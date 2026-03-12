# План разработки бекенда — Workspace

**Версия:** 1.0  
**Дата:** 2026-03-11  
**Статус:** Черновик

---

## 1. Назначение документа

Документ описывает план разработки **бекенда для раздела Workspace** в Desboard Hub: цели, текущее состояние, целевая архитектура, фазы разработки, API-контракты и порядок внедрения.

**Связанные документы:**
- [BACKEND_INTEGRATION_PLAN.md](./BACKEND_INTEGRATION_PLAN.md) — общий план интеграции (Фаза 8: Workspace)
- [SETTINGS_BACKEND_PLAN.md](./SETTINGS_BACKEND_PLAN.md) — настройки (таб Settings в Workspace ссылается на них)

---

## 2. Обзор раздела Workspace

### 2.1 Что такое Workspace

**Workspace** — виджет на дашборде и отдельная полноэкранная страница (`/widget/workspace`), выполняющая роль **командного центра**: сводка по активным проектам, срокам, обратной связи клиентов, участникам команды, файлам и настройкам.

### 2.2 Структура UI (текущая)

| Таб | Назначение | Источник данных (целевой) |
|-----|------------|---------------------------|
| **Overview** | KPI, активные проекты, просроченные, ожидание фидбэка, дедлайны, комментарии, загрузки, workload, хранилище, активность клиентов | Агрегации по team_id |
| **Clients** | Список клиентов команды | `clients` (team_id) |
| **Projects** | Список проектов с прогрессом | `projects` (team_id) |
| **Tasks** | Задачи по всем проектам | `tasks` через projects |
| **Deliverables** | Деливерабли по проектам | `deliverables` по project_id |
| **Files** | Использование хранилища + недавние файлы | `files`, `file_folders` (team_id) |
| **Team** | Участники команды и нагрузка | `team_members`, `profiles`, агрегация задач |
| **Templates** | Шаблоны проектов (опционально) | Нет таблицы — мок или будущая сущность |
| **Settings** | Ссылки на настройки workspace | Редирект на `/settings`, данные из `teams`, `team_settings`, `automation_rules` |

### 2.3 Текущее состояние

- **WorkspaceWidget** (`src/components/dashboard/WorkspaceWidget.tsx`): все данные **моковые** (константы `activeProjects`, `teamMembers`, `clients`, `tasks`, `deliverables`, `recentUploads`, `storageUsage` и т.д.).
- **Бекенд:** таблицы и API для команд, проектов, задач, клиентов, деливераблов, файлов, настроек команды и правил автоматизации **уже есть**. Контекст команды (`TeamContext`), выбор команды и RLS настроены.
- **Отсутствует:** подключение виджета к реальным API и агрегации для вкладки Overview (сводные показатели, просроченные, awaiting feedback, workload, storage usage по команде).

---

## 3. Целевая архитектура

### 3.1 Источники данных

```
Workspace
├── Team & identity
│   ├── useTeamContext()        → teamId (текущая команда)
│   ├── useTeams()               → список команд пользователя
│   ├── useTeam(teamId)         → название, создатель (при необходимости)
│   ├── useTeamMembers(teamId)  → участники + profiles (avatar, display_name)
│   └── useTeamSettings(teamId) → брендинг (для отображения имени/лого)
│
├── Projects & work
│   ├── useProjects(teamId)     → проекты с clients, tasks, milestones
│   ├── useAllTasks(teamId)     → все задачи по проектам (уже есть)
│   ├── useClients(teamId)      → клиенты команды
│   └── Deliverables            → по каждому project_id или useDeliverablesByTeam(teamId)
│
├── Files & storage
│   ├── useFileFolders(teamId)  → папки
│   ├── useFiles(null, teamId)  → файлы по команде (корень)
│   └── Storage usage           → сумма size_bytes по files команды (новый API или хук)
│
├── Dashboard aggregations (Overview)
│   ├── Active projects count   → фильтр useProjects по status
│   ├── Overdue items           → задачи/деливерабли с due_date < today
│   ├── Awaiting feedback       → деливерабли in_review / отправленные клиенту
│   ├── Pending approvals       → уточнить модель (деливерабли или отдельная сущность)
│   ├── Unread comments        → client_messages (при наличии read — иначе "recent")
│   ├── Upcoming deadlines     → задачи/милестоуны с due_date в ближайшие N дней
│   ├── Recent uploads         → useFiles(null, teamId), limit по дате
│   ├── Team workload           → подсчёт задач по assignee_id + useTeamMembers
│   ├── Storage usage           → сумма по files команды
│   └── Recent client activity  → последние client_messages по проектам команды
│
└── Settings tab
    └── Навигация на /settings; счётчики из useTeamMembers, useAutomationRules
```

### 3.2 Зависимости от других модулей

| Модуль | Зависимость |
|--------|-------------|
| Auth + TeamContext | Обязательны: выбор команды и user_id |
| Projects, Tasks, Clients | Уже реализованы |
| Deliverables | По project_id; для Overview нужна агрегация по team |
| Files + file_folders | Реализованы; для storage usage — агрегация по team |
| client_messages | Есть; для "unread" при необходимости расширить схему (read_at / read_by) |
| team_settings, automation_rules | Реализованы |

---

## 4. Фазы разработки

### Фаза 1: Подключение существующих данных (замена моков)

**Цель:** Workspace использует реальные данные из Supabase для табов Team, Clients, Projects, Tasks, Deliverables, Files. Моки удаляются.

| Задача | Тип | Описание |
|--------|-----|----------|
| 1.1 | UI | В `WorkspaceExpanded` внедрить `useTeamContext()`, получать `teamId` |
| 1.2 | UI | Таб **Team**: `useTeamMembers(teamId)` + `useTeamSettings(teamId)`; маппинг в формат карточек (имя, роль, аватар); убрать мок `teamMembers` |
| 1.3 | UI | Таб **Clients**: `useClients(teamId)`; маппинг в список с contact, email, projects count, lastActivity; убрать мок `clients` |
| 1.4 | UI | Таб **Projects**: `useProjects(teamId)`; фильтр по status (active, review и т.д.); прогресс, client, deadline из данных; убрать мок `activeProjects` |
| 1.5 | UI | Таб **Tasks**: `useAllTasks(teamId)` или данные из `useProjects`; отобразить assignee (через profiles по assignee_id), project, priority, status; убрать мок `tasks` |
| 1.6 | API+Hook | Добавить `fetchDeliverablesByTeam(teamId)` и хук `useDeliverablesByTeam(teamId)` — запрос проектов команды и для каждого get deliverables (или один запрос с join через projects) |
| 1.7 | UI | Таб **Deliverables**: `useDeliverablesByTeam(teamId)`; карточки с label, project, status, due_date; убрать мок `deliverables` |
| 1.8 | UI | Таб **Files**: `useFiles(null, teamId)` для недавних файлов; отображение имени, проекта, размера, даты; убрать мок `recentUploads` |
| 1.9 | UI | **WorkspacePreview** (карточка на дашборде): считать активные проекты и просроченные из `useProjects` + `useAllTasks` (или из агрегатов Фазы 2), убрать моки |

**Результат:** Табы Team, Clients, Projects, Tasks, Deliverables, Files работают на реальных данных. Preview при необходимости показывает заглушки до Фазы 2.

**Оценка:** 2–3 дня.

---

### Фаза 2: Агрегации для Overview и Storage

**Цель:** Вкладка Overview и карточка Preview показывают реальные KPI и списки: активные проекты, просроченные, ожидание фидбэка, предстоящие дедлайны, недавние загрузки, workload, использование хранилища, активность клиентов.

| Задача | Тип | Описание |
|--------|-----|----------|
| 2.1 | API | **Storage usage:** функция `getTeamStorageUsage(teamId)`: сумма `files.size_bytes` по всем папкам команды (через `file_folders.team_id`). Опционально: лимит из конфига/тарифа. |
| 2.2 | Hook | `useTeamStorageUsage(teamId)` — вызов getTeamStorageUsage, кэш React Query |
| 2.3 | API | **Workspace dashboard:** функция `fetchWorkspaceOverview(teamId)` возвращает: `{ activeProjectsCount, overdueTasks, overdueDeliverables, awaitingFeedback, upcomingDeadlines, recentFiles, unreadCommentsCount?, pendingApprovalsCount?, teamWorkload, storageUsage, recentClientActivity }`. Реализация: либо композиция существующих fetch-функций на клиенте, либо RPC в Supabase для тяжёлых агрегатов. |
| 2.4 | Hook | `useWorkspaceOverview(teamId)` — вызов fetchWorkspaceOverview, staleTime 1–2 мин |
| 2.5 | UI | Overview: заменить все моки на `useWorkspaceOverview(teamId)`; секции KPI, Active Projects, Awaiting Feedback, Overdue, Upcoming Deadlines, Unread Comments, Pending Approvals, Recent Uploads, Team Workload, Storage Usage, Recent Client Activity |
| 2.6 | UI | WorkspacePreview: использовать `useWorkspaceOverview(teamId)` или минимальный набор (activeProjectsCount, overdueCount, awaitingFeedbackCount, unreadCount, pendingApprovalsCount) |

**Уточнения по полям:**
- **Awaiting feedback:** деливерабли со статусом `in_review` или отправленные клиенту (если есть такой статус в схеме).
- **Pending approvals:** если в продукте нет отдельной сущности — считать из деливераблов в статусе ожидания апрува или временно 0.
- **Unread comments:** при отсутствии поля `read` в `client_messages` — показывать "recent comments" (последние N по проектам команды) или добавить в схему `read_at`/`read_by` и считать непрочитанные.
- **Team workload:** число активных задач на участника (assignee_id) + опционально процент от целевой нагрузки.

**Результат:** Overview и Preview полностью на бекенде.

**Оценка:** 2–3 дня.

---

### Фаза 3: Таб Settings и связь с настройками

**Цель:** Таб Settings во Workspace не дублирует логику, а ведёт на единую страницу настроек и отображает сводку.

| Задача | Тип | Описание |
|--------|-----|----------|
| 3.1 | UI | Таб **Settings**: блоки "Workspace Name", "Brand Settings", "Permission Rules", "Automation Rules" с реальными данными: `useTeam(teamId)` или `useTeamSettings(teamId)` для названия и бренда, `useAutomationRules(teamId)` для счётчика автомаций; по клику — переход на `/settings` с соответствующим табом (query или hash). |
| 3.2 | API | При необходимости: `useTeam(teamId)` — один проект/команда по id (если ещё нет). Иначе брать из первого элемента `useTeams().data` по id. |

**Результат:** Пользователь видит актуальные настройки и может перейти в полный раздел Settings.

**Оценка:** 0.5–1 день.

---

### Фаза 4: Шаблоны проектов (опционально)

**Цель:** Таб Templates перестаёт быть моком — либо удалить, либо ввести сущность "project templates".

| Задача | Тип | Описание |
|--------|-----|----------|
| 4.1 | Решение | Продуктовое решение: нужны ли шаблоны (создание проекта из шаблона). Если нет — таб скрыть или оставить заглушку "Coming soon". |
| 4.2 | Migration | При положительном решении: таблица `project_templates` (team_id, name, category, config jsonb), RLS. |
| 4.3 | API + Hook | `fetchProjectTemplates(teamId)`, `useProjectTemplates(teamId)`. |
| 4.4 | UI | Таб Templates: список из `useProjectTemplates(teamId)`. |

**Результат:** Таб Templates либо скрыт, либо работает на бекенде.

**Оценка:** 1–2 дня (при реализации).

---

### Фаза 5: UI для шаблонов проектов (CRUD + создание проекта из шаблона)

**Цель:** Полноценный UI: создание/редактирование/удаление шаблонов в Workspace и действие «Использовать шаблон» для создания проекта с подстановкой данных из шаблона.

| Задача | Тип | Описание |
|--------|-----|----------|
| 5.1 | UI | Кнопка «Создать шаблон» в табе Templates; диалог с полями: название, категория (General, Marketing, Development и т.д.); отправка в `createProjectTemplate`. |
| 5.2 | UI | На карточке шаблона: кнопки «Изменить» и «Удалить»; диалог редактирования (название, категория) → `updateProjectTemplate`; подтверждение удаления (AlertDialog) → `deleteProjectTemplate`. |
| 5.3 | UI | Кнопка «Использовать шаблон» на карточке; диалог «Создать проект из шаблона»: название проекта (по умолчанию из шаблона), опционально клиент; создание проекта через `createProject` с подстановкой полей из `template.config` (status, description и т.д.). |

**Результат:** Пользователь может создавать/редактировать/удалять шаблоны и создавать проект из шаблона без перехода на другую страницу.

**Оценка:** 1–2 дня.

---

### Фаза 6: «Сохранить проект как шаблон»

**Цель:** Возможность создать шаблон из существующего проекта (обратный сценарий к «Использовать шаблон»): из таба Projects во Workspace или из карточки проекта — действие «Сохранить как шаблон» с подстановкой в config полей проекта (status, description, color).

| Задача | Тип | Описание |
|--------|-----|----------|
| 6.1 | UI | В табе **Projects** (Workspace): на каждой карточке проекта кнопка/меню «Сохранить как шаблон»; диалог: название шаблона (по умолчанию — имя проекта), категория; создание шаблона с `config = { status, description, color }` из текущего проекта. |
| 6.2 | API | Использовать существующие `createProjectTemplate` и `useCreateProjectTemplate`; формирование config из полей проекта на клиенте. |

**Результат:** Пользователь может сохранить любой проект команды как шаблон и затем использовать его для создания новых проектов.

**Оценка:** 0.5–1 день.

---

### 5.1 Команда и участники (уже есть)

| Функция | Описание |
|---------|----------|
| `fetchTeams(userId)` | Команды пользователя (созданные + член) |
| `fetchTeamMembers(teamId)` | Участники с profiles |
| `useTeam(teamId)` | При необходимости — один team по id (можно из useTeams().data) |

### 5.2 Workspace Overview (новое)

| Функция | Вход | Выход |
|---------|------|--------|
| `fetchWorkspaceOverview(teamId)` | `teamId: string` | `{ activeProjectsCount, overdueTasks, overdueDeliverables, awaitingFeedback, upcomingDeadlines, recentFiles, unreadCommentsCount?, pendingApprovalsCount?, teamWorkload, storageUsage, recentClientActivity }` |

### 5.3 Storage usage (новое)

| Функция | Вход | Выход |
|---------|------|--------|
| `getTeamStorageUsage(teamId)` | `teamId: string` | `{ usedBytes: number, fileCount: number }` или `{ used: number, total: number, unit: "GB" }` |

### 5.4 Deliverables по команде (новое)

| Функция | Вход | Выход |
|---------|------|--------|
| `fetchDeliverablesByTeam(teamId)` | `teamId: string` | Массив деливераблов с полями проекта (name, client) для отображения в списке |

Реализация: запрос `projects` по team_id, затем для каждого `fetchDeliverables(projectId)` или один запрос с join `deliverables` + `projects` по team_id.

---

## 6. RLS и безопасность

- Все данные Workspace привязаны к `team_id`. Доступ через `is_team_member(team_id, auth.uid())`.
- Существующие таблицы уже защищены RLS.
- Новые RPC (если появятся для Overview) должны проверять членство в команде (SECURITY DEFINER + `is_team_member`).

---

## 7. Рекомендуемый порядок выполнения

1. **Фаза 1** — подключение данных по табам (Team, Clients, Projects, Tasks, Deliverables, Files).
2. **Фаза 2** — агрегации и Overview (включая storage usage и при необходимости RPC).
3. **Фаза 3** — таб Settings и навигация на `/settings`.
4. **Фаза 4** — по необходимости (шаблоны или скрытие таба).
5. **Фаза 5** — UI для шаблонов: CRUD в табе Templates и «Создать проект из шаблона».
6. **Фаза 6** — «Сохранить проект как шаблон» в табе Projects (Workspace).

**Общая оценка:** 5–8 дней без шаблонов.

---

## 8. Риски и ограничения

| Риск | Митигация |
|------|-----------|
| Много запросов при открытии Overview | Один RPC `get_workspace_overview(team_id)` в Supabase или композиция на клиенте с параллельными запросами и кэшем |
| Нет поля "unread" для сообщений | Использовать "recent comments" или добавить в `client_messages` поле `read_at` / `read_by` |
| Workload — нет "целевой" нагрузки | Показывать только число задач на assignee |
| Лимит хранилища по тарифу | Поле в `team_settings.meta` или отдельная таблица; в Фазе 2 можно hardcode лимит |

---

## 9. Чейнджлог

| Дата | Изменение |
|------|-----------|
| 2026-03-11 | Создан план Workspace Backend v1.0 |
| 2026-03-11 | Реализована Фаза 1: подключение данных — WorkspaceWidget использует useTeamContext, useProjects, useTeamMembers, useClients, useDeliverablesByTeam, useFiles, useTeams, useAutomationRules; добавлены fetchDeliverablesByTeam, useDeliverablesByTeam; моки удалены; Overview, Preview и табы (Team, Clients, Projects, Tasks, Deliverables, Files, Settings) на реальных данных; таб Templates — заглушка; таб Settings — ссылки на /settings |
| 2026-03-11 | Реализована Фаза 2: агрегации Overview и Storage — RPC get_team_storage_usage(p_team_id), getTeamStorageUsage + useTeamStorageUsage; fetchWorkspaceOverview(teamId) + useWorkspaceOverview(teamId); Overview и Preview питаются из useWorkspaceOverview; инвалидация workspace_overview при мутациях проектов, задач, деливераблов, файлов |
| 2026-03-11 | Реализована Фаза 3: таб Settings и связь с настройками — синхронизация активного таба с URL (?tab=profile|team|preferences) на SettingsPage; по клику на таб обновляется URL; переход из Workspace по ссылкам /settings и /settings?tab=team открывает нужный таб; добавлены fetchTeam(teamId) и useTeam(teamId) |
| 2026-03-11 | Реализована Фаза 4: шаблоны проектов — миграция project_templates (team_id, name, category, config jsonb), RLS; API fetchProjectTemplates, createProjectTemplate, updateProjectTemplate, deleteProjectTemplate и хуки useProjectTemplates, useCreateProjectTemplate, useUpdateProjectTemplate, useDeleteProjectTemplate; таб Templates в Workspace показывает список шаблонов команды |
| 2026-03-11 | Реализована Фаза 5: UI для шаблонов — кнопка «Создать шаблон», диалоги создания/редактирования и удаления; меню на карточке: «Использовать шаблон», «Изменить», «Удалить»; диалог «Создать проект из шаблона», createProject с подстановкой config |
| 2026-03-11 | Реализована Фаза 6: «Сохранить проект как шаблон» — в табе Projects кнопка на карточке проекта; диалог название и категория; config из проекта (status, description, color) |
