-- Project access tokens for external client portal (anonymous read + limited write)
-- Allows clients to view project handoff data and submit feedback via magic link
-- without requiring Supabase auth

-- 1. Table: project_access_tokens
CREATE TABLE IF NOT EXISTS public.project_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex') UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_project_access_tokens_token ON public.project_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_project_access_tokens_project_id ON public.project_access_tokens(project_id);

ALTER TABLE public.project_access_tokens ENABLE ROW LEVEL SECURITY;

-- Team members can manage tokens for their projects
DROP POLICY IF EXISTS "project_access_tokens_select" ON public.project_access_tokens;
CREATE POLICY "project_access_tokens_select" ON public.project_access_tokens FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_access_tokens.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
DROP POLICY IF EXISTS "project_access_tokens_insert" ON public.project_access_tokens;
CREATE POLICY "project_access_tokens_insert" ON public.project_access_tokens FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_access_tokens.project_id AND public.is_team_member(p.team_id, auth.uid()))
);
DROP POLICY IF EXISTS "project_access_tokens_delete" ON public.project_access_tokens;
CREATE POLICY "project_access_tokens_delete" ON public.project_access_tokens FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_access_tokens.project_id AND public.is_team_member(p.team_id, auth.uid()))
);

-- 2. RPC: Get client portal data by token (callable by anon — no auth required)
-- p_identifier: project UUID or slug
CREATE OR REPLACE FUNCTION public.get_client_portal_by_token(p_identifier text, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_project record;
  v_deliverables jsonb;
  v_messages jsonb;
  v_versions jsonb;
  v_invoices jsonb;
  v_files jsonb;
  v_client_name text;
  v_client_id uuid;
  v_tasks jsonb;
  v_milestones jsonb;
  v_valid boolean;
BEGIN
  -- Resolve identifier (UUID or slug) to project_id
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE p.id::text = p_identifier OR p.slug = p_identifier
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Project not found');
  END IF;

  -- Validate token
  SELECT EXISTS (
    SELECT 1 FROM public.project_access_tokens pat
    WHERE pat.project_id = v_project_id
      AND pat.token = p_token
      AND pat.expires_at > now()
  ) INTO v_valid;

  IF NOT v_valid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or expired token');
  END IF;

  -- Fetch project
  SELECT p.id, p.team_id, p.name, p.description, p.status, p.progress, p.deadline,
         p.budget, p.spent, p.client_id, p.handoff_status, p.handoff_rating, p.slug, p.created_at, p.updated_at
  INTO v_project
  FROM public.projects p
  WHERE p.id = v_project_id;

  -- Client name
  SELECT c.name, c.id INTO v_client_name, v_client_id
  FROM public.clients c WHERE c.id = v_project.client_id;

  -- Deliverables
  SELECT COALESCE(jsonb_agg(d ORDER BY d.sort_order NULLS LAST, d.created_at), '[]'::jsonb)
  INTO v_deliverables
  FROM public.deliverables d
  WHERE d.project_id = v_project_id;

  -- Messages
  SELECT COALESCE(jsonb_agg(cm ORDER BY cm.created_at), '[]'::jsonb)
  INTO v_messages
  FROM public.client_messages cm
  WHERE cm.project_id = v_project_id;

  -- Handoff versions
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', hv.id, 'version', hv.version, 'notes', hv.notes, 'files_count', hv.files_count, 'created_at', hv.created_at)
    ORDER BY hv.created_at DESC
  ), '[]'::jsonb)
  INTO v_versions
  FROM public.handoff_versions hv
  WHERE hv.project_id = v_project_id;

  -- Invoices
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', i.id, 'label', i.label, 'amount', i.amount, 'status', i.status, 'due_date', i.due_date, 'created_at', i.created_at)
  ), '[]'::jsonb)
  INTO v_invoices
  FROM public.invoices i
  WHERE i.project_id = v_project_id;

  -- Files: merge project_files + files (by project_id)
  WITH all_files AS (
    SELECT id, name, type, size_bytes, storage_path, created_at
    FROM public.project_files WHERE project_id = v_project_id
    UNION ALL
    SELECT id, name, type, size_bytes, storage_path, created_at
    FROM public.files WHERE project_id = v_project_id
  )
  SELECT COALESCE(
    (SELECT jsonb_agg(row_to_json(f.*)::jsonb ORDER BY f.created_at DESC) FROM all_files f),
    '[]'::jsonb
  ) INTO v_files;

  -- Tasks
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', t.id, 'title', t.title, 'status', t.status, 'priority', t.priority, 'due_date', t.due_date)
  ), '[]'::jsonb)
  INTO v_tasks
  FROM public.tasks t
  WHERE t.project_id = v_project_id;

  -- Milestones
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', m.id, 'title', m.title, 'due_date', m.due_date, 'completed', m.completed)
  ), '[]'::jsonb)
  INTO v_milestones
  FROM public.milestones m
  WHERE m.project_id = v_project_id;

  RETURN jsonb_build_object(
    'ok', true,
    'project', jsonb_build_object(
      'id', v_project.id,
      'name', v_project.name,
      'description', COALESCE(v_project.description, ''),
      'status', v_project.status,
      'progress', COALESCE(v_project.progress, 0),
      'deadline', v_project.deadline,
      'budget', COALESCE(v_project.budget, 0),
      'spent', COALESCE(v_project.spent, 0),
      'client_id', v_client_id,
      'client', jsonb_build_object('id', v_client_id, 'name', COALESCE(v_client_name, '')),
      'handoff_status', COALESCE(v_project.handoff_status, 'pending'),
      'handoff_rating', v_project.handoff_rating,
      'slug', v_project.slug,
      'created_at', v_project.created_at,
      'updated_at', v_project.updated_at
    ),
    'deliverables', v_deliverables,
    'messages', v_messages,
    'versions', v_versions,
    'invoices', v_invoices,
    'projectFiles', v_files,
    'tasks', v_tasks,
    'milestones', v_milestones
  );
END;
$$;

-- 3. RPC: Create project access token (team members only; auth required)
CREATE OR REPLACE FUNCTION public.create_project_access_token(p_project_id uuid, p_expires_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_expires timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id AND public.is_team_member(p.team_id, auth.uid())
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Project not found or access denied');
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires := now() + (COALESCE(NULLIF(p_expires_days, 0), 30) || ' days')::interval;

  INSERT INTO public.project_access_tokens (project_id, token, expires_at, created_by)
  VALUES (p_project_id, v_token, v_expires, auth.uid());

  RETURN jsonb_build_object('ok', true, 'token', v_token, 'expires_at', v_expires);
END;
$$;

-- 4. RPC: Client submit feedback by token (message, handoff_status, handoff_rating)
CREATE OR REPLACE FUNCTION public.client_submit_feedback_by_token(
  p_project_id uuid,
  p_token text,
  p_message text DEFAULT NULL,
  p_handoff_status text DEFAULT NULL,
  p_handoff_rating int DEFAULT NULL,
  p_sender_name text DEFAULT 'Client'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid boolean;
  v_msg_id uuid := NULL;
BEGIN
  -- Validate token
  SELECT EXISTS (
    SELECT 1 FROM public.project_access_tokens pat
    WHERE pat.project_id = p_project_id AND pat.token = p_token AND pat.expires_at > now()
  ) INTO v_valid;

  IF NOT v_valid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or expired token');
  END IF;

  -- Update project handoff fields if provided
  IF p_handoff_status IS NOT NULL AND p_handoff_status IN ('approved', 'pending', 'changes') THEN
    UPDATE public.projects
    SET handoff_status = p_handoff_status, updated_at = now()
    WHERE id = p_project_id;
  END IF;

  IF p_handoff_rating IS NOT NULL AND p_handoff_rating BETWEEN 1 AND 5 THEN
    UPDATE public.projects
    SET handoff_rating = p_handoff_rating, updated_at = now()
    WHERE id = p_project_id;
  END IF;

  -- Insert message if provided
  IF p_message IS NOT NULL AND trim(p_message) != '' THEN
    INSERT INTO public.client_messages (project_id, from_role, sender_name, text)
    VALUES (p_project_id, 'client', NULLIF(trim(p_sender_name), ''), trim(p_message))
    RETURNING id INTO v_msg_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'message_id', v_msg_id);
END;
$$;

-- 5. RPC: Update deliverable completed by token (client marks deliverable done)
CREATE OR REPLACE FUNCTION public.client_update_deliverable_by_token(
  p_project_id uuid,
  p_token text,
  p_deliverable_id uuid,
  p_completed boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.project_access_tokens pat
    WHERE pat.project_id = p_project_id AND pat.token = p_token AND pat.expires_at > now()
  ) INTO v_valid;

  IF NOT v_valid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or expired token');
  END IF;

  UPDATE public.deliverables
  SET completed = p_completed, status = CASE WHEN p_completed THEN 'done' ELSE 'active' END
  WHERE id = p_deliverable_id AND project_id = p_project_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Deliverable not found');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 6. Grant execute (anon for get + feedback; authenticated for create + manage)
GRANT EXECUTE ON FUNCTION public.get_client_portal_by_token(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_portal_by_token(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_project_access_token(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_submit_feedback_by_token(uuid, text, text, text, int, text) TO anon;
GRANT EXECUTE ON FUNCTION public.client_submit_feedback_by_token(uuid, text, text, text, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_update_deliverable_by_token(uuid, text, uuid, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.client_update_deliverable_by_token(uuid, text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_team_invite(text) TO authenticated;
