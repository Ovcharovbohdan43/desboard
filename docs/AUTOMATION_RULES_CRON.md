# Automation Rules — Cron Setup

Автоматический запуск правил из `automation_rules` выполняется по расписанию (cron).

## 1. Деплой Edge Function

```bash
supabase functions deploy run-automation-rules
```

## 2. Вызов по cron

### Вариант A: Внешний cron (cron-job.org, GitHub Actions)

Создайте HTTP-запрос к функции:

```
POST https://<PROJECT_REF>.supabase.co/functions/v1/run-automation-rules
Authorization: Bearer <SUPABASE_ANON_KEY или SERVICE_ROLE_KEY>
Content-Type: application/json
```

Рекомендуемый интервал: каждые 5–15 минут.

### Вариант B: pg_cron (внутри Supabase)

Если включён pg_cron, можно вызывать через `pg_net` или внешний триггер. Для Edge Functions обычно используют внешний cron.

### Вариант C: Vercel Cron / Railway Cron

Добавьте в `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/automation-rules",
    "schedule": "*/5 * * * *"
  }]
}
```

И API route, который вызывает Edge Function.

## 3. Секреты

Edge Function получает из окружения:

- `SUPABASE_URL` — URL проекта
- `SUPABASE_SERVICE_ROLE_KEY` — сервисный ключ (для доступа к automation_rules)

При деплое Supabase задаёт их автоматически.

## 4. Расширение логики

Сейчас функция только читает правила. Для реальной логики нужно:

1. Определить `event_type` (например `project_status_changed`, `deliverable_completed`).
2. Реализовать проверку `conditions` (например фильтр по `project_id`, `status`).
3. Реализовать выполнение `actions` (например обновление проекта, отправка уведомления).

Рекомендуется вести очередь событий и обрабатывать её в worker.
