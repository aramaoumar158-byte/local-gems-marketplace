-- À APPLIQUER EN DERNIER, une fois l'envoi d'emails configuré et testé (voir la demande de fusion).
--
-- Jusqu'ici, seul le statut « suspendu » bloquait les écritures : un compte « vérification en attente »
-- pouvait tout faire. Désormais, un compte doit être « active » (email vérifié) pour publier un produit,
-- commander, ajouter des favoris, etc. Un compte non vérifié peut seulement naviguer.
-- Les administrateurs (admin et super_admin) ne sont jamais bloqués, même si leur statut n'est pas « active ».
--
-- Attention : les comptes existants encore « en attente » devront confirmer leur email (page /verification).

CREATE OR REPLACE FUNCTION private.is_account_usable(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT private.is_admin(_user_id)
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.status = 'active')
$$;
