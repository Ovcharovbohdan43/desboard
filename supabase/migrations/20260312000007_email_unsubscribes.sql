-- Email unsubscribe list (required by email providers to reduce spam complaints)
CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  type text NOT NULL DEFAULT 'team_invites' CHECK (type IN ('team_invites')),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(email, type)
);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email_type ON public.email_unsubscribes(email, type);

COMMENT ON TABLE public.email_unsubscribes IS 'Opt-out list for transactional emails (e.g. team invites). Inserts via Edge Function unsubscribe-email with signed token.';
