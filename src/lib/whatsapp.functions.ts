import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const connectInput = z.object({
  phone_e164: z.string().min(8).max(20),
  display_name: z.string().min(1).max(120),
});

function normalizeEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

async function isAdminUser(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

async function hasWhatsappAccess(userId: string) {
  if (await isAdminUser(userId)) return { hasAccess: true, isAdmin: true };

  const { data: sub, error: subError } = await supabaseAdmin
    .from("subscriptions")
    .select("status,current_period_end,trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (subError) throw new Error(`Não foi possível validar a assinatura: ${subError.message}`);

  const now = Date.now();
  const hasAccess = !!sub && ["trial", "active"].includes(sub.status) &&
    (!sub.current_period_end || new Date(sub.current_period_end).getTime() > now) &&
    (sub.status !== "trial" || !sub.trial_ends_at || new Date(sub.trial_ends_at).getTime() > now);

  if (hasAccess) return { hasAccess: true, isAdmin: false };

  // Trial requires a connected WhatsApp number, so a new customer without
  // a subscription must be allowed to start the WhatsApp setup first.
  if (!sub) {
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authError || !authUser.user) throw new Error("Usuário não encontrado.");
    const email = normalizeEmail(authUser.user.email);
    const { data: claim, error: claimError } = await supabaseAdmin
      .from("trial_claims")
      .select("id")
      .eq("email_normalized", email)
      .maybeSingle();
    if (claimError) throw new Error(`Não foi possível validar o Trial: ${claimError.message}`);
    if (!claim) return { hasAccess: true, isAdmin: false };
  }

  return { hasAccess: false, isAdmin: false };
}
function normalizePhone(raw: string) {
  const digits = raw.replace(/[^0-9]/g, "");
  return `+${digits}`;
}

async function evolutionConfig() {
  let url = process.env.EVOLUTION_API_URL?.trim();
  let key = process.env.EVOLUTION_API_KEY?.trim();

  // Prefer the admin integration record when environment variables are absent.
  if (!url || !key) {
    const { data } = await supabaseAdmin
      .from("integration_credentials")
      .select("base_url,api_key,is_enabled")
      .eq("provider", "whatsapp")
      .maybeSingle();
    url = url || data?.base_url?.trim();
    key = key || data?.api_key?.trim();
  }

  if (!url || !key) {
    throw new Error("WhatsApp não configurado. Informe a URL e a chave da Evolution API em Administração → Integrações.");
  }

  return { url: url.replace(/\/$/, ""), key };
}

async function evolutionRequest(path: string, options: RequestInit = {}) {
  const { url, key } = await evolutionConfig();

  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();

  let body: any;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(
      body?.response?.message ||
        body?.message ||
        body?.error ||
        `Evolution API HTTP ${response.status}`,
    );
  }

  return body;
}

function extractQr(data: any): string | null {
  const candidates = [
    data?.qrcode?.base64,
    data?.qrcode?.base64Image,
    data?.qrcode?.code,
    data?.qrcode,
    data?.base64,
    data?.base64Image,
    data?.qr,
    data?.qr_code,
    data?.instance?.qrcode?.base64,
    data?.instance?.qrcode?.base64Image,
    data?.instance?.qrcode?.code,
    data?.data?.qrcode?.base64,
    data?.data?.qrcode?.base64Image,
    data?.data?.qrcode?.code,
    data?.data?.base64,
    data?.data?.qr,
  ];

  const value = candidates.find(
    (item) => typeof item === "string" && item.trim().length > 0,
  );

  return value ? value.trim() : null;
}

function normalizeQr(qr: string | null) {
  if (!qr) return null;
  const value = qr.trim();
  if (value.startsWith("data:image/")) return value;
  if (value.startsWith("data:")) return value;
  return `data:image/png;base64,${value.replace(/\s/g, "")}`;
}

async function getState(instance: string) {
  const data = await evolutionRequest(
    `/instance/connectionState/${encodeURIComponent(instance)}`,
  );

  return (
    data?.instance?.state ||
    data?.instance?.connectionStatus ||
    data?.state ||
    data?.connectionStatus ||
    "unknown"
  );
}

export const getMyWhatsapp = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const { data, error } = await supabaseAdmin
      .from("whatsapp_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return { connection: data };
  });

export const requestWhatsappConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => connectInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const access = await hasWhatsappAccess(userId);
    if (!access.hasAccess) {
      throw new Error("Ative o Trial ou um plano pago para liberar a conexão do WhatsApp.");
    }

    const phone = normalizePhone(data.phone_e164);

    // If this account is on Trial, bind the Trial to the WhatsApp number.
    // A number that already consumed a Trial blocks the account immediately.
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    if (subscription?.status === "trial") {
      const { data: existingClaim } = await supabaseAdmin
        .from("trial_claims")
        .select("user_id")
        .eq("phone_e164", phone)
        .maybeSingle();

      if (existingClaim && existingClaim.user_id !== userId) {
        await supabaseAdmin.from("subscriptions").update({
          status: "blocked",
          blocked_reason: "Número de WhatsApp já utilizado em outro Trial",
        }).eq("user_id", userId);
        await supabaseAdmin.from("system_logs").insert({
          user_id: userId,
          source: "security",
          event: "trial.phone_reuse_blocked",
          severity: "warning",
          metadata: { phone_last4: phone.slice(-4) },
        });
        throw new Error("Este número de WhatsApp já utilizou o Trial anteriormente.");
      }

      const { error: claimUpdateError } = await supabaseAdmin
        .from("trial_claims")
        .update({ phone_e164: phone })
        .eq("user_id", userId)
        .is("phone_e164", null);

      if (claimUpdateError) {
        await supabaseAdmin.from("subscriptions").update({
          status: "blocked",
          blocked_reason: "Falha ao vincular o número ao Trial",
        }).eq("user_id", userId);
        throw new Error("Não foi possível validar o número do Trial com segurança.");
      }
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (companyError) throw new Error(companyError.message);
    if (!company) throw new Error("Empresa não encontrada");

    // Uma instância exclusiva para esta empresa.
    const instance = `wa_${company.id.replace(/-/g, "").slice(0, 16)}`;

    let exists = false;

    try {
      const instances = await evolutionRequest("/instance/fetchInstances");

      const list = Array.isArray(instances)
        ? instances
        : Array.isArray(instances?.instances)
          ? instances.instances
          : Array.isArray(instances?.data)
            ? instances.data
            : [];
      exists = list.some(
        (item: any) =>
          item?.name === instance ||
          item?.instanceName === instance ||
          item?.instance?.instanceName === instance ||
          item?.instance?.name === instance,
      );
    } catch {
      // A criação será tentada abaixo.
    }

    let createResponse: any = null;
    if (!exists) {
      createResponse = await evolutionRequest("/instance/create", {
        method: "POST",
        body: JSON.stringify({
          instanceName: instance, integration: "WHATSAPP-BAILEYS", qrcode: true,
        }),
      });
    }

    const connection = await evolutionRequest(
      `/instance/connect/${encodeURIComponent(instance)}`,
    );

    const qr = normalizeQr(extractQr(connection) || extractQr(createResponse));
    const state = await getState(instance);

    const status =
      state === "open" || state === "connected"
        ? "connected"
        : "pending";

    const { data: row, error } = await supabaseAdmin
      .from("whatsapp_connections")
      .upsert(
        {
          user_id: userId,
          company_id: company.id,
          phone_e164: phone,
          display_name: data.display_name,
          instance_name: instance,
          status,
          qr_code: qr,
          connected_at:
            status === "connected"
              ? new Date().toISOString()
              : null,
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      connection: row,
      qr_code: qr,
      evolution_status: state,
    };
  });

export const refreshWhatsappConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const { data: connection, error } = await supabaseAdmin
      .from("whatsapp_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!connection?.instance_name) {
      throw new Error("WhatsApp ainda não foi configurado");
    }

    const state = await getState(connection.instance_name);

    if (state === "open" || state === "connected") {
      const now = new Date().toISOString();

      const { data, error: updateError } = await supabaseAdmin
        .from("whatsapp_connections")
        .update({
          status: "connected",
          connected_at: connection.connected_at ?? now,
          last_seen_at: now,
          qr_code: null,
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (updateError) throw new Error(updateError.message);

      return {
        connection: data,
        evolution_status: state,
      };
    }

    const result = await evolutionRequest(
      `/instance/connect/${encodeURIComponent(connection.instance_name)}`,
    );

    const qr = normalizeQr(extractQr(result));
    const refreshedState = await getState(connection.instance_name);
    const isConnected = refreshedState === "open" || refreshedState === "connected";

    const { data, error: updateError } = await supabaseAdmin
      .from("whatsapp_connections")
      .update({
        status: isConnected ? "connected" : "pending",
        qr_code: isConnected ? null : qr,
        connected_at: isConnected ? (connection.connected_at ?? new Date().toISOString()) : null,
        last_seen_at: isConnected ? new Date().toISOString() : connection.last_seen_at,
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    return {
      connection: data,
      qr_code: qr,
      evolution_status: refreshedState,
    };
  });

export const confirmWhatsappConnected = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const { data: connection, error } = await supabaseAdmin
      .from("whatsapp_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!connection?.instance_name) {
      throw new Error("WhatsApp não configurado");
    }

    const state = await getState(connection.instance_name);

    if (state !== "open" && state !== "connected") {
      throw new Error(
        "O WhatsApp ainda não está conectado. Escaneie o QR primeiro.",
      );
    }

    const now = new Date().toISOString();

    const { data, error: updateError } = await supabaseAdmin
      .from("whatsapp_connections")
      .update({
        status: "connected",
        connected_at: connection.connected_at ?? now,
        last_seen_at: now,
        qr_code: null,
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    return {
      connection: data,
      evolution_status: state,
    };
  });

export const disconnectWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const { data: connection } = await supabaseAdmin
      .from("whatsapp_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (connection?.instance_name) {
      try {
        await evolutionRequest(
          `/instance/logout/${encodeURIComponent(connection.instance_name)}`,
          { method: "DELETE" },
        );
      } catch {
        // Instância já desconectada.
      }
    }

    const { data, error } = await supabaseAdmin
      .from("whatsapp_connections")
      .update({
        status: "disconnected",
        qr_code: null,
        connected_at: null,
        last_seen_at: null,
      })
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    if (error) throw new Error(error.message);

    return { connection: data };
  });
