ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.product_status ADD VALUE IF NOT EXISTS 'pending_review';
ALTER TYPE public.product_status ADD VALUE IF NOT EXISTS 'published';
ALTER TYPE public.product_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE public.product_status ADD VALUE IF NOT EXISTS 'suspended';
ALTER TYPE public.store_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE public.store_status ADD VALUE IF NOT EXISTS 'rejected';

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon_url text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'pending';

CREATE OR REPLACE FUNCTION private.is_admin(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role::text IN ('admin','super_admin'))
$$;
REVOKE ALL ON FUNCTION private.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO authenticated, service_role;

-- Permissions granulaires (multi-admin futur)
CREATE TABLE public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);
GRANT SELECT ON public.admin_permissions TO authenticated;
GRANT ALL ON public.admin_permissions TO service_role;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ap_read ON public.admin_permissions FOR SELECT TO authenticated USING (private.is_admin(auth.uid()));

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY aal_read ON public.admin_audit_log FOR SELECT TO authenticated USING (private.is_admin(auth.uid()));

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid,
  target_type text NOT NULL,
  target_id text,
  target_label text,
  reason text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY rep_insert ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY rep_read ON public.reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR private.is_admin(auth.uid()));

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid,
  audience text NOT NULL DEFAULT 'admin',
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  read_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_read ON public.notifications FOR SELECT TO authenticated USING (recipient_id = auth.uid() OR (audience = 'admin' AND private.is_admin(auth.uid())));
CREATE POLICY notif_update ON public.notifications FOR UPDATE TO authenticated USING (recipient_id = auth.uid() OR (audience = 'admin' AND private.is_admin(auth.uid())));

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('PAY-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  order_id uuid REFERENCES public.orders(id),
  customer_id uuid,
  provider text,
  provider_reference text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'XOF',
  status text NOT NULL DEFAULT 'pending',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY pay_read ON public.payments FOR SELECT TO authenticated USING (customer_id = auth.uid() OR private.is_admin(auth.uid()));

CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('COM-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  order_id uuid REFERENCES public.orders(id),
  seller_id uuid,
  gross_amount numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 10,
  commission_amount numeric NOT NULL DEFAULT 0,
  seller_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.commissions TO authenticated;
GRANT ALL ON public.commissions TO service_role;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY com_read ON public.commissions FOR SELECT TO authenticated USING (seller_id = auth.uid() OR private.is_admin(auth.uid()));

CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  kind text NOT NULL,
  currency text NOT NULL DEFAULT 'XOF',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, kind)
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY wal_read ON public.wallets FOR SELECT TO authenticated USING (owner_id = auth.uid() OR private.is_admin(auth.uid()));

-- Journal immuable : le solde est la somme des écritures, jamais un champ modifiable
CREATE TABLE public.wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('LED-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id),
  amount numeric NOT NULL,
  entry_type text NOT NULL,
  source_type text,
  source_id text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_ledger TO authenticated;
GRANT ALL ON public.wallet_ledger TO service_role;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY led_read ON public.wallet_ledger FOR SELECT TO authenticated USING (private.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.wallets w WHERE w.id = wallet_id AND w.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION private.block_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Journal immuable : modification interdite'; END; $$;
CREATE TRIGGER ledger_immutable BEFORE UPDATE OR DELETE ON public.wallet_ledger FOR EACH ROW EXECUTE FUNCTION private.block_mutation();
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON public.admin_audit_log FOR EACH ROW EXECUTE FUNCTION private.block_mutation();

CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('WDR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  seller_id uuid,
  seller_label text,
  amount numeric NOT NULL DEFAULT 0,
  method text,
  status text NOT NULL DEFAULT 'pending',
  transaction_reference text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
GRANT SELECT, INSERT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY wd_insert ON public.withdrawals FOR INSERT TO authenticated WITH CHECK (seller_id = auth.uid() AND status = 'pending');
CREATE POLICY wd_read ON public.withdrawals FOR SELECT TO authenticated USING (seller_id = auth.uid() OR private.is_admin(auth.uid()));

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  seller_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id),
  sender_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.conversations, public.messages TO authenticated;
GRANT ALL ON public.conversations, public.messages TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
-- Aucun accès admin libre : uniquement les participants
CREATE POLICY conv_participants ON public.conversations FOR SELECT TO authenticated USING (client_id = auth.uid() OR seller_id = auth.uid());
CREATE POLICY conv_insert ON public.conversations FOR INSERT TO authenticated WITH CHECK (client_id = auth.uid());
CREATE POLICY msg_participants ON public.messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.client_id = auth.uid() OR c.seller_id = auth.uid())));
CREATE POLICY msg_insert ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.client_id = auth.uid() OR c.seller_id = auth.uid())));

CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  is_sensitive boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY ps_read ON public.platform_settings FOR SELECT TO authenticated USING (private.is_admin(auth.uid()));

-- ===== Actions admin sécurisées (vérification serveur + audit obligatoire) =====
CREATE OR REPLACE FUNCTION public.admin_action(_action text, _target_type text, _target_id text, _value text DEFAULT NULL, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT private.is_admin(uid) THEN
    INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
    VALUES (uid, 'UNAUTHORIZED_ATTEMPT', _target_type, _target_id, jsonb_build_object('attempted', _action));
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF _action IN ('USER_SUSPENDED','USER_REACTIVATED') THEN
    IF _target_id::uuid = uid THEN RAISE EXCEPTION 'Action impossible sur votre propre compte'; END IF;
    UPDATE public.profiles SET status = (CASE WHEN _action='USER_SUSPENDED' THEN 'suspended' ELSE 'active' END)::account_status WHERE id = _target_id::uuid;
  ELSIF _action IN ('STORE_APPROVED','STORE_SUSPENDED','STORE_REACTIVATED','STORE_REJECTED') THEN
    UPDATE public.stores SET status = (CASE _action WHEN 'STORE_APPROVED' THEN 'approved' WHEN 'STORE_REACTIVATED' THEN 'approved' WHEN 'STORE_SUSPENDED' THEN 'suspended' ELSE 'rejected' END)::store_status WHERE id = _target_id::uuid;
  ELSIF _action = 'STORE_FEATURED' THEN
    UPDATE public.stores SET is_featured = NOT is_featured WHERE id = _target_id::uuid;
  ELSIF _action IN ('PRODUCT_APPROVED','PRODUCT_HIDDEN','PRODUCT_REMOVED','PRODUCT_REJECTED') THEN
    UPDATE public.products SET status = (CASE _action WHEN 'PRODUCT_APPROVED' THEN 'active' WHEN 'PRODUCT_HIDDEN' THEN 'hidden' WHEN 'PRODUCT_REMOVED' THEN 'removed' ELSE 'draft' END)::product_status WHERE id = _target_id::uuid;
  ELSIF _action = 'PRODUCT_FEATURED' THEN
    UPDATE public.products SET is_featured = NOT is_featured WHERE id = _target_id::uuid;
  ELSIF _action = 'ORDER_STATUS_CHANGED' THEN
    UPDATE public.orders SET status = _value::order_status WHERE id = _target_id::uuid;
  ELSIF _action IN ('WITHDRAWAL_APPROVED','WITHDRAWAL_REJECTED','WITHDRAWAL_FAILED') THEN
    UPDATE public.withdrawals SET status = (CASE _action WHEN 'WITHDRAWAL_APPROVED' THEN 'processing' WHEN 'WITHDRAWAL_REJECTED' THEN 'rejected' ELSE 'failed' END), processed_at = now() WHERE id = _target_id::uuid AND status IN ('pending','processing');
  ELSIF _action IN ('REPORT_RESOLVED','REPORT_DISMISSED') THEN
    UPDATE public.reports SET status = CASE WHEN _action='REPORT_RESOLVED' THEN 'resolved' ELSE 'dismissed' END WHERE id = _target_id::uuid;
  ELSIF _action IN ('CATEGORY_TOGGLED') THEN
    UPDATE public.categories SET is_active = NOT is_active WHERE id = _target_id::uuid;
  ELSIF _action = 'NOTIFICATION_READ' THEN
    UPDATE public.notifications SET read_at = now() WHERE id = _target_id::uuid;
  ELSE
    RAISE EXCEPTION 'Action inconnue';
  END IF;

  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  VALUES (uid, _action, _target_type, _target_id, jsonb_build_object('value', _value, 'note', _note));
END; $$;
REVOKE ALL ON FUNCTION public.admin_action(text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_action(text,text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_upsert_category(_id uuid, _name text, _slug text, _emoji text, _position int)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); rid uuid;
BEGIN
  IF uid IS NULL OR NOT private.is_admin(uid) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.categories(name, slug, emoji, position) VALUES (_name, _slug, _emoji, COALESCE(_position,0)) RETURNING id INTO rid;
    INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, metadata) VALUES (uid,'CATEGORY_CREATED','category',rid::text, jsonb_build_object('name',_name));
  ELSE
    UPDATE public.categories SET name=_name, slug=_slug, emoji=_emoji, position=COALESCE(_position,position) WHERE id=_id RETURNING id INTO rid;
    INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, metadata) VALUES (uid,'CATEGORY_UPDATED','category',rid::text, jsonb_build_object('name',_name));
  END IF;
  RETURN rid;
END; $$;
REVOKE ALL ON FUNCTION public.admin_upsert_category(uuid,text,text,text,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_category(uuid,text,text,text,int) TO authenticated;

-- Paramètres : sensibles réservés au super_admin
CREATE OR REPLACE FUNCTION public.admin_update_setting(_key text, _value jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); sensitive boolean;
BEGIN
  IF uid IS NULL OR NOT private.is_admin(uid) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT is_sensitive INTO sensitive FROM public.platform_settings WHERE key = _key;
  IF COALESCE(sensitive,false) AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=uid AND role::text='super_admin')
     AND NOT EXISTS (SELECT 1 FROM public.admin_permissions WHERE user_id=uid AND permission='finance.settings') THEN
    RAISE EXCEPTION 'Permission financière requise';
  END IF;
  UPDATE public.platform_settings SET value=_value, updated_at=now(), updated_by=uid WHERE key=_key;
  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, metadata) VALUES (uid,'SETTING_CHANGED','setting',_key, jsonb_build_object('value',_value));
END; $$;
REVOKE ALL ON FUNCTION public.admin_update_setting(text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_setting(text,jsonb) TO authenticated;

-- Admins peuvent lire tous les rôles (déjà) ; transactions lisibles par admin (déjà)