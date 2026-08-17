import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function ensureAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

/* ============ INTEGRATIONS ============ */

export const adminListIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(supabaseAdmin, context.userId);
    const { data, error } = await supabaseAdmin
      .from("integration_credentials")
      .select("id,provider,label,base_url,config,is_enabled,last_test_at,last_test_status,last_test_message,created_at,updated_at,api_key")
      .order("label");
    if (error) throw new Error(error.message);
    return {
      integrations: (data ?? []).map(({ api_key, ...row }) => {
        const envKey =
          row.provider === "whatsapp" ? process.env.EVOLUTION_API_KEY :
          row.provider === "n8n" ? process.env.N8N_API_KEY :
          row.provider === "nexus" ? process.env.NEXUS_API_KEY :
          row.provider === "stripe" ? process.env.STRIPE_SECRET_KEY :
          undefined;
        const envBaseUrl =
          row.provider === "whatsapp" ? process.env.EVOLUTION_API_URL :
          row.provider === "n8n" ? process.env.N8N_BASE_URL :
          row.provider === "nexus" ? process.env.NEXUS_BASE_URL :
          undefined;
        return {
          ...row,
          base_url: row.base_url || envBaseUrl || null,
          api_key: null,
          api_key_configured: !!api_key || !!envKey,
        };
      }),
    };
  });

const integrationInput = z.object({
  provider: z.string().min(1).max(40),
  label: z.string().min(1).max(120).optional(),
  api_key: z.string().max(2000).nullable().optional(),
  base_url: z.string().max(500).nullable().optional(),
  config: z.record(z.string(), z.any()).optional(),
  is_enabled: z.boolean().optional(),
});

export const adminSaveIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => integrationInput.parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(supabaseAdmin, context.userId);
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("integration_credentials")
      .select("api_key")
      .eq("provider", data.provider)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);

    const patch: Record<string, unknown> = {
      provider: data.provider,
      label: data.label ?? data.provider,
      base_url: data.base_url ?? null,
      config: data.config ?? {},
      is_enabled: data.is_enabled ?? false,
    };
    if (data.api_key?.trim()) patch.api_key = data.api_key.trim();
    else if (existing?.api_key) patch.api_key = existing.api_key;

    const { error } = await supabaseAdmin
      .from("integration_credentials")
      .upsert(patch, { onConflict: "provider" });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("system_logs").insert({
      user_id: context.userId,
      source: "admin",
      event: `integration.${data.provider}.updated`,
      severity: "info",
    });
    return { ok: true };
  });

export const adminTestIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ provider: z.string().min(1).max(40) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(supabaseAdmin, context.userId);

    const { data: row, error: rowError } = await supabaseAdmin
      .from("integration_credentials")
      .select("*")
      .eq("provider", data.provider)
      .maybeSingle();

    if (rowError) throw new Error(rowError.message);
    if (!row) throw new Error("Integração não encontrada");

    const envKey =
      data.provider === "whatsapp" ? process.env.EVOLUTION_API_KEY :
      data.provider === "n8n" ? process.env.N8N_API_KEY :
      data.provider === "nexus" ? process.env.NEXUS_API_KEY :
      data.provider === "stripe" ? process.env.STRIPE_SECRET_KEY :
      undefined;
    const envBaseUrl =
      data.provider === "whatsapp" ? process.env.EVOLUTION_API_URL :
      data.provider === "n8n" ? process.env.N8N_BASE_URL :
      data.provider === "nexus" ? process.env.NEXUS_BASE_URL :
      undefined;
    const effectiveKey = row.api_key?.trim() || envKey?.trim() || "";
    const effectiveBaseUrl = row.base_url?.trim() || envBaseUrl?.trim() || "";

    let ok = false;
    let message = "";

    try {
      if (!effectiveKey) {
        message = "Chave de API ausente";
      }

      /* ================= NEXUS ================= */
      else if (data.provider === "nexus") {
        const baseUrl = (
          effectiveBaseUrl ||
          "https://intelligent-ai-router.lovable.app/api/public/v1"
        ).replace(/\/+$/, "");

        const r = await fetch(`${baseUrl}/models`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${effectiveKey}`,
            "Content-Type": "application/json",
          },
        });

        const text = await r.text();

        let body: any = null;
        try {
          body = JSON.parse(text);
        } catch {}

        ok = r.ok;

        if (ok) {
          const models = Array.isArray(body?.data)
            ? body.data
                .map((m: any) => m?.id)
                .filter(Boolean)
            : [];

          message =
            models.length > 0
              ? `Nexus conectado. ${models.length} modelo(s) disponível(is): ${models.slice(0, 5).join(", ")}`
              : "Nexus conectado, mas nenhum modelo foi retornado.";
        } else {
          message =
            body?.error?.message ||
            body?.message ||
            `Nexus HTTP ${r.status}: ${text.slice(0, 300)}`;
        }
      }

      /* ================= OPENAI ================= */
      else if (data.provider === "openai") {
        const r = await fetch("https://api.openai.com/v1/models", {
          headers: {
            Authorization: `Bearer ${effectiveKey}`,
          },
        });

        ok = r.ok;
        message = ok
          ? "OpenAI conectado com sucesso"
          : `OpenAI HTTP ${r.status}`;
      }

      /* ================= OPENROUTER ================= */
      else if (data.provider === "openrouter") {
        const r = await fetch("https://openrouter.ai/api/v1/models", {
          headers: {
            Authorization: `Bearer ${effectiveKey}`,
          },
        });

        ok = r.ok;
        message = ok
          ? "OpenRouter conectado com sucesso"
          : `OpenRouter HTTP ${r.status}`;
      }

      /* ================= STRIPE ================= */
      else if (data.provider === "stripe") {
        const r = await fetch("https://api.stripe.com/v1/balance", {
          headers: {
            Authorization: `Bearer ${effectiveKey}`,
          },
        });

        const text = await r.text();

        let body: any = null;
        try {
          body = JSON.parse(text);
        } catch {}

        ok = r.ok;

        message = ok
          ? "Stripe conectado com sucesso"
          : body?.error?.message || `Stripe HTTP ${r.status}`;
      }

      /* ================= WHATSAPP / N8N ================= */
      else if (data.provider === "whatsapp" || data.provider === "n8n") {
        if (!effectiveBaseUrl) {
          message = "URL base ausente";
        } else {
          const r = await fetch(effectiveBaseUrl, {
            method: "GET",
          });

          ok = r.status < 500;
          message = ok
            ? `Servidor respondeu (HTTP ${r.status})`
            : `HTTP ${r.status}`;
        }
      }

      else {
        ok = true;
        message = "Configuração salva (teste manual)";
      }
    } catch (e: any) {
      ok = false;
      message = e?.message ?? "Falha de rede";
    }

    await supabaseAdmin
      .from("integration_credentials")
      .update({
        last_test_at: new Date().toISOString(),
        last_test_status: ok ? "ok" : "fail",
        last_test_message: message.slice(0, 500),
      })
      .eq("provider", data.provider);

    return {
      ok,
      message,
    };
  });

/* ============ AI MODULES ============ */

export const adminListAIModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("ai_modules")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return { modules: data ?? [] };
  });

const aiInput = z.object({
  id: z.string().uuid(),
  is_enabled: z.boolean().optional(),
  model: z.string().min(1).max(120).optional(),
  system_prompt: z.string().max(8000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(64).max(32000).optional(),
});

export const adminSaveAIModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => aiInput.parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("ai_modules").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ BRIEFINGS ============ */

export const adminListBriefings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("briefings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { briefings: data ?? [] };
  });

const briefInput = z.object({
  id: z.string().uuid().optional(),
  customer_name: z.string().min(1).max(200),
  contact: z.string().max(200).optional().nullable(),
  channel: z.string().max(40).default("whatsapp"),
  status: z.enum(["pending", "in_progress", "approved", "completed"]).default("pending"),
  summary: z.string().max(4000).optional().nullable(),
});

export const adminSaveBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => briefInput.parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    if (data.id) {
      const { error } = await context.supabase
        .from("briefings")
        .update({
          customer_name: data.customer_name,
          contact: data.contact ?? null,
          channel: data.channel,
          status: data.status,
          summary: data.summary ?? null,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { data: company } = await context.supabase
        .from("companies").select("id").eq("owner_user_id", context.userId).maybeSingle();
      if (!company) throw new Error("Empresa do administrador não encontrada");
      const { error } = await context.supabase.from("briefings").insert({
        user_id: context.userId,
        company_id: company.id,
        customer_name: data.customer_name,
        contact: data.contact ?? null,
        channel: data.channel,
        status: data.status,
        summary: data.summary ?? null,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("briefings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ PLATFORM SETTINGS ============ */

export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("platform_settings").select("*");
    if (error) throw new Error(error.message);
    const map: Record<string, any> = {};
    for (const r of data ?? []) map[r.key] = r.value;
    return { settings: map };
  });

export const adminSaveSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      key: z.string().min(1).max(80),
      value: z.record(z.string(), z.any()),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("platform_settings")
      .upsert({ key: data.key, value: data.value, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ QUEUE STATS ============ */

export const adminQueueStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const [{ data: briefs }, { data: waConns }] = await Promise.all([
      context.supabase.from("briefings").select("status"),
      supabaseAdmin.from("whatsapp_connections").select("status"),
    ]);
    const byStatus: Record<string, number> = {};
    for (const b of briefs ?? []) byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;
    const waConnected = (waConns ?? []).filter((w) => w.status === "connected").length;
    return {
      pending: byStatus.pending ?? 0,
      in_progress: byStatus.in_progress ?? 0,
      approved: byStatus.approved ?? 0,
      completed: byStatus.completed ?? 0,
      whatsapp_connected: waConnected,
      whatsapp_total: (waConns ?? []).length,
    };
  });
