import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const companyInput = z.object({
  name: z.string().min(1).max(120),
  document: z.string().max(40).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  email: z.string().email().max(160).nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  timezone: z.string().max(60).optional(),
  locale: z.string().max(10).optional(),
});

const profileInput = z.object({
  full_name: z.string().min(1).max(120),
  company: z.string().max(120).nullable().optional(),
});

export const getMyCompany = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("owner_user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    // Auto-create as fallback (caso o trigger não tenha rodado p/ usuário legado)
    if (!data) {
      const { data: created, error: cErr } = await supabase
        .from("companies")
        .insert({ owner_user_id: userId, name: "Minha empresa" })
        .select()
        .single();
      if (cErr) throw new Error(cErr.message);
      return { company: created };
    }
    return { company: data };
  });

export const updateMyCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => companyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("companies")
      .update({
        name: data.name,
        document: data.document ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        logo_url: data.logo_url ?? null,
        timezone: data.timezone ?? "America/Sao_Paulo",
        locale: data.locale ?? "pt-BR",
      })
      .eq("owner_user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { company: row };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { profile: data };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => profileInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: data.full_name, company: data.company ?? null })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

type BillingHistoryEvent = {
  id: string;
  processed_at: string | null;
  provider: string | null;
  event_type: string | null;
};

type BillingHistoryLog = {
  id: string;
  created_at: string | null;
  severity: string | null;
  event: string | null;
};

export const getBillingHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (companyError) throw new Error(companyError.message);

    if (!company?.id) {
      return {
        events: [] as BillingHistoryEvent[],
        logs: [] as BillingHistoryLog[],
      };
    }

    const companyId = company.id;

    const [{ data: events, error: eventsError }, { data: logs, error: logsError }] =
      await Promise.all([
        (supabaseAdmin as any)
          .from("billing_events")
          .select("id, processed_at, provider, event_type")
          .eq("company_id", companyId)
          .neq("event_type", "EFI_PIX_CREATED")
          .order("processed_at", { ascending: false })
          .limit(50),

        (supabaseAdmin as any)
          .from("system_logs")
          .select("id, created_at, severity, event")
          .eq("company_id", companyId)
          .like("event", "subscription.%")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    if (eventsError) throw new Error(eventsError.message);
    if (logsError) throw new Error(logsError.message);

    return {
      events: (events ?? []) as unknown as BillingHistoryEvent[],
      logs: (logs ?? []) as unknown as BillingHistoryLog[],
    };
  });
