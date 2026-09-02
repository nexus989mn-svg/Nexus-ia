-- Nexus-ia production defaults for the Assistente de IA Supabase project.
-- Safe to re-run because provider is unique.
INSERT INTO public.integration_credentials (provider, label, base_url, config, is_enabled) VALUES
  ('stripe', 'Stripe (pagamentos)', NULL, '{}'::jsonb, false),
  ('whatsapp', 'WhatsApp (UAZAPI / Evolution)', NULL, '{}'::jsonb, false),
  ('n8n', 'n8n (automações)', NULL, '{}'::jsonb, false),
  ('openrouter', 'OpenRouter', NULL, '{}'::jsonb, false),
  ('openai', 'OpenAI', NULL, '{}'::jsonb, false),
  ('nexus', 'Nexus IA', 'https://intelligent-ai-router.lovable.app/api/public/v1', '{"model":"nexus-auto"}'::jsonb, false)
ON CONFLICT (provider) DO UPDATE SET
  label = EXCLUDED.label,
  base_url = COALESCE(NULLIF(public.integration_credentials.base_url, ''), EXCLUDED.base_url),
  config = CASE WHEN public.integration_credentials.config = '{}'::jsonb THEN EXCLUDED.config ELSE public.integration_credentials.config END;
