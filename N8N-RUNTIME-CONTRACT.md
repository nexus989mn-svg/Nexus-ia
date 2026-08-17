# Nexus Agent Runtime — contrato para a próxima camada n8n

Este arquivo **não altera os workflows n8n atuais**. Ele registra o contrato preparado pelo app/Supabase para a próxima versão dos workers.

## Princípios

- Multi-tenant: cada empresa é isolada por `company_id`.
- Não existe limite artificial de 300 clientes no modelo de dados.
- Cada empresa recebe quatro instâncias lógicas internas: `atendimento`, `sdr`, `audio`, `designer`.
- O cliente não vê os agentes internos.
- `designer` é interno/admin e executa trabalhos de catálogo/Canva.
- A fila é por conversa/empresa; uma empresa não bloqueia outra.
- Debounce padrão para mensagens de conversa: 3 segundos, renovado a cada nova mensagem.
- Idempotência usa `company_id + message_id` para webhooks e `company_id + idempotency_key` para jobs.
- Workers usam `SKIP LOCKED` via RPC para evitar duas execuções do mesmo job.

## Tabelas novas

- `company_agent_instances`
- `agent_conversation_runtime`
- `agent_inbox_messages`
- `agent_execution_jobs`
- `catalog_design_jobs`

## RPCs para os workers

### Entrada de mensagem

`public.enqueue_agent_message(...)`

Cria/atualiza o estado da conversa, registra a mensagem de forma idempotente e reinicia o debounce.

### Buscar conversas prontas

`public.claim_ready_agent_conversations(worker_id, limit)`

Retorna conversas cujo debounce terminou e aplica lock atômico por conversa.

### Buscar jobs

`public.claim_agent_jobs(worker_id, limit, job_type)`

Entrega jobs em estado `queued` a um worker sem permitir dupla aquisição.

### Finalizar job

`public.finish_agent_job(job_id, worker_id, success, result, error)`

Conclui ou reencaminha o job para retry e libera o lock da conversa.

### Recuperar locks antigos

`public.recover_stale_agent_runtime(timeout_seconds)`

Usado pelo watchdog para recuperar execuções interrompidas.

## Fluxo WhatsApp futuro

`Evolution webhook -> enqueue_agent_message -> debounce -> claim_ready_agent_conversations -> criar agent_execution_job -> claim_agent_jobs -> n8n -> agente correto -> Nexus IA -> resposta -> finish_agent_job -> Evolution`

O workflow atual de quatro agentes permanece intocado nesta etapa.

## Fluxo Catálogo futuro

`Catálogo do app -> catalog_design_jobs (queued) -> agent_execution_jobs (catalog_design) -> IA Designer interna -> Canva Bridge -> atualizar catalog_design_jobs -> devolver resultado ao app`

O cliente só vê a funcionalidade **Criar catálogo profissional**. O nome/controle da IA Designer fica no ambiente administrativo interno.
