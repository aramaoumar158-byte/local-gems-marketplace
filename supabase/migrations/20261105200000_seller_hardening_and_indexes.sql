-- Durcissement des droits des vendeurs + index de performance.
--
-- Problème : les règles (RLS) disent QUI peut modifier une ligne, mais pas QUELLES colonnes.
-- Un vendeur pouvait donc changer le montant ou la commission de ses commandes, approuver sa
-- propre boutique, se mettre « à la une » ou ajouter un produit dans la boutique d'un autre.
--
-- Solution : des déclencheurs (triggers) qui remettent les colonnes sensibles à leur valeur
-- d'origine pour tout utilisateur qui n'est pas administrateur.
-- auth.uid() IS NULL = appel interne (éditeur SQL, service_role) : autorisé.

-- ---------------------------------------------------------------------------
-- 1. COMMANDES : le vendeur ne peut changer que le statut de la commande et de la livraison
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_order_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR private.has_role(auth.uid(), 'admin') THEN
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

DROP TRIGGER IF EXISTS protect_order_sensitive_fields ON public.orders;
CREATE TRIGGER protect_order_sensitive_fields
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.protect_order_sensitive_fields();

-- ---------------------------------------------------------------------------
-- 2. BOUTIQUES : seul un admin approuve, met à la une ou note une boutique
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_store_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR private.has_role(auth.uid(), 'admin') THEN
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

DROP TRIGGER IF EXISTS protect_store_sensitive_fields ON public.stores;
CREATE TRIGGER protect_store_sensitive_fields
  BEFORE INSERT OR UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.protect_store_sensitive_fields();

-- ---------------------------------------------------------------------------
-- 3. PRODUITS : pas de « à la une » ni de produit dans la boutique d'un autre
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_product_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR private.has_role(auth.uid(), 'admin') THEN
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

DROP TRIGGER IF EXISTS protect_product_sensitive_fields ON public.products;
CREATE TRIGGER protect_product_sensitive_fields
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.protect_product_sensitive_fields();

-- ---------------------------------------------------------------------------
-- 4. RETRAITS (table payouts) : montant positif, statut « demandé » uniquement
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS payouts_seller_insert ON public.payouts;
CREATE POLICY payouts_seller_insert ON public.payouts FOR INSERT TO authenticated
  WITH CHECK (
    seller_id = auth.uid()
    AND status = 'requested'
    AND amount > 0
    AND is_demo = false
  );

-- ---------------------------------------------------------------------------
-- 5. INDEX : pages rapides quand les commandes et produits deviennent nombreux
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS orders_customer_idx     ON public.orders (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_seller_idx       ON public.orders (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_store_idx        ON public.orders (store_id);
CREATE INDEX IF NOT EXISTS orders_created_idx      ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS order_items_order_idx   ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS products_store_idx      ON public.products (store_id);
CREATE INDEX IF NOT EXISTS products_seller_idx     ON public.products (seller_id);
CREATE INDEX IF NOT EXISTS products_category_idx   ON public.products (category_id);
CREATE INDEX IF NOT EXISTS products_active_idx     ON public.products (created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS stores_owner_idx        ON public.stores (owner_id);
CREATE INDEX IF NOT EXISTS stores_approved_idx     ON public.stores (created_at DESC) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS transactions_seller_idx ON public.transactions (seller_id);
CREATE INDEX IF NOT EXISTS payouts_seller_idx      ON public.payouts (seller_id);

-- La table commissions est créée dans le dossier drizzle : on n'indexe que si elle existe déjà.
DO $$
BEGIN
  IF to_regclass('public.commissions') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS commissions_order_idx  ON public.commissions (order_id);
    CREATE INDEX IF NOT EXISTS commissions_seller_idx ON public.commissions (seller_id);
  END IF;
END $$;
