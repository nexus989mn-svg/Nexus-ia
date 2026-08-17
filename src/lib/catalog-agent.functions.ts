import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
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

    const reply = await nexusChat(messages, { temperature: 0.35, max_tokens: 2200 });
    const match = reply.match(/<CATALOG_DRAFT>\s*([\s\S]*?)\s*<\/CATALOG_DRAFT>/i);
    let draft: any = null;
    if (match) {
      try { draft = JSON.parse(match[1]); } catch { draft = null; }
    }
    return { reply: reply.replace(/<CATALOG_DRAFT>[\s\S]*?<\/CATALOG_DRAFT>/i, "").trim(), draft };
  });
