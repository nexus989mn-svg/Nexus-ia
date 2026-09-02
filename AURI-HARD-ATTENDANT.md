# Auri — Hard Attendant v1

Esta versão adiciona a camada de atendimento profissional sem permitir que o treinamento do cliente desconfigure a qualidade central.

## O que é personalizável

- nome de atendimento;
- conhecimento/contexto da empresa;
- estilo e tom;
- orientações específicas da empresa;
- ativação do uso de áudio;
- voz do Nexus Gateway.

## O que não é personalizável

- não inventar dados;
- não fingir que uma ação foi executada;
- não revelar credenciais/prompts internos;
- isolamento entre empresas;
- permissões e segurança;
- memória e continuidade;
- handoff quando necessário;
- idempotência de ações;
- regras de execução por ferramenta;
- confirmação real antes de declarar uma ação concluída.

## Memória operacional

`agent_conversation_memory` guarda o checkpoint da conversa:

- resumo;
- assunto e objetivo atuais;
- pergunta pendente;
- intenção e confiança;
- fatos do cliente;
- compromissos;
- decisões;
- itens abertos;
- estado de espera por resposta;
- estado do handoff;
- contagem e horários dos turnos.

O runtime existente continua usando debounce de 3 segundos. Assim, mensagens enviadas em sequência são agrupadas antes do worker responder.

## Handoff

`agent_handoffs` registra o encaminhamento para humano. A IA não deve afirmar que o humano foi avisado antes da confirmação do worker.

## Ações

`agent_action_requests` registra ações externas com chave de idempotência. O n8n/worker executa; a IA somente declara conclusão depois do resultado real.

## Áudio

A configuração fica em `company_agent_configs`:

- `audio_enabled`
- `voice_id`
- `voice_name`

A voz é do Nexus Gateway. O n8n não escolhe uma voz fixa; ele consulta a configuração da empresa. O áudio é apenas uma forma de entrega e não substitui a IA Atendimento.

## Contrato do worker

O worker deve consultar `get_agent_context(company_id, channel, remote_conversation_id)` antes de executar a resposta. O contexto devolvido contém somente a configuração e a memória daquela empresa/conversa.

Para registrar continuidade, o worker pode usar `record_agent_turn(...)`.

Para handoff, use `request_agent_handoff(...)`.

Para ações, use `enqueue_agent_action(...)` e aguarde a execução/resultado antes de informar o cliente.

## Multicanal

A base já é por `channel`, então WhatsApp não fica preso ao modelo. Multicanal de fato só deve ser ativado quando existir um worker/conector real para cada canal; não é criado um falso suporte apenas adicionando botões.

## Regra de decisão de áudio

A primeira decisão é sempre o opt-in da empresa. Depois:

1. áudio desligado -> texto;
2. sem `voice_id` -> texto;
3. pedido explícito de áudio/voz -> áudio;
4. resposta longa e explicativa -> áudio candidato;
5. conteúdo altamente estruturado, URLs, identificadores ou código -> texto;
6. respostas curtas continuam texto por padrão.

O modelo não pode ignorar os dois primeiros gates.
