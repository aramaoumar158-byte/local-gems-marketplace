-- Espace « Communauté » : publications (texte, photo ou courte vidéo), j'aime, commentaires, signalements.
-- Règles : tout le monde peut regarder ; seuls les comptes vérifiés (statut « active ») publient, aiment,
-- commentent et signalent. Les compteurs sont tenus par la base, jamais par le navigateur.
-- Une publication signalée par 3 comptes différents est masquée automatiquement en attendant l'avis
-- d'un administrateur.

-- ---------------------------------------------------------------------------
-- 0. Aide : le compte est-il vérifié ?
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_verified_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.status = 'active')
$$;

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Membre',
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 1000),
  media_type text CHECK (media_type IN ('image', 'video')),
  media_url text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'removed')),
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  report_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(btrim(body)) > 0 OR media_url IS NOT NULL),
  CHECK ((media_url IS NULL) = (media_type IS NULL))
);
CREATE INDEX IF NOT EXISTS community_posts_feed_idx ON public.community_posts (created_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS community_posts_status_idx ON public.community_posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_author_idx ON public.community_posts (author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts (id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Membre',
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_comments_post_idx ON public.community_comments (post_id, created_at);

CREATE TABLE IF NOT EXISTS public.community_likes (
  post_id uuid NOT NULL REFERENCES public.community_posts (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts (id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '' CHECK (char_length(reason) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, reporter_id)
);

-- ---------------------------------------------------------------------------
-- 2. Déclencheurs : nom de l'auteur, valeurs imposées, limites anti-abus, fichiers autorisés
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.community_post_before_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE
  prefix text;
  ext text;
BEGIN
  IF auth.uid() IS NULL OR private.is_admin(auth.uid()) THEN
    RETURN NEW;  -- appels internes et administrateurs
  END IF;

  NEW.author_id := auth.uid();
  NEW.status := 'published';
  NEW.like_count := 0;
  NEW.comment_count := 0;
  NEW.report_count := 0;
  NEW.author_name := COALESCE(
    NULLIF(btrim((SELECT full_name FROM public.profiles WHERE id = auth.uid())), ''), 'Membre');

  IF (SELECT count(*) FROM public.community_posts
      WHERE author_id = auth.uid() AND created_at > now() - interval '24 hours') >= 20 THEN
    RAISE EXCEPTION 'Limite de 20 publications par jour atteinte';
  END IF;

  IF NEW.media_url IS NOT NULL THEN
    prefix := '/storage/v1/object/public/community-media/' || auth.uid()::text || '/';
    IF position(prefix IN NEW.media_url) = 0 OR NEW.media_url LIKE '%..%' THEN
      RAISE EXCEPTION 'Fichier non autorisé';
    END IF;
    ext := lower(substring(NEW.media_url FROM '\.([A-Za-z0-9]+)$'));
    IF NEW.media_type = 'image' AND ext NOT IN ('jpg', 'jpeg', 'png', 'webp') THEN
      RAISE EXCEPTION 'Format de photo non autorisé';
    END IF;
    IF NEW.media_type = 'video' AND ext NOT IN ('mp4', 'webm') THEN
      RAISE EXCEPTION 'Format de vidéo non autorisé';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS community_post_before_insert ON public.community_posts;
CREATE TRIGGER community_post_before_insert BEFORE INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.community_post_before_insert();

CREATE OR REPLACE FUNCTION public.community_comment_before_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR private.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  NEW.author_id := auth.uid();
  NEW.author_name := COALESCE(
    NULLIF(btrim((SELECT full_name FROM public.profiles WHERE id = auth.uid())), ''), 'Membre');
  IF (SELECT count(*) FROM public.community_comments
      WHERE author_id = auth.uid() AND created_at > now() - interval '24 hours') >= 100 THEN
    RAISE EXCEPTION 'Limite de 100 commentaires par jour atteinte';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS community_comment_before_insert ON public.community_comments;
CREATE TRIGGER community_comment_before_insert BEFORE INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_comment_before_insert();

-- ---------------------------------------------------------------------------
-- 3. Compteurs et masquage automatique (exécutés avec les droits de la base)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.community_refresh_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  pid uuid := COALESCE(NEW.post_id, OLD.post_id);
BEGIN
  IF TG_TABLE_NAME = 'community_likes' THEN
    UPDATE public.community_posts SET like_count = (SELECT count(*) FROM public.community_likes WHERE post_id = pid) WHERE id = pid;
  ELSIF TG_TABLE_NAME = 'community_comments' THEN
    UPDATE public.community_posts SET comment_count = (SELECT count(*) FROM public.community_comments WHERE post_id = pid) WHERE id = pid;
  ELSIF TG_TABLE_NAME = 'community_reports' THEN
    UPDATE public.community_posts
       SET report_count = (SELECT count(*) FROM public.community_reports WHERE post_id = pid),
           status = CASE
             WHEN status = 'published' AND (SELECT count(*) FROM public.community_reports WHERE post_id = pid) >= 3
               THEN 'hidden' ELSE status END
     WHERE id = pid;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS community_likes_count ON public.community_likes;
CREATE TRIGGER community_likes_count AFTER INSERT OR DELETE ON public.community_likes
  FOR EACH ROW EXECUTE FUNCTION public.community_refresh_counts();
DROP TRIGGER IF EXISTS community_comments_count ON public.community_comments;
CREATE TRIGGER community_comments_count AFTER INSERT OR DELETE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_refresh_counts();
DROP TRIGGER IF EXISTS community_reports_count ON public.community_reports;
CREATE TRIGGER community_reports_count AFTER INSERT OR DELETE ON public.community_reports
  FOR EACH ROW EXECUTE FUNCTION public.community_refresh_counts();

-- ---------------------------------------------------------------------------
-- 4. Règles d'accès
-- ---------------------------------------------------------------------------
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.community_posts, public.community_comments, public.community_likes, public.community_reports FROM anon;
GRANT SELECT ON public.community_posts, public.community_comments TO anon;

-- Publications : visibles si publiées, ou si ce sont les siennes, ou pour un administrateur
CREATE POLICY community_posts_read ON public.community_posts FOR SELECT TO anon, authenticated
  USING (status = 'published' OR author_id = auth.uid() OR private.is_admin(auth.uid()));
CREATE POLICY community_posts_insert ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND private.is_verified_member(auth.uid()));
CREATE POLICY community_posts_admin_update ON public.community_posts FOR UPDATE TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY community_posts_delete ON public.community_posts FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR private.is_admin(auth.uid()));

-- Commentaires : visibles avec leur publication
CREATE POLICY community_comments_read ON public.community_comments FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id));
CREATE POLICY community_comments_insert ON public.community_comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND private.is_verified_member(auth.uid())
    AND EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND p.status = 'published')
  );
CREATE POLICY community_comments_delete ON public.community_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR private.is_admin(auth.uid()));

-- J'aime : chacun ne voit que les siens
CREATE POLICY community_likes_read ON public.community_likes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_admin(auth.uid()));
CREATE POLICY community_likes_insert ON public.community_likes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND private.is_verified_member(auth.uid())
    AND EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND p.status = 'published')
  );
CREATE POLICY community_likes_delete ON public.community_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Signalements : seuls les administrateurs les lisent
CREATE POLICY community_reports_read ON public.community_reports FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()));
CREATE POLICY community_reports_insert ON public.community_reports FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = auth.uid() AND private.is_verified_member(auth.uid())
    AND EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND p.status = 'published')
  );

-- ---------------------------------------------------------------------------
-- 5. Stockage des photos et vidéos : lecture publique, écriture dans son propre dossier
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-media', 'community-media', true, 20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS community_media_insert ON storage.objects;
CREATE POLICY community_media_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND private.is_verified_member(auth.uid())
  );
DROP POLICY IF EXISTS community_media_delete ON storage.objects;
CREATE POLICY community_media_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'community-media'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR private.is_admin(auth.uid()))
  );
