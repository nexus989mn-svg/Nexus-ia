import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { emitOperationalEvent } from "@/lib/ops.server";

function stripeKey() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("Stripe não configurado no servidor.");
  return key;
}
function appUrl() {
  return (process.env.APP_URL || process.env.PUBLIC_APP_URL || "http://localhost:8080").replace(/\/$/, "");
}
const ADMIN_EMAIL = "nexus989mn@gmail.com";
function normalizeEmail(email: string | null | undefined) { return (email ?? "").trim().toLowerCase(); }
async function isAdminUser(userId: string) {
  const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (role) return true;

  // Recovery path for the platform owner: the admin account must not depend
  // on having a customer subscription row. The database role remains the
  // primary authorization mechanism; the fixed owner email is only a
  // resilience fallback for deployments where the role seed is missing.
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    return !error && normalizeEmail(data.user?.email) === ADMIN_EMAIL;
  } catch {
    return false;
  }
}
async function getTrialEligibility(userId: string) {
  const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !authUser.user) throw new Error("Usuário não encontrado.");
  const email = normalizeEmail(authUser.user.email);
  const { data: wa } = await supabaseAdmin.from("whatsapp_connections").select("phone_e164,status").eq("user_id", userId).maybeSingle();
  const phone = wa?.status === "connected" ? (wa.phone_e164?.trim() || null) : null;
  const { data: emailClaim } = await supabaseAdmin.from("trial_claims").select("id,user_id").eq("email_normalized", email).maybeSingle();
  const { data: phoneClaim } = phone ? await supabaseAdmin.from("trial_claims").select("id,user_id").eq("phone_e164", phone).maybeSingle() : { data: null };
  return { eligible: !!phone && !emailClaim && !phoneClaim, email, phone, emailClaim, phoneClaim, reason: !phone ? "whatsapp_required" : emailClaim || phoneClaim ? "already_used" : null };
}

export const getMySubscription = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { userId } = context;
  const admin = await isAdminUser(userId);

  // The administrative account is a platform operator, not a paying customer.
  // Resolve this BEFORE touching the customer subscription table so a billing
  // schema/state problem can never make the admin appear as "Desconhecido".
  if (admin) {
    return {
      subscription: {
        status: "active" as const,
        current_period_end: null,
        blocked_reason: null,
        plan: { code: "admin", name: "Acesso administrativo", interval: null, features: [] },
      },
      hasAccess: true,
      isAdmin: true,
      mockMode: false,
      trialAvailable: false,
      trialBlockedReason: "admin",
    };
  }

  const { error: expireError } = await supabaseAdmin
    .from("subscriptions")
    .update({ status: "expired", blocked_reason: "Subscription period ended" })
    .eq("user_id", userId)
    .in("status", ["trial", "active"])
    .lt("current_period_end", new Date().toISOString());
  if (expireError) throw new Error(`Não foi possível atualizar a assinatura: ${expireError.message}`);

  const { data: sub, error: subError } = await supabaseAdmin
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .eq("user_id", userId)
    .maybeSingle();
  if (subError) throw new Error(`Não foi possível carregar a assinatura: ${subError.message}`);
  const hasAccess = !!sub?.plan && ["trial","active"].includes(sub.status) && (!sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now());
  const trial = await getTrialEligibility(userId);
  const trialAvailable = !sub && !trial.emailClaim;
  return { subscription: sub, hasAccess, isAdmin: false, mockMode: false, trialAvailable, trialBlockedReason: trial.reason };
});

export const listPlans = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin.from("plans").select("*").eq("is_active", true).order("sort_order", { ascending:true });
  if (error) throw new Error(error.message);
  return { plans: data ?? [] };
});

export const createCheckout = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({ planCode:z.enum(["trial","monthly","yearly"]) }).parse(d)).handler(async ({ context, data }) => {
  const { userId } = context;
  const { data: plan, error } = await supabaseAdmin.from("plans").select("*").eq("code",data.planCode).single();
  if (error || !plan) throw new Error("Plano não encontrado.");

  if (data.planCode === "trial") {
    if (await isAdminUser(userId)) throw new Error("Trial não é aplicável à conta administrativa.");
    const eligibility = await getTrialEligibility(userId);
    if (!eligibility.phone) throw new Error("Conecte e valide seu número de WhatsApp antes de ativar o Trial.");
    if (!eligibility.eligible) {
      await supabaseAdmin.from("subscriptions").update({ status:"blocked", blocked_reason:"Tentativa de reutilização do Trial detectada" }).eq("user_id",userId);
      await emitOperationalEvent({eventType:"TRIAL_REUSE_BLOCKED",severity:"warning",userId,payload:{email_match:!!eligibility.emailClaim,phone_match:!!eligibility.phoneClaim}});
      throw new Error("O Trial já foi utilizado por este e-mail ou número de WhatsApp.");
    }
    const end = new Date(Date.now() + Math.max(Number(plan.trial_days || 7),7)*86400000);
    const { error: rpcError } = await supabaseAdmin.rpc("claim_trial", { p_user_id:userId, p_plan_id:plan.id, p_email:eligibility.email, p_phone:eligibility.phone, p_period_end:end.toISOString() });
    if (rpcError) {
      await supabaseAdmin.from("subscriptions").update({status:"blocked",blocked_reason:"Tentativa de reutilização do Trial detectada"}).eq("user_id",userId);
      await emitOperationalEvent({eventType:"TRIAL_REUSE_BLOCKED",severity:"warning",userId,payload:{error:rpcError.message}});
      throw new Error(rpcError.message.includes("WHATSAPP_REQUIRED") ? "Conecte o WhatsApp antes de ativar o Trial." : "O Trial já foi utilizado ou não pôde ser validado com segurança.");
    }
    await emitOperationalEvent({eventType:"TRIAL_ACTIVATED",severity:"info",userId,payload:{plan:data.planCode}});
    return { mock:false, url:"/billing?trial=activated" };
  }

  const key = stripeKey();
  const params = new URLSearchParams();
  params.set("mode","subscription");
  params.set("success_url",`${appUrl()}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url",`${appUrl()}/billing?checkout=cancelled`);
  params.set("line_items[0][price_data][currency]","usd");
  params.set("line_items[0][price_data][unit_amount]",String(plan.price_usd_cents));
  params.set("line_items[0][price_data][recurring][interval]",data.planCode === "yearly" ? "year" : "month");
  params.set("line_items[0][price_data][product_data][name]",plan.name);
  params.set("line_items[0][quantity]","1");
  params.set("client_reference_id",userId);
  params.set("metadata[user_id]",userId);
  params.set("metadata[plan_code]",data.planCode);
  params.set("subscription_data[metadata][user_id]",userId);
  params.set("subscription_data[metadata][plan_code]",data.planCode);
  const auth = Buffer.from(`${key}:`).toString("base64");
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{Authorization:`Basic ${auth}`,"Content-Type":"application/x-www-form-urlencoded"},body:params});
  const body:any = await r.json().catch(()=>null);
  if (!r.ok || !body?.url) throw new Error(body?.error?.message || `Stripe HTTP ${r.status}`);
  await emitOperationalEvent({eventType:"CHECKOUT_STARTED",severity:"info",userId,payload:{plan:data.planCode,session_id:body.id}});
  return { mock:false, url:body.url as string };
});

export const openCustomerPortal = createServerFn({ method:"POST" }).middleware([requireSupabaseAuth]).handler(async ({context}) => {
  const key = stripeKey();
  const { data: sub } = await supabaseAdmin.from("subscriptions").select("stripe_customer_id").eq("user_id",context.userId).maybeSingle();
  if (!sub?.stripe_customer_id) throw new Error("Nenhum cliente Stripe encontrado.");
  const params = new URLSearchParams({customer:sub.stripe_customer_id,return_url:`${appUrl()}/billing`});
  const auth = Buffer.from(`${key}:`).toString("base64");
  const r = await fetch("https://api.stripe.com/v1/billing_portal/sessions",{method:"POST",headers:{Authorization:`Basic ${auth}`,"Content-Type":"application/x-www-form-urlencoded"},body:params});
  const body:any = await r.json().catch(()=>null);
  if (!r.ok || !body?.url) throw new Error(body?.error?.message || `Stripe HTTP ${r.status}`);
  return {url:body.url as string};
});

export const cancelSubscription = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async ({context}) => {
  const key = stripeKey();
  const {data:sub}=await supabaseAdmin.from("subscriptions").select("stripe_subscription_id").eq("user_id",context.userId).maybeSingle();
  if (!sub?.stripe_subscription_id) throw new Error("Assinatura Stripe não encontrada.");
  const auth=Buffer.from(`${key}:`).toString("base64");
  const params=new URLSearchParams({"cancel_at_period_end":"true"});
  const r=await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(sub.stripe_subscription_id)}`,{method:"POST",headers:{Authorization:`Basic ${auth}`,"Content-Type":"application/x-www-form-urlencoded"},body:params});
  const body:any=await r.json().catch(()=>null);
  if(!r.ok) throw new Error(body?.error?.message||`Stripe HTTP ${r.status}`);
  await supabaseAdmin.from("subscriptions").update({cancel_at_period_end:true}).eq("user_id",context.userId);
  await emitOperationalEvent({eventType:"SUBSCRIPTION_CANCEL_SCHEDULED",severity:"info",userId:context.userId,payload:{subscription_id:sub.stripe_subscription_id}});
  return {ok:true};
});
