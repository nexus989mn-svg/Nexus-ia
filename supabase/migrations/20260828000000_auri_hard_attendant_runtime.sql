-- ============================================================
-- AURI HARD ATTENDANT RUNTIME
-- Production-grade conversation memory, handoff, actions,
-- monitoring and customer-controlled audio preference.
-- Customer customization never replaces platform guardrails.
-- ============================================================

ALTER TABLE public.company_agent_configs
  ADD COLUMN IF NOT EXISTS audio_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voice_id TEXT,
  ADD COLUMN IF NOT EXISTS voice_name TEXT,
  ADD COLUMN IF NOT EXISTS customization_version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.agent_voice_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voice_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'pt-BR',
  provider TEXT NOT NULL DEFAULT 'nexus-gateway',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_voice_catalog_active
  ON public.agent_voice_catalog(is_active, language, name);

ALTER TABLE public.agent_voice_catalog ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.agent_voice_catalog TO authenticated;
GRANT ALL ON public.agent_voice_catalog TO service_role;
DROP POLICY IF EXISTS "Authenticated view active voices" ON public.agent_voice_catalog;
CREATE POLICY "Authenticated view active voices"
ON public.agent_voice_catalog FOR SELECT TO authenticated
USING (is_active = true);

CREATE TRIGGER trg_agent_voice_catalog_updated
BEFORE UPDATE ON public.agent_voice_catalog
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Voices already present in the user's Nexus Gateway. IDs are voice IDs,
-- not provider API secrets.
INSERT INTO public.agent_voice_catalog(voice_id, name, language, provider)
VALUES
  ('663b730b-71c8-4026-a450-88812905ea37', 'Marina', 'pt-BR', 'nexus-gateway'),
  ('2a51c725-607c-4343-96df-423ac2f8ff09', 'Letícia', 'pt-BR', 'nexus-gateway'),
  ('ebfc54c7-ee8e-4adc-9036-b514958b8779', 'Ana', 'pt-BR', 'nexus-gateway'),
  ('835778a8-4338-41f1-a245-478f502e613c', 'Maria Helena', 'pt-BR', 'nexus-gateway'),
  ('16aba2c3-de4f-482c-82af-1347cba77e42', 'Mariana', 'pt-BR', 'nexus-gateway'),
  ('7197b571-8d1f-48c2-b79f-a7d19eef5590', 'Bia', 'pt-BR', 'nexus-gateway')
ON CONFLICT (voice_id) DO UPDATE SET
  name = EXCLUDED.name,
  language = EXCLUDED.language,
  provider = EXCLUDED.provider,
  is_active = true,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.agent_conversation_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  remote_conversation_id TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  current_topic TEXT,
  current_goal TEXT,
  pending_question TEXT,
  last_intent TEXT,
  intent_confidence NUMERIC(5,4),
  awaiting_user BOOLEAN NOT NULL DEFAULT false,
  handoff_status TEXT NOT NULL DEFAULT 'none'
    CHECK (handoff_status IN ('none','requested','active','resolved')),
  customer_facts JSONB NOT NULL DEFAULT '{}'::jsonb,
  commitments JSONB NOT NULL DEFAULT '[]'::jsonb,
  decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  open_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  turn_count INTEGER NOT NULL DEFAULT 0,
  last_user_at TIMESTAMPTZ,
  last_assistant_at TIMESTAMPTZ,
  version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, channel, remote_conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_company
  ON public.agent_conversation_memory(company_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memory_open
  ON public.agent_conversation_memory(company_id, awaiting_user, handoff_status);

ALTER TABLE public.agent_conversation_memory ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.agent_conversation_memory TO authenticated;
GRANT ALL ON public.agent_conversation_memory TO service_role;
CREATE POLICY "Owners view own conversation memory"
ON public.agent_conversation_memory FOR SELECT TO authenticated
USING (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_agent_memory_updated
BEFORE UPDATE ON public.agent_conversation_memory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.agent_handoffs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  runtime_id UUID REFERENCES public.agent_conversation_runtime(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  remote_conversation_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','active','resolved','cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_agent_handoffs_company
  ON public.agent_handoffs(company_id, status, requested_at DESC);

ALTER TABLE public.agent_handoffs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.agent_handoffs TO authenticated;
GRANT ALL ON public.agent_handoffs TO service_role;
CREATE POLICY "Owners view own handoffs"
ON public.agent_handoffs FOR SELECT TO authenticated
USING (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.agent_action_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  runtime_id UUID REFERENCES public.agent_conversation_runtime(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  remote_conversation_id TEXT,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','approved','running','completed','failed','cancelled')),
  idempotency_key TEXT NOT NULL,
  request JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(company_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_queue
  ON public.agent_action_requests(status, created_at)
  WHERE status IN ('requested','approved','running');
CREATE INDEX IF NOT EXISTS idx_agent_actions_company
  ON public.agent_action_requests(company_id, created_at DESC);

ALTER TABLE public.agent_action_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.agent_action_requests TO authenticated;
GRANT ALL ON public.agent_action_requests TO service_role;
CREATE POLICY "Owners view own actions"
ON public.agent_action_requests FOR SELECT TO authenticated
USING (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.agent_runtime_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  runtime_id UUID REFERENCES public.agent_conversation_runtime(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('debug','info','warning','error','critical')),
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_runtime_events_company
  ON public.agent_runtime_events(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runtime_events_runtime
  ON public.agent_runtime_events(runtime_id, created_at DESC);

ALTER TABLE public.agent_runtime_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.agent_runtime_events TO authenticated;
GRANT ALL ON public.agent_runtime_events TO service_role;
CREATE POLICY "Owners view own runtime events"
ON public.agent_runtime_events FOR SELECT TO authenticated
USING (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'admin'));

-- Build a stable context package for n8n/workers. The worker gets only the
-- selected company/conversation context, never platform credentials/prompts.
CREATE OR REPLACE FUNCTION public.get_agent_context(
  p_company_id UUID,
  p_channel TEXT,
  p_remote_conversation_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_memory JSONB;
  v_runtime JSONB;
  v_config JSONB;
BEGIN
  SELECT to_jsonb(m) INTO v_memory
  FROM public.agent_conversation_memory m
  WHERE m.company_id = p_company_id
    AND m.channel = p_channel
    AND m.remote_conversation_id = p_remote_conversation_id;

  SELECT to_jsonb(r) INTO v_runtime
  FROM public.agent_conversation_runtime r
  WHERE r.company_id = p_company_id
    AND r.channel = p_channel
    AND r.remote_conversation_id = p_remote_conversation_id;

  SELECT jsonb_build_object(
    'display_name', c.display_name,
    'company_context', c.company_context,
    'audio_enabled', c.audio_enabled,
    'voice_id', c.voice_id,
    'voice_name', c.voice_name
  ) INTO v_config
  FROM public.company_agent_configs c
  WHERE c.company_id = p_company_id AND c.module_code = 'atendimento';

  RETURN jsonb_build_object(
    'memory', coalesce(v_memory, '{}'::jsonb),
    'runtime', coalesce(v_runtime, '{}'::jsonb),
    'attendant', coalesce(v_config, '{}'::jsonb),
    'policy_version', 'hard-attendant-v1'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_agent_context(UUID,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_agent_context(UUID,TEXT,TEXT) TO service_role;

-- Record a completed turn without allowing a worker to replace the company
-- configuration. This is the durable "where were we?" checkpoint.
CREATE OR REPLACE FUNCTION public.record_agent_turn(
  p_company_id UUID,
  p_channel TEXT,
  p_remote_conversation_id TEXT,
  p_role TEXT,
  p_summary TEXT DEFAULT NULL,
  p_current_topic TEXT DEFAULT NULL,
  p_current_goal TEXT DEFAULT NULL,
  p_pending_question TEXT DEFAULT NULL,
  p_last_intent TEXT DEFAULT NULL,
  p_intent_confidence NUMERIC DEFAULT NULL,
  p_awaiting_user BOOLEAN DEFAULT false,
  p_customer_facts JSONB DEFAULT '{}'::jsonb,
  p_commitments JSONB DEFAULT '[]'::jsonb,
  p_decisions JSONB DEFAULT '[]'::jsonb,
  p_open_items JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.agent_conversation_memory(
    company_id, channel, remote_conversation_id,
    summary, current_topic, current_goal, pending_question,
    last_intent, intent_confidence, awaiting_user,
    customer_facts, commitments, decisions, open_items,
    turn_count, last_user_at, last_assistant_at, version
  ) VALUES (
    p_company_id, p_channel, p_remote_conversation_id,
    coalesce(p_summary, ''), p_current_topic, p_current_goal, p_pending_question,
    p_last_intent, p_intent_confidence, p_awaiting_user,
    coalesce(p_customer_facts, '{}'::jsonb), coalesce(p_commitments, '[]'::jsonb),
    coalesce(p_decisions, '[]'::jsonb), coalesce(p_open_items, '[]'::jsonb),
    1,
    CASE WHEN p_role = 'user' THEN now() ELSE NULL END,
    CASE WHEN p_role = 'assistant' THEN now() ELSE NULL END,
    1
  )
  ON CONFLICT (company_id, channel, remote_conversation_id)
  DO UPDATE SET
    summary = CASE WHEN p_summary IS NULL THEN agent_conversation_memory.summary ELSE p_summary END,
    current_topic = coalesce(p_current_topic, agent_conversation_memory.current_topic),
    current_goal = coalesce(p_current_goal, agent_conversation_memory.current_goal),
    pending_question = p_pending_question,
    last_intent = coalesce(p_last_intent, agent_conversation_memory.last_intent),
    intent_confidence = coalesce(p_intent_confidence, agent_conversation_memory.intent_confidence),
    awaiting_user = p_awaiting_user,
    customer_facts = coalesce(p_customer_facts, agent_conversation_memory.customer_facts),
    commitments = coalesce(p_commitments, agent_conversation_memory.commitments),
    decisions = coalesce(p_decisions, agent_conversation_memory.decisions),
    open_items = coalesce(p_open_items, agent_conversation_memory.open_items),
    turn_count = agent_conversation_memory.turn_count + 1,
    last_user_at = CASE WHEN p_role = 'user' THEN now() ELSE agent_conversation_memory.last_user_at END,
    last_assistant_at = CASE WHEN p_role = 'assistant' THEN now() ELSE agent_conversation_memory.last_assistant_at END,
    version = agent_conversation_memory.version + 1,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_agent_turn(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,NUMERIC,BOOLEAN,JSONB,JSONB,JSONB,JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_agent_turn(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,NUMERIC,BOOLEAN,JSONB,JSONB,JSONB,JSONB) TO service_role;

-- Handoff is explicit and auditable. The attendant must never claim a human
-- was notified until a worker actually completes that action.
CREATE OR REPLACE FUNCTION public.request_agent_handoff(
  p_company_id UUID,
  p_channel TEXT,
  p_remote_conversation_id TEXT,
  p_reason TEXT,
  p_summary TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_runtime UUID;
BEGIN
  SELECT id INTO v_runtime
  FROM public.agent_conversation_runtime
  WHERE company_id = p_company_id
    AND channel = p_channel
    AND remote_conversation_id = p_remote_conversation_id;

  INSERT INTO public.agent_handoffs(company_id, runtime_id, channel, remote_conversation_id, reason, summary)
  VALUES (p_company_id, v_runtime, p_channel, p_remote_conversation_id, trim(p_reason), coalesce(p_summary,''))
  RETURNING id INTO v_id;

  INSERT INTO public.agent_runtime_events(company_id, runtime_id, event_type, severity, message, metadata)
  VALUES (p_company_id, v_runtime, 'handoff.requested', 'warning', 'Atendimento encaminhado para humano.', jsonb_build_object('handoff_id', v_id, 'reason', p_reason));

  UPDATE public.agent_conversation_memory
  SET handoff_status = 'requested', awaiting_user = false, updated_at = now()
  WHERE company_id = p_company_id AND channel = p_channel AND remote_conversation_id = p_remote_conversation_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_agent_handoff(UUID,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_agent_handoff(UUID,TEXT,TEXT,TEXT,TEXT) TO service_role;

-- Create an auditable action request. Execution remains the worker's job.
CREATE OR REPLACE FUNCTION public.enqueue_agent_action(
  p_company_id UUID,
  p_action_type TEXT,
  p_idempotency_key TEXT,
  p_request JSONB DEFAULT '{}'::jsonb,
  p_channel TEXT DEFAULT 'whatsapp',
  p_remote_conversation_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_runtime UUID;
BEGIN
  SELECT id INTO v_runtime
  FROM public.agent_conversation_runtime
  WHERE company_id = p_company_id
    AND channel = p_channel
    AND remote_conversation_id = p_remote_conversation_id;

  INSERT INTO public.agent_action_requests(
    company_id, runtime_id, channel, remote_conversation_id,
    action_type, idempotency_key, request
  ) VALUES (
    p_company_id, v_runtime, p_channel, p_remote_conversation_id,
    trim(p_action_type), trim(p_idempotency_key), coalesce(p_request,'{}'::jsonb)
  )
  ON CONFLICT (company_id, idempotency_key) DO UPDATE
  SET request = EXCLUDED.request
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_agent_action(UUID,TEXT,TEXT,JSONB,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_agent_action(UUID,TEXT,TEXT,JSONB,TEXT,TEXT) TO service_role;

-- Existing runtime gets a longer, explicit metadata contract without changing
-- the existing debounce/queue behavior.
UPDATE public.company_agent_configs
SET customization_version = greatest(customization_version, 1)
WHERE module_code = 'atendimento';

COMMENT ON COLUMN public.company_agent_configs.audio_enabled IS
  'Customer preference only. Core attendant may decide when audio is appropriate, but audio is never used when this is false.';
COMMENT ON COLUMN public.company_agent_configs.voice_id IS
  'Nexus Gateway voice ID selected by the customer. Never a provider API secret.';
COMMENT ON COLUMN public.company_agent_configs.voice_name IS
  'Display label for the selected Nexus Gateway voice.';

-- Atomically bind a durable job to a conversation runtime. This closes the
-- gap between claiming a conversation and creating the worker job.
CREATE OR REPLACE FUNCTION public.create_agent_execution_job(
  p_company_id UUID,
  p_runtime_id UUID,
  p_job_type TEXT,
  p_idempotency_key TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_priority INTEGER DEFAULT 100,
  p_max_attempts INTEGER DEFAULT 3
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id UUID;
  v_agent_instance UUID;
BEGIN
  SELECT id INTO v_agent_instance
  FROM public.company_agent_instances
  WHERE company_id = p_company_id
    AND module_code = 'atendimento'
    AND enabled = true
  LIMIT 1;

  INSERT INTO public.agent_execution_jobs(
    company_id, agent_instance_id, runtime_id, job_type,
    idempotency_key, priority, max_attempts, payload
  ) VALUES (
    p_company_id, v_agent_instance, p_runtime_id, trim(p_job_type),
    trim(p_idempotency_key), greatest(0, least(p_priority, 1000)),
    greatest(1, least(p_max_attempts, 10)), coalesce(p_payload,'{}'::jsonb)
  )
  ON CONFLICT (company_id, idempotency_key) DO UPDATE
  SET payload = EXCLUDED.payload
  RETURNING id INTO v_job_id;

  UPDATE public.agent_conversation_runtime
  SET processing_job_id = v_job_id, updated_at = now()
  WHERE id = p_runtime_id AND company_id = p_company_id;

  RETURN v_job_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_agent_execution_job(UUID,UUID,TEXT,TEXT,JSONB,INTEGER,INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_agent_execution_job(UUID,UUID,TEXT,TEXT,JSONB,INTEGER,INTEGER) TO service_role;
