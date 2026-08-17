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