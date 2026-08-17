-- Nexus IA como integração oficial do sistema
INSERT INTO public.integration_credentials
  (provider, label, base_url, config, is_enabled)
VALUES
  (
    'nexus',
    'Nexus IA',
    'https://intelligent-ai-router.lovable.app/api/public/v1',
    '{"model":"nexus-auto"}'::jsonb,
    false
  )
ON CONFLICT (provider) DO UPDATE
SET
  label = EXCLUDED.label,
  base_url = COALESCE(
    NULLIF(public.integration_credentials.base_url, ''),
    EXCLUDED.base_url
  ),
  config = CASE
    WHEN public.integration_credentials.config = '{}'::jsonb
      THEN EXCLUDED.config
    ELSE public.integration_credentials.config
  END;
