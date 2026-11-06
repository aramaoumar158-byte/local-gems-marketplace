-- Correctif : les déclencheurs de la migration 20261105200000 testaient le rôle exact 'admin'
-- et ne reconnaissaient pas 'super_admin'. Un super administrateur aurait donc été traité comme
-- un vendeur (approbation de boutiques et modification de commandes annulées).
-- On utilise désormais private.is_admin() (admin OU super_admin), comme le reste de l'espace admin.
-- Les déclencheurs existent déjà : seules les fonctions sont remplacées.

CREATE OR REPLACE FUNCTION public.protect_order_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR private.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  NEW.reference         := OLD.reference;
  NEW.customer_id       := OLD.customer_id;
  NEW.seller_id         := OLD.seller_id;
  NEW.store_id          := OLD.store_id;
  NEW.total_amount      := OLD.total_amount;
  NEW.commission_amount := OLD.commission_amount;
  NEW.payment_status    := OLD.payment_status;
  NEW.delivery_address  := OLD.delivery_address;
  NEW.delivery_phone    := OLD.delivery_phone;
  NEW.is_demo           := OLD.is_demo;
  NEW.created_at        := OLD.created_at;
  -- restent modifiables par le vendeur : status, delivery_status
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_store_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR private.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status      := 'pending';   -- toute nouvelle boutique attend la validation
    NEW.is_featured := false;
    NEW.is_demo     := false;
    NEW.rating      := 0;
  ELSE
    NEW.owner_id    := OLD.owner_id;
    NEW.status      := OLD.status;
    NEW.is_featured := OLD.is_featured;
    NEW.is_demo     := OLD.is_demo;
    NEW.rating      := OLD.rating;
  END IF;
  RETURN NEW;
END;
$$;

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
  ELSE
    NEW.is_featured := OLD.is_featured;
    NEW.is_demo     := OLD.is_demo;
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
