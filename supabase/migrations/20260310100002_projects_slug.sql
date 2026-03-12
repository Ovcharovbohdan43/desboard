-- Add slug column to projects for human-readable URLs
-- /portal/:slug and /client/:slug will work alongside UUID

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug) WHERE slug IS NOT NULL;

-- Backfill: generate unique slug from name (lowercase, hyphens). Collisions use id suffix.
WITH numbered AS (
  SELECT id, name,
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(COALESCE(name, '')), '\s+', '-', 'g'), '[^a-z0-9\-]', '', 'g')) AS base_slug,
    ROW_NUMBER() OVER (PARTITION BY LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(COALESCE(name, '')), '\s+', '-', 'g'), '[^a-z0-9\-]', '', 'g'))) AS rn
  FROM public.projects
  WHERE slug IS NULL
)
UPDATE public.projects p
SET slug = CASE
  WHEN n.base_slug = '' THEN 'proj-' || LEFT(REPLACE(p.id::text, '-', ''), 8)
  WHEN n.rn > 1 THEN n.base_slug || '-' || LEFT(REPLACE(p.id::text, '-', ''), 6)
  ELSE n.base_slug
END
FROM numbered n
WHERE p.id = n.id;

COMMENT ON COLUMN public.projects.slug IS 'URL-safe identifier for /portal/:slug and /client/:slug. Unique when set.';
