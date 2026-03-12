-- Phase 3: Client Portal + Handoff
-- Tables: clients (extend), deliverables, handoff_versions, client_messages, invoices

-- Extend clients with contact_name, email, status
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Add handoff metadata to projects (client feedback status)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS handoff_status text DEFAULT 'pending' CHECK (handoff_status IN ('approved', 'pending', 'changes')),
  ADD COLUMN IF NOT EXISTS handoff_rating integer CHECK (handoff_rating IS NULL OR (handoff_rating >= 1 AND handoff_rating <= 5));

-- deliverables (пакет передачи)
CREATE TABLE IF NOT EXISTS public.deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label text NOT NULL,
  completed boolean DEFAULT false,
  due_date date,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('done', 'active', 'upcoming')),
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- handoff_versions (версии пакета передачи)
CREATE TABLE IF NOT EXISTS public.handoff_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version text NOT NULL,
  notes text DEFAULT '',
  files_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- client_messages (сообщения для Client Portal, feedback)
CREATE TABLE IF NOT EXISTS public.client_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_role text NOT NULL CHECK (from_role IN ('team', 'client')),
  sender_name text,
  text text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- invoices (счета по проекту)
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
  due_date date,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deliverables_project_id ON public.deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_handoff_versions_project_id ON public.handoff_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_project_id ON public.client_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices(project_id);
