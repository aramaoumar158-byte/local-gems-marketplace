CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  user_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  send_count integer NOT NULL DEFAULT 1,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  last_sent_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.email_verification_codes FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.email_verification_codes TO service_role;

ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;