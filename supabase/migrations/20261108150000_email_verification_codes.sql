-- Codes de vérification par email.
-- La table n'est lisible et modifiable que par le serveur (service_role) : aucune règle d'accès
-- n'est créée pour les utilisateurs, donc personne ne peut lire ou fabriquer un code depuis le navigateur.
-- Le code lui-même n'est jamais stocké : seulement son empreinte (HMAC), calculée par le serveur.

CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  send_count integer NOT NULL DEFAULT 1,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  last_sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.email_verification_codes FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.email_verification_codes TO service_role;
