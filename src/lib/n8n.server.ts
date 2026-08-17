import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type N8nChatPayload = {
  userId: string;
  companyId: string;
  companyName?: string | null;
  conversationId: string;
  moduleCode: string;
  message: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  customPrompt?: string;
  isAdmin?: boolean;
};

export async function callN8nChat(payload: N8nChatPayload) {
  const { data: integration, error } = await supabaseAdmin
    .from("integration_credentials")
    .select("base_url, api_key, config, is_enabled")
    .eq("provider", "n8n")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!integration?.is_enabled || !integration.base_url) return null;

  const config = (integration.config ?? {}) as Record<string, unknown>;
  const path = String(config.webhook_path ?? "/webhook/nexus-chat").replace(/^\//, "");
  const url = `${String(integration.base_url).replace(/\/$/, "")}/${path}`;
  const secret = String(config.webhook_secret ?? "");
  const headers: Record<string,string> = { "Content-Type": "application/json" };
  if (integration.api_key) headers.Authorization = `Bearer ${integration.api_key}`;
  if (secret) headers["x-nexus-webhook-secret"] = secret;

  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`n8n HTTP ${response.status}`);
  const data = await response.json() as { output?: string; conversationId?: string; agent?: string; error?: string };
  return data;
}
