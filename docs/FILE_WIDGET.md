# Виджет «Файлы» (File Storage)

**Назначение:** централизованное хранилище файлов команды с папками, метаданными и связью с проектами.

**Дата обновления:** 2026-03-09

---

## Описание

Виджет позволяет:
- Создавать иерархические папки
- Загружать файлы в Supabase Storage
- Искать, фильтровать и сортировать файлы
- Редактировать метаданные (теги, звёздочка, переименование, перемещение)
- Связывать файлы с проектами
- Массовые действия (скачать, переместить, удалить)

---

## Компоненты

| Компонент | Назначение |
|-----------|------------|
| `FilesPreview` | Карточка на дашборде — счётчик файлов, примеры имён, % использования |
| `FilesExpandedBackend` | Полноценный UI на странице `/widget/files` — работа с Supabase |
| `FilesExpanded` | Mock-версия (используется при отключённом feature flag или для демо) |

---

## Функциональность

### Сводка

- **Поиск** — по имени и тегам (client-side)
- **Фильтры** — по тегу и типу файла
- **Сортировка** — по имени, дате, размеру, типу
- **Режимы отображения** — список / сетка
- **Панель деталей** — свойства, теги, скачать, удалить
- **Bulk actions** — скачать, переместить, удалить несколько файлов
- **CRUD** — создание папок, загрузка, переименование, перемещение, удаление
- **Звёздочка** — избранное
- **Теги** — массив строк (Final, Draft, Review и др.)
- **Связь с проектом** — `project_id` при загрузке
- **Иерархия папок** — `parent_id` в `file_folders`
- **Мобильная версия** — drawer папок, full-screen панель деталей

### API

- `api/files.ts` — `fetchFiles`, `uploadFile`, `getFileDownloadUrl`, `deleteFile`, `updateFile`
- `api/fileFolders.ts` — `fetchFolders`, `createFolder`, `updateFolder`, `deleteFolder`
- Хуки: `useFiles`, `useUploadFile`, `useDeleteFile`, `useUpdateFile`, `useFileFolders`, `useCreateFolder`

### Схема БД

- `file_folders` — `id`, `team_id`, `name`, `parent_id`, `color`
- `files` — `id`, `folder_id`, `project_id`, `name`, `type`, `size_bytes`, `storage_path`, `added_by`, `version`, `starred`, `tags[]`
- Storage bucket `project-files`, путь: `{teamId}/{folderId}/{uuid}_{name}`

---

## Ограничения

- Storage limit: 500 MB (индикатор в UI)
- Bucket limit per file: 50 MB (настраивается в Supabase)
- Client/label: не в схеме; используется теги (Final, Draft, Review и т.д.)

---

## Модули

- `src/components/dashboard/FileStorageWidget.tsx`
- `src/api/files.ts`
- `src/api/fileFolders.ts`
- `src/hooks/useFiles.ts`
- `src/hooks/useFileFolders.ts`
