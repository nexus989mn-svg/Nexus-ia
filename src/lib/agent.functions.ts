import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function getCompanyId(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    const { data: created, error: cErr } = await supabase
      .from("companies")
      .insert({ owner_user_id: userId, name: "Minha empresa" })
      .select("id")
      .single();
    if (cErr) throw new Error(cErr.message);
    return created.id as string;
  }
  return data.id as string;
}

async function requireAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Acesso interno restrito ao administrador.");
}

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const companyId = await getCompanyId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("ai_conversations")
      .select("id, title, module_code, created_at, updated_at")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { conversations: data ?? [] };
  });

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        title: z.string().min(1).max(120).optional(),
        moduleCode: z.string().max(40).nullable().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const companyId = await getCompanyId(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("ai_conversations")
      .insert({
        company_id: companyId,
        user_id: context.userId,
        title: data.title ?? "Nova conversa",
        module_code: data.moduleCode ?? null,
      })
      .select("id, title, module_code, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { conversation: row };
  });

export const renameConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), title: z.string().min(1).max(120) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const companyId = await getCompanyId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("ai_conversations")
      .update({ title: data.title })
      .eq("id", data.id)
      .eq("company_id", companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const companyId = await getCompanyId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("ai_conversations")
      .delete()
      .eq("id", data.id)
      .eq("company_id", companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getConversationMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const companyId = await getCompanyId(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("ai_messages")
      .select("id, role, parts, content, created_at")
      .eq("conversation_id", data.id)
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { messages: rows ?? [] };
  });


export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await getCompanyId(context.supabase, context.userId);
    const [{ count: conversations }, { count: briefings }, { data: enabledModules }] = await Promise.all([
      context.supabase.from("ai_conversations").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      context.supabase.from("briefings").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
      context.supabase.from("ai_modules").select("id", { count: "exact", head: true }).eq("is_enabled", true),
    ]);
    const { data: subscription } = await context.supabase.from("subscriptions").select("plan:plans(price_usd_cents), status").eq("user_id", context.userId).maybeSingle();
    const priceUsd = subscription?.status === "active" ? Number((subscription as any)?.plan?.price_usd_cents ?? 0) / 100 : 0;
    const interval = (subscription as any)?.plan?.interval;
    const revenueUsd = interval === "yearly" ? priceUsd / 12 : priceUsd;
    return {
      conversations: conversations ?? 0,
      briefings: briefings ?? 0,
      revenueUsd,
      enabledAgents: (enabledModules as any)?.length ?? 0,
    };
  });
