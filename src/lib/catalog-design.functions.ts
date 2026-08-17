import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireActiveSubscription } from "@/lib/security.server";

const input = z.object({
  brief: z.string().max(12000).default(""),
  references: z.array(z.string().url()).max(20).default([]),
});

async function getCompanyId(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Empresa não encontrada.");
  return data.id as string;
}



const imageJobInput = z.object({
  productName: z.string().min(1).max(200),
  productDescription: z.string().max(2000).optional().default(""),
  styleBrief: z.string().max(6000).optional().default(""),
  referenceImageUrl: z.string().url().nullable().optional(),
  referenceUrls: z.array(z.string().url()).max(10).default([]),
});

export const createCatalogProductImageJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => imageJobInput.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await requireActiveSubscription(context.userId);
    const companyId = await getCompanyId(context.userId);

    const { data: designer, error: designerError } = await supabaseAdmin
      .from("company_agent_instances")
      .select("id")
      .eq("company_id", companyId)
      .eq("module_code", "designer")
      .maybeSingle();
    if (designerError) throw new Error(designerError.message);

    const idempotency = `catalog-image:${companyId}:${crypto.randomUUID()}`;
    const { data: job, error } = await supabaseAdmin
      .from("agent_execution_jobs")
      .insert({
        company_id: companyId,
        agent_instance_id: designer?.id ?? null,
        job_type: "catalog_product_image",
        idempotency_key: idempotency,
        priority: 90,
        payload: {
          companyId,
          requestedBy: context.userId,
          productName: data.productName,
          productDescription: data.productDescription,
          styleBrief: data.styleBrief,
          referenceImageUrl: data.referenceImageUrl ?? null,
          referenceUrls: data.referenceUrls,
          output: { target: "canva", type: "product_image" },
        },
      })
      .select("id,status,created_at")
      .single();

    if (error) throw new Error(error.message);
    return { job };
  });

export const createCatalogDesignJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => input.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await requireActiveSubscription(context.userId);
    const companyId = await getCompanyId(context.userId);

    const [{ data: categories, error: catError }, { data: products, error: prodError }] = await Promise.all([
      supabaseAdmin.from("catalog_categories").select("id,name,description,sort_order,is_active").eq("company_id", companyId).order("sort_order"),
      supabaseAdmin.from("catalog_products").select("id,category_id,name,description,sku,price_cents,currency,image_url,stock,is_active").eq("company_id", companyId).eq("is_active", true).order("created_at", { ascending: true }),
    ]);
    if (catError) throw new Error(catError.message);
    if (prodError) throw new Error(prodError.message);
    if (!products?.length) throw new Error("Adicione pelo menos um produto antes de criar o catálogo.");

    const payload = {
      companyId,
      requestedBy: context.userId,
      brief: data.brief.trim(),
      references: data.references,
      categories: categories ?? [],
      products: products ?? [],
      output: { target: "canva", type: "professional_catalog" },
    };

    const idempotency = `catalog-design:${companyId}:${crypto.randomUUID()}`;
    const { data: job, error } = await supabaseAdmin
      .from("catalog_design_jobs")
      .insert({
        company_id: companyId,
        requested_by: context.userId,
        status: "queued",
        brief: payload,
        reference_urls: data.references,
      })
      .select("id,status,created_at")
      .single();
    if (error) throw new Error(error.message);

    // Create the durable worker job now; n8n/Canva workers will consume it later.
    const { data: designer, error: designerError } = await supabaseAdmin
      .from("company_agent_instances")
      .select("id")
      .eq("company_id", companyId)
      .eq("module_code", "designer")
      .maybeSingle();
    if (designerError) throw new Error(designerError.message);

    const { error: jobError } = await supabaseAdmin.from("agent_execution_jobs").insert({
      company_id: companyId,
      agent_instance_id: designer?.id ?? null,
      job_type: "catalog_design",
      idempotency_key: idempotency,
      priority: 80,
      payload: { catalogDesignJobId: job.id, ...payload },
    });
    if (jobError) throw new Error(jobError.message);

    return { job };
  });
