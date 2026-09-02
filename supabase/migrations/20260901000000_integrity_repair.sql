-- ============================================================
-- INTEGRITY REPAIR — Assistente IA
-- Idempotent repair for the production schema used by the app.
-- Does NOT auto-grant customer Trials. Trial is claimed only after
-- WhatsApp validation through claim_trial().
-- ============================================================

-- integration_credentials: normalize the contract expected by server functions.
ALTER TABLE public.integration_credentials
  ADD COLUMN IF NOT EXISTS api_key TEXT,
  ADD COLUMN IF NOT EXISTS base_url TEXT,
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_test_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_test_status TEXT,
  ADD COLUMN IF NOT EXISTS last_test_message TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.integration_credentials
SET label = COALESCE(NULLIF(trim(label), ''), provider)
WHERE label IS NULL OR trim(label) = '';
ALTER TABLE public.integration_credentials ALTER COLUMN label SET NOT NULL;

-- Required integration records. Existing credentials/configuration are preserved.
INSERT INTO public.integration_credentials (provider, label, base_url, config, is_enabled)
VALUES
  ('stripe', 'Stripe (pagamentos)', NULL, '{}'::jsonb, false),
  ('whatsapp', 'WhatsApp (Evolution)', NULL, '{}'::jsonb, false),
  ('n8n', 'n8n (automações)', NULL, '{}'::jsonb, false),
  ('openrouter', 'OpenRouter', NULL, '{}'::jsonb, false),
  ('openai', 'OpenAI', NULL, '{}'::jsonb, false),
  ('nexus', 'Nexus IA', 'https://intelligent-ai-router.lovable.app/api/public/v1', '{"model":"nexus-auto"}'::jsonb, false)
ON CONFLICT (provider) DO UPDATE SET
  label = COALESCE(NULLIF(public.integration_credentials.label, ''), EXCLUDED.label),
  base_url = COALESCE(NULLIF(public.integration_credentials.base_url, ''), EXCLUDED.base_url),
  config = CASE
    WHEN public.integration_credentials.config IS NULL OR public.integration_credentials.config = '{}'::jsonb
      THEN EXCLUDED.config
    ELSE public.integration_credentials.config
  END;

-- Every existing authenticated account must have a role and a company.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id,
       CASE WHEN lower(coalesce(u.email, '')) = 'nexus989mn@gmail.com'
            THEN 'admin'::public.app_role
            ELSE 'customer'::public.app_role END
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id);

INSERT INTO public.companies (owner_user_id, name, email)
SELECT u.id,
       COALESCE(NULLIF(p.full_name, ''), split_part(coalesce(u.email, 'empresa'), '@', 1)),
       u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.owner_user_id = u.id);

-- Backfill company ownership on operational rows when possible.
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

-- Keep the platform owner out of customer subscription gates.
-- Customer subscriptions remain optional until Trial/payment is explicitly claimed.
-- Repair only missing admin role; never fabricate a paid/trial customer subscription.

-- Reassert the server-only security contract for credentials and billing state.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.integration_credentials FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.whatsapp_connections FROM authenticated;

DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins view subscriptions" ON public.subscriptions;
CREATE POLICY "Users and admins view subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage integrations" ON public.integration_credentials;
CREATE POLICY "Admins manage integrations"
  ON public.integration_credentials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure the owner can always be recognized by role even if the original seed was missed.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(coalesce(u.email, '')) = 'nexus989mn@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = u.id AND r.role = 'admin'::public.app_role
  );
