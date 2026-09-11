import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callN8nChat } from "@/lib/n8n.server";
import { nexusChat } from "@/lib/nexus.server";
import { requireActiveSubscription } from "@/lib/security.server";

const messageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) });

export const catalogAgentChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ messages: z.array(messageSchema).min(1).max(30), imageUrl: z.string().url().nullable().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const { userId } = context;
    await requireActiveSubscription(userId);
    const { data: company } = await supabaseAdmin.from("companies").select("id, name").eq("owner_user_id", userId).maybeSingle();
    if (!company) throw new Error("Empresa não encontrada.");

    const { data: categories } = await supabaseAdmin.from("catalog_categories").select("id,name").eq("company_id", company.id).order("name");

    const system = `Você é o Agente de Catálogo da plataforma. Sua única função é criar e editar produtos e categorias do catálogo de uma empresa. Não fale sobre cobrança, WhatsApp, SDR ou suporte.

Conduza a criação de forma conversacional e curta. Colete apenas o que faltar: nome, categoria, descrição, preço, SKU/variações, estoque e imagem.

Responda sempre em texto simples, natural e limpo. Não use Markdown, asteriscos, títulos com **, listas com marcadores ou qualquer outra formatação técnica na mensagem exibida ao usuário. Nunca mostre tags, JSON ou instruções internas na resposta visível ao usuário.
O usuário pode escolher a imagem: usar a foto enviada, usar uma URL já existente, gerar uma nova imagem ou usar a foto como referência. Se a opção de gerar imagem for escolhida, explique que o agente precisa de um provedor de imagem configurado no ADM; não invente uma imagem nem diga que gerou se não gerou.

No final, quando houver dados suficientes, devolva também um bloco JSON válido entre <CATALOG_DRAFT> e </CATALOG_DRAFT> com: {"name":string,"description":string,"category":string|null,"price_cents":number,"sku":string|null,"stock":number|null,"image_url":string|null}. Fora do bloco JSON, responda normalmente em pt-BR.

Empresa: ${company.name}. Categorias existentes: ${(categories ?? []).map((c) => c.name).join(", ") || "nenhuma"}.`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: any }> = [{ role: "system", content: system }];
    if (data.imageUrl) messages.push({ role: "system", content: `Imagem fornecida pelo usuário para este produto: ${data.imageUrl}` });
    if (data.imageUrl) {
      const last = data.messages[data.messages.length - 1];
      messages.push(...data.messages.slice(0, -1));
      messages.push({ role: last.role, content: [{ type: "text", text: last.content }, { type: "image_url", image_url: { url: data.imageUrl } }] });
    } else {
      messages.push(...data.messages);
    }

    const lastMessage = data.messages[data.messages.length - 1]?.content ?? "";

    // A IA Catálogo conversa usando a IA configurada no próprio APP.
    // O n8n não é usado para responder a conversa do Catálogo.
    const nexusReply = await nexusChat(messages, {
      temperature: 0.35,
      max_tokens: 2200,
    });

    const replyText = String(nexusReply ?? "").trim();

    if (!replyText) {
      throw new Error("A IA do Catálogo não retornou uma resposta.");
    }

    const draftMatch = replyText.match(
      /<CATALOG_DRAFT>\s*([\s\S]*?)\s*<\/CATALOG_DRAFT>/i
    );

    let draft: any = null;

    if (draftMatch) {
      try {
        draft = JSON.parse(draftMatch[1]);
      } catch {
        draft = null;
      }
    }

    /*
     * A IA Catálogo só encaminha para a IA Designer quando,
     * dentro do contexto da conversa, houver autorização explícita.
     *
     * A marca é interna e nunca aparece para o usuário.
     */
    const designerMatch = replyText.match(
      /<DESIGNER_REQUEST>\s*([\s\S]*?)\s*<\/DESIGNER_REQUEST>/i
    );

    let designerRequest: {
      brief: string;
      product: string;
      referenceImageUrl: string | null;
    } | null = null;

    if (designerMatch) {
      try {
        const parsed = JSON.parse(designerMatch[1]);

        designerRequest = {
          brief: String(parsed?.brief ?? "").trim(),
          product: String(
            parsed?.product ??
            draft?.name ??
            "Produto do catálogo"
          ).trim(),
          referenceImageUrl:
            typeof parsed?.referenceImageUrl === "string"
              ? parsed.referenceImageUrl
              : data.imageUrl ?? null,
        };
      } catch {
        designerRequest = null;
      }
    }

    /*
     * Somente aqui a IA Catálogo chama a IA Designer.
     * O módulo enviado é "designer", nunca "catalogo".
     *
     * A Designer é quem segue para o fluxo/executor existente.
     */
    let designer: Record<string, unknown> | null = null;

    if (designerRequest) {
      const designerResult = await callN8nChat({
        userId,
        companyId: company.id,
        companyName: company.name,
        conversationId: `catalog:${userId}`,
        moduleCode: "designer",
        message: designerRequest.brief,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              product: designerRequest.product,
              brief: designerRequest.brief,
              referenceImageUrl: designerRequest.referenceImageUrl,
              catalogDraft: draft,
            }),
          },
        ],
        systemPrompt:
          "Você é a IA Designer. Receba o pedido encaminhado pela IA Catálogo, prepare a produção visual e encaminhe a produção pelo fluxo existente. Você é a única IA responsável por acionar a produção. Não responda como IA Catálogo e não altere o pedido do cliente.",
        temperature: 0.35,
        maxTokens: 2200,
        imageUrl: designerRequest.referenceImageUrl,
        isAdmin: false,
      });

      designer = designerResult as Record<string, unknown> | null;
    }

    const cleanReply = replyText
      .replace(
        /<DESIGNER_REQUEST>[\s\S]*?<\/DESIGNER_REQUEST>/i,
        ""
      )
      .replace(
        /<CATALOG_DRAFT>[\s\S]*?<\/CATALOG_DRAFT>/i,
        ""
      )
      // O cliente recebe texto limpo, sem marcação Markdown.
      .replace(/\\*\\*/g, "")
      .replace(/^\\s*[-•]\\s*/gm, "")
      .replace(/\\n{3,}/g, "\\n\\n")
      .trim();

    const designerData = designer ?? {};

    const jobId =
      typeof designerData.jobId === "string"
        ? designerData.jobId
        : null;

    const producedImageUrl =
      typeof designerData.imageUrl === "string"
        ? designerData.imageUrl
        : typeof designerData.image_url === "string"
          ? designerData.image_url
          : null;

    return {
      reply: cleanReply,
      draft,
      needsDesigner: !!designerRequest,
      jobId,
      result: designerData.result ?? null,
      imageUrl: producedImageUrl,
      execution: designerData.execution ?? null,
    };
  });
