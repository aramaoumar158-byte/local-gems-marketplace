-- Commission plateforme et stock calculés côté serveur.
-- Avant : le client envoyait lui-même le montant total (modifiable) et le stock ne bougeait pas.
-- Maintenant : une seule fonction crée les commandes, en lisant les VRAIS prix en base.

CREATE OR REPLACE FUNCTION public.place_order(
  p_lines jsonb,
  p_address text,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_rate constant numeric := 10;           -- commission plateforme en %
  v_line jsonb;
  v_product public.products%ROWTYPE;
  v_qty int;
  v_store uuid;
  v_orders jsonb := '[]'::jsonb;
  v_order_id uuid;
  v_total numeric;
  v_commission numeric;
  v_seller uuid;
  v_ref text;
  r record;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Connexion requise';
  END IF;
  IF NOT private.is_account_usable(v_user) THEN
    RAISE EXCEPTION 'Compte non autorisé à commander';
  END IF;
  IF p_address IS NULL OR length(btrim(p_address)) = 0 THEN
    RAISE EXCEPTION 'Adresse de livraison requise';
  END IF;
  IF jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Panier vide';
  END IF;

  -- Table temporaire : une ligne par produit, avec prix et stock réels
  CREATE TEMP TABLE _po_lines (
    product_id uuid, store_id uuid, seller_id uuid,
    name text, unit_price numeric, qty int
  ) ON COMMIT DROP;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_qty := COALESCE((v_line->>'quantity')::int, 0);
    IF v_qty < 1 OR v_qty > 1000 THEN
      RAISE EXCEPTION 'Quantité invalide';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_line->>'productId')::uuid
    FOR UPDATE;                              -- verrouille pour éviter la survente

    IF NOT FOUND OR v_product.status <> 'active' THEN
      RAISE EXCEPTION 'Produit indisponible';
    END IF;
    IF v_product.seller_id IS NOT DISTINCT FROM v_user THEN
      RAISE EXCEPTION 'Vous ne pouvez pas acheter votre propre produit';
    END IF;
    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Stock insuffisant pour %', v_product.name;
    END IF;

    UPDATE public.products SET stock = stock - v_qty WHERE id = v_product.id;

    INSERT INTO _po_lines
    VALUES (v_product.id, v_product.store_id, v_product.seller_id,
            v_product.name, v_product.price, v_qty);
  END LOOP;

  -- Une commande par boutique
  FOR v_store, v_seller IN
    SELECT DISTINCT store_id, seller_id FROM _po_lines
  LOOP
    SELECT COALESCE(sum(unit_price * qty), 0) INTO v_total
    FROM _po_lines
    WHERE store_id IS NOT DISTINCT FROM v_store
      AND seller_id IS NOT DISTINCT FROM v_seller;

    v_commission := round(v_total * v_rate / 100);

    INSERT INTO public.orders
      (customer_id, seller_id, store_id, total_amount, commission_amount,
       delivery_address, delivery_phone, status)
    VALUES
      (v_user, v_seller, v_store, v_total, v_commission,
       btrim(p_address), NULLIF(btrim(COALESCE(p_phone, '')), ''), 'pending')
    RETURNING id, reference INTO v_order_id, v_ref;

    INSERT INTO public.order_items (order_id, product_id, product_name, unit_price, quantity)
    SELECT v_order_id, product_id, name, unit_price, qty
    FROM _po_lines
    WHERE store_id IS NOT DISTINCT FROM v_store
      AND seller_id IS NOT DISTINCT FROM v_seller;

    INSERT INTO public.commissions
      (order_id, seller_id, reference, gross_amount, rate, commission_amount, seller_amount, status)
    VALUES
      (v_order_id, v_seller, v_ref, v_total, v_rate, v_commission, v_total - v_commission, 'pending');

    v_orders := v_orders || jsonb_build_object(
      'id', v_order_id, 'reference', v_ref,
      'total', v_total, 'commission', v_commission,
      'seller_amount', v_total - v_commission);
  END LOOP;

  RETURN v_orders;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb, text, text) TO authenticated;

-- Fermer la porte : plus d'insertion directe de commandes depuis le navigateur.
REVOKE INSERT ON public.orders FROM authenticated;
REVOKE INSERT ON public.order_items FROM authenticated;
