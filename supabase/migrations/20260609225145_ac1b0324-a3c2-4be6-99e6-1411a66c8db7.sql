
-- 1) COMPANIES
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text UNIQUE,
  document text,
  phone text,
  email text,
  logo_url text,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  locale text NOT NULL DEFAULT 'pt-BR',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own company"
  ON public.companies FOR ALL
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_companies_owner ON public.companies(owner_user_id);

-- 2) HELPER
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.companies WHERE owner_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.user_owns_company(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.companies WHERE id = _company_id AND owner_user_id = auth.uid())
$$;

-- 3) ADD company_id columns (nullable first)
ALTER TABLE public.catalog_products      ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.catalog_categories    ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.whatsapp_connections  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.briefings             ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- 4) BACKFILL — uma empresa por usuário existente
INSERT INTO public.companies (owner_user_id, name, email)
SELECT u.id,
       COALESCE(NULLIF(p.full_name, ''), NULLIF(p.company, ''), split_part(u.email, '@', 1)) AS name,
       u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.owner_user_id = u.id);

-- 5) BACKFILL company_id em dados operacionais
UPDATE public.catalog_products t
  SET company_id = c.id
  FROM public.companies c
  WHERE t.company_id IS NULL AND c.owner_user_id = t.user_id;

UPDATE public.catalog_categories t
  SET company_id = c.id
  FROM public.companies c
  WHERE t.company_id IS NULL AND c.owner_user_id = t.user_id;

UPDATE public.whatsapp_connections t
  SET company_id = c.id
  FROM public.companies c
  WHERE t.company_id IS NULL AND c.owner_user_id = t.user_id;

UPDATE public.briefings t
  SET company_id = c.id
  FROM public.companies c
  WHERE t.company_id IS NULL AND c.owner_user_id = t.user_id;

-- 6) NOT NULL
ALTER TABLE public.catalog_products      ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.catalog_categories    ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.whatsapp_connections  ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.briefings             ALTER COLUMN company_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_products_company   ON public.catalog_products(company_id);
CREATE INDEX IF NOT EXISTS idx_catalog_categories_company ON public.catalog_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_company           ON public.whatsapp_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_briefings_company          ON public.briefings(company_id);

-- 7) RLS atualizada — recria policies por empresa
DROP POLICY IF EXISTS "Users manage their products"        ON public.catalog_products;
DROP POLICY IF EXISTS "Users manage their own products"    ON public.catalog_products;
DROP POLICY IF EXISTS "users_catalog_products"             ON public.catalog_products;
DROP POLICY IF EXISTS "owners_manage_products"             ON public.catalog_products;
CREATE POLICY "Company members manage products"
  ON public.catalog_products FOR ALL
  USING (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users manage their categories"       ON public.catalog_categories;
DROP POLICY IF EXISTS "Users manage their own categories"   ON public.catalog_categories;
DROP POLICY IF EXISTS "users_catalog_categories"            ON public.catalog_categories;
DROP POLICY IF EXISTS "owners_manage_categories"            ON public.catalog_categories;
CREATE POLICY "Company members manage categories"
  ON public.catalog_categories FOR ALL
  USING (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users manage own whatsapp"           ON public.whatsapp_connections;
DROP POLICY IF EXISTS "users_whatsapp"                      ON public.whatsapp_connections;
DROP POLICY IF EXISTS "owners_manage_whatsapp"              ON public.whatsapp_connections;
CREATE POLICY "Company members manage whatsapp"
  ON public.whatsapp_connections FOR ALL
  USING (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage briefings"             ON public.briefings;
DROP POLICY IF EXISTS "Users manage their briefings"        ON public.briefings;
DROP POLICY IF EXISTS "users_briefings"                     ON public.briefings;
CREATE POLICY "Company members manage briefings"
  ON public.briefings FOR ALL
  USING (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'));

-- 8) Trigger handle_new_user estendida — cria empresa
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial_plan_id UUID;
  v_name TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  -- profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, v_name);

  -- role
  IF lower(NEW.email) = 'nexus989mn@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  END IF;

  -- company (auto)
  INSERT INTO public.companies (owner_user_id, name, email)
  VALUES (NEW.id, v_name, NEW.email);

  -- trial subscription
  SELECT id INTO v_trial_plan_id FROM public.plans WHERE code = 'trial' LIMIT 1;
  INSERT INTO public.subscriptions (
    user_id, plan_id, status, trial_ends_at, current_period_start, current_period_end
  )
  VALUES (
    NEW.id, v_trial_plan_id, 'trial',
    now() + interval '7 days', now(), now() + interval '7 days'
  );

  INSERT INTO public.system_logs (user_id, source, event, severity, metadata)
  VALUES (NEW.id, 'ai_admin', 'user.created', 'info',
          jsonb_build_object('email', NEW.email));

  RETURN NEW;
END;
$$;
