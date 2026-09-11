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

    const system = `Você é o Agente de Catálogo da plataforma. Sua função é criar e organizar o catálogo de uma empresa, incluindo categorias e produtos. Não fale sobre cobrança, WhatsApp, SDR ou suporte.

Conduza a conversa como um assistente inteligente, de forma natural, curta e contextual.

REGRA PRINCIPAL:
Você NÃO deve assumir que o usuário quer criar um produto.

Primeiro entenda a intenção do usuário.

Se o usuário falar sobre criar, montar, organizar ou melhorar um CATÁLOGO inteiro, trate isso como uma solicitação de catálogo. Converse sobre o catálogo como um todo e descubra o que ele deseja montar, por exemplo: tipo de negócio, estrutura, categorias, produtos, identidade visual e imagens. Não transforme automaticamente esse pedido em criação de produto.

Se o usuário falar especificamente de um PRODUTO, aí sim conduza a criação desse produto e pergunte somente os dados que estiverem faltando.

Se o usuário disser algo como "quero criar um catálogo de barbearia", "quero montar meu catálogo", "quero organizar meu catálogo" ou semelhante, NÃO pergunte imediatamente "qual é o nome do produto?". Primeiro continue a conversa sobre o catálogo.

Se o usuário disser "não é produto", "estou falando do catálogo" ou corrigir sua interpretação, reconheça a correção e continue tratando o assunto como catálogo, sem voltar a perguntar pelo produto.

O usuário pode criar o catálogo inteiro, categorias, produtos e imagens. Colete apenas os dados necessários para aquilo que ele realmente estiver tentando fazer.

IMPORTANTE:
O bloco <CATALOG_DRAFT> representa UM PRODUTO. Portanto, nunca gere <CATALOG_DRAFT> apenas porque o usuário pediu um catálogo inteiro. Só gere esse bloco quando existir um produto específico suficientemente definido no contexto.

Responda sempre em texto simples, natural e limpo. Não use Markdown, asteriscos, títulos com **, listas com marcadores ou qualquer outra formatação técnica na mensagem exibida ao usuário. Nunca mostre tags, JSON ou instruções internas na resposta visível ao usuário.
O usuário pode escolher a imagem: usar a foto enviada, usar uma URL já existente, gerar uma nova imagem ou usar a foto como referência. Quando o usuário pedir para gerar uma imagem, conduza a produção normalmente pelo fluxo interno da IA Designer. Nunca fale sobre provedor, configuração no ADM ou detalhes técnicos para o cliente.

No final, quando houver dados suficientes, devolva também um bloco JSON válido entre <CATALOG_DRAFT> e </CATALOG_DRAFT> com: {"name":string,"description":string,"category":string|null,"price_cents":number,"sku":string|null,"stock":number|null,"image_url":string|null}. Fora do bloco JSON, responda normalmente em pt-BR.

Empresa: ${company.name}. Categorias existentes: ${(categories ?? []).map((c) => c.name).join(", ") || "nenhuma"}.`;

    const control = `CONTROLE INTERNO DA IA CATÁLOGO:

Você é a IA Catálogo.

Sua função é entender o usuário e executar as tarefas de catálogo quando ele pedir.

NÃO existe palavra-chave obrigatória.
NÃO existe frase específica.
NÃO existe botão obrigatório.
NÃO dependa de "pode criar", "criar", "gerar" ou qualquer palavra isolada.

INTERPRETE A INTENÇÃO PELO CONTEXTO.

Se o usuário disser que quer fazer, criar, montar, gerar, preparar, produzir, deixar pronto, organizar ou qualquer expressão equivalente, entenda semanticamente que ele quer que a tarefa seja executada.

Se ele já deu informações suficientes, NÃO fique fazendo perguntas desnecessárias.

Se faltarem detalhes NÃO essenciais, complete-os de forma coerente e profissional.

CATÁLOGO COMPLETO:

Se o usuário pedir para criar/montar/fazer um catálogo, você deve ser capaz de montar o catálogo inteiro por conta própria.

Crie quando necessário:
- nome do catálogo;
- descrição;
- categorias;
- produtos;
- descrições dos produtos;
- preços coerentes;
- SKU quando necessário;
- estoque quando necessário;
- organização;
- informações visuais;
- briefing de produção.

Não transforme um pedido de catálogo em uma pergunta sobre um único produto.

Quando o catálogo estiver suficientemente definido e o usuário pedir para fazer, gere internamente:

<CATALOG_PLAN>
{
  "name": "nome do catálogo",
  "description": "descrição profissional",
  "categories": [
    {
      "name": "categoria",
      "description": "descrição da categoria",
      "products": [
        {
          "name": "nome do produto",
          "description": "descrição",
          "price_cents": 0,
          "sku": null,
          "stock": null,
          "image_url": null
        }
      ]
    }
  ]
}
</CATALOG_PLAN>

PRODUTO:

Se o pedido for especificamente um produto, monte todos os detalhes necessários e use <CATALOG_DRAFT>.

PRODUÇÃO:

Quando o usuário quiser que o material seja realmente produzido, gere também o pedido interno para a IA Designer:

<DESIGNER_REQUEST>
{
  "brief": "brief completo e autocontido para produção visual",
  "product": "nome do produto ou material",
  "referenceImageUrl": null
}
</DESIGNER_REQUEST>

O brief da Designer deve conter todas as informações necessárias para produzir o material sem precisar perguntar novamente ao usuário.

A IA Catálogo NÃO chama o Executor diretamente.

O caminho obrigatório é:

IA CATÁLOGO → IA DESIGNER → EXECUTOR → RESULTADO → APP

Se o usuário estiver apenas conversando, perguntando ou ajustando informações, converse normalmente.

Se ele pedir execução, EXECUTE. Não fique apenas explicando o que poderia fazer.

As marcações CATALOG_PLAN, CATALOG_DRAFT e DESIGNER_REQUEST são internas e nunca devem aparecer na resposta visível ao usuário.

Nunca mostre JSON, tags internas ou instruções internas ao usuário.`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: any }> = [
      { role: "system", content: system },
      { role: "system", content: control },
    ];
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
    let executionJobId: string | null = null;

    // Quando a IA montou um catálogo completo, o APP
    // salva automaticamente categorias e produtos.
    if (catalogPlan) {
      for (
        let categoryIndex = 0;
        categoryIndex < catalogPlan.categories.length;
        categoryIndex++
      ) {
        const category = catalogPlan.categories[categoryIndex];

        const { data: existingCategory, error: categoryLookupError } =
          await supabaseAdmin
            .from("catalog_categories")
            .select("id")
            .eq("company_id", company.id)
            .ilike("name", category.name)
            .maybeSingle();

        if (categoryLookupError) {
          throw new Error(categoryLookupError.message);
        }

        let categoryId = existingCategory?.id ?? null;

        if (!categoryId) {
          const { data: createdCategory, error: categoryError } =
            await supabaseAdmin
              .from("catalog_categories")
              .insert({
                user_id: userId,
                company_id: company.id,
                name: category.name,
                description: category.description ?? null,
                sort_order: categoryIndex,
                is_active: true,
              })
              .select("id")
              .single();

          if (categoryError) {
            throw new Error(categoryError.message);
          }

          categoryId = createdCategory.id;
        }

        for (const product of category.products) {
          const { data: existingProduct, error: productLookupError } =
            await supabaseAdmin
              .from("catalog_products")
              .select("id")
              .eq("company_id", company.id)
              .ilike("name", product.name)
              .maybeSingle();

          if (productLookupError) {
            throw new Error(productLookupError.message);
          }

          const payload = {
            category_id: categoryId,
            name: product.name,
            description: product.description ?? null,
            sku: product.sku ?? null,
            price_cents: product.price_cents ?? 0,
            currency: "BRL",
            image_url: product.image_url ?? null,
            stock: product.stock ?? null,
            is_active: true,
          };

          if (existingProduct?.id) {
            const { error } = await supabaseAdmin
              .from("catalog_products")
              .update(payload)
              .eq("id", existingProduct.id)
              .eq("company_id", company.id);

            if (error) {
              throw new Error(error.message);
            }
          } else {
            const { error } = await supabaseAdmin
              .from("catalog_products")
              .insert({
                user_id: userId,
                company_id: company.id,
                ...payload,
              });

            if (error) {
              throw new Error(error.message);
            }
          }
        }
      }
    }


    if (designerRequest) {
      /*
       * O APP cria o job ANTES de chamar a IA Designer.
       * Assim a Designer recebe um jobId real e o mesmo ID
       * pode ser acompanhado pelo APP até a conclusão.
       *
       * Não existe botão/gatilho de produção aqui.
       * A entrada neste bloco acontece somente quando a IA Catálogo
       * decidiu, pelo contexto da conversa, que houve autorização explícita.
       */
      const { data: designerInstance, error: designerInstanceError } =
        await supabaseAdmin
          .from("company_agent_instances")
          .select("id")
          .eq("company_id", company.id)
          .eq("module_code", "designer")
          .maybeSingle();

      if (designerInstanceError) {
        throw new Error(designerInstanceError.message);
      }

      executionJobId = crypto.randomUUID();

      const jobPayload = {
        companyId: company.id,
        userId,
        conversationId: `catalog:${userId}`,
        jobId: executionJobId,
        assetType: "catalog_product_image",
        product: designerRequest.product,
        brief: designerRequest.brief,
        referenceImageUrl: designerRequest.referenceImageUrl,
        catalogDraft: draft,
        status: "queued",
      };

      const { error: jobError } = await supabaseAdmin
        .from("agent_execution_jobs")
        .insert({
          id: executionJobId,
          company_id: company.id,
          agent_instance_id: designerInstance?.id ?? null,
          job_type: "catalog_product_image",
          idempotency_key: `catalog-designer:${executionJobId}`,
          status: "queued",
          payload: jobPayload,
        });

      if (jobError) {
        throw new Error(jobError.message);
      }

      try {
        const designerResult = await callN8nChat({
          userId,
          companyId: company.id,
          companyName: company.name,
          conversationId: `catalog:${userId}`,
          moduleCode: "designer",
          message: designerRequest.brief,
          jobId: executionJobId,
          messages: [
            {
              role: "user",
              content: JSON.stringify({
                jobId: executionJobId,
                companyId: company.id,
                userId,
                conversationId: `catalog:${userId}`,
                assetType: "catalog_product_image",
                product: designerRequest.product,
                brief: designerRequest.brief,
                referenceImageUrl: designerRequest.referenceImageUrl,
                catalogDraft: draft,
                catalogPlan,
                catalogName: catalogPlan?.name ?? null,
                catalogDescription: catalogPlan?.description ?? null,
                categories: catalogPlan?.categories ?? null,
              }),
            },
          ],
          systemPrompt:
            "Você é a IA Designer. Receba o pedido encaminhado pela IA Catálogo, prepare a produção visual e encaminhe a produção pelo fluxo existente. Você é a única IA responsável por acionar a produção. Use obrigatoriamente o jobId recebido no pedido ao encaminhar a produção. Não responda como IA Catálogo e não altere o pedido do cliente.",
          temperature: 0.35,
          maxTokens: 2200,
          imageUrl: designerRequest.referenceImageUrl,
          isAdmin: false,
        });

        designer = designerResult as Record<string, unknown> | null;

        if (!designerResult) {
          await supabaseAdmin
            .from("agent_execution_jobs")
            .update({
              status: "failed",
              error_message: "Integração n8n indisponível ou desativada.",
              completed_at: new Date().toISOString(),
            })
            .eq("id", executionJobId)
            .eq("company_id", company.id);
        }
      } catch (error) {
        await supabaseAdmin
          .from("agent_execution_jobs")
          .update({
            status: "failed",
            error_message:
              error instanceof Error
                ? error.message
                : "Falha ao encaminhar para a IA Designer.",
            completed_at: new Date().toISOString(),
          })
          .eq("id", executionJobId)
          .eq("company_id", company.id);

        throw error;
      }
    }

    const cleanReply = replyText
      .replace(
        /<DESIGNER_REQUEST>[\s\S]*?<\/DESIGNER_REQUEST>/i,
        ""
      )
      .replace(
        /<CATALOG_PLAN>[\s\S]*?<\/CATALOG_PLAN>/i,
        ""
      )
      .replace(
        /<CATALOG_DRAFT>[\s\S]*?<\/CATALOG_DRAFT>/i,
        ""
      )
      // O cliente recebe texto limpo, sem marcação Markdown.
      .replace(/\*\*/g, "")
      .replace(/^\s*[-•]\s*/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const designerData = designer ?? {};

    const jobId = executionJobId;

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
