-- ============================================================
-- PIX / PAGAMENTOS MANUAIS RECORRENTES
-- Cartão continua usando Stripe Subscription.
-- Pix é uma cobrança avulsa por ciclo.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,

  provider TEXT NOT NULL DEFAULT 'stripe',
  payment_method TEXT NOT NULL DEFAULT 'pix',

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','expired','failed','canceled')),

  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'brl',

  provider_payment_id TEXT,
  provider_customer_id TEXT,

  pix_qr_code TEXT,
  pix_qr_code_url TEXT,
  pix_expires_at TIMESTAMPTZ,

  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user
  ON public.payment_orders(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_orders_status
  ON public.payment_orders(status);

CREATE INDEX IF NOT EXISTS idx_payment_orders_provider_payment
  ON public.payment_orders(provider_payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_orders_expires
  ON public.payment_orders(pix_expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_orders_provider_payment_unique
  ON public.payment_orders(provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_payment_orders_updated
ON public.payment_orders;

CREATE TRIGGER trg_payment_orders_updated
BEFORE UPDATE ON public.payment_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.payment_orders TO authenticated;
GRANT ALL ON public.payment_orders TO service_role;

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own payment orders"
ON public.payment_orders;

CREATE POLICY "Users view own payment orders"
ON public.payment_orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Adiciona informação da forma de cobrança na assinatura.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_payment_method_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_payment_method_check
  CHECK (
    payment_method IS NULL
    OR payment_method IN ('card','pix')
  );

CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_method
  ON public.subscriptions(payment_method);
