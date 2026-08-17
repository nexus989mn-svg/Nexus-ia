-- ============================================================
-- NEXUS MULTI-TENANT AGENT RUNTIME
-- Preparation layer for the next n8n generation.
-- No global customer limit is introduced here.
-- Each company gets isolated agent instances, conversation state,
-- inbound message batching and execution jobs.
-- ============================================================

-- 1) One logical instance of each internal agent per company.
CREATE TABLE IF NOT EXISTS public.company_agent_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL CHECK (module_code IN ('atendimento','sdr','audio','designer')),
  internal_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config_version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, module_code)
);

CREATE INDEX IF NOT EXISTS idx_company_agent_instances_company
  ON public.company_agent_instances(company_id, module_code);

ALTER TABLE public.company_agent_instances ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.company_agent_instances TO authenticated;
GRANT ALL ON public.company_agent_instances TO service_role;

CREATE POLICY "Owners view own agent instances"
ON public.company_agent_instances FOR SELECT TO authenticated
USING (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_company_agent_instances_updated
BEFORE UPDATE ON public.company_agent_instances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Persisted conversation runtime state.
-- This is deliberately separate from ai_conversations because WhatsApp
-- conversations may belong to contacts who are not SaaS users.
CREATE TABLE IF NOT EXISTS public.agent_conversation_runtime (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  remote_conversation_id TEXT NOT NULL,
  module_code TEXT NOT NULL DEFAULT 'atendimento'
    CHECK (module_code IN ('atendimento','sdr','audio','designer')),
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','processing','blocked')),
  debounce_until TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  processing_job_id UUID,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  version BIGINT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, channel, remote_conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_runtime_ready
  ON public.agent_conversation_runtime(status, debounce_until)
  WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_agent_runtime_company
  ON public.agent_conversation_runtime(company_id, channel, remote_conversation_id);

ALTER TABLE public.agent_conversation_runtime ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.agent_conversation_runtime TO authenticated;
GRANT ALL ON public.agent_conversation_runtime TO service_role;
CREATE POLICY "Owners view own runtime"
ON public.agent_conversation_runtime FOR SELECT TO authenticated
USING (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_agent_runtime_updated
BEFORE UPDATE ON public.agent_conversation_runtime
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Raw inbound messages. Unique message_id prevents duplicate webhook deliveries.
CREATE TABLE IF NOT EXISTS public.agent_inbox_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  runtime_id UUID NOT NULL REFERENCES public.agent_conversation_runtime(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  remote_message_id TEXT,
  sender_id TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','system','assistant')),
  content TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','batched','processed','ignored','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE(company_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_inbox_pending
  ON public.agent_inbox_messages(runtime_id, status, created_at)
  WHERE status = 'pending';

ALTER TABLE public.agent_inbox_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.agent_inbox_messages TO authenticated;
GRANT ALL ON public.agent_inbox_messages TO service_role;
CREATE POLICY "Owners view own inbox"
ON public.agent_inbox_messages FOR SELECT TO authenticated
USING (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'));

-- 4) Durable execution jobs. The n8n workers will claim these with SKIP LOCKED.
CREATE TABLE IF NOT EXISTS public.agent_execution_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_instance_id UUID REFERENCES public.company_agent_instances(id) ON DELETE SET NULL,
  runtime_id UUID REFERENCES public.agent_conversation_runtime(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','completed','failed','cancelled')),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_claim
  ON public.agent_execution_jobs(status, available_at, priority DESC, created_at)
  WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_agent_jobs_company
  ON public.agent_execution_jobs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_runtime
  ON public.agent_execution_jobs(runtime_id, created_at DESC);

ALTER TABLE public.agent_execution_jobs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.agent_execution_jobs TO authenticated;
GRANT ALL ON public.agent_execution_jobs TO service_role;
CREATE POLICY "Owners view own jobs"
ON public.agent_execution_jobs FOR SELECT TO authenticated
USING (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_agent_jobs_updated
BEFORE UPDATE ON public.agent_execution_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Catalog -> Designer -> Canva durable jobs.
CREATE TABLE IF NOT EXISTS public.catalog_design_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  catalog_id UUID,
  conversation_id UUID,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','briefing','designing','rendering','completed','failed','cancelled')),
  brief JSONB NOT NULL DEFAULT '{}'::jsonb,
  reference_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  canva_design_id TEXT,
  canva_preview_url TEXT,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalog_design_jobs_company
  ON public.catalog_design_jobs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_design_jobs_queue
  ON public.catalog_design_jobs(status, created_at)
  WHERE status IN ('queued','briefing','designing','rendering');

ALTER TABLE public.catalog_design_jobs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.catalog_design_jobs TO authenticated;
GRANT ALL ON public.catalog_design_jobs TO service_role;
CREATE POLICY "Owners manage own catalog design jobs"
ON public.catalog_design_jobs FOR SELECT TO authenticated
USING (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners create own catalog design jobs"
ON public.catalog_design_jobs FOR INSERT TO authenticated
WITH CHECK (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_catalog_design_jobs_updated
BEFORE UPDATE ON public.catalog_design_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Designer is internal. Clients can never manage its company config.
DROP POLICY IF EXISTS "Owners manage own agent configs" ON public.company_agent_configs;
CREATE POLICY "Owners manage client agent configs"
ON public.company_agent_configs FOR ALL TO authenticated
USING (
  (public.user_owns_company(company_id) AND module_code IN ('atendimento','sdr','audio'))
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  (public.user_owns_company(company_id) AND module_code IN ('atendimento','sdr','audio'))
  OR public.has_role(auth.uid(), 'admin')
);

-- 7) Automatically provision the four internal agent instances for every company.
CREATE OR REPLACE FUNCTION public.provision_company_agent_runtime(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.company_agent_instances(company_id, module_code, internal_name)
  VALUES
    (p_company_id, 'atendimento', 'atendimento_' || replace(p_company_id::text, '-', '')),
    (p_company_id, 'sdr',         'sdr_' || replace(p_company_id::text, '-', '')),
    (p_company_id, 'audio',       'audio_' || replace(p_company_id::text, '-', '')),
    (p_company_id, 'designer',    'designer_' || replace(p_company_id::text, '-', ''))
  ON CONFLICT (company_id, module_code) DO NOTHING;

  INSERT INTO public.company_agent_configs(company_id, module_code, display_name)
  VALUES
    (p_company_id, 'atendimento', NULL),
    (p_company_id, 'sdr', NULL),
    (p_company_id, 'audio', NULL),
    (p_company_id, 'designer', NULL)
  ON CONFLICT (company_id, module_code) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.provision_company_agent_runtime(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_company_agent_runtime(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.trg_provision_company_agent_runtime()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.provision_company_agent_runtime(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provision_company_agent_runtime ON public.companies;
CREATE TRIGGER trg_provision_company_agent_runtime
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.trg_provision_company_agent_runtime();

-- Backfill existing companies safely.
INSERT INTO public.company_agent_instances(company_id, module_code, internal_name)
SELECT c.id, m.module_code, m.module_code || '_' || replace(c.id::text, '-', '')
FROM public.companies c
CROSS JOIN (VALUES ('atendimento'),('sdr'),('audio'),('designer')) AS m(module_code)
ON CONFLICT (company_id, module_code) DO NOTHING;

INSERT INTO public.company_agent_configs(company_id, module_code, display_name)
SELECT c.id, m.module_code, NULL
FROM public.companies c
CROSS JOIN (VALUES ('atendimento'),('sdr'),('audio'),('designer')) AS m(module_code)
ON CONFLICT (company_id, module_code) DO NOTHING;

-- 8) Enqueue one inbound message and reset the conversation debounce timer.
CREATE OR REPLACE FUNCTION public.enqueue_agent_message(
  p_company_id UUID,
  p_channel TEXT,
  p_remote_conversation_id TEXT,
  p_message_id TEXT,
  p_module_code TEXT DEFAULT 'atendimento',
  p_content TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_debounce_seconds INTEGER DEFAULT 3
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_runtime_id UUID;
  v_message_id UUID;
BEGIN
  INSERT INTO public.agent_conversation_runtime(
    company_id, channel, remote_conversation_id, module_code,
    status, debounce_until, last_message_at, version
  ) VALUES (
    p_company_id, p_channel, p_remote_conversation_id, p_module_code,
    'waiting', now() + make_interval(secs => greatest(0, least(p_debounce_seconds, 30))), now(), 1
  )
  ON CONFLICT (company_id, channel, remote_conversation_id)
  DO UPDATE SET
    module_code = EXCLUDED.module_code,
    status = CASE
      WHEN agent_conversation_runtime.status = 'blocked' THEN 'blocked'
      ELSE 'waiting'
    END,
    debounce_until = now() + make_interval(secs => greatest(0, least(p_debounce_seconds, 30))),
    last_message_at = now(),
    version = agent_conversation_runtime.version + 1,
    updated_at = now()
  RETURNING id INTO v_runtime_id;

  INSERT INTO public.agent_inbox_messages(
    company_id, runtime_id, message_id, remote_message_id, content, payload
  ) VALUES (
    p_company_id, v_runtime_id, p_message_id, p_message_id, p_content, coalesce(p_payload, '{}'::jsonb)
  )
  ON CONFLICT (company_id, message_id) DO NOTHING
  RETURNING id INTO v_message_id;

  RETURN COALESCE(v_message_id, v_runtime_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_agent_message(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB,INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_agent_message(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB,INTEGER) TO service_role;

-- 9) Atomically claim one ready conversation. n8n workers can call this concurrently.
CREATE OR REPLACE FUNCTION public.claim_ready_agent_conversations(
  p_worker_id TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  runtime_id UUID,
  company_id UUID,
  channel TEXT,
  remote_conversation_id TEXT,
  module_code TEXT,
  last_message_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT r.id
    FROM public.agent_conversation_runtime r
    WHERE r.status = 'waiting'
      AND r.debounce_until IS NOT NULL
      AND r.debounce_until <= now()
    ORDER BY r.last_message_at ASC NULLS FIRST
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(p_limit, 100))
  )
  UPDATE public.agent_conversation_runtime r
  SET status = 'processing',
      locked_at = now(),
      locked_by = p_worker_id,
      updated_at = now()
  FROM picked
  WHERE r.id = picked.id
  RETURNING r.id, r.company_id, r.channel, r.remote_conversation_id,
            r.module_code, r.last_message_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_ready_agent_conversations(TEXT,INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ready_agent_conversations(TEXT,INTEGER) TO service_role;

-- 10) Atomic job claim. Separate workers never claim the same job.
CREATE OR REPLACE FUNCTION public.claim_agent_jobs(
  p_worker_id TEXT,
  p_limit INTEGER DEFAULT 10,
  p_job_type TEXT DEFAULT NULL
)
RETURNS SETOF public.agent_execution_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT j.id
    FROM public.agent_execution_jobs j
    WHERE j.status = 'queued'
      AND j.available_at <= now()
      AND j.attempts < j.max_attempts
      AND (p_job_type IS NULL OR j.job_type = p_job_type)
    ORDER BY j.priority DESC, j.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(p_limit, 100))
  )
  UPDATE public.agent_execution_jobs j
  SET status = 'running',
      attempts = j.attempts + 1,
      locked_at = now(),
      locked_by = p_worker_id,
      started_at = coalesce(j.started_at, now()),
      updated_at = now()
  FROM picked
  WHERE j.id = picked.id
  RETURNING j.*;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_agent_jobs(TEXT,INTEGER,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_agent_jobs(TEXT,INTEGER,TEXT) TO service_role;

-- 11) Finish/release helpers. They are intentionally service-role only.
CREATE OR REPLACE FUNCTION public.finish_agent_job(
  p_job_id UUID,
  p_worker_id TEXT,
  p_success BOOLEAN,
  p_result JSONB DEFAULT '{}'::jsonb,
  p_error TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_runtime_id UUID;
BEGIN
  UPDATE public.agent_execution_jobs
  SET status = CASE WHEN p_success THEN 'completed' ELSE CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'queued' END END,
      result = coalesce(p_result, '{}'::jsonb),
      error_message = p_error,
      completed_at = CASE WHEN p_success OR attempts >= max_attempts THEN now() ELSE NULL END,
      available_at = CASE WHEN NOT p_success AND attempts < max_attempts THEN now() + interval '5 seconds' ELSE available_at END,
      locked_at = NULL,
      locked_by = NULL,
      updated_at = now()
  WHERE id = p_job_id AND status = 'running' AND locked_by = p_worker_id
  RETURNING runtime_id INTO v_runtime_id;

  IF NOT FOUND THEN RETURN false; END IF;

  IF v_runtime_id IS NOT NULL THEN
    UPDATE public.agent_conversation_runtime
    SET status = 'waiting', locked_at = NULL, locked_by = NULL,
        processing_job_id = NULL, updated_at = now()
    WHERE id = v_runtime_id AND status = 'processing';
  END IF;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.finish_agent_job(UUID,TEXT,BOOLEAN,JSONB,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_agent_job(UUID,TEXT,BOOLEAN,JSONB,TEXT) TO service_role;

-- 12) Expired locks can be recovered by a watchdog without touching customer data.
CREATE OR REPLACE FUNCTION public.recover_stale_agent_runtime(p_timeout_seconds INTEGER DEFAULT 120)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.agent_conversation_runtime
  SET status = 'waiting', locked_at = NULL, locked_by = NULL,
      processing_job_id = NULL, updated_at = now()
  WHERE status = 'processing'
    AND locked_at < now() - make_interval(secs => greatest(30, least(p_timeout_seconds, 3600)));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recover_stale_agent_runtime(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recover_stale_agent_runtime(INTEGER) TO service_role;
