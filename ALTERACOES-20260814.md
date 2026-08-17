# Correções finais — Nexus SaaS

## Cliente
- Treinamento visual em `/training`, com tutorial passo a passo e ilustrações internas.
- Personalização por empresa em `company_agent_configs`.
- Nome, comportamento, contexto da empresa e regras ficam isolados por `company_id`.
- Cliente não pode configurar Designer.
- Designer é interno/admin-only.
- Personalização nunca substitui regras de segurança nem concede acesso administrativo.

## Catálogo
- Mantido separado do Designer.
- O agente de catálogo continua responsável pelo produto; nenhuma alteração no Designer substitui automaticamente uma imagem do catálogo.

## Billing
- Removido modo MOCK de ativação paga.
- Mensal: US$ 28.
- Anual: US$ 280.
- Pagamento pago é confirmado por webhook assinado do Stripe antes de `subscriptions.status = active`.
- Falha de pagamento bloqueia o acesso.
- Portal/cancelamento usam Stripe real.
- Trial exige WhatsApp conectado e verifica email + telefone contra ledger permanente.
- Tentativa de reutilização bloqueia a assinatura e gera evento operacional.
- Assinaturas mock antigas são bloqueadas.

## Operação
- `operational_events` registra pagamentos, segurança e erros.
- `Nexus Watchdog` no n8n analisa eventos e envia relatório ao WhatsApp administrativo.
- O Watchdog não recebe acesso irrestrito ao código. Correções de código devem seguir patch + teste + rollback.

## Segurança
- Credenciais de integração não são mais devolvidas ao navegador.
- Funções administrativas usam service role no servidor.
- Cliente só vê que a chave está configurada.
- Designer é bloqueado no endpoint para não-admin.

## Preparação multi-tenant + runtime (2026-08-15)

- Cliente não recebe acesso à Central interna de agentes.
- O menu administrativo pode abrir a Central interna; o cliente vê somente funcionalidades do produto.
- "Treinar IA" foi transformado em "Conhecimento da empresa" sem seletor de agentes. O conhecimento é compartilhado com os módulos internos voltados ao cliente, mantendo o Designer interno.
- Novo runtime Supabase preparado para multi-tenant: `company_agent_instances`, `agent_conversation_runtime`, `agent_inbox_messages`, `agent_execution_jobs` e `catalog_design_jobs`.
- Cada empresa recebe automaticamente instâncias lógicas de Atendimento, SDR, Áudio e Designer.
- Não foi criado limite de quantidade de clientes.
- Debounce padrão de 3 segundos, idempotência por empresa/mensagem, locks atômicos e workers com `SKIP LOCKED` foram preparados via RPC.
- O fluxo n8n existente não foi alterado nesta etapa.
- Catálogo ganhou o ponto de entrada "Criar catálogo profissional", que cria um job persistente para a futura ponte Catálogo → Designer interno → Canva.
