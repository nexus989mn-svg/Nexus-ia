
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
