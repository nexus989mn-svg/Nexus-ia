## Etapa única — Base SaaS profissional multi-empresa

Tudo que já existe permanece. Nada de dados fictícios. Nada de agentes/workflows ainda.

---

### 1. Banco — arquitetura multi-tenant (1 migração)

Nova tabela `companies` (id, owner_user_id, name, slug, document, phone, email, logo_url, timezone, locale, timestamps) com RLS:
- Dono lê/edita sua empresa.
- Admin global lê/edita todas (via `has_role`).

Adicionar coluna `company_id uuid REFERENCES companies(id) ON DELETE CASCADE` em:
`catalog_products`, `catalog_categories`, `whatsapp_connections`, `briefings`, `ai_modules`, `integration_credentials`.

Backfill:
- Para cada `auth.users` existente sem empresa: cria 1 company (nome = profile.full_name ou email), `owner_user_id = user.id`.
- Preenche `company_id` em todas as linhas existentes nas tabelas acima a partir do `user_id` do dono.
- Depois: `ALTER COLUMN company_id SET NOT NULL` nas operacionais.

Trigger `handle_new_user` estendida: ao criar usuário, cria company automaticamente e devolve id.

RLS atualizada nas 6 tabelas: troca `user_id = auth.uid()` por `company_id IN (SELECT id FROM companies WHERE owner_user_id = auth.uid())` OR `has_role(auth.uid(),'admin')`. Mantém GRANTs existentes.

Função helper `current_company_id()` SECURITY DEFINER para uso nos serverFns.

Sem apagar coluna `user_id` antiga — fica como auditoria.

---

### 2. Server functions

Nova `src/lib/company.functions.ts`:
- `getMyCompany` — retorna empresa do usuário logado.
- `updateMyCompany` — atualiza dados (nome, doc, telefone, logo, timezone).
- `getBillingHistory` — lê `billing_events` + `subscriptions` do usuário.

Ajustes nas existentes (`catalog`, `whatsapp`, `admin-config`): trocam filtros `user_id` por `company_id` resolvido via helper. Assinaturas e API não mudam.

Admin (`src/lib/admin.functions.ts`): adicionar `listCompanies`, `listSubscriptionsAll`, `listSystemLogs` paginados.

---

### 3. Rotas novas (área do cliente)

- `/_authenticated/profile` — dados do usuário (nome, e-mail, senha).
- `/_authenticated/company` — dados da empresa (form completo + upload logo via URL por enquanto).
- `/_authenticated/billing` (já existe) — adiciona aba **Histórico** lendo `billing_events`.

Sidebar passa a ter: Painel, WhatsApp, Catálogo, Empresa, Perfil, Assinatura, Administração (admin).

---

### 4. Admin com dados reais

Reformula `/_authenticated/admin` adicionando abas:
- **Clientes/Empresas** — tabela paginada de companies + owner + plano + status.
- **Assinaturas** — todas as subscriptions com filtro por status.
- **Logs** — `system_logs` recente com filtro por severidade.

Mantém tudo que já existe (Integrações, Módulos IA, Briefings, Configurações).

---

### 5. Redesign visual preto/verde mobile-first

Tokens já existem em `src/styles.css` (preto #0B0F0C / verde #22C55E). Aplicar consistentemente:
- `AppShell` vira `Sidebar` shadcn com `collapsible="icon"` (desktop) e Sheet (mobile), header sticky com trigger.
- Todas as rotas autenticadas usam padrão: page header (título + ação primária), cards `bg-card-glass` com `shadow-elegant`, espaçamento responsivo `p-4 md:p-6 lg:p-8`.
- Landing `/` redesenhada: hero preto com glow verde, seções Recursos, Como funciona, Planos (lendo `plans` real), CTA, footer. Mobile-first.
- Touch targets ≥44px, inputs grandes, tabelas viram cards em mobile.

---

### 6. i18n pt-BR completo

Auditoria do `src/lib/i18n.ts`: garantir 100% das chaves presentes em pt-BR e usadas em todas as rotas. Remover textos hardcoded em inglês remanescentes. Idioma fixo pt-BR (switcher já reduzido).

---

### Técnico

- Migração única com 4 blocos: CREATE companies + GRANT + RLS + policies; ALTER ADD company_id nas 6 tabelas; backfill DO block; ALTER NOT NULL + helper function + trigger update.
- Após migração: regen types automático, então atualizar serverFns e UI.
- Sidebar shadcn substitui `AppShell` atual mas mantém rotas/labels — só visual.
- Nenhum agente, workflow, integração nova de IA nesta etapa.

---

### Fora de escopo (próxima etapa)

Agentes IA por empresa, workflows, memória vetorial, multi-usuário por empresa (members/convites), upload real de logo via storage.
