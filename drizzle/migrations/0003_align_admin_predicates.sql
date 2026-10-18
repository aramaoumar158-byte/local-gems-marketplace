-- =====================================================================
-- ANW KA SUKU — 0003 : alignement des prédicats d'administration
-- =====================================================================
-- OBJET
--   Les policies RLS et le trigger d'administration historiques testaient
--   private.has_role(auth.uid(), 'admin'). Cette fonction compare
--   EXACTEMENT (role = 'admin') : elle ne reconnaît PAS le rôle
--   'super_admin'.
--
-- ÉTAT VÉRIFIÉ EN DIRECT (18/10/2026, compte 'super_admin' réel) :
--   - LECTURE : AUCUNE restriction observée. Les policies sont permissives
--     et s'additionnent ; celles fondées sur private.is_admin() — qui
--     accepte DÉJÀ 'admin' ET 'super_admin' (drizzle/migrations/0000,
--     ligne 17) — suffisent. Le blocage de lecture initialement soupçonné
--     n'a PAS été reproduit.
--   - TRIGGER : le défaut est réel et latent.
--     public.protect_profile_privileged_fields() utilisant
--     has_role(...,'admin'), un compte 'super_admin' SANS le rôle 'admin'
--     verrait ses changements de status/phone_verified/email_verified
--     silencieusement annulés (ex. « suspendre un utilisateur » sans effet).
--     Non déclenché à ce jour : un seul compte existe et l'auto-suspension
--     est interdite par admin_action().
--   - CONTEXTE NON AUTHENTIFIÉ : auth.uid() est NULL dans l'éditeur SQL
--     Supabase, donc has_role(NULL,'admin') est faux et le trigger annulait
--     aussi les promotions exécutées à la main. C'est pourquoi le statut
--     restait 'pending_verification' après scripts/promote-super-admin.sql.
--
-- CORRECTIF
--   1) Prédicat unique et explicite private.is_admin() (admin OU super_admin)
--      pour toutes les policies d'administration.
--   2) Trigger : le contexte non authentifié (auth.uid() IS NULL : éditeur
--      SQL, service_role) est désormais considéré comme de confiance, et le
--      prédicat administrateur y ajoute private.is_account_usable() — un
--      administrateur suspendu ne peut donc plus réactiver son propre compte.
--   3) Ajout de private.is_account_usable() aux policies (B2) : un
--      administrateur suspendu perd réellement ses accès. C'est le seul
--      durcissement de comportement effectif sur la base actuelle.
--
-- PORTÉE / IMPACT
--   Migration ADDITIVE et IDEMPOTENTE :
--     - aucune table, colonne, ligne ni donnée n'est supprimée ou modifiée ;
--     - seules des policies RLS et une fonction de trigger sont redéfinies ;
--     - les clauses d'accès personnel (id/user_id/seller_id/customer_id =
--       auth.uid()) sont conservées à l'identique ;
--     - ré-exécuter ce fichier n'a aucun effet de bord.
--   Réversible : réappliquer la définition d'origine (has_role) si besoin.
--
-- APPLICATION : Supabase Dashboard -> SQL Editor -> New query -> Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Champs privilégiés du profil (status, phone_verified, email_verified)
--    - Contexte non authentifié (auth.uid() IS NULL : éditeur SQL Supabase,
--      service_role) : de confiance, la modification passe. C'est ce qui
--      permet à scripts/promote-super-admin.sql de fonctionner réellement.
--    - Administrateur (admin OU super_admin) NON suspendu : peut suspendre
--      ou réactiver un compte.
--    - Tout autre compte, et tout administrateur suspendu : les champs
--      privilégiés sont restaurés (aucune auto-réactivation possible).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid())) THEN
    NEW.status := OLD.status;
    NEW.phone_verified := OLD.phone_verified;
    NEW.email_verified := OLD.email_verified;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_profile_privileged_fields() FROM PUBLIC, anon, authenticated;

-- Prédicat administrateur retenu partout ci-dessous :
--   private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid())

-- ---------------------------------------------------------------------
-- 2. profiles
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid())));

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid())))
  WITH CHECK (id = auth.uid() OR (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid())));

-- ---------------------------------------------------------------------
-- 3. user_roles — lecture seule, aucune écriture possible depuis l'app
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid())));

-- ---------------------------------------------------------------------
-- 4. categories
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS categories_admin_all ON public.categories;
CREATE POLICY categories_admin_all ON public.categories FOR ALL TO authenticated
  USING (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid()))
  WITH CHECK (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid()));

-- ---------------------------------------------------------------------
-- 5. stores
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS stores_admin_all ON public.stores;
CREATE POLICY stores_admin_all ON public.stores FOR ALL TO authenticated
  USING (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid()))
  WITH CHECK (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid()));

DROP POLICY IF EXISTS stores_admin_read ON public.stores;
CREATE POLICY stores_admin_read ON public.stores FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid()));

-- ---------------------------------------------------------------------
-- 6. products
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS products_admin_all ON public.products;
CREATE POLICY products_admin_all ON public.products FOR ALL TO authenticated
  USING (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid()))
  WITH CHECK (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid()));

DROP POLICY IF EXISTS products_admin_read ON public.products;
CREATE POLICY products_admin_read ON public.products FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid()));

-- ---------------------------------------------------------------------
-- 7. orders
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS orders_admin_all ON public.orders;
CREATE POLICY orders_admin_all ON public.orders FOR ALL TO authenticated
  USING (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid()))
  WITH CHECK (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid()));

DROP POLICY IF EXISTS orders_admin_read ON public.orders;
CREATE POLICY orders_admin_read ON public.orders FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid()));

-- ---------------------------------------------------------------------
-- 8. order_items
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS order_items_read ON public.order_items;
CREATE POLICY order_items_read ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id
    AND (o.customer_id = auth.uid() OR o.seller_id = auth.uid()
      OR (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid())))));

-- ---------------------------------------------------------------------
-- 9. payouts / transactions
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS payouts_seller_read ON public.payouts;
CREATE POLICY payouts_seller_read ON public.payouts FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid())));

DROP POLICY IF EXISTS transactions_seller_read ON public.transactions;
CREATE POLICY transactions_seller_read ON public.transactions FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR customer_id = auth.uid()
    OR (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid())));
