import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEFAULT_BASE_URL =
  "https://intelligent-ai-router.lovable.app/api/public/v1";

type NexusConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export async function getNexusConfig(): Promise<NexusConfig> {
  const { data, error } = await supabaseAdmin
    .from("integration_credentials")
    .select("api_key, base_url, is_enabled, config")
    .eq("provider", "nexus")
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao carregar Nexus: ${error.message}`);
  }

  const apiKey = data?.api_key?.trim() || process.env.NEXUS_API_KEY?.trim();

  const baseUrl = (
    data?.base_url?.trim() ||
    process.env.NEXUS_BASE_URL?.trim() ||
    DEFAULT_BASE_URL
  ).replace(/\/+$/, "");

  if (!apiKey) {
    throw new Error(
      "Nexus IA não configurada. Informe a API Key no painel ADM."
    );
  }

  if (data?.is_enabled === false) {
    throw new Error("Nexus IA está desativada no painel ADM.");
  }

  const config = (data?.config ?? {}) as Record<string, unknown>;

  const model =
    typeof config.model === "string" && config.model.trim()
      ? config.model.trim()
      : process.env.NEXUS_MODEL?.trim() || "nexus-auto";

  return {
    apiKey,
    baseUrl,
    model,
  };
}

/**
 * Testa a credencial Nexus sem gerar uma resposta de IA.
 * Usa o endpoint OpenAI-compatible /models.
 */
export async function testNexusConnection() {
  const { apiKey, baseUrl } = await getNexusConfig();

  const response = await fetch(`${baseUrl}/models`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  const text = await response.text();

  let body: any = null;

  try {
    body = JSON.parse(text);
  } catch {
    // resposta não JSON
  }

  if (!response.ok) {
    throw new Error(
      body?.error?.message ||
        body?.message ||
        `Nexus HTTP ${response.status}: ${text.slice(0, 300)}`
    );
  }

  return {
    ok: true,
    status: response.status,
    models: Array.isArray(body?.data)
      ? body.data.map((m: any) => m?.id).filter(Boolean)
      : [],
  };
}

export async function nexusChat(
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: any;
  }>,
  options?: {
    temperature?: number;
    max_tokens?: number;
  },
) {
  const { apiKey, baseUrl, model } = await getNexusConfig();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.4,
      max_tokens: options?.max_tokens ?? 1800,
    }),
  });

  const text = await response.text();

  let body: any = null;

  try {
    body = JSON.parse(text);
  } catch {
    // resposta não JSON
  }

  if (!response.ok) {
    throw new Error(
      body?.error?.message ||
        body?.message ||
        `Nexus HTTP ${response.status}: ${text.slice(0, 500)}`
    );
  }

  const content = body?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Nexus respondeu sem conteúdo.");
  }

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part: any) =>
        typeof part === "string"
          ? part
          : typeof part?.text === "string"
            ? part.text
            : ""
      )
      .join("")
      .trim();
  }

  return String(content);
}
