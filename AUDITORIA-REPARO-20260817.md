# Reparo de auditoria — 2026-08-17

Correções aplicadas sobre o pacote completo de 2026-08-16:

- Restauradas as colunas de status do teste de integrações no Supabase: `last_test_at`, `last_test_status`, `last_test_message`.
- Mantida a leitura das credenciais de integração pelo servidor, sem expor chaves no browser.
- Integrações WhatsApp/n8n/Nexus/Stripe aceitam fallback de credenciais existentes no ambiente do servidor; nenhuma credencial existente foi apagada ou substituída.
- WhatsApp passou a consultar a empresa com `supabaseAdmin` no server function, evitando o erro de permissão na tabela `companies`.
- Acesso ao WhatsApp respeita admin ou assinatura Trial/active válida.
- QR da Evolution aceita os envelopes conhecidos da API e normaliza data URL/base64.
- Criação/conexão da instância aceita diferentes formatos de `fetchInstances` e usa o QR retornado na criação quando necessário.
- Refresh do WhatsApp atualiza o estado real após chamar `connect`.

Validação realizada:
- 106 arquivos TypeScript/TSX passaram por transpile/syntax check sem erros.
- `.env` foi preservado sem alteração.
- A migration de integração foi aplicada no projeto Supabase de produção.

Observação: `npm ci` não terminou dentro do limite do ambiente de auditoria; portanto a validação final de build deve ser feita no Termux com `npm install`/`npm ci` completo.
