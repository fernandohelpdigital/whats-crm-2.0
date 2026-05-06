## Plano: Página de Transmissão (Disparo em Massa WhatsApp)

### Visão geral
Nova página "Transmissão" no menu lateral para criar e gerenciar campanhas de disparo em massa via Evolution API, com persistência no Supabase, controle de execução (play/pause/resume/delete) e métricas em tempo real.

---

### 1. Banco de dados (Supabase)

**Tabela `broadcasts`** — campanha em si
- `name` (text) — nome do disparo
- `status` (enum: draft, running, paused, completed, failed)
- `delay_preset` (text: very_short, short, medium, long, very_long)
- `delay_min_seconds`, `delay_max_seconds` (int)
- `messages` (jsonb) — array de até 30 modelos de texto
- `contact_ids` (jsonb) — array de IDs dos contatos selecionados (snapshot da segmentação)
- `total_targets`, `sent_count`, `failed_count`, `read_count`, `replied_count` (int)
- `current_index` (int) — posição para "iniciar de onde parou"
- `user_id`, timestamps

**Tabela `broadcast_logs`** — uma linha por destinatário
- `broadcast_id`, `contact_id`, `phone`, `contact_name`
- `status` (pending, sent, failed, read, replied)
- `message_text` (texto sorteado enviado)
- `message_id` (id da Evolution para correlação de leitura/resposta)
- `sent_at`, `read_at`, `replied_at`, `error`
- `user_id`, timestamps

RLS: apenas dono (`auth.uid() = user_id`) lê/escreve.

---

### 2. Edge function `broadcast-runner`
Responsável por executar o disparo em background (não trava a UI):
- Recebe `broadcast_id`
- Carrega broadcast + contatos pendentes a partir de `current_index`
- Loop: para cada contato → sorteia mensagem aleatória dos modelos → chama Evolution `/message/sendText` → grava `broadcast_logs` com `message_id` retornado → incrementa `sent_count` e `current_index` → aguarda delay aleatório dentro do preset
- Verifica antes de cada envio se status ainda é `running` (permite pausa "suave")
- Ao final, marca como `completed`

Como Edge Functions têm limite de execução, a função processa em lotes e se reagenda chamando-se novamente, ou usa um loop com checkpoint frequente. Para campanhas longas, a função grava progresso a cada envio para que possa ser retomada.

### 3. Atualização de métricas (read/replied)
O socket já existente do WhatsApp (`socketClient.ts`) recebe eventos de `messages.update` (status read) e `messages.upsert` (resposta entrante). Vamos adicionar um listener no frontend que, quando o usuário tem a página aberta, atualiza a tabela `broadcast_logs` correlacionando `message_id` para marcar `read_at` / `replied_at` e incrementar contadores.

### 4. Frontend

**`components/BroadcastPage.tsx`** — listagem de campanhas
- Cards com nome, status, progresso (barra), botões: ▶️ iniciar/retomar, ⏸️ pausar, 🗑️ excluir, 📊 métricas
- Botão "Nova Transmissão" abre wizard

**`components/BroadcastWizard.tsx`** — criação em passos
1. **Nome** + preset de atraso (radio cards: Muito curto 1–5s, Curto 5–20s, Médio 20–50s, Longo 50–120s, Muito longo 120–300s)
2. **Mensagens** — editor com até 30 textareas (add/remove), com suporte a placeholder `{{nome}}`
3. **Segmentação** — lista de contatos da tabela `contacts` com filtros por tag (multi-select), busca por nome/telefone, seleção em massa
4. **Revisão** — total de destinatários, exemplo de delay, botão "Salvar como rascunho" ou "Salvar e iniciar"

**`components/BroadcastMetricsModal.tsx`** — métricas em tempo real
- Cards: Total, Enviados, Falhas, Lidos, Respondidos
- Barra de progresso
- Tabela com últimos envios (status por contato)
- Auto-refresh a cada 3s (consulta Supabase)

### 5. Integração com menu
Adicionar item "Transmissão" no `ChatDashboard.tsx` (sidebar) com flag em `user_feature_flags` (nova coluna `broadcast`, default true). Roteamento condicional como as demais páginas.

---

### Detalhes técnicos
- Sorteio de mensagem: `messages[Math.floor(Math.random()*messages.length)]`
- Delay aleatório: `min + Math.random()*(max-min)` segundos entre envios
- Pausa: front atualiza `status='paused'` → runner detecta no próximo checkpoint e encerra
- Retomar: front chama edge function novamente; ela pula para `current_index`
- Excluir: `delete` em cascata via FK ou manual nos logs

### Observações
- O envio é feito pela edge function (server-side) para não depender do navegador aberto.
- A correlação de leitura/resposta depende dos eventos do socket; vou adicionar o handler em `ChatDashboard` para que funcione enquanto o app estiver aberto. Para captura 100% offline seria necessário um webhook da Evolution apontando para outra edge function (posso adicionar depois se quiser).

### Arquivos a criar/editar
- Migration: tabelas `broadcasts`, `broadcast_logs`, enum, RLS, coluna `broadcast` em `user_feature_flags`
- Edge function: `supabase/functions/broadcast-runner/index.ts`
- `components/BroadcastPage.tsx`, `components/BroadcastWizard.tsx`, `components/BroadcastMetricsModal.tsx`
- Edição: `components/ChatDashboard.tsx` (menu + roteamento + listener de socket para métricas)
- Edição: `types.ts` (tipos de Broadcast)
