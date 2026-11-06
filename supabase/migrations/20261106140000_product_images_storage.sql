-- Photos des produits : espace de stockage public en lecture, écriture réservée au vendeur
-- dans SON dossier (le premier niveau du chemin est l'identifiant du vendeur).

-- 1. Espace de stockage : 5 Mo max par photo, formats image courants uniquement
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 'product-images', true, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Règles d'accès. La lecture publique passe par l'adresse directe du fichier (espace public) :
--    aucune règle de lecture n'est ajoutée, donc personne ne peut lister le contenu du dossier.
DROP POLICY IF EXISTS product_images_seller_insert ON storage.objects;
CREATE POLICY product_images_seller_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND private.has_role(auth.uid(), 'seller')
    AND private.is_account_usable(auth.uid())
  );

DROP POLICY IF EXISTS product_images_seller_update ON storage.objects;
CREATE POLICY product_images_seller_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS product_images_seller_delete ON storage.objects;
CREATE POLICY product_images_seller_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Les administrateurs peuvent retirer n'importe quelle photo (modération)
DROP POLICY IF EXISTS product_images_admin_delete ON storage.objects;
CREATE POLICY product_images_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND private.is_admin(auth.uid()));

-- 3. Une fiche produit ne peut référencer que des photos du vendeur lui-même (6 maximum).
--    Sinon un vendeur pourrait y mettre l'adresse d'un site extérieur.
CREATE OR REPLACE FUNCTION public.validate_product_images()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  img text;
  prefix text;
BEGIN
  IF auth.uid() IS NULL OR private.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.images IS NOT DISTINCT FROM OLD.images THEN
    RETURN NEW;
  END IF;

  IF COALESCE(array_length(NEW.images, 1), 0) > 6 THEN
    RAISE EXCEPTION 'Six photos maximum par produit';
  END IF;

  prefix := '/storage/v1/object/public/product-images/' || auth.uid()::text || '/';
  FOREACH img IN ARRAY COALESCE(NEW.images, '{}'::text[]) LOOP
    IF position(prefix in img) = 0 OR img LIKE '%..%' THEN
      RAISE EXCEPTION 'Photo non autorisée';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_product_images ON public.products;
CREATE TRIGGER validate_product_images
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_images();
