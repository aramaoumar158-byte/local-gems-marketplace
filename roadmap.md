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

## Vitrine publique & achats
- [x] Accueil public branché sur les données réelles : produits à la une, catégories, boutiques, recherche
- [x] Catalogue public `/explorer` avec recherche (`?q=`) et filtre par catégorie (`?cat=`)
- [x] Fiche produit `/produit/:id` (galerie, quantité, stock, favori, panier, boutique vendeur)
- [x] Page boutique `/boutique/:slug` (repli sur l'identifiant si la boutique n'a pas de slug)
- [x] Panier client en stockage local : badge d'en-tête, quantités, total en FCFA
- [x] Passage de commande : création `orders` + `order_items`, groupée par boutique, statut « en attente »
- [x] Visuel de repli (emoji de catégorie) pour les produits sans photo
- [ ] Messagerie client ↔ vendeur (`conversations` / `messages`)
- [ ] Commission plateforme et décrément du stock côté serveur (aujourd'hui : montant transmis par le client, stock inchangé)

## Plus tard (hors sprint 1)
- Mobile Money, wallet, retraits, commissions, messagerie temps réel
