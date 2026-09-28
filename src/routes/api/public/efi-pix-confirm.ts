import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { consultarEfiPix } from "@/lib/efi-pix.server";
import { emitOperationalEvent } from "@/lib/ops.server";

export const Route = createFileRoute("/api/public/efi-pix-confirm")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.EFI_N8N_CONFIRM_SECRET?.trim();

        if (
          !secret ||
          request.headers.get("x-efi-n8n-secret") !== secret
        ) {
          return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }

        const body = await request.json().catch(() => null);
        const txid = String(body?.txid || "").trim();

        if (!txid) {
          return Response.json(
            { error: "TXID obrigatório" },
            { status: 400 }
          );
        }

        const pix = await consultarEfiPix(txid);

        if (pix.status !== "CONCLUIDA") {
          return Response.json({
            ok: true,
            confirmado: false,
            status: pix.status,
            txid,
          });
        }

        const { data: event, error: eventError } =
          await supabaseAdmin
            .from("billing_events")
            .select("id,user_id,payload")
            .eq("provider", "efi")
            .eq("external_event_id", txid)
            .eq("event_type", "EFI_PIX_CREATED")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (eventError) {
          throw new Error(eventError.message);
        }

        if (!event) {
          return Response.json(
            {
              error: "Cobrança Efí não encontrada.",
              txid,
            },
            { status: 404 }
          );
        }

        const userId = event.user_id;

        if (!userId) {
          throw new Error("Usuário da cobrança Efí não encontrado.");
        }

        const payload =
          event.payload &&
          typeof event.payload === "object" &&
          !Array.isArray(event.payload)
            ? (event.payload as Record<string, unknown>)
            : {};

        const planId =
          typeof payload.plan_id === "string"
            ? payload.plan_id
            : null;

        const planCode =
          typeof payload.plan_code === "string"
            ? payload.plan_code
            : null;

        if (!planId || !planCode) {
          throw new Error("Dados do plano não encontrados na cobrança Efí.");
        }

        const now = new Date();

        const end = new Date(now);

        if (planCode === "yearly") {
          end.setFullYear(end.getFullYear() + 1);
        } else {
          end.setMonth(end.getMonth() + 1);
        }

        const { data: existing } = await supabaseAdmin
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({
              plan_id: planId,
              status: "active",
              current_period_start: now.toISOString(),
              current_period_end: end.toISOString(),
              trial_ends_at: null,
                blocked_reason: null,
              cancel_at_period_end: false,
            })
            .eq("user_id", userId);

          if (error) {
            throw new Error(error.message);
          }
        } else {
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .insert({
              user_id: userId,
              plan_id: planId,
              status: "active",
              current_period_start: now.toISOString(),
              current_period_end: end.toISOString(),
                cancel_at_period_end: false,
            });

          if (error) {
            throw new Error(error.message);
          }
        }

        await supabaseAdmin
          .from("billing_events")
          .insert({
            user_id: userId,
            provider: "efi",
            event_type: "EFI_PIX_PAID",
            external_event_id: `${txid}:paid`,
            payload: {
              txid,
              plan_id: planId,
              plan_code: planCode,
              status: pix.status,
              valor: pix.valor?.original,
              confirmed_at: now.toISOString(),
            },
            processed_at: now.toISOString(),
          });

        await emitOperationalEvent({
          eventType: "EFI_PIX_PAID",
          severity: "info",
          userId,
          payload: {
            txid,
            plan: planCode,
            amount: pix.valor?.original,
          },
        });

        return Response.json({
          ok: true,
          confirmado: true,
          ativado: true,
          txid,
          userId,
          planCode,
          pix,
        });
      },
    },
  },
});
