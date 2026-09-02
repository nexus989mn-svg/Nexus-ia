import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getAgentRuntimeContext(companyId: string, channel: string, remoteConversationId: string) {
  const { data, error } = await (supabaseAdmin as any).rpc("get_agent_context", {
    p_company_id: companyId,
    p_channel: channel,
    p_remote_conversation_id: remoteConversationId,
  });
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, any>;
}

export async function recordAgentTurn(args: {
  companyId: string;
  channel: string;
  remoteConversationId: string;
  role: "user" | "assistant";
  summary?: string;
  currentTopic?: string | null;
  currentGoal?: string | null;
  pendingQuestion?: string | null;
  lastIntent?: string | null;
  intentConfidence?: number | null;
  awaitingUser?: boolean;
  customerFacts?: Record<string, unknown>;
  commitments?: unknown[];
  decisions?: unknown[];
  openItems?: unknown[];
}) {
  const { error } = await (supabaseAdmin as any).rpc("record_agent_turn", {
    p_company_id: args.companyId,
    p_channel: args.channel,
    p_remote_conversation_id: args.remoteConversationId,
    p_role: args.role,
    p_summary: args.summary ?? null,
    p_current_topic: args.currentTopic ?? null,
    p_current_goal: args.currentGoal ?? null,
    p_pending_question: args.pendingQuestion ?? null,
    p_last_intent: args.lastIntent ?? null,
    p_intent_confidence: args.intentConfidence ?? null,
    p_awaiting_user: args.awaitingUser ?? false,
    p_customer_facts: args.customerFacts ?? {},
    p_commitments: args.commitments ?? [],
    p_decisions: args.decisions ?? [],
    p_open_items: args.openItems ?? [],
  });
  if (error) throw new Error(error.message);
}
