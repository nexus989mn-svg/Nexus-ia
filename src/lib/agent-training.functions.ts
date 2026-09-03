import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireActiveSubscription } from "@/lib/security.server";
import { AURI_CUSTOMIZATION_LIMITS } from "@/lib/agent-policy";

const modules = ["atendimento", "sdr", "audio"] as const;
const input = z.object({
  displayName: z.string().max(AURI_CUSTOMIZATION_LIMITS.displayNameMax).nullable().optional(),
  companyContext: z.record(z.string(), z.any()).default({}),
  behaviorPrompt: z.string().max(AURI_CUSTOMIZATION_LIMITS.behaviorMax).default(""),
  rules: z.record(z.string(), z.any()).default({}),
  audioEnabled: z.boolean().default(false),
  voiceId: z.string().max(160).nullable().optional(),
  voiceName: z.string().max(120).nullable().optional(),
});

async function companyId(userId: string) {
  const { data, error } = await supabaseAdmin.from("companies").select("id").eq("owner_user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Empresa não encontrada.");
  return data.id as string;
}

export const getMyAgentTraining = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireActiveSubscription(context.userId);
    const cid = await companyId(context.userId);
    const { data: row, error } = await (supabaseAdmin as any).from("company_agent_configs")
      .select("id,module_code,display_name,behavior_prompt,company_context,rules,version,updated_at,audio_enabled,voice_id,voice_name")
      .eq("company_id", cid).eq("module_code", "atendimento").maybeSingle();
    if (error) throw new Error(error.message);
    return { config: row };
  });

export const saveMyAgentTraining = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => input.parse(d))
  .handler(async ({ context, data }) => {
    await requireActiveSubscription(context.userId);
    const cid = await companyId(context.userId);
    const companyContext = { ...(data.companyContext ?? {}) };
    const summary = typeof companyContext.summary === "string"
      ? companyContext.summary.slice(0, AURI_CUSTOMIZATION_LIMITS.companySummaryMax)
      : "";
    companyContext.summary = summary;

    let voiceName = data.voiceName?.trim() || null;
    if (data.voiceId?.trim()) {
      const { data: voice, error: voiceError } = await (supabaseAdmin as any)
        .from("agent_voice_catalog")
        .select("voice_id,name,is_active")
        .eq("voice_id", data.voiceId.trim())
        .maybeSingle();
      if (voiceError) throw new Error(voiceError.message);
      if (!voice || !voice.is_active) throw new Error("A voz selecionada não está disponível.");
      voiceName = voice.name;
    } else if (data.audioEnabled) {
      throw new Error("Escolha uma voz antes de ativar o uso de áudio.");
    }

    const { data: existing } = await (supabaseAdmin as any).from("company_agent_configs")
      .select("module_code,version,behavior_prompt,rules,display_name")
      .eq("company_id", cid).in("module_code", modules);
    const byModule = new Map((existing ?? []).map((r: any) => [r.module_code, r]));
    const rows = modules.map((moduleCode) => {
      const current = byModule.get(moduleCode) as any;
      return {
        company_id: cid,
        module_code: moduleCode,
        display_name: moduleCode === "atendimento" ? (data.displayName?.trim() || null) : (current?.display_name ?? null),
        company_context: companyContext,
        behavior_prompt: moduleCode === "atendimento" ? data.behaviorPrompt.trim() : (current?.behavior_prompt ?? ""),
        rules: data.rules,
        audio_enabled: moduleCode === "atendimento" ? data.audioEnabled : Boolean(current?.audio_enabled ?? false),
        voice_id: moduleCode === "atendimento" ? (data.voiceId?.trim() || null) : (current?.voice_id ?? null),
        voice_name: moduleCode === "atendimento" ? voiceName : (current?.voice_name ?? null),
        customization_version: Number(current?.customization_version ?? 0) + 1,
        version: Number(current?.version ?? 0) + 1,
        updated_by: context.userId,
      };
    });

    const { data: saved, error } = await (supabaseAdmin as any).from("company_agent_configs")
      .upsert(rows, { onConflict: "company_id,module_code" })
      .select("*");
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("system_logs").insert({
      user_id: context.userId,
      source: "ai_admin",
      event: "company_knowledge.updated",
      severity: "info",
      metadata: { company_id: cid, modules, audio_enabled: data.audioEnabled, voice_id: data.voiceId ?? null },
    });
    return { config: saved?.find((r: any) => r.module_code === "atendimento") ?? null };
  });
export const previewAgentVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    voiceId: z.string().min(1).max(160),
    language: z.enum(["pt-BR", "en", "es"]).default("pt-BR"),
    text: z.string().min(1).max(1000).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await requireActiveSubscription(context.userId);
    const cid = await companyId(context.userId);
    void cid;

    const { data: voice, error: voiceError } = await (supabaseAdmin as any)
      .from("agent_voice_catalog")
      .select("voice_id,name,is_active")
      .eq("voice_id", data.voiceId.trim())
      .maybeSingle();
    if (voiceError) throw new Error(voiceError.message);
    if (!voice || !voice.is_active) throw new Error("A voz selecionada não está disponível.");

    const base = (process.env.NEXUS_BASE_URL || "https://intelligent-ai-router.lovable.app/api/public/v1").replace(/\/$/, "");
    const token = process.env.NEXUS_API_KEY;
    if (!token) throw new Error("NEXUS_API_KEY não configurada no servidor.");

    const response = await fetch(`${base}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input:
          data.text ??
          (data.language === "en"
            ? "Hello! I am Auri. This is a sample of the voice that will be used for customer service."
            : data.language === "es"
              ? "¡Hola! Soy Auri. Esta es una muestra de la voz que se utilizará en la atención al cliente."
              : "Olá! Eu sou a Auri. Esta é uma amostra da voz que será usada no atendimento."),
        voice_id: voice.voice_id,
        language: data.language,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Não foi possível gerar a prévia da voz (${response.status}). ${detail}`.trim());
    }

    const payload = await response.json().catch(() => null) as any;
    const url = payload?.url ?? payload?.audio_url ?? payload?.audioUrl;
    if (!url || typeof url !== "string") throw new Error("O Gateway não retornou a URL da prévia.");

    return { url, voiceId: voice.voice_id, voiceName: voice.name };
  });

