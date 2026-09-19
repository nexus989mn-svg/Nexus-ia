import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const conversationInput = z.object({
  conversationId: z.string().uuid(),
});

const saveInput = z.object({
  conversationId: z.string().uuid(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().max(8000),
      imageUrl: z.string().url().nullable().optional(),
    }),
  ).max(50),
  title: z.string().max(160).nullable().optional(),
});

async function getCompany(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id, name")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Empresa não encontrada.");

  return data;
}

async function assertOwner(userId: string, conversationId: string) {
  const company = await getCompany(userId);

  const { data, error } = await supabaseAdmin
    .from("ai_conversations")
    .select("id, company_id, user_id, title, context, created_at, updated_at")
    .eq("id", conversationId)
    .eq("company_id", company.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Conversa não encontrada.");

  return { company, conversation: data };
}

export const createCatalogConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const company = await getCompany(userId);

    const { data, error } = await supabaseAdmin
      .from("ai_conversations")
      .insert({
        company_id: company.id,
        user_id: userId,
        title: "Nova conversa",
        context: {
          moduleCode: "catalogo",
        },
      })
      .select("id, title, context, created_at, updated_at")
      .single();

    if (error) throw new Error(error.message);

    const greeting =
      "Olá! O que você quer montar no seu catálogo? Pode me explicar do jeito que quiser. Eu vou entender o que você precisa e conduzir a criação com você.";

    const { error: messageError } = await supabaseAdmin
      .from("ai_messages")
      .insert({
        conversation_id: data.id,
        company_id: company.id,
        role: "assistant",
        content: greeting,
        metadata: {
          moduleCode: "catalogo",
        },
      });

    if (messageError) throw new Error(messageError.message);

    return {
      conversation: data,
      greeting,
    };
  });

export const listMyCatalogConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const company = await getCompany(userId);

    const { data, error } = await supabaseAdmin
      .from("ai_conversations")
      .select("id, title, context, created_at, updated_at")
      .eq("company_id", company.id)
      .eq("user_id", userId)
      .eq("context->>moduleCode", "catalogo")
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);

    return {
      conversations: data ?? [],
    };
  });

export const getMyCatalogConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => conversationInput.parse(d))
  .handler(async ({ context, data }) => {
    const { userId } = context;

    const { conversation } = await assertOwner(
      userId,
      data.conversationId,
    );

    const { data: messages, error } = await supabaseAdmin
      .from("ai_messages")
      .select(
        "id, conversation_id, role, content, metadata, created_at",
      )
      .eq("conversation_id", conversation.id)
      .eq("company_id", conversation.company_id)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    return {
      conversation,
      messages: messages ?? [],
    };
  });

export const saveCatalogConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => saveInput.parse(d))
  .handler(async ({ context, data }) => {
    const { userId } = context;

    const { company, conversation } = await assertOwner(
      userId,
      data.conversationId,
    );

    const existing = await supabaseAdmin
      .from("ai_messages")
      .select("role, content, metadata")
      .eq("conversation_id", conversation.id)
      .eq("company_id", company.id)
      .order("created_at", { ascending: true });

    if (existing.error) {
      throw new Error(existing.error.message);
    }

    const stored = existing.data ?? [];

    const incoming = data.messages.map((message) => ({
      role: message.role,
      content: message.content,
      imageUrl: message.imageUrl ?? null,
    }));

    const existingKeys = new Set(
      stored.map((message) =>
        JSON.stringify({
          role: message.role,
          content: message.content,
          imageUrl:
            (message.metadata as Record<string, unknown> | null)
              ?.imageUrl ?? null,
        }),
      ),
    );

    const toInsert = incoming
      .filter((message) => {
        const key = JSON.stringify(message);
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      })
      .map((message) => ({
        conversation_id: conversation.id,
        company_id: company.id,
        role: message.role,
        content: message.content,
        metadata: {
          moduleCode: "catalogo",
          ...(message.imageUrl
            ? { imageUrl: message.imageUrl }
            : {}),
        },
      }));

    if (toInsert.length > 0) {
      const { error } = await supabaseAdmin
        .from("ai_messages")
        .insert(toInsert);

      if (error) throw new Error(error.message);
    }

    const title =
      data.title?.trim() ||
      (incoming.find(
        (message) => message.role === "user" && message.content.trim(),
      )?.content.trim().slice(0, 160) ?? "Nova conversa");

    const { error: updateError } = await supabaseAdmin
      .from("ai_conversations")
      .update({
        title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation.id)
      .eq("company_id", company.id)
      .eq("user_id", userId);

    if (updateError) throw new Error(updateError.message);

    return { ok: true };
  });

export const deleteMyCatalogConversation = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => conversationInput.parse(d))
  .handler(async ({ context, data }) => {
    const { userId } = context;

    const { company, conversation } = await assertOwner(
      userId,
      data.conversationId,
    );

    const { error: messagesError } = await supabaseAdmin
      .from("ai_messages")
      .delete()
      .eq("conversation_id", conversation.id)
      .eq("company_id", company.id);

    if (messagesError) {
      throw new Error(messagesError.message);
    }

    const { error: conversationError } = await supabaseAdmin
      .from("ai_conversations")
      .delete()
      .eq("id", conversation.id)
      .eq("company_id", company.id)
      .eq("user_id", userId);

    if (conversationError) {
      throw new Error(conversationError.message);
    }

    return { ok: true };
  });
