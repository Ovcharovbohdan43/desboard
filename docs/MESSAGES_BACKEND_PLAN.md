# План разработки бекенда — виджет Messages

**Версия:** 1.0  
**Дата:** 2026-03-12  
**Статус:** Черновик

---

## 1. Назначение документа

Документ описывает **детальный план разработки бекенда для виджета Messages** в Desboard Hub: цели, текущее состояние, выбор модели данных, целевая архитектура, фазы разработки, API-контракты, безопасность, тестирование и порядок внедрения. План соответствует техническим требованиям для enterprise-приложений (безопасность, RLS, API-first, масштабируемость, тестируемость).

**Отличие от Client Portal messages:** В приложении уже реализованы **client_messages** — сообщения в контексте проекта между командой и клиентом (портал, handoff). Виджет **Messages** предназначен для **внутренних сообщений команды** (личные чаты, при необходимости — каналы). Это отдельная доменная область и отдельная схема БД.

**Связанные документы:**
- [BACKEND_INTEGRATION_PLAN.md](./BACKEND_INTEGRATION_PLAN.md) — общий план (Фаза 6: Messages)
- [API_STRUCTURE.md](./API_STRUCTURE.md) — структура API и хуков
- [PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md) — роль виджета Messages в продукте

---

## 2. Обзор виджета Messages

### 2.1 Назначение

**Messages** — виджет на дашборде и полноэкранная страница (`/widget/messages`), обеспечивающая **внутреннюю коммуникацию команды**: обмен сообщениями между участниками команды (личные переписки и при необходимости общие каналы). Не путать с перепиской по проекту с клиентом (Client Portal).

### 2.2 Структура UI (текущая)

| Элемент | Назначение | Текущий источник данных |
|--------|------------|--------------------------|
| **MessagesPreview** (карточка на дашборде) | Счётчик непрочитанных, превью последних сообщений, всего сообщений | Мок `initialMessages` |
| **MessagesExpanded** (страница `/widget/messages`) | Список переписок, поиск, открытие одного чата, просмотр сообщений, ответ | Мок `initialMessages`, локальный state |
| Детальный вид сообщения | Отправитель, время, проект (опц.), текст, кнопка «Ответить» | Мок |

### 2.3 Текущее состояние

- **Код:** `src/components/dashboard/MessagesWidget.tsx` — только моковые данные (`initialMessages`), нет запросов к Supabase.
- **Роутинг:** Виджет зарегистрирован в `Index.tsx` и `WidgetPage.tsx` для `/widget/messages`.
- **Feature flags:** Виджет **не включён** в `ENABLED_WIDGETS` в `src/lib/featureFlags.ts` — отображается как «Coming soon» или не кликабелен.
- **Бекенд:** Таблиц для внутренних сообщений команды **нет**. Таблица `client_messages` используется только для Client Portal (проект ↔ клиент).

### 2.4 Целевое поведение

- Участник команды видит список своих чатов (личные и при наличии — каналы).
- В каждом чате — история сообщений с возможностью отправки текста и вложений.
- Непрочитанные сообщения подсвечиваются; счётчик непрочитанных на карточке и в сайдбаре.
- Опционально: realtime-обновление при новых сообщениях.
- Поиск по отправителю и тексту сообщений.

---

## 3. Выбор модели данных

В [BACKEND_INTEGRATION_PLAN.md](./BACKEND_INTEGRATION_PLAN.md) (Фаза 6) предложены два варианта:

| Вариант | Описание | Плюсы | Минусы |
|---------|----------|--------|--------|
| **A** | Одна таблица сообщений: `(team_id, from_user_id, to_user_id?, project_id?, text, read, created_at)` | Простота, быстрый старт | Нет явной сущности «чат»; сложнее группировать переписку и добавлять каналы |
| **B** | Чаты + участники + сообщения: `chats`, `chat_participants`, `messages` | Масштабируемость, личные чаты и каналы, гибкая модель прочтений | Больше таблиц и миграций |

**Рекомендация: Вариант B (чаты + участники + сообщения).**

Обоснование:
- Соответствует типичным мессенджерам (Slack, Teams, Discord): сущность «чат» и участники.
- Позволяет в будущем ввести каналы (`type = 'channel'`) без смены схемы.
- Удобно считать непрочитанные по участнику и чату (отдельная таблица или поле `last_read_at` в участниках).
- Совместимо с Supabase Realtime (подписка на вставки в `messages` по `chat_id`).

Имена таблиц с префиксом **`team_`** для явного отделения от `client_messages`:
- `team_chats` — чаты (команда, тип, название).
- `team_chat_participants` — участники чата и метка «прочитано до».
- `team_chat_messages` — сообщения в чате.
- `team_chat_message_attachments` — вложения (по аналогии с `client_message_attachments`).

---

## 4. Целевая схема БД

### 4.1 Таблицы

```sql
-- Чаты (личные или канал)
team_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'channel')),
  name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Участники чата + метка прочтения
team_chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.team_chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  last_read_at timestamptz,
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(chat_id, user_id)
);

-- Сообщения
team_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.team_chats(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Вложения
team_chat_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.team_chat_messages(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  name text NOT NULL,
  size_bytes bigint DEFAULT 0,
  type text DEFAULT 'file',
  created_at timestamptz DEFAULT now() NOT NULL
);
```

### 4.2 Индексы

```sql
CREATE INDEX idx_team_chats_team_id ON public.team_chats(team_id);
CREATE INDEX idx_team_chat_participants_chat_id ON public.team_chat_participants(chat_id);
CREATE INDEX idx_team_chat_participants_user_id ON public.team_chat_participants(user_id);
CREATE INDEX idx_team_chat_messages_chat_id ON public.team_chat_messages(chat_id);
CREATE INDEX idx_team_chat_messages_created_at ON public.team_chat_messages(chat_id, created_at);
CREATE INDEX idx_team_chat_message_attachments_message_id ON public.team_chat_message_attachments(message_id);
```

### 4.3 Логика личного чата (direct)

- Личный чат: `type = 'direct'`, в `team_chat_participants` ровно две строки (user_id A, user_id B).
- При «написать пользователю X»: ищем чат с участниками {current_user, X}; если нет — создаём `team_chats(team_id, type='direct')` и двух участников.

### 4.4 Хранилище вложений

- **Bucket:** тот же `project-files` или отдельный `team-chat-files`.
- **Путь:** `{team_id}/team-chat/{chat_id}/{message_id}/{unique_filename}`.

---

## 5. RLS и безопасность

### 5.1 Принцип доступа

- Доступ привязан к команде: только `is_team_member(team_id, auth.uid())`.
- Участник видит только чаты, где он в `team_chat_participants`.

### 5.2 Политики

- **team_chats:** SELECT/INSERT/UPDATE/DELETE — только если `is_team_member(team_id, auth.uid())`.
- **team_chat_participants:** SELECT — участник чата или член команды; INSERT/UPDATE/DELETE — член команды.
- **team_chat_messages:** SELECT — участник чата; INSERT — участник и `from_user_id = auth.uid()`; UPDATE/DELETE — только своё сообщение при необходимости.
- **team_chat_message_attachments:** доступ через сообщение → чат → team_id, `is_team_member`.

### 5.3 Storage

- Политики для путей `{team_id}/team-chat/*`: только `is_team_member(team_id, auth.uid())`.

### 5.4 Защита

- Rate limiting на создание сообщений и загрузку файлов.
- Санитизация текста (XSS).
- Ограничение размера и количества вложений.

---

## 6. API-контракты

### 6.1 Чаты

| Функция | Вход | Выход |
|---------|------|--------|
| `fetchTeamChats(teamId)` | `teamId: string` | `TeamChat[]` (с последним сообщением и unread) |
| `fetchOrCreateDirectChat(teamId, otherUserId)` | `teamId`, `otherUserId` | `TeamChat` |
| `createChannel(teamId, name)` | опционально | `TeamChat` |

### 6.2 Сообщения

| Функция | Вход | Выход |
|---------|------|--------|
| `fetchChatMessages(chatId, options?)` | `chatId`, `{ limit?, before? }` | `TeamChatMessage[]` (с вложениями) |
| `sendMessage(chatId, text, files?)` | `chatId`, `text`, `files?` | `TeamChatMessage` |
| `markChatAsRead(chatId, lastReadAt)` | `chatId`, `lastReadAt` | `void` |

### 6.3 Превью

| Функция | Вход | Выход |
|---------|------|--------|
| `fetchMessagesPreview(teamId)` | `teamId` | `{ unreadCount, totalCount, recentChats }` |

---

## 7. React Query хуки

| Хук | Назначение |
|-----|------------|
| `useTeamChats(teamId)` | Список чатов |
| `useChatMessages(chatId)` | Сообщения чата с пагинацией |
| `useSendMessage(chatId)` | Отправка сообщения |
| `useMarkChatAsRead(chatId)` | Отметка прочтения |
| `useMessagesPreview(teamId)` | Данные для карточки виджета |
| `useFetchOrCreateDirectChat(teamId)` | Начать чат с пользователем |

---

## 8. Realtime (опционально)

- Подписка на `team_chat_messages` по `chat_id` для открытого чата.
- При INSERT — инвалидация `useChatMessages(chatId)`, `useTeamChats(teamId)`, `useMessagesPreview(teamId)`.

---

## 9. Фазы разработки

### Фаза 1: Схема БД и RLS (1–2 дня)

- Миграция: таблицы, индексы.
- RLS для всех таблиц, политики Storage.
- Обновить `types.ts`.

### Фаза 2: API и хуки без вложений (2–3 дня)

- `fetchTeamChats`, `fetchOrCreateDirectChat`, `fetchChatMessages`, `sendMessage`, `markChatAsRead`, `fetchMessagesPreview`.
- Хуки: `useTeamChats`, `useChatMessages`, `useSendMessage`, `useMarkChatAsRead`, `useMessagesPreview`, `useFetchOrCreateDirectChat`.

### Фаза 3: Вложения (1–2 дня)

- Загрузка файлов в Storage, запись в `team_chat_message_attachments`.
- Подтягивание вложений в `fetchChatMessages`, signed URL для скачивания.
- UI: выбор файлов, отображение вложений в сообщениях.

### Фаза 4: Интеграция UI (2–3 дня)

- MessagesExpanded на `useTeamChats`, `useChatMessages`, `useSendMessage`, `useMarkChatAsRead`.
- MessagesPreview на `useMessagesPreview`.
- Удаление моков, обработка loading/error/empty, включение виджета в feature flags.
- Кнопка «Новый чат» и выбор участника.

### Фаза 5: Realtime и полировка (1–2 дня)

- Подписка Realtime на сообщения открытого чата.
- Тесты API/хуков, обновление документации.

### Фаза 6 (опционально): Каналы (2–3 дня)

- Создание канала, приглашение участников, UI разделения «Личные» / «Каналы».

**Общая оценка:** 7–12 дней (без каналов 7–10).

---

## 10. Тестирование

- **Модульные:** API с моком Supabase client.
- **Интеграционные:** создание чата, отправка сообщений, RLS (другой пользователь не видит чужие чаты).
- **E2E (опционально):** вход → Messages → новый чат → отправка сообщения.
- **Edge cases:** пустой чат, дублирование direct-чата при одновременном создании, лимиты текста и вложений.

---

## 11. Производительность

- Пагинация сообщений (50–100 за раз).
- Индексы по п. 4.2.
- Кэш превью с staleTime 1–2 мин; подписка Realtime только на открытый чат.

---

## 12. Риски и ограничения

| Риск | Митигация |
|------|-----------|
| Дублирование direct-чата | Уникальность по паре участников; RPC fetchOrCreateDirectChat с проверкой. |
| Рост объёма сообщений | Пагинация; опционально архивация. |
| Realtime в бесплатном плане | Опциональная подписка; fallback на polling. |
| Рост Storage | Лимиты размера и количества файлов. |

---

## 13. Зависимости

- Auth, TeamContext, teams, team_members, profiles (уже есть в проекте).

---

## 14. Чейнджлог

| Дата | Изменение |
|------|-----------|
| 2026-03-12 | Создан план разработки бекенда для виджета Messages v1.0 |
| 2026-03-12 | Фаза 1: миграции 20260312000000_team_chats.sql (таблицы + индексы), 20260312000001_team_chats_rls.sql (RLS); обновлён types.ts (team_chats, team_chat_participants, team_chat_messages, team_chat_message_attachments). Вложения — путь в bucket project-files: {team_id}/team-chat/... (существующие политики). |
| 2026-03-12 | Фаза 2: RPC get_team_chats_preview, fetch_or_create_direct_chat (миграция 20260312000002_team_chats_preview_rpc.sql); API team_messages.ts (fetchTeamChats, fetchOrCreateDirectChat, fetchChatMessages, sendMessage, markChatAsRead, fetchMessagesPreview); хуки useTeamMessages.ts (useTeamChats, useChatMessages, useSendMessage, useMarkChatAsRead, useMessagesPreview, useFetchOrCreateDirectChat). Без вложений. |
| 2026-03-12 | Фаза 3: вложения — fetchChatMessages возвращает TeamChatMessageWithAttachments (attachments из team_chat_message_attachments); sendMessage(chatId, text, { files, teamId }) загрузка в project-files по пути {teamId}/team-chat/{chatId}/{messageId}/{filename}; getAttachmentDownloadUrl(storagePath, expiresIn); useSendMessage принимает { text, files? }. |
| 2026-03-12 | Фаза 4: интеграция UI — MessagesPreview на useMessagesPreview; MessagesExpanded на useTeamChats, useChatMessages, useSendMessage, useMarkChatAsRead, useFetchOrCreateDirectChat; удалены моки; поиск по чатам; диалог «Новый чат»; форма с вложениями; виджет включён в ENABLED_WIDGETS. RPC дополнен other_user_id. |
| 2026-03-12 | Фаза 5: Realtime — миграция 20260312000003; useTeamChatRealtime; интеграция в MessagesExpanded. |
| 2026-03-12 | Фаза 6: каналы — createChannel(teamId, name, creatorUserId), addChannelParticipant(chatId, userId), fetchChatParticipantIds; useCreateChannel, useAddChannelParticipant; UI: секции Direct/Channels, кнопка Channel + диалог создания, Invite в канале. |
