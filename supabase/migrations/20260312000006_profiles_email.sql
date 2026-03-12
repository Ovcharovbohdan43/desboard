-- Add email to profiles for display fallback when display_name is null.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Backfill email and display_name from auth.users
UPDATE public.profiles p
SET
  email = COALESCE(p.email, u.email),
  display_name = COALESCE(p.display_name, u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
FROM auth.users u
WHERE p.user_id = u.id;

-- Trigger: set email and improve display_name fallback on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  RETURN new;
END;
$$;
