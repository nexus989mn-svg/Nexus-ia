ALTER TABLE public.integration_credentials
  ADD COLUMN IF NOT EXISTS last_test_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_test_status text,
  ADD COLUMN IF NOT EXISTS last_test_message text;

COMMENT ON COLUMN public.integration_credentials.last_test_at IS 'Último teste de conectividade da integração';
COMMENT ON COLUMN public.integration_credentials.last_test_status IS 'Resultado do último teste: ok ou fail';
COMMENT ON COLUMN public.integration_credentials.last_test_message IS 'Mensagem resumida do último teste';
