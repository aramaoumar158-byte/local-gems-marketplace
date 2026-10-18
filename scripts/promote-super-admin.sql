-- =====================================================================
-- ANW KA SUKU — Promouvoir un compte en Super Admin
-- ---------------------------------------------------------------------
-- Débloque : "Administrator audit end-to-end verification" (roadmap)
--            — aucun compte administrateur n'existe encore.
--
-- Procédure :
--   1. Créer le compte via l'application (inscription normale,
--      rôle Client ou Vendeur — le rôle Super Admin n'est JAMAIS
--      proposé publiquement).
--   2. Noter le numéro de téléphone ou l'email de ce compte.
--   3. Remplir v_phone / v_email ci-dessous.
--   4. Exécuter ce fichier dans l'éditeur SQL Supabase
--      (Dashboard → SQL Editor → New query → Run).
--
-- Le rôle est attribué uniquement ici, en interne, côté base :
-- aucune écriture n'est possible sur public.user_roles depuis l'app.
-- =====================================================================

DO $$
DECLARE
  v_raw_phone text := '+223 70 00 00 00';   -- ← REMPLACER (ou laisser vide)
  v_email      text := '';                  -- ← REMPLACER (ou laisser vide)
  v_digits     text;
  v_user_id    uuid;
BEGIN
  -- --- Normalisation du numéro au format stocké : 223XXXXXXXX --------
  IF coalesce(v_raw_phone, '') <> '' THEN
    v_digits := regexp_replace(v_raw_phone, '[^0-9]', '', 'g');
    IF left(v_digits, 2) = '00' THEN
      v_digits := substr(v_digits, 3);
    END IF;
    IF left(v_digits, 3) = '223' THEN
      v_digits := substr(v_digits, 4);
    END IF;
    IF v_digits !~ '^[5-9][0-9]{7}$' THEN
      RAISE EXCEPTION 'Numéro malien invalide : %', v_raw_phone;
    END IF;
    v_digits := '223' || v_digits;

    SELECT id INTO v_user_id FROM public.profiles WHERE phone = v_digits LIMIT 1;
  END IF;

  -- --- Repli sur l'email ---------------------------------------------
  IF v_user_id IS NULL AND coalesce(v_email, '') <> '' THEN
    SELECT id INTO v_user_id
      FROM public.profiles
     WHERE lower(coalesce(email, '')) = lower(v_email)
     LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun compte trouvé. Inscrivez d''abord le compte via l''application, puis relisez v_phone / v_email.';
  END IF;

  -- --- Activer le compte puis attribuer les rôles ----------------------
  -- 'super_admin' : accès complet, y compris aux paramètres sensibles.
  -- 'admin'       : rôle opérationnel explicitement testé par certaines
  --                 policies RLS historiques. Les deux sont attribués pour
  --                 rester fonctionnel même si la migration d'alignement
  --                 (drizzle/migrations/0003_align_admin_predicates.sql)
  --                 n'a pas encore été appliquée.
  UPDATE public.profiles
     SET status = 'active',
         phone_verified = CASE WHEN phone IS NOT NULL THEN true ELSE phone_verified END
   WHERE id = v_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Compte promu admin + super_admin : %', v_user_id;
END $$;

-- =====================================================================
-- Vérification : le compte apparaît ci-dessous avec role = super_admin
-- =====================================================================
SELECT p.full_name,
       p.phone,
       p.email,
       p.status,
       ur.role,
       ur.created_at AS role_granted_at
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
 WHERE ur.role IN ('admin', 'super_admin')
 ORDER BY ur.created_at;

-- =====================================================================
-- Une fois connecté avec ce compte, vérifier que l'audit est lisible :
-- la requête ci-dessous doit renvoyer des lignes (ou zéro, mais sans
-- erreur 401/403 — l'accès anonyme doit rester refusé).
-- =====================================================================
-- SELECT * FROM public.admin_audit_log ORDER BY created_at DESC LIMIT 20;
