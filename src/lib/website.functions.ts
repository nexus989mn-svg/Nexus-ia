import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireActiveSubscription } from "@/lib/security.server";

const websiteInput = z.object({
  url: z
    .string()
    .trim()
    .url()
    .refine((value) => /^https?:\/\//i.test(value), "URL inválida"),
  isActive: z.boolean().default(true),
  usageMode: z.enum(["link", "booking", "both"]),
  linkMessage: z.string().max(5000).default(""),
  bookingInstructions: z.string().max(10000).default(""),
});

async function getCompanyId(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Empresa não encontrada.");

  return data.id;
}

async function getInstanceContext(userId: string) {
  const companyId = await getCompanyId(userId);

  const { data: connection, error } = await supabaseAdmin
    .from("whatsapp_connections")
    .select("company_id, instance_name, status")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!connection?.instance_name) {
    throw new Error("Nenhuma instância WhatsApp configurada.");
  }

  if (connection.company_id !== companyId) {
    throw new Error("Instância WhatsApp não pertence à empresa.");
  }

  return {
    companyId,
    instanceName: connection.instance_name,
  };
}

export const getMyWebsite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireActiveSubscription(context.userId);

    const { companyId, instanceName } = await getInstanceContext(
      context.userId,
    );

    const { data, error } = await context.supabase
      .from("company_websites")
      .select("*")
      .eq("company_id", companyId)
      .eq("instance_name", instanceName)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return {
      website: data,
    };
  });

export const saveMyWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => websiteInput.parse(data))
  .handler(async ({ context, data }) => {
    await requireActiveSubscription(context.userId);

    const { companyId, instanceName } = await getInstanceContext(
      context.userId,
    );

    const { data: saved, error } = await context.supabase
      .from("company_websites")
      .upsert(
        {
          company_id: companyId,
          instance_name: instanceName,
          url: data.url,
          is_active: data.isActive,
          usage_mode: data.usageMode,
          link_message: data.linkMessage,
          booking_instructions: data.bookingInstructions,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "company_id,instance_name",
        },
      )
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return {
      website: saved,
    };
  });
