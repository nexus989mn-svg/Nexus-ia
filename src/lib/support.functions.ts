import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const threadInput = z.object({
  subject: z.string().trim().min(1).max(160).default("Suporte AURI"),
  message: z.string().trim().min(1).max(10000),
});

const messageInput = z.object({
  threadId: z.string().uuid(),
  message: z.string().trim().min(1).max(10000),
});

const threadIdInput = z.object({ threadId: z.string().uuid() });

async function getCompanyId(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Empresa não encontrada.");
  return data.id as string;
}

async function assertThreadOwner(supabase: any, userId: string, threadId: string) {
  const { data, error } = await supabase
    .from("support_threads")
    .select("id, company_id, requester_user_id, status, needs_human")
    .eq("id", threadId)
    .eq("requester_user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Atendimento não encontrado.");
  return data;
}

export const listMySupportThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const companyId = await getCompanyId(supabase, userId);

    const { data, error } = await (supabase as any)
      .from("support_threads")
      .select("id, subject, status, needs_human, last_message_at, created_at, updated_at")
      .eq("company_id", companyId)
      .eq("requester_user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { threads: data ?? [] };
  });

export const getMySupportMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => threadIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const thread = await assertThreadOwner(supabase, userId, data.threadId);

    const { data: messages, error } = await (supabase as any)
      .from("support_messages")
      .select("id, thread_id, sender_type, sender_user_id, content, status, created_at")
      .eq("thread_id", thread.id)
      .eq("company_id", thread.company_id)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return { thread, messages: messages ?? [] };
  });

export const createSupportThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => threadInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await getCompanyId(supabase, userId);
    const db = supabase as any;

    const { data: thread, error: threadError } = await db
      .from("support_threads")
      .insert({
        company_id: companyId,
        requester_user_id: userId,
        subject: data.subject || "Suporte AURI",
        status: "waiting_ai",
      })
      .select("id, subject, status, needs_human, last_message_at, created_at, updated_at")
      .single();

    if (threadError) throw new Error(threadError.message);

    const { error: messageError } = await db.from("support_messages").insert({
      thread_id: thread.id,
      company_id: companyId,
      sender_type: "customer",
      sender_user_id: userId,
      content: data.message,
      status: "pending_ai",
    });

    if (messageError) {
      await db.from("support_threads").delete().eq("id", thread.id).eq("requester_user_id", userId);
      throw new Error(messageError.message);
    }

    return { thread };
  });

export const sendSupportMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => messageInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const thread = await assertThreadOwner(supabase, userId, data.threadId);
    const db = supabase as any;

    if (thread.status === "closed") {
      throw new Error("Este atendimento foi encerrado. Abra um novo atendimento para continuar.");
    }

    const messageStatus = thread.status === "human_pending" ? "delivered" : "pending_ai";
    const nextStatus = thread.status === "human_pending" ? "human_pending" : "waiting_ai";

    const { error } = await db.from("support_messages").insert({
      thread_id: thread.id,
      company_id: thread.company_id,
      sender_type: "customer",
      sender_user_id: userId,
      content: data.message,
      status: messageStatus,
    });

    if (error) throw new Error(error.message);

    await db
      .from("support_threads")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", thread.id)
      .eq("requester_user_id", userId);

    return { ok: true };
  });

export const closeSupportThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => threadIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertThreadOwner(supabase, userId, data.threadId);

    const { error } = await (supabase as any)
      .from("support_threads")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", data.threadId)
      .eq("requester_user_id", userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
