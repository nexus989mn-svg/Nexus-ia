# Integração Nexus Chat + n8n

## Fluxo oficial

Chat web → `/api/chat` → Webhook n8n `nexus-chat` → Switch por `moduleCode` → agente especializado → Nexus IA (`/chat/completions`) → Respond to Webhook → `/api/chat` → UI.

O n8n não chama Gemini, OpenAI, OpenRouter ou Lovable AI. O único motor de geração é o Nexus IA.

## Agentes

- `atendimento`: atendimento geral, intenção, catálogo e encaminhamento.
- `sdr`: qualificação e prospecção.
- `designer`: briefing e orientação de design.
- `audio`: processamento de transcrições e preparação de texto para áudio.

## Multi-tenant

O backend envia `userId`, `companyId`, `conversationId`, `companyName`, `moduleCode` e histórico de mensagens. O n8n usa `companyId` apenas como contexto do tenant e não consulta dados de outra empresa.

## Segurança

Configure `N8N_CHAT_WEBHOOK_SECRET` no n8n e o mesmo segredo em `integration_credentials.config.webhook_secret`. Opcionalmente mantenha uma API key para autenticação adicional. Nunca exponha essas credenciais no browser.

## Nexus no n8n

Configure no ambiente do n8n:

- `NEXUS_BASE_URL=https://intelligent-ai-router.lovable.app/api/public/v1`
- `NEXUS_API_KEY=<chave do Nexus>`

O workflow usa `POST $NEXUS_BASE_URL/chat/completions` com `model: nexus-auto`.

## Dados financeiros e agenda

O antigo Google Sheets fixo e o Google Calendar fixo foram removidos do fluxo. Dados financeiros, cobrança, agenda e credenciais específicas de cada empresa devem ser executados por ferramentas server-side da empresa quando essas integrações estiverem configuradas. O n8n não usa uma planilha/calendário global.
