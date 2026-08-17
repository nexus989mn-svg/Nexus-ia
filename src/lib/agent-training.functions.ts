import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireActiveSubscription } from "@/lib/security.server";

const modules = ["atendimento", "sdr", "audio"] as const;
const input = z.object({
  displayName: z.string().max(80).nullable().optional(),
  companyContext: z.record(z.string(), z.any()).default({}),
  behaviorPrompt: z.string().max(12000).default(""),
  rules: z.record(z.string(), z.any()).default({}),
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
    const { data: row, error } = await supabaseAdmin.from("company_agent_configs")
      .select("id,module_code,display_name,behavior_prompt,company_context,rules,version,updated_at")
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
    const { data: existing } = await supabaseAdmin.from("company_agent_configs")
      .select("module_code,version,behavior_prompt,rules,display_name")
      .eq("company_id", cid).in("module_code", modules);

    const byModule = new Map((existing ?? []).map((r: any) => [r.module_code, r]));
    const rows = modules.map((moduleCode) => {
      const current = byModule.get(moduleCode) as any;
      return {
        company_id: cid,
        module_code: moduleCode,
        display_name: moduleCode === "atendimento" ? (data.displayName?.trim() || null) : (current?.display_name ?? null),
        // The company knowledge is shared with all customer-facing internal workers.
        company_context: data.companyContext,
        // Only Atendimento's behavior text is edited from this customer-facing screen.
        behavior_prompt: moduleCode === "atendimento" ? data.behaviorPrompt.trim() : (current?.behavior_prompt ?? ""),
        rules: data.rules,
        version: Number(current?.version ?? 0) + 1,
        updated_by: context.userId,
      };
    });

    const { data: saved, error } = await supabaseAdmin.from("company_agent_configs")
      .upsert(rows, { onConflict: "company_id,module_code" })
      .select("*");
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("system_logs").insert({
      user_id: context.userId,
      source: "ai_admin",
      event: "company_knowledge.updated",
      severity: "info",
      metadata: { company_id: cid, modules: modules },
    });
    return { config: saved?.find((r: any) => r.module_code === "atendimento") ?? null };
  });
