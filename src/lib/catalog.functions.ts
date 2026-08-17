import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireActiveSubscription } from "@/lib/security.server";

const categoryInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
});

const productInput = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  sku: z.string().max(80).nullable().optional(),
  price_cents: z.number().int().min(0),
  currency: z.string().min(3).max(3).default("BRL"),
  image_url: z.string().url().nullable().optional(),
  stock: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().optional(),
});


async function ensureCatalogAccess(_supabase: any, userId: string) {
  await requireActiveSubscription(userId);
}

async function getCompanyId(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Empresa não encontrada para este usuário");
  return data.id as string;
}

export const listCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureCatalogAccess(supabase, userId);
    const companyId = await getCompanyId(supabase, userId);
    const [{ data: categories }, { data: products }] = await Promise.all([
      supabase.from("catalog_categories").select("*").eq("company_id", companyId).order("sort_order").order("name"),
      supabase.from("catalog_products").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
    ]);
    return { categories: categories ?? [], products: products ?? [] };
  });

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => categoryInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureCatalogAccess(supabase, userId);
    const companyId = await getCompanyId(supabase, userId);
    if (data.id) {
      const { error } = await supabase
        .from("catalog_categories")
        .update({
          name: data.name,
          description: data.description ?? null,
          sort_order: data.sort_order ?? 0,
          is_active: data.is_active ?? true,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("catalog_categories").insert({
        user_id: userId,
        company_id: companyId,
        name: data.name,
        description: data.description ?? null,
        sort_order: data.sort_order ?? 0,
        is_active: data.is_active ?? true,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureCatalogAccess(context.supabase, context.userId);
    const { error } = await context.supabase.from("catalog_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => productInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureCatalogAccess(supabase, userId);
    const companyId = await getCompanyId(supabase, userId);
    const payload = {
      category_id: data.category_id ?? null,
      name: data.name,
      description: data.description ?? null,
      sku: data.sku ?? null,
      price_cents: data.price_cents,
      currency: data.currency,
      image_url: data.image_url ?? null,
      stock: data.stock ?? null,
      is_active: data.is_active ?? true,
    };
    if (data.id) {
      const { error } = await supabase.from("catalog_products").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("catalog_products")
        .insert({ user_id: userId, company_id: companyId, ...payload });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureCatalogAccess(context.supabase, context.userId);
    const { error } = await context.supabase.from("catalog_products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleProductActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureCatalogAccess(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("catalog_products")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
