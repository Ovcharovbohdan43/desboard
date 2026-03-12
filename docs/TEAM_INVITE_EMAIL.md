# Team Invite Email (Resend)

## Обзор

Приглашения в команду отправляются на email через [Resend](https://resend.com). Edge Function `send-invite-email` вызывается после создания invite и отправляет письмо с ссылкой.

## Конфигурация

### 1. Supabase Edge Function secrets

Добавьте в Supabase Dashboard → Project Settings → Edge Functions → Secrets:

| Секрет | Описание |
|--------|----------|
| `RESEND_API_KEY` | API ключ Resend (формат `re_xxxxx`). Получить в [Resend Dashboard](https://resend.com/api-keys) |
| `SUPABASE_ANON_KEY` | Публичный anon key проекта (обычно уже доступен в Edge Functions) |
| `UNSUBSCRIBE_SECRET` | Секрет для подписи ссылки «Отписаться от рассылки» (HMAC-SHA256). Если не задан — ссылка отписки не добавляется в письмо |

```bash
# Через Supabase CLI (опционально)
npx supabase secrets set RESEND_API_KEY=re_your_api_key
```

### 2. Деплой Edge Function

```bash
npx supabase functions deploy send-invite-email
```

## Flow

1. Пользователь вводит email и выбирает роль → нажимает «Send invite»
2. Создаётся запись в `team_invites` (createTeamInvite)
3. Вызывается Edge Function `send-invite-email` с `{ inviteId, appUrl }`
4. Функция загружает invite, team, inviter; отправляет письмо через Resend
5. При успехе — toast «Invite sent to {email}»
6. При ошибке — invite сохранён, ссылка копируется в буфер, toast с предупреждением

## Повторная отправка

Для ожидающих invites есть кнопка (Mail) «Resend invite email» — любой admin/owner команды может повторно отправить письмо.

## Отправитель (from)

По умолчанию используется `Desboard <invites@desboard.app>`. Чтобы отправлять с этого адреса, добавьте и верифицируйте домен `desboard.app` в [Resend Domains](https://resend.com/domains). Для тестов можно временно вернуть `onboarding@resend.dev`. Для production:

1. Добавьте и верифицируйте домен в [Resend Domains](https://resend.com/domains)
2. Измените `from` в `supabase/functions/send-invite-email/index.ts` при необходимости (сейчас: `invites@desboard.app`):
   ```ts
   from: "Desboard <invites@desboard.app>",
   ```

## Отписка от рассылки (Unsubscribe)

Для соответствия требованиям провайдеров почты (снижение риска попадания в спам):

1. В каждое письмо приглашения добавлена ссылка «Unsubscribe from team invite emails»
2. Страница `/unsubscribe` — публичная, без авторизации
3. Ссылка содержит подписанный токен (`i` = inviteId, `e` = base64url(email), `s` = HMAC-SHA256)
4. Edge Function `unsubscribe-email` проверяет подпись и добавляет email в таблицу `email_unsubscribes`
5. Перед отправкой письма `send-invite-email` проверяет, не отписан ли получатель; при наличии записи в `email_unsubscribes` письмо не отправляется

```bash
npx supabase functions deploy unsubscribe-email
npx supabase secrets set UNSUBSCRIBE_SECRET=your_random_secret_32_chars
```

## Ограничения

- Письмо отправляется только авторизованным пользователям (inviter или admin/owner команды)
- Invite должен быть активен (не истёк)
- `SUPABASE_ANON_KEY` обязателен для проверки JWT пользователя
- Email, отписанные от рассылки, не получают приглашений (с возвратом ошибки вызывающему API)

## Версия

- 2025-03-12 — Отписка от рассылки (unsubscribe link, страница `/unsubscribe`, Edge Function `unsubscribe-email`)
- 2025-03-12 — Первая версия (Resend, Edge Function)
