-- Update get_client_portal_by_token to include attachments in each message

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
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE p.id::text = p_identifier OR p.slug = p_identifier
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Project not found');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.project_access_tokens pat
    WHERE pat.project_id = v_project_id AND pat.token = p_token AND pat.expires_at > now()
  ) INTO v_valid;

  IF NOT v_valid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or expired token');
  END IF;

  SELECT p.id, p.team_id, p.name, p.description, p.status, p.progress, p.deadline,
         p.budget, p.spent, p.client_id, p.handoff_status, p.handoff_rating, p.slug, p.created_at, p.updated_at
  INTO v_project
  FROM public.projects p WHERE p.id = v_project_id;

  SELECT c.name, c.id INTO v_client_name, v_client_id
  FROM public.clients c WHERE c.id = v_project.client_id;

  SELECT COALESCE(jsonb_agg(d ORDER BY d.sort_order NULLS LAST, d.created_at), '[]'::jsonb)
  INTO v_deliverables
  FROM public.deliverables d WHERE d.project_id = v_project_id;

  -- Messages with attachments
  SELECT COALESCE(
    (SELECT jsonb_agg(
      to_jsonb(cm) || jsonb_build_object(
        'attachments',
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'size_bytes', a.size_bytes, 'storage_path', a.storage_path, 'type', a.type))
          FROM public.client_message_attachments a WHERE a.message_id = cm.id
        ), '[]'::jsonb)
      )
      ORDER BY cm.created_at
    )
    FROM public.client_messages cm
    WHERE cm.project_id = v_project_id),
    '[]'::jsonb
  ) INTO v_messages;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', hv.id, 'version', hv.version, 'notes', hv.notes, 'files_count', hv.files_count, 'created_at', hv.created_at)
    ORDER BY hv.created_at DESC
  ), '[]'::jsonb)
  INTO v_versions
  FROM public.handoff_versions hv WHERE hv.project_id = v_project_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', i.id, 'label', i.label, 'amount', i.amount, 'status', i.status, 'due_date', i.due_date, 'created_at', i.created_at)
  ), '[]'::jsonb)
  INTO v_invoices
  FROM public.invoices i WHERE i.project_id = v_project_id;

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

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', t.id, 'title', t.title, 'status', t.status, 'priority', t.priority, 'due_date', t.due_date)
  ), '[]'::jsonb)
  INTO v_tasks
  FROM public.tasks t WHERE t.project_id = v_project_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', m.id, 'title', m.title, 'due_date', m.due_date, 'completed', m.completed)
  ), '[]'::jsonb)
  INTO v_milestones
  FROM public.milestones m WHERE m.project_id = v_project_id;

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
