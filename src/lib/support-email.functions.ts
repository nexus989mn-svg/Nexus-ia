import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const emailInput = z.object({
  subject: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(10000),
});

export const createSupportEmailRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => emailInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as any;

    const { data: company, error: companyError } = await db
      .from("companies")
      .select("id, name")
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (companyError) throw new Error(companyError.message);
    if (!company?.id) throw new Error("Empresa não encontrada.");

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);

    const customerEmail = String(profile?.email ?? "").trim();
    if (!customerEmail) {
      throw new Error("Seu e-mail de cadastro não está disponível.");
    }

    const requestId = crypto.randomUUID();

    const { data: thread, error } = await db
      .from("support_email_threads")
      .insert({
        message_id: `panel:${requestId}`,
        thread_id: `panel:${requestId}`,
        customer_email: customerEmail,
        customer_name: String(profile?.full_name ?? company.name ?? "").trim() || null,
        subject: data.subject,
        body: data.message,
        status: "received",
        needs_human: false,
        metadata: {
          channel: "panel",
          request_id: requestId,
          company_name: company.name,
        },
        company_id: company.id,
        requester_user_id: userId,
      })
      .select("id, subject, status, received_at")
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, thread };
  });
