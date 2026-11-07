-- Un vendeur pouvait modifier le statut de ses propres produits (règle « products_owner_update »
-- sans limite de colonnes) : il pouvait donc se les approuver, ou réactiver un produit rejeté
-- ou retiré par un administrateur. Les nouveaux produits sont maintenant toujours « en attente »
-- et le vendeur ne peut que masquer un produit ou le renvoyer en modération.
-- Les administrateurs (admin ou super_admin) et les appels internes ne sont pas limités.

CREATE OR REPLACE FUNCTION public.protect_product_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR private.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_featured := false;
    NEW.is_demo     := false;
    NEW.status      := 'pending_review';
  ELSE
    NEW.is_featured := OLD.is_featured;
    NEW.is_demo     := OLD.is_demo;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status::text = 'hidden'
         AND OLD.status::text IN ('draft', 'pending_review', 'active', 'published') THEN
        NULL;  -- le vendeur peut masquer son produit
      ELSIF NEW.status::text = 'pending_review'
         AND OLD.status::text IN ('draft', 'hidden') THEN
        NULL;  -- le vendeur peut le renvoyer en modération
      ELSE
        NEW.status := OLD.status;  -- tout le reste est réservé aux administrateurs
      END IF;
    END IF;
  END IF;

  -- La boutique doit appartenir au vendeur (contrôlé à la création ou si la boutique change)
  IF NEW.store_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.store_id IS DISTINCT FROM OLD.store_id) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = NEW.store_id AND s.owner_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Cette boutique ne vous appartient pas';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
