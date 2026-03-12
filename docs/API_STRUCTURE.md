# Структура API и хуков

## Папки

| Путь | Назначение |
|------|------------|
| `src/api/` | Функции запросов к Supabase |
| `src/hooks/` | React Query хуки (useQuery, useMutation) |
| `src/contexts/` | AuthContext, TeamContext |
| `src/lib/queryClient.ts` | Конфигурация React Query |

## Использование

### Auth

```tsx
import { useAuthContext } from "@/contexts/AuthContext";

function MyComponent() {
  const { user, session, isLoading, signOut } = useAuthContext();
  if (isLoading) return <Spinner />;
  if (!user) return <div>Не авторизован</div>;
  // ...
}
```

### Выбор команды

```tsx
import { useTeamContext } from "@/contexts/TeamContext";

function MyComponent() {
  const { teamId, setTeamId } = useTeamContext();
  // teamId сохраняется в localStorage
}
```

### React Query (пример)

```tsx
import { useTeams } from "@/hooks/useTeams";

function MyComponent() {
  const { data: teams, isLoading, error } = useTeams();
  // ...
}
```

## Применение миграций RLS

```bash
npx supabase db push
# или
npx supabase migration up
```
