# Roadmap — ANW KA SUKU (plateforme fabricants, vendeurs & clients, Mali)

Nom officiel exact à utiliser partout : **ANW KA SUKU**

## Sprint 0 — Fondations
- [x] Direction artistique (vert profond / orange-or / blanc / encre tech)
- [x] Page d'accueil publique (hero, recherche, catégories, produits, boutiques)
- [x] Navigation & layout partagés

## Sprint 1 — Auth, rôles & sécurité
- [x] Lovable Cloud activé
- [x] Schéma: profiles, user_roles, stores, products, orders (+ données de démo)
- [x] Inscription (nom, téléphone obligatoire, email facultatif, rôle client/vendeur)
- [x] Connexion par téléphone + mot de passe
- [x] Validation stricte du format Mali +223
- [x] Unicité du numéro de téléphone
- [x] Indicateur de robustesse + afficher/masquer le mot de passe
- [x] Case obligatoire Conditions d'utilisation + Politique de confidentialité
- [x] Pages /conditions et /confidentialite
- [x] État du compte: active / pending_verification / suspended
- [x] Écran de vérification après inscription
- [x] Page compte suspendu + blocage des écritures pour les comptes suspendus
- [x] Rôle Super Admin non attribuable publiquement (aucune écriture possible sur user_roles)
- [x] Redirection automatique /client /seller /admin
- [x] Protection des routes par rôle + règles d'accès base de données
- [ ] Vérification OTP par SMS — bloqué : nécessite un opérateur SMS externe
- [ ] Vérification email — prévue après activation de l'envoi d'emails

## Interfaces
- [x] Administrator audit: immutable records, actor/target snapshots, searchable paginated review and database authorization
- [ ] Administrator audit end-to-end verification — blocked: no administrator account exists; sign in with an internally authorized administrator (débloquable via `scripts/promote-super-admin.sql`)
- [x] Client: dashboard, explorer, favoris, panier, commandes, messages, profil
- [x] Vendeur: dashboard, boutique, produits, ajouter produit, commandes, messages, ventes, revenus, profil
- [x] Admin: dashboard, utilisateurs, vendeurs, clients, boutiques, produits, commandes, finances, statistiques
- [x] Branchement des écrans Client & Vendeur sur les données réelles (Supabase : catalogue actif, favoris, commandes, boutique & produits, ventes/revenus, métriques 7 jours) — admin déjà branché

## Plus tard (hors sprint 1)
- Mobile Money, wallet, retraits, commissions, messagerie temps réel
