# Security hardening aplicado

Esta versão reforça o backend sem expor mecanismos de segurança na interface pública.

## Principais mudanças

- Mutação de `subscriptions` removida do cliente autenticado; alterações passam pelo servidor.
- Ledger permanente `trial_claims` para impedir Trial reutilizado por e-mail ou número.
- Histórico de Trial não é apagado quando a conta é excluída.
- Contas que tentam reutilizar Trial são bloqueadas no backend.
- Número de WhatsApp usado durante Trial é vinculado ao registro do Trial.
- Credenciais de integrações não são mais devolvidas ao navegador; somente status de configuração.
- Chaves existentes são preservadas quando o campo de API Key fica vazio ao salvar.
- WhatsApp passa a usar operações server-side para o estado da conexão.
- Webhook Stripe público agora falha fechado e não aceita JSON não assinado.
- Checagem de assinatura foi centralizada no servidor para os recursos de IA.
- Preços corrigidos para US$ 28/mês e US$ 280/ano.
- Novos usuários não recebem Trial automaticamente antes da validação de elegibilidade.
- `.env` e arquivos de ambiente locais ficam fora do controle de versão.

## Importante

A migration `supabase/migrations/20260814060000_security_hardening.sql` precisa ser aplicada no banco Supabase antes de usar esta versão.

O servidor precisa de `SUPABASE_SERVICE_ROLE_KEY` configurada no ambiente do servidor. Essa chave nunca deve ser enviada para o navegador.

A verificação real da assinatura Stripe continua deliberadamente bloqueada até ser ligada com uma implementação oficial de verificação. Isso é intencional: é melhor rejeitar um webhook do que aceitar um webhook falsificado.
