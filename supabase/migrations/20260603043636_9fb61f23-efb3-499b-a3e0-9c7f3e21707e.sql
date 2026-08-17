
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
