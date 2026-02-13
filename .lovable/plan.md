

## Plano de Integracao Completa com Supabase

### Situacao Atual

O sistema e um CRM de WhatsApp com as seguintes funcionalidades:
- **Chat**: Conversas via Evolution API (dados vem da API externa, nao precisam ser armazenados)
- **Kanban CRM**: Leads/Deals (atualmente em memoria -- perdem-se ao recarregar)
- **Follow-up**: Agendamentos de mensagens (atualmente em memoria)
- **Propostas**: Gerador de PDF (sem persistencia)
- **Admin**: Feature flags e branding por instancia (atualmente em localStorage)
- **Autenticacao**: Apenas credenciais da Evolution API em localStorage (sem Supabase Auth)

### O Que Precisa Ser Persistido no Supabase

| Dado | Situacao Atual | Destino |
|------|---------------|---------|
| Leads/Deals do Kanban | Estado React (perde ao recarregar) | Tabela `deals` |
| Follow-up Tasks | Estado React (perde ao recarregar) | Tabela `follow_up_tasks` |
| Feature Flags por instancia | localStorage | Tabela `instance_feature_flags` |
| Branding do sistema | localStorage | Tabela `system_branding` |
| Propostas geradas | Nao salva | Tabela `proposals` |
| Usuarios/Perfis | Nao existe | Supabase Auth + tabela `profiles` |
| Roles (admin/user) | Hardcoded (`instanceName === 'admin'`) | Tabela `user_roles` |

### Plano de Implementacao (6 Etapas)

---

**Etapa 1 -- Autenticacao com Supabase Auth**

- Adicionar login/cadastro com email+senha via Supabase Auth
- Criar tabela `profiles` com campos: `id` (ref auth.users), `instance_name`, `api_key` (criptografada ou nao armazenada), `base_url`, `display_name`, `avatar_url`
- Criar tabela `user_roles` com enum `app_role` (admin, user)
- Trigger para auto-criar perfil no signup
- Substituir o login atual (que valida direto na Evolution API) por: login Supabase -> buscar perfil -> conectar Evolution API com as credenciais do perfil
- RLS em todas as tabelas

---

**Etapa 2 -- Tabela de Deals (Kanban)**

Criar tabela `deals` com todos os campos do tipo `Deal`:
- `id`, `user_id`, `title`, `company`, `tags` (text[]), `value`, `status` (enum deal_status), `date`
- `contact_id`, `avatar_url`, `phone`, `email`, `zip_code`, `address`, `number_address`, `complement`, `neighborhood`, `city`, `state`, `source`, `average_bill_value`, `budget_presented`, `notes`
- `created_at`, `updated_at`

RLS: Usuarios so veem/editam seus proprios deals.

Atualizar `SalesKanban.tsx` e `ChatDashboard.tsx` para fazer CRUD via Supabase ao inves de estado local.

---

**Etapa 3 -- Tabela de Follow-up Tasks**

Criar tabela `follow_up_tasks`:
- `id`, `user_id`, `contact_id`, `contact_name`, `avatar_url`, `scheduled_at`, `message`, `status` (pending/sent/cancelled), `type` (whatsapp/call/email)
- `created_at`, `updated_at`

RLS: Usuarios so veem/editam seus proprios follow-ups.

Atualizar `FollowUpCalendar.tsx` para persistir no Supabase.

---

**Etapa 4 -- Tabela de Propostas**

Criar tabela `proposals`:
- `id`, `user_id`, `contact_name`, `contact_number`, `project_title`, `service_type`, `description`, `tech_stack`, `timeline`
- `setup_cost`, `monthly_cost`, `hours_estimated`
- `address_data` (jsonb)
- `created_at`

RLS: Usuarios so veem/editam suas proprias propostas.

Atualizar `ProposalGenerator.tsx` para salvar no Supabase apos gerar o PDF.

---

**Etapa 5 -- Configuracoes de Admin (Feature Flags e Branding)**

Criar tabela `instance_feature_flags`:
- `id`, `instance_name` (unique), `dashboard`, `kanban`, `proposals`, `followup`, `chat`
- Gerenciada apenas por admins

Criar tabela `system_branding`:
- `id`, `system_name`, `primary_color`
- Registro unico, editavel apenas por admins

RLS: Leitura por todos autenticados, escrita apenas por admins (via `has_role()`).

Atualizar `AdminPage.tsx` e `ChatDashboard.tsx` para ler/gravar do Supabase ao inves de localStorage.

---

**Etapa 6 -- Ajustes Finais e Dashboard**

- Atualizar `Dashboard.tsx` para calcular KPIs a partir dos dados reais do Supabase
- Adicionar Realtime subscriptions do Supabase para atualizar deals/tasks em tempo real
- Remover toda dependencia de localStorage para dados de negocio (manter apenas preferencias visuais como tema claro/escuro)
- Testes end-to-end

---

### Detalhes Tecnicos

**Migrations SQL (resumo das tabelas):**

```text
1. create type app_role as enum ('admin', 'user')
2. create type deal_status as enum (12 valores do DealStatus)
3. create type task_status as enum ('pending', 'sent', 'cancelled')
4. create type task_type as enum ('whatsapp', 'call', 'email')
5. Tabelas: profiles, user_roles, deals, follow_up_tasks, proposals, instance_feature_flags, system_branding
6. Funcao has_role() SECURITY DEFINER
7. Trigger auto-create profile on signup
8. RLS policies em todas as tabelas
```

**Padrao de codigo no frontend:**
- Criar hooks customizados: `useDeals()`, `useFollowUps()`, `useProposals()`, `useFeatureFlags()`, `useBrandingConfig()`
- Cada hook encapsula queries e mutations do Supabase
- Substituir `useState` local por dados do Supabase com loading states

**Ordem de execucao recomendada:**
Etapa 1 (Auth) -> Etapa 5 (Admin/Flags) -> Etapa 2 (Deals) -> Etapa 3 (Follow-ups) -> Etapa 4 (Propostas) -> Etapa 6 (Ajustes)

A autenticacao vem primeiro porque todas as outras tabelas dependem de `user_id` para RLS.

