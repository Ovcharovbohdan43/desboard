-- User preferences: theme, language, notifications
-- Phase 4: User settings

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  language text DEFAULT 'en',
  notifications jsonb DEFAULT '{"email": true, "in_app": true}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_settings_own" ON public.user_settings;
CREATE POLICY "user_settings_own" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
