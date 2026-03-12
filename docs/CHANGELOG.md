# Changelog

## [2026-03-12]

### Добавлено

- **Приглашение в команду по email (Resend):**
  - Edge Function `send-invite-email`: отправка письма через Resend API
  - API `sendInviteEmail(inviteId)` — вызов после создания invite
  - Flow: создание invite → отправка email; при ошибке — fallback на копирование ссылки
  - Кнопка «Resend» (Mail) в списке ожидающих invites (Settings, TeamSelector)
  - Документация `docs/TEAM_INVITE_EMAIL.md` — настройка RESEND_API_KEY, деплой

### Изменено

- SettingsPage и TeamSelector: при успешном создании invite вызывается sendInviteEmail, toast «Invite sent to {email}»

## [2026-03-11] (продолжение)

### Добавлено

- **План бекенда Workspace** — документ `docs/WORKSPACE_BACKEND_PLAN.md`: фазы разработки (подключение данных по табам, агрегации Overview, таб Settings, опционально шаблоны), API-контракты, риски. BACKEND_INTEGRATION_PLAN обновлён ссылкой на план (Фаза 8).
- **Workspace Phase 1 (бекенд):** виджет Workspace переведён на реальные данные Supabase: добавлены `fetchDeliverablesByTeam` и хук `useDeliverablesByTeam`; WorkspacePreview и WorkspaceExpanded используют useTeamContext, useProjects, useTeamMembers, useClients, useDeliverablesByTeam, useFiles, useTeams, useAutomationRules; моки удалены; табы Team, Clients, Projects, Tasks, Deliverables, Files и Overview строятся на этих данных; таб Settings ведёт на `/settings` с актуальным именем команды и счётчиком автомаций; добавлены хелперы formatRelativeTime и formatFileSize в `lib/utils`.
- **Workspace Phase 2:** агрегации для Overview и Storage: миграция `20260311000004_workspace_storage_usage_rpc.sql` (RPC `get_team_storage_usage`); API `getTeamStorageUsage`, хук `useTeamStorageUsage` (staleTime 2 мин); API `fetchWorkspaceOverview` и хук `useWorkspaceOverview` (композиция проектов, участников, клиентов, деливераблов, файлов, storage); Overview и Preview используют `useWorkspaceOverview`; инвалидация кэша `workspace_overview` при мутациях проектов, задач, деливераблов и файлов.
- **Workspace Phase 3:** таб Settings и связь с настройками: на странице Settings активный таб синхронизирован с URL (`?tab=profile|team|preferences`); при переключении таба обновляется query; переход из Workspace по ссылкам `/settings` и `/settings?tab=team` открывает нужный таб; добавлены `fetchTeam(teamId)` и `useTeam(teamId)` в api/teams и useTeams.
- **Workspace Phase 4:** шаблоны проектов: миграция `20260311000005_project_templates.sql` (таблица project_templates, RLS); API и хуки в `api/projectTemplates.ts` и `hooks/useProjectTemplates.ts`; таб Templates в Workspace отображает список шаблонов команды из бекенда.
- **Workspace Phase 5:** UI для шаблонов: кнопка «Создать шаблон», диалоги создания/редактирования и удаления; меню на карточке шаблона; диалог «Создать проект из шаблона», createProject с подстановкой config.
- **Workspace Phase 6:** «Сохранить проект как шаблон»: в табе Projects (Workspace) кнопка на карточке; диалог название и категория; config из проекта (status, description, color).

### Изменено

- **Брендинг: финальная проверка** — заменены оставшиеся хардкоды:
  - Index: accentColor для calendar, clients, tasks, analytics
  - ClientPortalPage: активная вкладка — bg-[var(--brand-primary)]
  - ClientExternalPage: табы, timeline, avatar, сообщения, versions, upload — var(--brand-primary)
  - ClientPortalWidget, ProjectsWidget, StudioWidget, MessagesWidget, FinancesWidget, CalendarWidget, AnalyticsWidget — иконки и индикаторы

- **Брендинг: дашборд и файловый менеджер**:
  - Карточки виджетов на дашборде используют `accentColor: var(--brand-primary)` вместо фиксированных hex
  - FileStorageWidget: полоски загрузки, иконка HardDrive, индикаторы — `var(--brand-primary)`

- **Глобальный брендинг** — BrandProvider перенесён в App (применяется ко всем маршрутам):
  - `primary_color` задаёт `--primary`, `--ring`, `--sidebar-primary` — табы, прогресс-бары, сайдбар используют бренд-цвет
  - Settings, Client Portal, виджеты — единый стиль

- **Обновление клиента → портал** — при изменении имени клиента (`updateClient`) инвалидируются handoff-запросы, портал показывает актуальное имя

## [2026-03-11]

### Добавлено

- **Automation rules worker** — Edge Function `run-automation-rules`:
  - Читает включённые правила из `automation_rules`
  - Использует service role для обхода RLS
  - Документация по cron: `docs/AUTOMATION_RULES_CRON.md`

- **Branding в Client Portal** — страница `/portal/:portalId`:
  - `primary_color` применяется через CSS `--brand-primary` (активные элементы, сообщения клиента, табы)
  - `logo_url` показывается в шапке портала вместо иконки Eye

### Изменено

- Edge Function использует импорт `npm:@supabase/supabase-js@2` (рекомендация Supabase)
