-- ============================================================
-- CLIENT-SCOPED AI TRAINING + OPERATIONAL EVENTS
-- Client customization can never change global ai_modules.
-- Designer remains an internal/admin-only module.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.company_agent_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL CHECK (module_code IN ('atendimento','sdr','audio','designer')),
  display_name TEXT,
  behavior_prompt TEXT NOT NULL DEFAULT '',
  company_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, module_code)
);

GRANT SELECT, INSERT, UPDATE ON public.company_agent_configs TO authenticated;
GRANT ALL ON public.company_agent_configs TO service_role;
ALTER TABLE public.company_agent_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own agent configs"
ON public.company_agent_configs FOR ALL TO authenticated
USING (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_company_agent_configs_updated
BEFORE UPDATE ON public.company_agent_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_company_agent_configs_company
ON public.company_agent_configs(company_id);

-- Internal operational event ledger. Clients never write to it.
CREATE TABLE IF NOT EXISTS public.operational_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.operational_events TO authenticated;
GRANT ALL ON public.operational_events TO service_role;
ALTER TABLE public.operational_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view operational events"
ON public.operational_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_operational_events_type_created
ON public.operational_events(event_type, created_at DESC);

-- Seed the four product roles. Designer is internal-only and is not client-editable.
INSERT INTO public.ai_modules (code, name, description, is_enabled, model)
VALUES
 ('atendimento','IA Atendimento','Atendimento e conversas dos clientes',true,'nexus-auto'),
 ('sdr','IA SDR','Prospecção e qualificação',true,'nexus-auto'),
 ('designer','IA Designer','Produção visual interna para catálogos dos clientes',true,'nexus-auto'),
 ('audio','IA Áudio','Transcrição e apoio de voz',true,'nexus-auto')
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  model = 'nexus-auto',
  is_enabled = true;
