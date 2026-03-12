# План подключения бекенда — Desboard Hub

**Версия:** 1.1  
**Дата:** 2026-03-09  
**Статус:** Черновик

---

## Приоритеты (актуальные)

**Текущий фокус** — следующие модули в порядке важности:

1. **Хранилище файлов** — File Storage (папки, загрузка/скачивание, метаданные)
2. **Управление проектами** — Projects (проекты, задачи, milestones)
3. **Пакет передачи** — Handoff (deliverables, версии, статусы для передачи клиенту)
4. **Портал для клиентов** — Client Portal (доступ клиента, просмотр, обратная связь)

**Рекомендуемый порядок фаз с учётом приоритетов:**

```
Фаза 0 (подготовка)  →  Фаза 2 (Projects)  →  Фаза 5 (Files)  →  Фаза 3 (Client Portal + Handoff)
```

Фазы 1 (Finances), 4 (Calendar), 6 (Messages), 7 (Analytics), 8 (Workspace) — выполняются после приоритетных.

---

## 1. Обзор текущего состояния

### 1.1 Технологии

| Компонент       | Стек                          |
|-----------------|-------------------------------|
| Frontend        | React 18, Vite, TypeScript    |
| UI              | shadcn-ui, Tailwind CSS      |
| Data fetching   | TanStack React Query         |
| Backend (BaaS)  | Supabase (клиент настроен)   |

### 1.2 Уже есть

- Supabase-клиент (`src/integrations/supabase/client.ts`)
- Типы БД (`src/integrations/supabase/types.ts`) для:  
  `teams`, `team_members`, `profiles`, `transactions`, `expense_categories`, `income_sources`
- `.env` с `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY`
- React Query в `App.tsx`

### 1.3 Чего нет

- Использования Supabase в UI — данные в виджетах моковые
- Миграций Supabase (если БД настроена через Dashboard, миграций может не быть)
- Авторизации (используется ли Supabase Auth)
- RLS (Row Level Security) для мультитенантности
- Согласованной слоистой архитектуры (hooks, services, types)

---

## 2. Соответствие виджетов и схемы БД

| Виджет        | Supabase-схема                       | Статус                    |
|---------------|--------------------------------------|---------------------------|
| Finances      | transactions, expense_categories, income_sources | Схема есть, UI на моках  |
| Projects      | —                                    | Нет таблиц                |
| Tasks         | —                                    | Нет таблиц                |
| Client Portal | —                                    | Нет таблиц                |
| Files         | —                                    | Нет схемы + Storage       |
| Calendar      | —                                    | Нет таблиц                |
| Messages      | —                                    | Нет таблиц                |
| Analytics     | Агрегации transactions               | Схема есть, данные моковые |
| Workspace     | teams, team_members, profiles        | Схема есть, UI на моках   |

---

## 3. Фазы плана

---

### Фаза 0: Подготовка и инфраструктура

**Цель:** подготовить общую инфраструктуру, аутентификацию и общие слои.

#### Задачи

1. **Аутентификация**
   - [x] Решить: используется ли Supabase Auth? — да
   - [ ] Если да: добавить страницы логина/регистрации
   - [x] Хранить `session` / `user` в контексте
   - [ ] Проверять `supabase.auth.getUser()` при старте приложения
   - [ ] Защищать роуты (редирект на логин при незалогине)

2. **Структура кода**
   - [ ] Папка `src/api/` или `src/services/` под запросы к Supabase
   - [x] Папка `src/hooks/` для React Query хуков
   - [ ] Общие типы в `src/types/` или `src/integrations/supabase/types.ts`
   - [ ] Маппинг UI-моделей ↔ типы из Supabase

3. **React Query**
   - [ ] Настроить базовый `queryClient` (staleTime, retry, etc.)
   - [ ] Единый `useQuery`/`useMutation`-паттерн
   - [ ] Инвалидация кэша при мутациях

4. **Supabase**
   - [ ] Убедиться, что таблицы из `types.ts` существуют в проекте
   - [x] Миграция RLS: `supabase/migrations/20260309000000_enable_rls.sql`
   - [ ] Включить RLS для `teams`, `team_members`, `profiles`, `transactions`, `expense_categories`, `income_sources`
   - [ ] Определить политики по `team_id` / `user_id`

**Результат:** базовая auth, структура API/сервисов, RLS и React Query готовы к использованию.

---

### Фаза 1: Finances (Транзакции, категории, источники дохода)

**Цель:** подключить виджет Finances к Supabase.

#### Задачи

1. **API-слой**
   - [ ] `api/transactions.ts`: CRUD через Supabase
   - [ ] `api/expenseCategories.ts`: чтение/создание категорий
   - [ ] `api/incomeSources.ts`: чтение/создание источников

2. **React Query**
   - [ ] `useTransactions(teamId)`
   - [ ] `useExpenseCategories(teamId)`
   - [ ] `useIncomeSources(teamId)`
   - [ ] `useCreateTransaction`, `useUpdateTransaction`, `useDeleteTransaction`
   - [ ] `useCreateExpenseCategory`, `useCreateIncomeSource`

3. **Интеграция UI**
   - [ ] В `FinancesWidget` заменить mock-данные на данные из хуков
   - [ ] Маппинг `Transaction` (Supabase) ↔ UI-модель
   - [ ] Состояния: loading, error, empty
   - [ ] Создание/редактирование/удаление транзакций через форму

4. **Бизнес-логика**
   - [ ] Определить, как выбирается `team_id` (URL, контекст, дефолтная команда)
   - [ ] Связь `category_id`, `income_source_id` с UI-выбором

**Результат:** Finances полностью работает с Supabase.

---

### Фаза 2: Схема и интеграция Projects & Tasks

**Цель:** проекты и задачи хранятся в Supabase и отображаются в UI.

#### Схема (новые таблицы)

```sql
-- projects
projects(id, team_id, name, client_id, status, progress, deadline, description, 
         budget, spent, color, created_at, updated_at)

-- tasks
tasks(id, project_id, title, description, status, priority, assignee_id, due_date, 
      tags, comments_count, attachments_count, created_at, updated_at)

-- milestones
milestones(id, project_id, title, due_date, completed, created_at)

-- project_files (metadata; файлы — Supabase Storage)
project_files(id, project_id, name, type, size_bytes, storage_path, added_by, created_at)
```

#### Задачи

1. **Миграции**
   - [x] Создать миграции для `projects`, `tasks`, `milestones`, `project_files`, `clients`
   - [ ] Связи с `teams`, `profiles`
   - [ ] RLS для всех новых таблиц

2. **API и хуки**
   - [ ] `useProjects(teamId)`, `useProject(projectId)`
   - [ ] `useTasks(projectId)`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`
   - [ ] `useMilestones(projectId)`, CRUD для milestones
   - [ ] Обновить `types.ts` (например, через `supabase gen types`)

3. **Интеграция UI**
   - [ ] `ProjectsWidget` → `useProjects`, `useTasks`, `useMilestones`
   - [ ] `TasksWidget` → `useTasks` (общий список или по проекту)
   - [ ] Формы создания/редактирования проектов и задач

**Результат:** Projects и Tasks работают через Supabase.

---

### Фаза 3: Client Portal + Пакет передачи (Handoff)

**Цель:** клиенты и проекты портала + пакет передачи (deliverables, версии, feedback) в Supabase.

**Пакет передачи (Handoff)** включает: deliverables, milestones, версии файлов, статусы approval, сообщения клиента.

#### Схема

```sql
-- clients (отдельная сущность, связь с projects)
clients(id, team_id, name, contact_name, email, status, created_at)

-- Связь projects.client_id -> clients.id (если ещё нет)
-- deliverables (пакет передачи)
deliverables(id, project_id, label, completed, due_date, status: 'done'|'active'|'upcoming', created_at)

-- handoff_versions (версии пакета передачи)
handoff_versions(id, project_id, version, notes, files_count, created_at, created_by)

-- messages (для Client Portal, feedback)
client_messages(id, project_id, from_user_id, from_role: 'team'|'client', text, created_at)

-- invoices (если отдельно от transactions)
invoices(id, project_id, label, amount, status, due_date, created_at)
```

#### Задачи

1. **Миграции**
   - [x] `clients` (extend: contact_name, email, status), `deliverables`, `handoff_versions`, `client_messages`, `invoices`
   - [x] RLS (`20260310100000_client_portal_handoff.sql`, `20260310100001_client_portal_rls.sql`)

2. **API и хуки**
   - [x] `useClients(teamId)`, CRUD
   - [x] `useDeliverables(projectId)`, CRUD
   - [x] `useClientMessages(projectId)`, отправка сообщений
   - [x] `useInvoices(projectId)`, `useHandoffVersions(projectId)`
   - [x] `useHandoffData(projectId)` — полные данные handoff

3. **Интеграция UI**
   - [x] `ClientPortalWidget` (ClientsPreview, ClientsExpanded) → хуки
   - [x] `ClientPortalPage` — `/portal/:portalId` с backend
   - [x] `ClientExternalPage` — `/client/:projectId` с backend (при auth)

**Результат:** Client Portal работает с Supabase.

---

### Фаза 4: Calendar

**Цель:** события календаря в Supabase.

#### Схема

```sql
calendar_events(id, team_id, title, date, time, duration_minutes, color, 
                created_by, created_at, updated_at)
```

#### Задачи

1. **Миграции**
   - [ ] `calendar_events`
   - [ ] RLS по `team_id`

2. **API и хуки**
   - [ ] `useCalendarEvents(teamId, startDate?, endDate?)`
   - [ ] CRUD для событий

3. **Интеграция UI**
   - [ ] `CalendarWidget` → `useCalendarEvents`
   - [ ] Создание/редактирование событий

**Результат:** Calendar работает с Supabase.

---

### Фаза 5: File Storage

**Цель:** файлы в Supabase Storage, метаданные в БД.

#### Схема

```sql
file_folders(id, team_id, name, parent_id, color, created_at)
files(id, folder_id, project_id?, name, type, size_bytes, storage_path, 
      added_by, version, starred, tags, created_at, updated_at)
```

#### Задачи

1. **Supabase Storage**
   - [x] Создать bucket `project-files` — `20260309200001_storage_bucket.sql`
   - [x] Политики доступа по `team_id` (путь: team_id/folder_id/filename)

2. **Миграции**
   - [x] `file_folders`, `files` — `20260309200000_file_storage.sql`
   - [x] RLS

3. **API и хуки**
   - [x] `useFileFolders(teamId)`, `useFiles(folderId, teamId)`
   - [x] Загрузка: `supabase.storage.from('project-files').upload(...)`
   - [x] Сохранение метаданных в `files`
   - [x] Скачивание/удаление файлов

4. **Интеграция UI**
   - [x] `FilesExpandedBackend` → `useFileFolders`, `useFiles`, `useUploadFile`, `useDeleteFile`, `useUpdateFile`
   - [x] Create folder, Upload, Download, Delete
   - [x] Виджет Files включён в feature flags
   - [x] **2026-03-09:** Доработан FilesExpandedBackend — поиск, фильтры, сортировка, list/grid, detail panel, bulk actions, rename, move, tags, starred, upload с метаданными. FilesPreview использует реальные данные.

**Результат:** Files работают через Supabase Storage + БД. Полноценный UI виджета.

---

### Фаза 6: Messages

**Цель:** внутренние сообщения в Supabase.

Детальный план бекенда: **[docs/MESSAGES_BACKEND_PLAN.md](./MESSAGES_BACKEND_PLAN.md)**.

#### Схема

```sql
-- Вариант A: простые сообщения (без чатов)
messages(id, team_id, from_user_id, to_user_id?, project_id?, text, read, created_at)

-- Вариант B: чаты + сообщения (рекомендуется — см. MESSAGES_BACKEND_PLAN.md)
team_chats(id, team_id, type: 'direct'|'channel', name?)
team_chat_participants(chat_id, user_id, role, last_read_at)
team_chat_messages(id, chat_id, from_user_id, text, created_at)
team_chat_message_attachments(message_id, storage_path, name, size_bytes, type)
```

#### Задачи

1. **Миграции**
   - [ ] Реализовать по [MESSAGES_BACKEND_PLAN.md](./MESSAGES_BACKEND_PLAN.md): таблицы, RLS, Storage
2. **API и хуки**
   - [ ] `useTeamChats(teamId)`, `useChatMessages(chatId)`, `useSendMessage`, `useMarkChatAsRead`, `useMessagesPreview`, `useFetchOrCreateDirectChat`
   - [ ] При необходимости — realtime через Supabase Realtime
3. **Интеграция UI**
   - [ ] `MessagesWidget` → хуки (см. план)
   - [ ] (Опционально) Realtime для новых сообщений

**Результат:** Messages работают через Supabase (внутренние чаты команды).

---

### Фаза 7: Analytics

**Цель:** аналитика на основе реальных данных.

#### Задачи

1. **Слой данных**
   - [ ] Агрегации по `transactions`: доход, расходы, тренды
   - [ ] Агрегации по `projects`: статусы, прогресс
   - [ ] RPC или представления для отчётов (если нужны тяжёлые запросы)

2. **Хуки**
   - [ ] `useRevenueData(teamId, period)`
   - [ ] `useProjectStatusData(teamId)`
   - [ ] `useClientRevenue(teamId)` (если есть связь project → client → income)

3. **Интеграция UI**
   - [ ] `AnalyticsWidget` → хуки
   - [ ] Графики на реальных данных

**Результат:** Analytics строится на данных из Supabase.

---

### Фаза 8: Workspace (команды и участники)

**Цель:** Workspace-виджет использует `teams`, `team_members`, `profiles` и все связанные данные (проекты, задачи, клиенты, деливерабли, файлы). Детальный план бекенда: **[docs/WORKSPACE_BACKEND_PLAN.md](./WORKSPACE_BACKEND_PLAN.md)**.

#### Задачи

1. **API и хуки**
   - [x] `useTeams()`, `useTeamMembers(teamId)` (реализованы)
   - [ ] `useTeam(teamId)` — при необходимости (один team по id)
   - [ ] `useProfile(userId)` или `useCurrentProfile()` — при необходимости
   - [ ] CRUD для участников (частично есть: приглашения, роли, удаление)

2. **Логика команды**
   - [x] Выбор текущей команды (TeamContext, URL, дефолт)
   - [x] Проверка `is_team_member` перед доступом к данным (RLS)

3. **Интеграция UI**
   - [ ] `WorkspaceWidget` → `useTeamMembers`, `useProjects`, `useTasks`, `useClients`, `useDeliverablesByTeam`, `useFiles` и т.д.
   - [ ] Overview: агрегации (fetchWorkspaceOverview, useTeamStorageUsage)
   - [ ] Отображение участников, проектов, дедлайнов, storage, Settings-таб

**Результат:** Workspace полностью работает с Supabase. См. [WORKSPACE_BACKEND_PLAN.md](./WORKSPACE_BACKEND_PLAN.md).

---

### Фаза 9: Итоговая проверка и оптимизация

**Цель:** стабильная работа, производительность и удобство разработки.

#### Задачи

1. **Проверки**
   - [ ] Все виджеты используют backend, моки удалены
   - [ ] Обработка loading/error/empty во всех виджетах
   - [ ] RLS покрывает все таблицы

2. **Производительность**
   - [ ] Индексы для частых запросов (`team_id`, `project_id`, `date` и т.д.)
   - [ ] Разумный staleTime в React Query
   - [ ] Пагинация или виртуализация для больших списков

3. **Документация**
   - [ ] README: как поднять проект, переменные окружения
   - [ ] Описание API/слоя Supabase
   - [ ] Чейнджлог изменений

4. **Тесты**
   - [ ] Unit-тесты для API/hooks (где возможно)
   - [ ] Smoke-тесты критических сценариев

---

## 4. Зависимости между фазами

```
Фаза 0 (подготовка)
    │
    ├─► Фаза 2 (Projects & Tasks) ───► Фаза 5 (Files) ───► Фаза 3 (Client Portal + Handoff)
    │       │                                   │                      │
    │       │                                   └── project_files ─────┘
    │       └──────────────────────────────────────────────────────────┘
    │
    ├─► Фаза 8 (Workspace) ◄── может быть раньше, для выбора team_id
    │
    ├─► Фаза 1 (Finances)
    ├─► Фаза 4 (Calendar)
    ├─► Фаза 6 (Messages)
    ├─► Фаза 7 (Analytics)
    │
    └─► Фаза 9 (итоговая проверка)
```

**Рекомендуемый порядок по приоритетам:** 0 → 2 → 5 → 3 (Files, Projects, Handoff, Client Portal).  
**Общий порядок всех фаз:** 0 → 2 → 5 → 3 → 1 → 4 → 6 → 7 → 8 → 9

---

## 5. Вопросы для уточнения

1. **Бекенд**
   - Используется ли Supabase как единственный бекенд или планируется отдельный REST API (Node.js, Python и т.д.)?

2. **Аутентификация**
   - Нужна ли Supabase Auth (email/password, OAuth)?
   - Планируется ли внешний портал для клиентов (`/client/:projectId`) с отдельной логикой входа?

3. **Мультитенантность**
   - Один пользователь — одна команда или несколько?
   - Как выбирать текущую команду (из URL, из контекста, дефолт)?

4. **Схема БД**
   - Таблицы из `types.ts` уже развёрнуты в Supabase или только типы описаны?
   - Есть ли доступ к Supabase Dashboard для просмотра/создания таблиц и миграций?

5. **Приоритет виджетов** ✓ уточнено
   - Приоритет: Хранилище файлов → Проекты → Пакет передачи → Портал клиентов

6. **Realtime**
   - Нужен ли live-update для Messages, Tasks или уведомлений?

---

## 6. Changelog

| Дата       | Изменение                                                       |
|------------|-----------------------------------------------------------------|
| 2026-03-09 | Первая версия плана интеграции бекенда                          |
| 2026-03-09 | Приоритеты: Files → Projects → Handoff → Client Portal; v1.1    |
| 2026-03-09 | Фаза 0: AuthContext, TeamContext, api/, hooks/, queryClient, RLS   |
| 2026-03-09 | Фаза 5: file_folders, files, Storage bucket, FilesExpandedBackend   |
| 2026-03-10 | Фаза 3: deliverables, handoff_versions, client_messages, invoices; Client Portal backend integration   |
| 2026-03-11 | Фаза 8: добавлена ссылка на детальный план [WORKSPACE_BACKEND_PLAN.md](./WORKSPACE_BACKEND_PLAN.md); уточнены задачи и статусы |
| 2026-03-12 | Фаза 6 (Messages): добавлена ссылка на [MESSAGES_BACKEND_PLAN.md](./MESSAGES_BACKEND_PLAN.md); схема уточнена (team_chats, participants, messages, вложения) |
