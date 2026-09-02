import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function requireActiveSubscription(userId: string) {
  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (role) return { admin: true, status: "admin" as const };

  const { data: subscription, error } = await supabaseAdmin
    .from("subscriptions")
    .select("status, trial_ends_at, current_period_end, blocked_reason")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error("Não foi possível validar a assinatura.");

  const now = Date.now();
  const active = !!subscription &&
    ["active", "trial"].includes(subscription.status) &&
    (!subscription.current_period_end || new Date(subscription.current_period_end).getTime() > now) &&
    (subscription.status !== "trial" || !subscription.trial_ends_at || new Date(subscription.trial_ends_at).getTime() > now);

  if (!active) {
    throw new Error(subscription?.blocked_reason || "Assinatura inativa ou expirada.");
  }

  return { admin: false, status: subscription!.status as "trial" | "active" };
}
