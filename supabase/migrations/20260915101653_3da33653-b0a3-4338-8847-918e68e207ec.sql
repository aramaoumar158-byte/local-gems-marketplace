ALTER TYPE public.account_status ADD VALUE IF NOT EXISTS 'pending_verification';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
  ON public.profiles (phone) WHERE phone IS NOT NULL;

-- Empêche l'auto-modification de l'état du compte et des indicateurs de vérification
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.status := OLD.status;
    NEW.phone_verified := OLD.phone_verified;
    NEW.email_verified := OLD.email_verified;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profile_privileged_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER protect_profile_privileged_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- Compte utilisable ? (ni suspendu)
CREATE OR REPLACE FUNCTION public.is_account_usable(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.status <> 'suspended'
  )
$$;

REVOKE ALL ON FUNCTION public.is_account_usable(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_account_usable(uuid) TO authenticated;

DROP POLICY IF EXISTS products_owner_insert ON public.products;
CREATE POLICY products_owner_insert ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid() AND has_role(auth.uid(), 'seller') AND is_account_usable(auth.uid()));

DROP POLICY IF EXISTS products_owner_update ON public.products;
CREATE POLICY products_owner_update ON public.products
  FOR UPDATE TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid() AND is_account_usable(auth.uid()));

DROP POLICY IF EXISTS stores_owner_insert ON public.stores;
CREATE POLICY stores_owner_insert ON public.stores
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND has_role(auth.uid(), 'seller') AND is_account_usable(auth.uid()));

DROP POLICY IF EXISTS orders_customer_insert ON public.orders;
CREATE POLICY orders_customer_insert ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid() AND is_account_usable(auth.uid()));