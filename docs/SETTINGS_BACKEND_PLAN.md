# План разработки бекенда — Settings

**Версия:** 1.0  
**Дата:** 2026-03-11  
**Статус:** Черновик

---

## 1. Обзор

Раздел **Settings** объединяет настройки на трёх уровнях:

1. **Пользователь** — профиль, аватар, уведомления, локальные предпочтения  
2. **Команда** — название, брендинг, роли, приглашения  
3. **Приложение** — глобальные предпочтения (тема, язык)

Сейчас в сайдбаре есть пункт Settings, но маршрут и бекенд для него не реализованы. Workspace содержит таб "Settings" с моковыми пунктами (Brand Settings, Permission Rules и т.д.).

---

## 2. Существующая схема (релевантная для Settings)

| Сущность       | Таблица / API                | Поля                                  |
|----------------|------------------------------|---------------------------------------|
| Профиль        | `profiles`                   | user_id, display_name, avatar_url     |
| Команда        | `teams`                      | id, name, created_by                  |
| Члены команды  | `team_members`               | team_id, user_id, role                |
| Приглашения    | `team_invites`               | team_id, email, role, token, expires  |
| Роли           | (constraint)                 | owner, admin, member, guest           |

**Нет:** настроек уведомлений, брендинга команды, глобальных пользовательских предпочтений.

---

## 3. Целевая архитектура

### 3.1 Уровни настроек

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings (общая страница /dashboard/settings)                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─ Profile        │  Профиль пользователя (независимо от команды)│
│  │  - display_name │  profiles + auth.users metadata             │
│  │  - avatar_url   │  user_settings (опционально)                │
│  │  - email (read) │                                             │
│  └─────────────────┘                                             │
│  ┌─ Team           │  Настройки текущей команды                   │
│  │  - name         │  teams, team_settings (NEW)                  │
│  │  - brand        │  team_members, team_invites                  │
│  │  - members      │                                             │
│  └─────────────────┘                                             │
│  ┌─ Preferences    │  Глобальные предпочтения пользователя       │
│  │  - theme        │  user_settings (NEW)                         │
│  │  - language     │  или profiles расширение                     │
│  │  - notifications│                                             │
│  └─────────────────┘                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Фазы разработки

### Фаза 1: Маршрут и профиль (MVP)

**Цель:** Страница Settings + редактирование профиля через Supabase.

| Задача | Тип | Описание |
|--------|-----|----------|
| 1.1 | Route | Добавить `/settings` и `navToRoute.settings` |
| 1.2 | UI | Страница `SettingsPage` с табами Profile / Team / Preferences |
| 1.3 | RLS | Убедиться, что `profiles` имеет UPDATE для владельца |
| 1.4 | API | `updateProfile(user_id, { display_name, avatar_url })` |
| 1.5 | Hooks | `useProfile`, `useUpdateProfile` |
| 1.6 | Storage | Загрузка аватара в Supabase Storage (bucket `avatars`), RLS |

**Зависимости:** Auth, Supabase client.

**Результат:** Пользователь может менять имя и аватар, данные сохраняются в `profiles`.

---

### Фаза 2: Настройки команды

**Цель:** Редактирование имени команды и список участников (owner/admin).

| Задача | Тип | Описание |
|--------|-----|----------|
| 2.1 | Schema | Расширить `teams` при необходимости (slug, logo_url и т.д.) |
| 2.2 | RLS | Использовать `teams_update_policy` (owner/admin) |
| 2.3 | API | `updateTeam(team_id, { name })` |
| 2.4 | Hooks | `useTeam`, `useUpdateTeam` (частично уже есть) |
| 2.5 | UI | Таб Team: редактирование имени, список участников, приглашения |

**Результат:** Owner/Admin могут менять название команды и видеть управление участниками.

---

### Фаза 3: Брендинг и team_settings (опционально)

**Цель:** Брендинг workspace (цвета, лого, шрифты).

| Задача | Тип | Описание |
|--------|-----|----------|
| 3.1 | Migration | `team_settings` (team_id, primary_color, logo_url, font_family, JSONB meta) |
| 3.2 | RLS | SELECT/UPDATE только для member команды, UPDATE — owner/admin |
| 3.3 | API | `getTeamSettings`, `updateTeamSettings` |
| 3.4 | Hooks | `useTeamSettings`, `useUpdateTeamSettings` |
| 3.5 | UI | Таб Brand Settings в Settings |

**Результат:** Команда может задать primary color, лого, шрифт для workspace.

---

### Фаза 4: User preferences (тема, уведомления)

**Цель:** Перенос темы в профиль/настройки и опции уведомлений.

| Задача | Тип | Описание |
|--------|-----|----------|
| 4.1 | Migration | `user_settings` (user_id PK, theme, language, notifications JSONB) |
| 4.2 | RLS | Только владелец (user_id = auth.uid()) |
| 4.3 | API | `getUserSettings`, `updateUserSettings` |
| 4.4 | Hooks | `useUserSettings`, `useUpdateUserSettings` |
| 4.5 | UI | Переключатель темы + настройки уведомлений |
| 4.6 | Hydration | При логине загружать theme и применять |

**Результат:** Тема и язык сохраняются в БД, доступны при перелогине.

---

### Фаза 5: Permission rules и automation (будущее)

Workspace показывает "Permission Rules" и "Automation Rules". Рекомендуется реализовывать после основного Settings:

| Сущность | Описание |
|----------|----------|
| Permission Rules | Кастомизация прав ролей (owner/admin/member/guest) — сейчас хардкод |
| Automation Rules | Триггеры (например, при смене статуса проекта) — отдельный модуль |

Эти фазы можно отложить до появления явного продуктового спроса.

---

## 5. Предлагаемая схема миграций

### 5.1 Миграция: `team_settings` (Фаза 3)

```sql
CREATE TABLE IF NOT EXISTS public.team_settings (
  team_id uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  primary_color text DEFAULT '#6366f1',
  logo_url text,
  font_family text DEFAULT 'system',
  meta jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_settings_select" ON public.team_settings
  FOR SELECT USING (public.is_team_member(team_id, auth.uid()));

CREATE POLICY "team_settings_update" ON public.team_settings
  FOR UPDATE USING (public.can_manage_team_members(team_id, auth.uid()));

CREATE POLICY "team_settings_insert" ON public.team_settings
  FOR INSERT WITH CHECK (public.can_manage_team_members(team_id, auth.uid()));
```

### 5.2 Миграция: `user_settings` (Фаза 4)

```sql
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  language text DEFAULT 'en',
  notifications jsonb DEFAULT '{"email": true, "in_app": true}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_own" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);
```

---

## 6. API контракты

### 6.1 Profile

| Метод | Endpoint / функция | Описание |
|-------|--------------------|----------|
| GET | `profiles.select().eq('user_id', uid).single()` | Текущий профиль |
| PATCH | `profiles.update({ display_name, avatar_url }).eq('user_id', uid)` | Обновить профиль |

### 6.2 Team

| Метод | Endpoint / функция | Описание |
|-------|--------------------|----------|
| PATCH | `teams.update({ name }).eq('id', team_id)` | Обновить название (owner/admin) |

### 6.3 User Settings (после Фазы 4)

| Метод | Endpoint / функция | Описание |
|-------|--------------------|----------|
| GET | `user_settings.select().eq('user_id', uid).single()` | Настройки пользователя |
| UPSERT | `user_settings.upsert({ user_id, theme, language, notifications })` | Сохранить |

### 6.4 Team Settings (после Фазы 3)

| Метод | Endpoint / функция | Описание |
|-------|--------------------|----------|
| GET | `team_settings.select().eq('team_id', id).single()` | Настройки команды |
| UPSERT | `team_settings.upsert({ team_id, primary_color, logo_url, ... })` | Сохранить |

---

## 7. Права доступа (RLS)

| Таблица | SELECT | INSERT | UPDATE | DELETE |
|---------|--------|--------|--------|--------|
| profiles | owner | — (trigger) | owner | — |
| teams | member | — | owner/admin | — |
| team_members | member | owner/admin | owner/admin | owner/admin / self |
| team_invites | owner/admin | owner/admin | — | owner/admin |
| team_settings | member | owner/admin | owner/admin | — |
| user_settings | owner | owner | owner | owner |

---

## 8. Рекомендуемый порядок

1. **Фаза 1** — маршрут + профиль (2–3 дня).  
2. **Фаза 2** — настройки команды (1–2 дня).  
3. **Фаза 4** — user_settings (тема, язык) — 1–2 дня.  
4. **Фаза 3** — team_settings (брендинг) — по необходимости.  
5. **Фаза 5** — permission/automation rules — позже.

---

## 9. Риски и ограничения

| Риск | Митигация |
|------|-----------|
| Профиль может дублировать `auth.users.raw_user_meta_data` | `profiles` — источник правды для display_name/avatar, metadata — только при регистрации |
| Много таблиц настроек | Сначала `profiles` + `teams`, расширение через `user_settings` и `team_settings` при необходимости |
| Theme в localStorage | Постепенно мигрировать в `user_settings` с fallback на localStorage |

---

## 10. Changelog

| Дата | Изменение |
|------|-----------|
| 2026-03-11 | Создан план Settings Backend v1.0 |
| 2026-03-11 | Реализована Фаза 1: маршрут /settings, SettingsPage, профиль (display_name, avatar), useProfile, uploadAvatar, bucket avatars |
| 2026-03-11 | Реализована Фаза 2: таб Team — редактирование имени, список участников, приглашения, смена ролей, удаление/выход |
| 2026-03-11 | Реализована Фаза 4: user_settings (theme, notifications), Preferences таб, ThemeHydrator, Sidebar sync |
| 2026-03-11 | Реализована Фаза 3: team_settings (primary_color, logo_url), Brand settings в Team таб |
| 2026-03-11 | Реализована Фаза 5: Permission Rules (member_can_invite в meta.role_permissions), automation_rules таблица + UI |

