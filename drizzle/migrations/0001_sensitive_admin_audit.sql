GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
REVOKE INSERT,UPDATE,DELETE ON public.admin_audit_log FROM authenticated,anon;
DROP POLICY IF EXISTS aal_read ON public.admin_audit_log;
CREATE POLICY aal_read ON public.admin_audit_log FOR SELECT TO authenticated USING (private.is_admin(auth.uid()) AND private.is_account_usable(auth.uid()));
CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON public.admin_audit_log(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS admin_audit_actor_idx ON public.admin_audit_log(admin_id,created_at DESC);
CREATE OR REPLACE FUNCTION private.audit_admin_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); o jsonb; n jsonb; fields text[]; b jsonb; a jsonb; target text; tid text; label text; actor_name text; actor_role text;
BEGIN
IF uid IS NULL OR NOT private.is_admin(uid) THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
IF NOT private.is_account_usable(uid) THEN RAISE EXCEPTION 'Compte suspendu'; END IF;
o:=CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
n:=CASE WHEN TG_OP='DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END;
CASE TG_TABLE_NAME
WHEN 'profiles' THEN target:='user'; fields:=ARRAY['status','phone_verified','email_verified']; label:=COALESCE(n->>'full_name',o->>'full_name');
WHEN 'stores' THEN target:='store'; fields:=ARRAY['store_name','status','is_featured']; label:=COALESCE(n->>'store_name',o->>'store_name');
WHEN 'products' THEN target:='product'; fields:=ARRAY['name','status','is_featured','price','stock']; label:=COALESCE(n->>'name',o->>'name');
WHEN 'orders' THEN target:='order'; fields:=ARRAY['status','payment_status','delivery_status','total_amount','commission_amount']; label:=COALESCE(n->>'reference',o->>'reference');
WHEN 'withdrawals' THEN target:='withdrawal'; fields:=ARRAY['status','amount','processed_at','transaction_reference']; label:=COALESCE(n->>'reference',o->>'reference');
WHEN 'reports' THEN target:='report'; fields:=ARRAY['status','severity']; label:=COALESCE(n->>'target_label',o->>'target_label');
WHEN 'categories' THEN target:='category'; fields:=ARRAY['name','slug','emoji','position','is_active','parent_id']; label:=COALESCE(n->>'name',o->>'name');
WHEN 'platform_settings' THEN target:='setting'; fields:=ARRAY['value','is_sensitive']; label:=COALESCE(n->>'key',o->>'key');
WHEN 'user_roles' THEN target:='role'; fields:=ARRAY['user_id','role']; label:=COALESCE(n->>'user_id',o->>'user_id');
WHEN 'admin_permissions' THEN target:='permission'; fields:=ARRAY['user_id','permission']; label:=COALESCE(n->>'user_id',o->>'user_id');
END CASE;
SELECT COALESCE(jsonb_object_agg(k,v),'{}'::jsonb) INTO b FROM jsonb_each(o) e(k,v) WHERE k=ANY(fields);
SELECT COALESCE(jsonb_object_agg(k,v),'{}'::jsonb) INTO a FROM jsonb_each(n) e(k,v) WHERE k=ANY(fields);
IF TG_OP='UPDATE' AND b=a THEN RETURN NEW; END IF;
IF TG_TABLE_NAME='platform_settings' AND (COALESCE((n->>'is_sensitive')::boolean,false) OR COALESCE((o->>'is_sensitive')::boolean,false)) THEN
IF b ? 'value' THEN b:=jsonb_set(b,'{value}','"[REDACTED]"'); END IF;
IF a ? 'value' THEN a:=jsonb_set(a,'{value}','"[REDACTED]"'); END IF;
END IF;
tid:=COALESCE(n->>'id',o->>'id',label);
SELECT full_name INTO actor_name FROM public.profiles WHERE id=uid;
SELECT role::text INTO actor_role FROM public.user_roles WHERE user_id=uid ORDER BY CASE WHEN role::text='super_admin' THEN 0 WHEN role::text='admin' THEN 1 ELSE 2 END LIMIT 1;
INSERT INTO public.admin_audit_log(admin_id,action,target_type,target_id,metadata) VALUES(uid,COALESCE(NULLIF(current_setting('app.audit_action',true),''),upper(target)||'_'||TG_OP),target,tid,jsonb_build_object('actor_name',actor_name,'actor_role',actor_role,'target_label',label,'before',b,'after',a,'note',NULLIF(current_setting('app.audit_note',true),'')));
IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;
REVOKE ALL ON FUNCTION private.audit_admin_change() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['profiles','stores','products','orders','withdrawals','reports','categories','platform_settings','user_roles','admin_permissions'] LOOP EXECUTE format('CREATE TRIGGER capture_admin_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.audit_admin_change()',t); END LOOP; END; $$;
CREATE OR REPLACE FUNCTION public.admin_action(_action text,_target_type text,_target_id text,_value text DEFAULT NULL,_note text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); affected integer; expected text;
BEGIN
IF uid IS NULL OR NOT private.is_admin(uid) OR NOT private.is_account_usable(uid) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
expected:=CASE WHEN _action LIKE 'USER_%' THEN 'user' WHEN _action LIKE 'STORE_%' THEN 'store' WHEN _action LIKE 'PRODUCT_%' THEN 'product' WHEN _action LIKE 'ORDER_%' THEN 'order' WHEN _action LIKE 'WITHDRAWAL_%' THEN 'withdrawal' WHEN _action LIKE 'REPORT_%' THEN 'report' WHEN _action LIKE 'CATEGORY_%' THEN 'category' WHEN _action='NOTIFICATION_READ' THEN 'notification' END;
IF expected IS NULL OR _target_type IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Type de cible invalide'; END IF;
PERFORM set_config('app.audit_action',_action,true); PERFORM set_config('app.audit_note',COALESCE(_note,''),true);
IF _action IN ('USER_SUSPENDED','USER_REACTIVATED') THEN
IF _target_id::uuid=uid THEN RAISE EXCEPTION 'Action impossible sur votre propre compte'; END IF;
UPDATE public.profiles SET status=(CASE WHEN _action='USER_SUSPENDED' THEN 'suspended' ELSE 'active' END)::account_status WHERE id=_target_id::uuid;
ELSIF _action IN ('STORE_APPROVED','STORE_SUSPENDED','STORE_REACTIVATED','STORE_REJECTED') THEN UPDATE public.stores SET status=(CASE _action WHEN 'STORE_APPROVED' THEN 'approved' WHEN 'STORE_REACTIVATED' THEN 'approved' WHEN 'STORE_SUSPENDED' THEN 'suspended' ELSE 'rejected' END)::store_status WHERE id=_target_id::uuid;
ELSIF _action='STORE_FEATURED' THEN UPDATE public.stores SET is_featured=NOT is_featured WHERE id=_target_id::uuid;
ELSIF _action IN ('PRODUCT_APPROVED','PRODUCT_HIDDEN','PRODUCT_REMOVED','PRODUCT_REJECTED') THEN UPDATE public.products SET status=(CASE _action WHEN 'PRODUCT_APPROVED' THEN 'active' WHEN 'PRODUCT_HIDDEN' THEN 'hidden' WHEN 'PRODUCT_REMOVED' THEN 'removed' ELSE 'draft' END)::product_status WHERE id=_target_id::uuid;
ELSIF _action='PRODUCT_FEATURED' THEN UPDATE public.products SET is_featured=NOT is_featured WHERE id=_target_id::uuid;
ELSIF _action='ORDER_STATUS_CHANGED' THEN UPDATE public.orders SET status=_value::order_status WHERE id=_target_id::uuid;
ELSIF _action IN ('WITHDRAWAL_APPROVED','WITHDRAWAL_REJECTED','WITHDRAWAL_FAILED') THEN UPDATE public.withdrawals SET status=(CASE _action WHEN 'WITHDRAWAL_APPROVED' THEN 'processing' WHEN 'WITHDRAWAL_REJECTED' THEN 'rejected' ELSE 'failed' END),processed_at=now() WHERE id=_target_id::uuid AND status IN ('pending','processing');
ELSIF _action IN ('REPORT_RESOLVED','REPORT_DISMISSED') THEN UPDATE public.reports SET status=CASE WHEN _action='REPORT_RESOLVED' THEN 'resolved' ELSE 'dismissed' END WHERE id=_target_id::uuid;
ELSIF _action='CATEGORY_TOGGLED' THEN UPDATE public.categories SET is_active=NOT is_active WHERE id=_target_id::uuid;
ELSIF _action='NOTIFICATION_READ' THEN UPDATE public.notifications SET read_at=now() WHERE id=_target_id::uuid;
ELSE RAISE EXCEPTION 'Action inconnue'; END IF;
GET DIAGNOSTICS affected=ROW_COUNT;
IF affected=0 THEN RAISE EXCEPTION 'Cible introuvable ou action non applicable'; END IF;
IF _action='NOTIFICATION_READ' THEN INSERT INTO public.admin_audit_log(admin_id,action,target_type,target_id,metadata) VALUES(uid,_action,_target_type,_target_id,jsonb_build_object('note',_note)); END IF;
PERFORM set_config('app.audit_action','',true); PERFORM set_config('app.audit_note','',true);
END; $$;
REVOKE ALL ON FUNCTION public.admin_action(text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_action(text,text,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_upsert_category(_id uuid,_name text,_slug text,_emoji text,_position int) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); rid uuid;
BEGIN
IF uid IS NULL OR NOT private.is_admin(uid) OR NOT private.is_account_usable(uid) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
PERFORM set_config('app.audit_action',CASE WHEN _id IS NULL THEN 'CATEGORY_CREATED' ELSE 'CATEGORY_UPDATED' END,true);
IF _id IS NULL THEN INSERT INTO public.categories(name,slug,emoji,position) VALUES(_name,_slug,_emoji,COALESCE(_position,0)) RETURNING id INTO rid;
ELSE UPDATE public.categories SET name=_name,slug=_slug,emoji=_emoji,position=COALESCE(_position,position) WHERE id=_id RETURNING id INTO rid; END IF;
IF rid IS NULL THEN RAISE EXCEPTION 'Catégorie introuvable'; END IF;
PERFORM set_config('app.audit_action','',true); RETURN rid;
END; $$;
REVOKE ALL ON FUNCTION public.admin_upsert_category(uuid,text,text,text,int) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_category(uuid,text,text,text,int) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_update_setting(_key text,_value jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); sensitive boolean;
BEGIN
IF uid IS NULL OR NOT private.is_admin(uid) OR NOT private.is_account_usable(uid) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
SELECT is_sensitive INTO sensitive FROM public.platform_settings WHERE key=_key;
IF NOT FOUND THEN RAISE EXCEPTION 'Paramètre introuvable'; END IF;
IF COALESCE(sensitive,false) AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=uid AND role::text='super_admin') AND NOT EXISTS(SELECT 1 FROM public.admin_permissions WHERE user_id=uid AND permission='finance.settings') THEN RAISE EXCEPTION 'Permission financière requise'; END IF;
PERFORM set_config('app.audit_action','SETTING_CHANGED',true);
UPDATE public.platform_settings SET value=_value,updated_at=now(),updated_by=uid WHERE key=_key;
PERFORM set_config('app.audit_action','',true);
END; $$;
REVOKE ALL ON FUNCTION public.admin_update_setting(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_update_setting(text,jsonb) TO authenticated;