# Подключение Supabase к проекту

## 1. Переменные окружения

Создайте `.env` в корне проекта (или убедитесь, что они заданы):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

## 2. Применение миграций

### Вариант A: Supabase CLI (локально)

```bash
# Установка CLI (если ещё не установлен)
npm install -g supabase

# Привязка к проекту
npx supabase link --project-ref aqgwigjzvpcjzaymfnbw

# Применение миграций
npx supabase db push
```

### Вариант B: Supabase Dashboard

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard) → ваш проект
2. **SQL Editor** → New query
3. Скопируйте и выполните по очереди:
   - `supabase/migrations/20260308999999_initial_schema.sql`
   - `supabase/migrations/20260309000000_enable_rls.sql`

### Вариант C: supabase db push (без link)

```bash
npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

Пароль можно взять в Dashboard → Project Settings → Database.

## 2.1. Edge Functions (опционально)

Для отправки приглашений по email через Resend:

1. Secrets: Dashboard → Project Settings → Edge Functions → `RESEND_API_KEY`, `SUPABASE_ANON_KEY`
2. Деплой: `npx supabase functions deploy send-invite-email`
3. Подробности: `docs/TEAM_INVITE_EMAIL.md`

## 3. Проверка

После применения миграций:

1. В Dashboard → Table Editor должны появиться таблицы: `teams`, `team_members`, `profiles`, `transactions`, `expense_categories`, `income_sources`
2. Authentication → Enable Email provider (если ещё не включён)
3. При необходимости отключите "Confirm email" в Authentication → Providers → Email для упрощённой разработки

## 4. Phase 2 migrations

After the initial schema, run:

- `supabase/migrations/20260309100000_projects_tasks.sql` — creates clients, projects, tasks, milestones, project_files
- `supabase/migrations/20260309100001_projects_rls.sql` — RLS for Phase 2 tables

## 5. Phase 3 migrations (Client Portal + Handoff)

- `supabase/migrations/20260310100000_client_portal_handoff.sql` — deliverables, handoff_versions, client_messages, invoices
- `supabase/migrations/20260310100001_client_portal_rls.sql` — RLS for Phase 3 tables

## 6. Роуты

| Путь | Доступ |
|------|--------|
| `/login` | Публичный |
| `/register` | Публичный |
| `/` | Требует авторизации |
| `/widget/:id` | Требует авторизации |
| `/portal/:portalId` | Требует авторизации. `portalId` — UUID проекта или slug (например `flux-brand`) |
| `/client/:projectId` | Публичный (портал клиента). `projectId` — UUID или slug (например `mono-website`) |
