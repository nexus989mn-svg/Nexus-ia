-- Atomic Trial claim: one email OR one phone can consume it only once.
CREATE OR REPLACE FUNCTION public.claim_trial(
  p_user_id UUID,
  p_plan_id UUID,
  p_email TEXT,
  p_phone TEXT,
  p_period_end TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RAISE EXCEPTION 'WHATSAPP_REQUIRED';
  END IF;

  INSERT INTO public.trial_claims(user_id, email_normalized, phone_e164, source, metadata)
  VALUES (p_user_id, lower(trim(p_email)), trim(p_phone), 'checkout', jsonb_build_object('plan','trial'))
  RETURNING id INTO v_id;

  INSERT INTO public.subscriptions(user_id, plan_id, status, trial_ends_at, current_period_start, current_period_end, blocked_reason)
  VALUES (p_user_id, p_plan_id, 'trial', p_period_end, now(), p_period_end, NULL)
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    trial_ends_at = EXCLUDED.trial_ends_at,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    blocked_reason = NULL;

  RETURN v_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'TRIAL_ALREADY_USED';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_trial(UUID,UUID,TEXT,TEXT,TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_trial(UUID,UUID,TEXT,TEXT,TIMESTAMPTZ) TO service_role;

-- Never let legacy mock subscriptions grant paid access in production.
UPDATE public.subscriptions
SET status = 'blocked',
    blocked_reason = 'Assinatura de teste/mock desativada; pagamento Stripe necessário.'
WHERE status = 'active'
  AND (stripe_subscription_id LIKE 'mock_%' OR stripe_customer_id LIKE 'mock_%');
