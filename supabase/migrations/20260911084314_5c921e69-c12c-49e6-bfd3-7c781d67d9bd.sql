-- ENUMS
CREATE TYPE public.app_role AS ENUM ('client', 'seller', 'admin');
CREATE TYPE public.store_status AS ENUM ('pending', 'approved', 'suspended');
CREATE TYPE public.product_status AS ENUM ('draft', 'active', 'hidden', 'removed');
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');
CREATE TYPE public.account_status AS ENUM ('active', 'suspended');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  city TEXT,
  avatar_url TEXT,
  status public.account_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  requested TEXT;
  final_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.raw_user_meta_data ->> 'phone',
    NULLIF(NEW.raw_user_meta_data ->> 'contact_email', '')
  );

  requested := COALESCE(NEW.raw_user_meta_data ->> 'role', 'client');
  IF requested = 'seller' THEN final_role := 'seller'; ELSE final_role := 'client'; END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, final_role);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CATEGORIES
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  emoji TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories_admin_all" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- STORES
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID,
  store_name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  city TEXT,
  phone TEXT,
  logo_url TEXT,
  banner_url TEXT,
  status public.store_status NOT NULL DEFAULT 'pending',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stores_public_read" ON public.stores FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "stores_owner_read" ON public.stores FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "stores_admin_read" ON public.stores FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "stores_owner_insert" ON public.stores FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(), 'seller'));
CREATE POLICY "stores_owner_update" ON public.stores FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "stores_admin_all" ON public.stores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER stores_updated_at BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  stock INT NOT NULL DEFAULT 0,
  images TEXT[] NOT NULL DEFAULT '{}',
  status public.product_status NOT NULL DEFAULT 'active',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON public.products FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "products_owner_read" ON public.products FOR SELECT TO authenticated USING (seller_id = auth.uid());
CREATE POLICY "products_admin_read" ON public.products FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "products_owner_insert" ON public.products FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid() AND public.has_role(auth.uid(), 'seller'));
CREATE POLICY "products_owner_update" ON public.products FOR UPDATE TO authenticated
  USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());
CREATE POLICY "products_owner_delete" ON public.products FOR DELETE TO authenticated USING (seller_id = auth.uid());
CREATE POLICY "products_admin_all" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORDERS
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL DEFAULT ('CMD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  customer_id UUID,
  seller_id UUID,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_address TEXT,
  delivery_phone TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_customer_read" ON public.orders FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "orders_seller_read" ON public.orders FOR SELECT TO authenticated USING (seller_id = auth.uid());
CREATE POLICY "orders_admin_read" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "orders_customer_insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "orders_seller_update" ON public.orders FOR UPDATE TO authenticated
  USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());
CREATE POLICY "orders_admin_all" ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_read" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id
    AND (o.customer_id = auth.uid() OR o.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "order_items_insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid()));

-- FAVORITES
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_own" ON public.favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- FUTURE FINANCE ARCHITECTURE (no processing yet)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  seller_id UUID,
  customer_id UUID,
  provider TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_seller_read" ON public.transactions FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  method TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts_seller_read" ON public.payouts FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "payouts_seller_insert" ON public.payouts FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid());

-- DEMO DATA
INSERT INTO public.categories (name, slug, emoji, position) VALUES
  ('Artisanat', 'artisanat', '🧵', 1),
  ('Poterie', 'poterie', '🏺', 2),
  ('Vêtements', 'vetements', '👗', 3),
  ('Meubles', 'meubles', '🪑', 4),
  ('Produits locaux', 'produits-locaux', '🌾', 5),
  ('Décoration', 'decoration', '🖼️', 6),
  ('Accessoires', 'accessoires', '👜', 7);

INSERT INTO public.stores (id, store_name, slug, description, city, phone, status, is_featured, is_demo, rating) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Atelier Terre & Feu', 'terre-et-feu', 'Poterie artisanale façonnée à la main à Ségou. Démonstration.', 'Ségou', '+223 70 00 00 01', 'approved', true, true, 4.8),
  ('22222222-2222-4222-8222-222222222222', 'Bogolan de Sikasso', 'bogolan-sikasso', 'Textiles bogolan teints naturellement. Démonstration.', 'Sikasso', '+223 70 00 00 02', 'approved', true, true, 4.9),
  ('33333333-3333-4333-8333-333333333333', 'Menuiserie Sankara', 'menuiserie-sankara', 'Meubles sur mesure en bois massif. Démonstration.', 'Bamako', '+223 70 00 00 03', 'approved', true, true, 4.7),
  ('44444444-4444-4444-8444-444444444444', 'Maison Déco Niger', 'maison-deco-niger', 'Décoration intérieure inspirée du fleuve. Démonstration.', 'Mopti', '+223 70 00 00 04', 'approved', false, true, 4.6),
  ('55555555-5555-4555-8555-555555555555', 'Saveurs du Mali', 'saveurs-du-mali', 'Produits locaux : karité, miel, céréales. Démonstration.', 'Kayes', '+223 70 00 00 05', 'pending', false, true, 4.5);

INSERT INTO public.products (store_id, category_id, name, description, price, stock, status, is_featured, is_demo)
SELECT s.id, c.id, p.name, p.description, p.price, p.stock, 'active'::public.product_status, p.featured, true
FROM (VALUES
  ('terre-et-feu', 'poterie', 'Jarre en terre cuite', 'Jarre traditionnelle façonnée à la main. Donnée de démonstration.', 12500, 14, true),
  ('terre-et-feu', 'poterie', 'Service à thé en argile', 'Six tasses et une théière en argile polie. Donnée de démonstration.', 18000, 8, false),
  ('terre-et-feu', 'decoration', 'Vase décoratif ocre', 'Vase émaillé aux tons ocre. Donnée de démonstration.', 22000, 5, false),
  ('bogolan-sikasso', 'vetements', 'Boubou bogolan homme', 'Boubou en coton teint au bogolan. Donnée de démonstration.', 35000, 12, true),
  ('bogolan-sikasso', 'artisanat', 'Tissu bogolan 2m', 'Pièce de tissu bogolan authentique. Donnée de démonstration.', 15000, 30, false),
  ('bogolan-sikasso', 'accessoires', 'Sac à main bogolan', 'Sac cousu main, doublure coton. Donnée de démonstration.', 9500, 20, true),
  ('menuiserie-sankara', 'meubles', 'Tabouret sculpté', 'Tabouret en bois massif sculpté. Donnée de démonstration.', 28000, 6, true),
  ('menuiserie-sankara', 'meubles', 'Table basse artisanale', 'Table basse en bois de vène. Donnée de démonstration.', 95000, 3, false),
  ('maison-deco-niger', 'decoration', 'Lampe en calebasse', 'Lampe décorative en calebasse ajourée. Donnée de démonstration.', 17500, 10, true),
  ('maison-deco-niger', 'decoration', 'Miroir cadre bois', 'Miroir au cadre sculpté à la main. Donnée de démonstration.', 24000, 4, false),
  ('saveurs-du-mali', 'produits-locaux', 'Beurre de karité 500g', 'Karité pur non raffiné. Donnée de démonstration.', 3500, 100, false),
  ('saveurs-du-mali', 'produits-locaux', 'Miel du Wassoulou 1L', 'Miel récolté au Wassoulou. Donnée de démonstration.', 7000, 45, true)
) AS p(store_slug, cat_slug, name, description, price, stock, featured)
JOIN public.stores s ON s.slug = p.store_slug
JOIN public.categories c ON c.slug = p.cat_slug;

INSERT INTO public.orders (store_id, status, total_amount, commission_amount, delivery_address, delivery_phone, is_demo, created_at)
SELECT s.id, o.status::public.order_status, o.total, o.total * 0.05, o.addr, '+223 70 11 22 33', true, now() - (o.days || ' days')::interval
FROM (VALUES
  ('terre-et-feu', 'delivered', 30500, 'Badalabougou, Bamako', 2),
  ('terre-et-feu', 'pending', 12500, 'Ségou centre', 0),
  ('bogolan-sikasso', 'shipped', 44500, 'Hamdallaye ACI 2000, Bamako', 1),
  ('bogolan-sikasso', 'delivered', 15000, 'Sikasso', 6),
  ('menuiserie-sankara', 'confirmed', 95000, 'Kalaban Coro, Bamako', 3),
  ('maison-deco-niger', 'delivered', 41500, 'Mopti', 9)
) AS o(store_slug, status, total, addr, days)
JOIN public.stores s ON s.slug = o.store_slug;