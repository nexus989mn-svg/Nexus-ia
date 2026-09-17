import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callN8nChat } from "@/lib/n8n.server";
import { requireActiveSubscription } from "@/lib/security.server";

const messageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) });

export const catalogAgentChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    messages: z.array(messageSchema).min(1).max(30),
    conversationId: z.string().min(1).max(200),
    imageUrl: z.string().url().nullable().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { userId } = context;
    await requireActiveSubscription(userId);
    const { data: company } = await supabaseAdmin.from("companies").select("id, name").eq("owner_user_id", userId).maybeSingle();
    if (!company) throw new Error("Empresa não encontrada.");

    const lastMessage = data.messages[data.messages.length - 1]?.content ?? "";

    // O Catálogo usa o fluxo central do n8n para processar a conversa.
    const n8nReply = await callN8nChat({
      userId,
      companyId: company.id,
      companyName: company.name,
      conversationId: data.conversationId,
      moduleCode: "catalogo",
      message: lastMessage,
      messages: data.messages,
temperature: 0.35,
      maxTokens: 2200,
      imageUrl: data.imageUrl ?? null,
    });

    const replyText = String(
      n8nReply?.output ??
      n8nReply?.response ??
      n8nReply?.reply ??
      n8nReply?.message ??
      ""
    ).trim();

    if (!replyText) {
      throw new Error("A IA do Catálogo não retornou uma resposta.");
    }

    const draftMatch = replyText.match(
      /<CATALOG_DRAFT>\s*([\s\S]*?)\s*<\/CATALOG_DRAFT>/i
    );

    let draft: any = null;

    let catalogPlan: {
      name: string;
      description: string;
      categories: Array<{
        name: string;
        description: string | null;
        products: Array<{
          name: string;
          description: string | null;
          price_cents: number;
          sku: string | null;
          stock: number | null;
          image_url: string | null;
        }>;
      }>;
    } | null = null;

    const catalogPlanMatch = replyText.match(
      /<CATALOG_PLAN>\s*([\s\S]*?)\s*<\/CATALOG_PLAN>/i
    );

    if (catalogPlanMatch) {
      try {
        const parsed = JSON.parse(catalogPlanMatch[1]);

        if (
          parsed &&
          typeof parsed.name === "string" &&
          Array.isArray(parsed.categories)
        ) {
          catalogPlan = {
            name: parsed.name.trim(),
            description: String(parsed.description ?? "").trim(),
            categories: parsed.categories
              .filter((category: any) =>
                category && typeof category.name === "string"
              )
              .map((category: any) => ({
                name: String(category.name).trim(),
                description:
                  category.description == null
                    ? null
                    : String(category.description).trim(),
                products: Array.isArray(category.products)
                  ? category.products
                      .filter((product: any) =>
                        product && typeof product.name === "string"
                      )
                      .map((product: any) => ({
                        name: String(product.name).trim(),
                        description:
                          product.description == null
                            ? null
                            : String(product.description).trim(),
                        price_cents: Number.isFinite(
                          Number(product.price_cents)
                        )
                          ? Math.max(
                              0,
                              Math.round(Number(product.price_cents))
                            )
                          : 0,
                        sku:
                          product.sku == null ||
                          String(product.sku).trim() === ""
                            ? null
                            : String(product.sku).trim(),
                        stock:
                          product.stock == null ||
                          String(product.stock).trim() === ""
                            ? null
                            : Math.max(
                                0,
                                Math.round(Number(product.stock))
                              ),
                        image_url:
                          typeof product.image_url === "string"
                            ? product.image_url
                            : null,
                      }))
                  : [],
              })),
          };
        }
      } catch {
        catalogPlan = null;
      }
    }


    if (draftMatch) {
      try {
        draft = JSON.parse(draftMatch[1]);
      } catch {
        draft = null;
      }
    }

    const cleanReply =
      typeof n8nReply?.output === "string"
        ? n8nReply.output
        : typeof n8nReply?.reply === "string"
          ? n8nReply.reply
          : typeof n8nReply?.response === "string"
            ? n8nReply.response
            : "";

    const jobId =
      typeof n8nReply?.jobId === "string"
        ? n8nReply.jobId
        : null;

    const producedImageUrl =
      typeof n8nReply?.imageUrl === "string"
        ? n8nReply.imageUrl
        : typeof n8nReply?.image_url === "string"
          ? n8nReply.image_url
          : null;

    return {
      reply: cleanReply,
      draft,
      jobId,

      imageUrl: producedImageUrl,

    };
  });
