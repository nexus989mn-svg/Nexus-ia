import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function ensureAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const adminListCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);

    const [{ data: profiles, error: pErr }, { data: subs, error: sErr }, { data: plans, error: plErr }, { data: adminRoles, error: aErr }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, user_id, email, full_name, company, created_at")
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("subscriptions")
          .select("user_id, status, current_period_end, plan_id"),
        supabaseAdmin.from("plans").select("id, name, code"),
        supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin"),
      ]);
    if (pErr) throw new Error(pErr.message);
    if (sErr) throw new Error(sErr.message);
    if (plErr) throw new Error(plErr.message);
    if (aErr) throw new Error(aErr.message);

    const adminIds = new Set((adminRoles ?? []).map((r) => r.user_id));
    const planById = new Map((plans ?? []).map((p) => [p.id, p]));
    const subByUser = new Map(
      (subs ?? []).map((s) => [
        s.user_id,
        {
          status: s.status,
          current_period_end: s.current_period_end,
          plan: s.plan_id ? planById.get(s.plan_id) ?? null : null,
        },
      ]),
    );

    const customers = (profiles ?? []).filter((p) => !adminIds.has(p.user_id)).map((p) => ({
      ...p,
      subscription: subByUser.get(p.user_id) ?? null,
    }));

    return { customers };
  });

export const adminSetSubscriptionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        status: z.enum(["trial", "active", "expired", "blocked", "canceled"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.userId);

    const updates: {
      status: typeof data.status;
      current_period_end?: string;
      blocked_reason?: string | null;
    } = { status: data.status };
    if (data.status === "active") {
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      updates.current_period_end = end.toISOString();
      updates.blocked_reason = null;
    }
    if (data.status === "blocked") {
      updates.blocked_reason = "Blocked by admin";
    }

    await supabaseAdmin.from("subscriptions").update(updates).eq("user_id", data.targetUserId);
    await supabaseAdmin.from("system_logs").insert({
      user_id: data.targetUserId,
      source: "admin",
      event: `subscription.${data.status}.manual`,
      severity: "info",
      metadata: { by: context.userId },
    });
    return { ok: true };
  });

export const adminListLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("system_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { logs: data ?? [] };
  });

export const adminExpireOverdue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data, error } = await supabaseAdmin.rpc("expire_overdue_subscriptions");
    if (error) throw new Error(error.message);
    return { expired: data ?? 0 };
  });

export const adminExecutiveStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const [{ data: subs }, { data: plans }, { data: profiles }, { data: adminRoles }] =
      await Promise.all([
        supabaseAdmin.from("subscriptions").select("user_id, status, plan_id, current_period_end, created_at"),
        supabaseAdmin.from("plans").select("id, code, price_usd_cents, interval"),
        supabaseAdmin.from("profiles").select("id, user_id, created_at"),
        supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin"),
      ]);

    const adminIds = new Set((adminRoles ?? []).map((r) => r.user_id));
    const customerProfiles = (profiles ?? []).filter((p) => !adminIds.has(p.user_id));
    const customerCount = customerProfiles.length;
    const recentSignups = customerProfiles.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 30);

    const planMap = new Map((plans ?? []).map((p) => [p.id, p]));
    const byStatus: Record<string, number> = {};
    let mrrCents = 0;
    let arrCents = 0;
    for (const s of (subs ?? []).filter((s) => !adminIds.has(s.user_id))) {
      byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
      if (s.status === "active" && s.plan_id) {
        const pl = planMap.get(s.plan_id);
        if (pl?.interval === "monthly") mrrCents += pl.price_usd_cents;
        if (pl?.interval === "yearly") {
          arrCents += pl.price_usd_cents;
          mrrCents += Math.round(pl.price_usd_cents / 12);
        }
      }
    }

    // last 14 days signup chart
    const days: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = (recentSignups ?? []).filter((r) => r.created_at?.slice(0, 10) === key).length;
      days.push({ date: key, count });
    }

    return {
      customers: customerCount ?? 0,
      byStatus,
      mrrUsd: mrrCents / 100,
      arrUsd: (arrCents + mrrCents * 12) / 100,
      activeSubs: byStatus.active ?? 0,
      trialSubs: byStatus.trial ?? 0,
      canceledSubs: byStatus.canceled ?? 0,
      blockedSubs: (byStatus.blocked ?? 0) + (byStatus.expired ?? 0),
      signupSeries: days,
    };
  });

export const adminListPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data, error } = await supabaseAdmin.from("plans").select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return { plans: data ?? [] };
  });

export const adminUpdatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().min(1).max(80).optional(),
        price_usd_cents: z.number().int().min(0).max(10000000).optional(),
        is_active: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.userId);
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("plans").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("system_logs").insert({
      user_id: context.userId,
      source: "admin",
      event: "plan.updated",
      severity: "info",
      metadata: { id, patch },
    });
    return { ok: true };
  });

export const adminListBillingEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("billing_events")
      .select("*")
      .order("processed_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { events: data ?? [] };
  });

export const adminListCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const [{ data: companies, error: cErr }, { data: profiles }, { data: subs }, { data: plans }] =
      await Promise.all([
        supabaseAdmin
          .from("companies")
          .select("id, name, document, phone, email, owner_user_id, created_at, timezone, logo_url")
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("profiles").select("user_id, email, full_name"),
        supabaseAdmin.from("subscriptions").select("user_id, status, plan_id, current_period_end"),
        supabaseAdmin.from("plans").select("id, name, code"),
      ]);
    if (cErr) throw new Error(cErr.message);
    const profByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    const planById = new Map((plans ?? []).map((p) => [p.id, p]));
    const subByUser = new Map((subs ?? []).map((s) => [s.user_id, s]));
    const rows = (companies ?? []).map((c) => {
      const sub = subByUser.get(c.owner_user_id);
      return {
        ...c,
        owner: profByUser.get(c.owner_user_id) ?? null,
        subscription: sub
          ? {
              status: sub.status,
              current_period_end: sub.current_period_end,
              plan: sub.plan_id ? planById.get(sub.plan_id) ?? null : null,
            }
          : null,
      };
    });
    return { companies: rows };
  });



export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabaseAdmin.from("profiles").select("user_id,email,full_name,company,created_at,updated_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id,role,created_at"),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (rErr) throw new Error(rErr.message);
    const roleByUser = new Map<string, string>((roles ?? []).map((r) => [r.user_id, r.role]));
    return { users: (profiles ?? []).map((p) => ({ ...p, role: roleByUser.get(p.user_id) ?? "customer" })) };
  });

export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ targetUserId: z.string().uuid(), role: z.enum(["admin", "customer"]) }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.userId);
    if (data.targetUserId === context.userId && data.role !== "admin") {
      throw new Error("Você não pode remover sua própria permissão de administrador.");
    }
    if (data.role === "customer") {
      const { count, error } = await supabaseAdmin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin");
      if (error) throw new Error(error.message);
      if ((count ?? 0) <= 1) throw new Error("O sistema precisa manter pelo menos um administrador.");
    }
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.targetUserId);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.targetUserId, role: data.role });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("system_logs").insert({
      user_id: data.targetUserId,
      source: "admin",
      event: `user.role.${data.role}`,
      severity: "info",
      metadata: { by: context.userId },
    });
    return { ok: true };
  });
