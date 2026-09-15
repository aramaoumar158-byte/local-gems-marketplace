CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION private.is_account_usable(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.status <> 'suspended') $$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_account_usable(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_account_usable(uuid) TO authenticated, service_role;

-- profiles
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR private.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

-- user_roles
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

-- categories
DROP POLICY IF EXISTS categories_admin_all ON public.categories;
CREATE POLICY categories_admin_all ON public.categories FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- stores
DROP POLICY IF EXISTS stores_admin_all ON public.stores;
CREATE POLICY stores_admin_all ON public.stores FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS stores_admin_read ON public.stores;
CREATE POLICY stores_admin_read ON public.stores FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS stores_owner_insert ON public.stores;
CREATE POLICY stores_owner_insert ON public.stores FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND private.has_role(auth.uid(), 'seller') AND private.is_account_usable(auth.uid()));

-- products
DROP POLICY IF EXISTS products_admin_all ON public.products;
CREATE POLICY products_admin_all ON public.products FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS products_admin_read ON public.products;
CREATE POLICY products_admin_read ON public.products FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS products_owner_insert ON public.products;
CREATE POLICY products_owner_insert ON public.products FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid() AND private.has_role(auth.uid(), 'seller') AND private.is_account_usable(auth.uid()));
DROP POLICY IF EXISTS products_owner_update ON public.products;
CREATE POLICY products_owner_update ON public.products FOR UPDATE TO authenticated
  USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid() AND private.is_account_usable(auth.uid()));

-- orders
DROP POLICY IF EXISTS orders_admin_all ON public.orders;
CREATE POLICY orders_admin_all ON public.orders FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS orders_admin_read ON public.orders;
CREATE POLICY orders_admin_read ON public.orders FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS orders_customer_insert ON public.orders;
CREATE POLICY orders_customer_insert ON public.orders FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid() AND private.is_account_usable(auth.uid()));

-- order_items
DROP POLICY IF EXISTS order_items_read ON public.order_items;
CREATE POLICY order_items_read ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id
    AND (o.customer_id = auth.uid() OR o.seller_id = auth.uid() OR private.has_role(auth.uid(), 'admin'))));

-- payouts / transactions
DROP POLICY IF EXISTS payouts_seller_read ON public.payouts;
CREATE POLICY payouts_seller_read ON public.payouts FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS transactions_seller_read ON public.transactions;
CREATE POLICY transactions_seller_read ON public.transactions FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR customer_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

-- trigger de protection des champs sensibles
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN
    NEW.status := OLD.status;
    NEW.phone_verified := OLD.phone_verified;
    NEW.email_verified := OLD.email_verified;
  END IF;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.is_account_usable(uuid);
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);