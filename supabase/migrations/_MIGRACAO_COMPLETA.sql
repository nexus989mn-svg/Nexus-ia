
-- ==================================================
-- MIGRATION: 20260529203242_aee573b0-e0aa-4764-96d1-ca31f6702345.sql
-- ==================================================

-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');
CREATE TYPE public.subscription_status AS ENUM ('trial', 'active', 'expired', 'blocked', 'canceled');
CREATE TYPE public.plan_interval AS ENUM ('trial', 'monthly', 'yearly');

-- =========================================
-- TIMESTAMP TRIGGER FN
-- =========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  company TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- USER ROLES
-- =========================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer helper to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========================================
-- PLANS
-- =========================================
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  interval public.plan_interval NOT NULL,
  price_usd_cents INTEGER NOT NULL DEFAULT 0,
  trial_days INTEGER NOT NULL DEFAULT 0,
  stripe_price_id TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_plans_updated
BEFORE UPDATE ON public.plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- SUBSCRIPTIONS
-- =========================================
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  status public.subscription_status NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON public.subscriptions(current_period_end);

CREATE TRIGGER trg_subscriptions_updated
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- BILLING EVENTS (webhook idempotency)
-- =========================================
CREATE TABLE public.billing_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'stripe',
  external_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.billing_events TO authenticated;
GRANT ALL ON public.billing_events TO service_role;

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- =========================================
-- SYSTEM LOGS (AI Admin audit)
-- =========================================
CREATE TABLE public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'system',
  event TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_logs TO authenticated;
GRANT ALL ON public.system_logs TO service_role;

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_system_logs_user ON public.system_logs(user_id);
CREATE INDEX idx_system_logs_created ON public.system_logs(created_at DESC);

-- =========================================
-- RLS POLICIES
-- =========================================

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- plans
CREATE POLICY "Plans are public" ON public.plans
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage plans" ON public.plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- subscriptions
CREATE POLICY "Users view own subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- billing_events
CREATE POLICY "Users view own billing events" ON public.billing_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- system_logs
CREATE POLICY "Users view own logs" ON public.system_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- =========================================
-- HANDLE NEW USER: profile + role + trial sub
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial_plan_id UUID;
BEGIN
  -- profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );

  -- role
  IF lower(NEW.email) = 'nexus989mn@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  END IF;

  -- trial subscription
  SELECT id INTO v_trial_plan_id FROM public.plans WHERE code = 'trial' LIMIT 1;

  INSERT INTO public.subscriptions (
    user_id, plan_id, status, trial_ends_at, current_period_start, current_period_end
  )
  VALUES (
    NEW.id,
    v_trial_plan_id,
    'trial',
    now() + interval '7 days',
    now(),
    now() + interval '7 days'
  );

  -- audit
  INSERT INTO public.system_logs (user_id, source, event, severity, metadata)
  VALUES (NEW.id, 'ai_admin', 'user.created', 'info',
          jsonb_build_object('email', NEW.email));

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- AI ADMIN: expire overdue subscriptions
-- =========================================
CREATE OR REPLACE FUNCTION public.expire_overdue_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  WITH expired AS (
    UPDATE public.subscriptions
    SET status = 'expired',
        blocked_reason = 'Subscription period ended'
    WHERE status IN ('trial', 'active')
      AND current_period_end IS NOT NULL
      AND current_period_end < now()
    RETURNING user_id
  )
  INSERT INTO public.system_logs (user_id, source, event, severity, metadata)
  SELECT user_id, 'ai_admin', 'subscription.expired', 'warning',
         jsonb_build_object('auto', true)
  FROM expired;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =========================================
-- SEED PLANS
-- =========================================
INSERT INTO public.plans (code, name, description, interval, price_usd_cents, trial_days, features, sort_order) VALUES
  ('trial',   'Free Trial',   '7-day free trial with full access',                'trial',   0,     7,
   '["1 WhatsApp instance","AI assistant","Up to 100 conversations","Basic catalog"]'::jsonb, 0),
  ('monthly', 'Pro Monthly',  'Full access, billed monthly',                       'monthly', 4900,  0,
   '["Unlimited conversations","Multiple WhatsApp instances","AI Sales Assistant","AI SDR","Product catalog","Priority support"]'::jsonb, 1),
  ('yearly',  'Pro Yearly',   'Full access, 2 months free (billed annually)',      'yearly',  49000, 0,
   '["Everything in Monthly","2 months free","AI Designer included","Dedicated onboarding"]'::jsonb, 2);

-- ==================================================
-- MIGRATION: 20260529203304_71c3472d-3b39-4a10-92e5-de6a459096e6.sql
-- ==================================================

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_overdue_subscriptions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- ==================================================
-- MIGRATION: 20260602022445_629e2186-e96a-4831-9eda-c996d641c46c.sql
-- ==================================================

-- ============ CATEGORIES ============
CREATE TABLE public.catalog_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_categories TO authenticated;
GRANT ALL ON public.catalog_categories TO service_role;

ALTER TABLE public.catalog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own categories"
  ON public.catalog_categories FOR ALL TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_catalog_categories_updated
  BEFORE UPDATE ON public.catalog_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_catalog_categories_user ON public.catalog_categories(user_id);

-- ============ PRODUCTS ============
CREATE TABLE public.catalog_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.catalog_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  image_url TEXT,
  stock INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_products TO authenticated;
GRANT ALL ON public.catalog_products TO service_role;

ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own products"
  ON public.catalog_products FOR ALL TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_catalog_products_updated
  BEFORE UPDATE ON public.catalog_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_catalog_products_user ON public.catalog_products(user_id);
CREATE INDEX idx_catalog_products_category ON public.catalog_products(category_id);

-- ==================================================
-- MIGRATION: 20260603042202_4aeb8d93-5e4b-4e39-abdd-523fd03aa6d9.sql
-- ==================================================

CREATE TABLE public.whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  phone_e164 TEXT,
  display_name TEXT,
  instance_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'disconnected',
  qr_code TEXT,
  connected_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_connections TO authenticated;
GRANT ALL ON public.whatsapp_connections TO service_role;

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own whatsapp connection"
ON public.whatsapp_connections
FOR ALL
TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_whatsapp_connections_updated_at
BEFORE UPDATE ON public.whatsapp_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================================================
-- MIGRATION: 20260603043636_9fb61f23-efb3-499b-a3e0-9c7f3e21707e.sql
-- ==================================================

-- Integration credentials (admin-only): real provider configuration storage
CREATE TABLE public.integration_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  api_key TEXT,
  base_url TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  last_test_at TIMESTAMPTZ,
  last_test_status TEXT,
  last_test_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_credentials TO authenticated;
GRANT ALL ON public.integration_credentials TO service_role;
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage integrations" ON public.integration_credentials
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_integration_credentials_updated
  BEFORE UPDATE ON public.integration_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AI module configuration (admin-only)
CREATE TABLE public.ai_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  system_prompt TEXT NOT NULL DEFAULT '',
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 2048,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_modules TO authenticated;
GRANT ALL ON public.ai_modules TO service_role;
ALTER TABLE public.ai_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai_modules" ON public.ai_modules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_ai_modules_updated
  BEFORE UPDATE ON public.ai_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed AI modules
INSERT INTO public.ai_modules (code, name, description, model) VALUES
  ('sdr', 'IA SDR', 'Qualificação de leads e prospecção', 'google/gemini-2.5-flash'),
  ('atendimento', 'IA Atendimento', 'Agente conversacional WhatsApp', 'google/gemini-2.5-flash'),
  ('designer', 'IA Designer', 'Assistente de design generativo', 'google/gemini-2.5-pro'),
  ('audio', 'IA Áudio', 'Transcrição de voz e leitura em áudio', 'openai/gpt-5-mini');

-- Briefings (per-user with admin override)
CREATE TABLE public.briefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  contact TEXT,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'pending',
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefings TO authenticated;
GRANT ALL ON public.briefings TO service_role;
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own briefings" ON public.briefings
  FOR ALL TO authenticated
  USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_briefings_updated
  BEFORE UPDATE ON public.briefings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_briefings_user_status ON public.briefings(user_id, status);

-- Platform settings (admin-only key/value)
CREATE TABLE public.platform_settings (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage platform settings" ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default integrations
INSERT INTO public.integration_credentials (provider, label) VALUES
  ('stripe', 'Stripe (pagamentos)'),
  ('whatsapp', 'WhatsApp (UAZAPI / Evolution)'),
  ('n8n', 'n8n (automações)'),
  ('openrouter', 'OpenRouter'),
  ('openai', 'OpenAI');

-- ==================================================
-- MIGRATION: 20260609225145_ac1b0324-a3c2-4be6-99e6-1411a66c8db7.sql
-- ==================================================

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

-- ==================================================
-- MIGRATION: 20260609225212_f625bf44-26fc-4f2e-9961-fb583ce6a167.sql
-- ==================================================

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role)         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_company_id()             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_company(uuid)          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_overdue_subscriptions()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()       FROM PUBLIC, anon, authenticated;

-- ==================================================
-- MIGRATION: 20260611021433_f5f44e15-f207-4089-9712-90845fe7b62d.sql
-- ==================================================
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nova conversa',
  module_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_conversations_company_idx ON public.ai_conversations(company_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_conversations TO service_role;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members read own conversations" ON public.ai_conversations
  FOR SELECT TO authenticated
  USING (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "company members insert own conversations" ON public.ai_conversations
  FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_company(company_id) AND user_id = auth.uid());
CREATE POLICY "company members update own conversations" ON public.ai_conversations
  FOR UPDATE TO authenticated
  USING (public.user_owns_company(company_id))
  WITH CHECK (public.user_owns_company(company_id));
CREATE POLICY "company members delete own conversations" ON public.ai_conversations
  FOR DELETE TO authenticated
  USING (public.user_owns_company(company_id));

CREATE TRIGGER ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  content text,
  tokens_input integer,
  tokens_output integer,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_messages_conversation_idx ON public.ai_messages(conversation_id, created_at);
CREATE INDEX ai_messages_company_idx ON public.ai_messages(company_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members read own messages" ON public.ai_messages
  FOR SELECT TO authenticated
  USING (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "company members insert own messages" ON public.ai_messages
  FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_company(company_id));
CREATE POLICY "company members delete own messages" ON public.ai_messages
  FOR DELETE TO authenticated
  USING (public.user_owns_company(company_id));