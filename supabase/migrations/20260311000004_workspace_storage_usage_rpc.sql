-- Workspace Phase 2: team storage usage aggregation (single round-trip)
-- Returns used_bytes and file_count for the team's files (via file_folders).

CREATE OR REPLACE FUNCTION public.get_team_storage_usage(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used_bytes bigint;
  v_file_count bigint;
BEGIN
  IF NOT public.is_team_member(p_team_id, auth.uid()) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT
    COALESCE(SUM(f.size_bytes), 0)::bigint,
    COUNT(f.id)::bigint
  INTO v_used_bytes, v_file_count
  FROM public.files f
  INNER JOIN public.file_folders ff ON ff.id = f.folder_id
  WHERE ff.team_id = p_team_id;

  RETURN jsonb_build_object(
    'used_bytes', v_used_bytes,
    'file_count', v_file_count
  );
END;
$$;

COMMENT ON FUNCTION public.get_team_storage_usage(uuid) IS
  'Returns aggregated storage usage for a team (used_bytes, file_count). RLS: only team members.';
