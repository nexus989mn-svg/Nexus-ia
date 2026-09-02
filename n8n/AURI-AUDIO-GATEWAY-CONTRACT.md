# AURI — Contrato de Áudio com Nexus Gateway

O Atendimento continua sendo o dono da conversa. Áudio é somente uma forma auxiliar de entrega.

## Configuração
- `company_agent_configs.audio_enabled` controla se a empresa habilitou áudio.
- `company_agent_configs.voice_id` guarda somente o ID da voz clonada do Nexus Gateway.
- `company_agent_configs.voice_name` é apenas o rótulo exibido no app.
- As vozes disponíveis ficam em `agent_voice_catalog`.

## Gateway
POST `https://intelligent-ai-router.lovable.app/api/public/v1/audio/speech`

Headers:
- `Authorization: Bearer <NEXUS_GATEWAY_TOKEN>`
- `Content-Type: application/json`

Body mínimo:
```json
{"input":"Texto a falar","voice_id":"<ID_DA_VOZ>"}
```

O Gateway retorna JSON contendo a URL do áudio. O n8n deve fazer GET nessa URL para obter o binário e então entregar pelo canal conectado (WhatsApp etc.).

Não enviar arquivo da voz novamente e não usar TTS genérico quando houver `voice_id` configurado.
