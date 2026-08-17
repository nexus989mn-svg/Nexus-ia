# Nexus — Arquitetura Multi-tenant + Runtime de Agentes

## Regra do produto

O cliente não enxerga agentes internos. Ele enxerga somente as funcionalidades do SaaS.

- WhatsApp: o atendimento responde ao cliente, sem expor a implementação interna.
- Catálogo: o cliente usa "Criar com IA"/"Criar catálogo profissional" como funcionalidade.
- Designer: interno/admin; não aparece no painel do cliente.
- SDR e Áudio: internos; não aparecem no painel do cliente.

## Isolamento

Cada conta possui `company_id` próprio. O cadastro de uma empresa provisiona quatro instâncias lógicas internas:

- `atendimento_<company_id>`
- `sdr_<company_id>`
- `audio_<company_id>`
- `designer_<company_id>`

A configuração e o runtime nunca devem usar "último usuário", estado global ou memória compartilhada entre empresas.

## Concorrência

A fila não é global entre empresas. Ela é particionada por empresa e conversa.

Cada conversa WhatsApp possui seu próprio:

- debounce;
- lock;
- estado de processamento;
- lote de mensagens;
- job;
- idempotência.

Uma empresa não espera a outra.

## Debounce

Padrão inicial: 3 segundos após a última mensagem recebida. Cada nova mensagem reinicia o contador. O valor pode ser alterado pelo worker/n8n dentro do limite seguro definido na RPC.

## Idempotência

- Entrada: `company_id + message_id`.
- Job: `company_id + idempotency_key`.

Isso evita respostas duplicadas quando um webhook é reenviado.

## Jobs

`agent_execution_jobs` é a fila durável.

Workers n8n usam:

1. `claim_ready_agent_conversations`
2. agrupam as mensagens pendentes
3. criam/atualizam `agent_execution_jobs`
4. `claim_agent_jobs`
5. executam o agente correspondente
6. chamam `finish_agent_job`
7. liberam a conversa

O watchdog usa `recover_stale_agent_runtime` para recuperar locks interrompidos.

## Catálogo → Designer → Canva

O app cria `catalog_design_jobs` com:

- `company_id`
- usuário solicitante
- briefing
- referências
- snapshot dos produtos/categorias
- status

Também cria um `agent_execution_job` do tipo `catalog_design` ligado à instância interna de Designer daquela empresa.

A próxima camada n8n consumirá esse job e fará:

`Catálogo -> Designer interno -> Canva -> resultado -> app`

O app já está preparado para esse fluxo, mas o workflow n8n/Canva não foi alterado nesta etapa.

## Sem limite artificial de clientes

Não foi criado `MAX_CUSTOMERS`, contador global ou fila única. O modelo é multi-tenant e pode ser escalado com mais workers conforme a infraestrutura crescer.
