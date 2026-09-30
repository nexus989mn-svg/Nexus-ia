import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createEfiPixCharge } from "@/lib/efi-pix.server";


function appUrl() {
  const configured =
    process.env.APP_URL ||
    process.env.PUBLIC_APP_URL ||
    "";

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "https://auri-ia-vercel-fix-real.vercel.app";
}

async function usdToBrl() {
  const response = await fetch(
    "https://api.frankfurter.app/latest?from=USD&to=BRL"
  );

  const body: any = await response.json().catch(() => null);

  if (!response.ok || !body?.rates?.BRL) {
    throw new Error("Não foi possível obter a cotação USD/BRL.");
  }

  const rate = Number(body.rates.BRL);

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Cotação USD/BRL inválida.");
  }

  return rate;
}

export const createEfiPixCheckout = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        planCode: z.enum(["monthly", "yearly"]),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;

    const { data: plan, error } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("code", data.planCode)
      .single();

    if (error || !plan) {
      throw new Error("Plano não encontrado.");
    }

    const rate = await usdToBrl();

    const amountBrl = Math.max(
      0.50,
      Math.round(
        ((Number(plan.price_usd_cents) / 100) * rate) * 100
      ) / 100
    );

    const pix = await createEfiPixCharge({
      amount: amountBrl,
      userId,
      planCode: data.planCode,
      planName: plan.name,
    });

    const { error: eventError } = await supabaseAdmin
      .from("billing_events")
      .insert({
        user_id: userId,
        provider: "efi",
        event_type: "EFI_PIX_CREATED",
        external_event_id: pix.txid,
        payload: {
          txid: pix.txid,
          user_id: userId,
          plan_id: plan.id,
          plan_code: data.planCode,
          plan_name: plan.name,
          amount_brl: amountBrl,
          pix_copia_e_cola: pix.pixCopiaECola,
          imagem_qrcode: pix.imagemQrcode,
          link_visualizacao: pix.linkVisualizacao,
          status: pix.status,
          created_at: new Date().toISOString(),
        },
      });

    if (eventError) {
      throw new Error(
        `Pix criado, mas não foi possível registrar a cobrança: ${eventError.message}`
      );
    }

    return {
      mock: false,
      provider: "efi",
      paymentMethod: "pix",
      txid: pix.txid,
      amountBrl,
      pixCopiaECola: pix.pixCopiaECola,
      imagemQrcode: pix.imagemQrcode,
      url:
        pix.linkVisualizacao ||
        `${appUrl()}/billing?pix=created&txid=${encodeURIComponent(
          pix.txid
        )}`,
    };
  });
