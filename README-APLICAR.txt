AURI — correção da aba Suporte

Arquivos incluídos:
- src/lib/support-i18n.ts
- src/lib/support.functions.ts
- src/routes/_authenticated/support.tsx
- src/components/app-shell.tsx
- supabase/migrations/20260904203453_add_in_app_support_multitenant.sql

O banco Supabase já recebeu a migration correspondente. A migration está no projeto para manter o schema versionado.

Aplicação no Termux:
1. Entre no projeto:
   cd ~/Nexus-ia
2. Faça backup dos 4 arquivos existentes:
   cp src/components/app-shell.tsx src/components/app-shell.tsx.bak-support
   cp src/routes/_authenticated/support.tsx src/routes/_authenticated/support.tsx.bak-support
3. Copie o conteúdo desta pasta para a raiz do projeto, preservando os caminhos.
4. Depois:
   npm run build

A aba Suporte agora é um atendimento real por conta/empresa:
- cada usuário vê somente seus próprios atendimentos;
- cada atendimento fica preso ao company_id da empresa;
- mensagens entram na fila pending_ai para o n8n;
- respostas da AURI/humano aparecem no mesmo painel;
- polling automático atualiza a conversa;
- encerramento de atendimento;
- interface responsiva sem o card estático antigo;
- textos da aba e do menu acompanham PT-BR, EN e ES sem alterar o restante do i18n existente.

Importante:
O fluxo do n8n precisa consumir support_messages com status=pending_ai e gravar a resposta como sender_type=ai, além de atualizar o support_threads.status para answered. A estrutura já está preparada para isso; não há chamada direta do navegador para o n8n.
