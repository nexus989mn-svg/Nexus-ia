import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function emitOperationalEvent(input: {
  eventType: string;
  severity?: "info" | "warning" | "error" | "critical";
  userId?: string | null;
  companyId?: string | null;
  payload?: Record<string, unknown>;
}) {
  const event = {
    event_type: input.eventType,
    severity: input.severity ?? "info",
    user_id: input.userId ?? null,
    company_id: input.companyId ?? null,
    payload: input.payload ?? {},
  };
  await supabaseAdmin.from("operational_events").insert(event);

  const { data: n8n } = await supabaseAdmin.from("integration_credentials")
    .select("base_url,api_key,config,is_enabled").eq("provider","n8n").maybeSingle();
  if (!n8n?.is_enabled || !n8n.base_url) return;
  const config = (n8n.config ?? {}) as Record<string, unknown>;
  const path = String(config.ops_webhook_path ?? "/webhook/nexus-ops").replace(/^\//, "");
  const secret = String(config.webhook_secret ?? "");
  const headers: Record<string,string> = { "Content-Type": "application/json" };
  if (n8n.api_key) headers.Authorization = `Bearer ${n8n.api_key}`;
  if (secret) headers["x-nexus-webhook-secret"] = secret;
  try {
    await fetch(`${String(n8n.base_url).replace(/\/$/, "")}/${path}`, {
      method: "POST", headers, body: JSON.stringify(event),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error("[ops] n8n notification failed", error);
  }
}
