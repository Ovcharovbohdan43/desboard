# MVP: Команды и проекты — чеклист

Проверка полноты реализации создания команд и проектов для MVP.

## Команды (Teams)

### Backend
- [x] **Таблицы:** `teams` (id, name, created_by), `team_members` (team_id, user_id, role) — `20260308999999_initial_schema.sql`
- [x] **RLS:** политики на `teams` и `team_members` без рекурсии — `20260309000000_enable_rls.sql`, `20260309000001_team_members_rls_no_recursion.sql`
- [x] **Функция:** `is_team_member(team_id, user_id)` — создатель или запись в `team_members` — `initial_schema.sql`
- [x] **Функция:** `can_access_team_members(team_id, user_id)` — SECURITY DEFINER для политик SELECT на `team_members` — `20260309000001_team_members_rls_no_recursion.sql`
- [x] **API:** `src/api/teams.ts` — `fetchTeams(userId)`, `createTeam(name, userId)` (вставка в `teams` + `team_members` с role `owner`)

### Frontend
- [x] **Хуки:** `useTeams()`, `useCreateTeam()` — инвалидация кэша после создания — `src/hooks/useTeams.ts`
- [x] **Контекст:** `TeamContext` — `teamId`, `setTeamId`, сохранение в localStorage — `src/contexts/TeamContext.tsx`
- [x] **TeamGuard:** при 0 команд — форма «Create your first team»; иначе авто-выбор первой команды — `src/components/TeamGuard.tsx`
- [x] **TeamSelector:** в сайдбаре — текущая команда, переключение, «Create new team» — `src/components/TeamSelector.tsx`
- [x] **CreateTeamDialog:** форма (название), ошибки, закрытие и вызов `onCreated(teamId)` — `src/components/TeamSelector.tsx`

### Сценарии
- [x] Пользователь без команд видит форму первой команды, создаёт → выбирается новая команда, показывается дашборд.
- [x] В сайдбаре можно переключить команду и создать новую из выпадающего списка.
- [x] Ошибки создания команды отображаются (в т.ч. сообщение от Supabase).

---

## Проекты (Projects)

### Backend
- [x] **Таблицы:** `projects` (team_id, name, status, …) — `20260309100000_projects_tasks.sql`
- [x] **RLS:** доступ по `is_team_member(team_id, auth.uid())` — `20260309100001_projects_rls.sql`
- [x] **API:** `src/api/projects.ts` — `fetchProjects(teamId)`, `createProject(insert)`, `updateProject`, `deleteProject`

### Frontend
- [x] **Хуки:** `useProjects(teamId)`, `useCreateProject(teamId)` — инвалидация после создания — `src/hooks/useProjects.ts`
- [x] **Страница проектов:** список, фильтр, кнопка «Add Project» — `src/components/dashboard/ProjectsWidget.tsx` (ProjectsExpanded)
- [x] **Форма проекта:** название, обязательная привязка к команде (`team_id`), индикатор загрузки и ошибки — `AddProjectForm`
- [x] **Если команда не выбрана:** сообщение + кнопка «Create team», открывающая `CreateTeamDialog` — `onOpenCreateTeam`

### Сценарии
- [x] Выбрана команда в сайдбаре → «Add Project» → ввод названия → «Create» → проект создаётся в выбранной команде, список обновляется.
- [x] Команда не выбрана → в форме проекта показывается подсказка и кнопка «Create team»; после создания команды можно создать проект.

---

## Порядок миграций

1. `20260308999999_initial_schema.sql` — teams, team_members, is_team_member, profiles, …
2. `20260309000000_enable_rls.sql` — RLS для teams, team_members, profiles, …
3. `20260309000001_team_members_rls_no_recursion.sql` — исправление рекурсии в политиках team_members
4. `20260309100000_projects_tasks.sql` — projects, tasks, milestones, clients, project_files
5. `20260309100001_projects_rls.sql` — RLS для projects, tasks, milestones, clients, project_files
6. `20260309200000_file_storage.sql` — file_folders, files (Phase 5)
7. `20260309200001_storage_bucket.sql` — bucket project-files, Storage RLS policies

Применение: `npx supabase db push` или через Supabase Dashboard.

---

## Статусы задач (Tasks)

- **Значения в БД:** `todo` | `in_progress` | `review` | `done` — см. `projects_tasks.sql`.
- **Pipeline в UI:** To Do → In Progress → Review → Done.
- **Review:** семантически — «работа сделана, ожидает проверки/согласования перед закрытием». В текущем MVP **нет отдельного workflow подтверждения**: любой участник команды может перевести задачу в Review и затем в Done. Роль «ревьюера» или обязательное подтверждение не реализованы — статус Review используется как ручной этап по договорённости в команде.
- **Подсказки в UI:** над канбаном отображается строка «Pipeline: To Do → In Progress → Review → Done»; у колонки и пункта статуса Review есть описание (title/tooltip): «Work done, awaiting review or approval».

---

## Версия

- Дата: 2025-03-09  
- MVP: создание команд и проектов; статусы задач и пояснение Review.
