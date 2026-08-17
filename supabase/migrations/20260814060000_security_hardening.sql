-- ============================================================
-- SECURITY HARDENING
-- - Trial can only be consumed once per normalized email OR phone.
-- - Subscription mutations are server-only; authenticated users may only read.
-- - API credentials remain server-side and are never returned to the browser.
-- - New accounts no longer receive an automatic trial before eligibility is checked.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trial_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_normalized TEXT NOT NULL UNIQUE,
  phone_e164 TEXT UNIQUE,
  source TEXT NOT NULL DEFAULT 'checkout',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.trial_claims TO authenticated;
GRANT ALL ON public.trial_claims TO service_role;
ALTER TABLE public.trial_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own trial claim" ON public.trial_claims
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_trial_claims_phone ON public.trial_claims(phone_e164);
CREATE INDEX IF NOT EXISTS idx_trial_claims_email ON public.trial_claims(email_normalized);

-- Backfill every previously granted trial into the permanent anti-reuse ledger.
INSERT INTO public.trial_claims (user_id, email_normalized, phone_e164, source, used_at, metadata)
SELECT
  s.user_id,
  lower(trim(u.email)),
  NULL,
  'legacy_subscription',
  COALESCE(s.created_at, now()),
  jsonb_build_object('backfilled', true)
FROM public.subscriptions s
JOIN auth.users u ON u.id = s.user_id
JOIN public.plans p ON p.id = s.plan_id
WHERE p.code = 'trial'
ON CONFLICT (user_id) DO NOTHING;

-- Add known WhatsApp numbers to their existing trial claims.
UPDATE public.trial_claims tc
SET phone_e164 = w.phone_e164
FROM public.whatsapp_connections w
WHERE w.user_id = tc.user_id
  AND w.phone_e164 IS NOT NULL
  AND tc.phone_e164 IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.trial_claims other
    WHERE other.phone_e164 = w.phone_e164
      AND other.user_id <> tc.user_id
  );

-- Subscription state is security-sensitive and cannot be changed by the browser.
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;

DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.subscriptions;
CREATE POLICY "Admins view subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

-- Credentials are never client-readable except through the masked admin server function.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.integration_credentials FROM authenticated;

-- Billing event payloads and system audit logs are server-owned.
REVOKE INSERT, UPDATE, DELETE ON public.billing_events FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.system_logs FROM authenticated;

-- WhatsApp state is also server-owned; all mutations go through authenticated server functions.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_connections FROM authenticated;

-- Prevent the public webhook from being usable as a fake billing activation endpoint.
REVOKE EXECUTE ON FUNCTION public.expire_overdue_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_overdue_subscriptions() TO service_role;

-- Correct production pricing requested by the product owner: $28/month and $280/year.
UPDATE public.plans SET price_usd_cents = 2800 WHERE code = 'monthly';
UPDATE public.plans SET price_usd_cents = 28000 WHERE code = 'yearly';

-- New users do not receive a trial automatically. It is created only after the
-- server-side eligibility check in billing.functions.ts succeeds.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );

  IF lower(NEW.email) = 'nexus989mn@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  END IF;

  INSERT INTO public.companies (owner_user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  INSERT INTO public.system_logs (user_id, source, event, severity, metadata)
  VALUES (
    NEW.id,
    'security',
    'user.created',
    'info',
    jsonb_build_object('email', lower(NEW.email), 'trial', 'not_auto_granted')
  );

  RETURN NEW;
END;
$$;

-- Explicitly deny browser writes to the permanent trial ledger.
REVOKE INSERT, UPDATE, DELETE ON public.trial_claims FROM authenticated;

-- Keep the Nexus provider seeded without exposing its credential.
INSERT INTO public.integration_credentials (provider, label, base_url, config, is_enabled)
VALUES (
  'nexus',
  'Nexus IA',
  'https://intelligent-ai-router.lovable.app/api/public/v1',
  '{"model":"nexus-auto"}'::jsonb,
  false
)
ON CONFLICT (provider) DO NOTHING;

-- Trial history must survive account deletion so an old email/number cannot
-- obtain a fresh Trial by deleting and recreating the account.
ALTER TABLE public.trial_claims
  DROP CONSTRAINT IF EXISTS trial_claims_user_id_fkey;
