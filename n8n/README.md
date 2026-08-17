# Nexus n8n — workflows

1. `nexus-chat-4-agentes.json`: atendimento/sdr/audio para clientes e Designer somente para administração.
2. `nexus-ops-watchdog.json`: recebe eventos de pagamento, segurança e erros, analisa com Nexus e envia relatório ao WhatsApp administrativo.

Variáveis do n8n:
- N8N_CHAT_WEBHOOK_SECRET
- NEXUS_BASE_URL
- NEXUS_API_KEY
- NEXUS_MODEL=nexus-auto
- EVOLUTION_API_URL
- EVOLUTION_API_KEY
- EVOLUTION_INSTANCE
- OPS_ADMIN_WHATSAPP

A correção automática de código não é feita por um agente com acesso irrestrito ao servidor. O Watchdog diagnostica e recomenda/reexecuta somente ações operacionais seguras; mudanças de código devem passar por uma rotina de patch + teste + rollback controlada.
