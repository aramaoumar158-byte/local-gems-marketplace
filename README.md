# Local Gems Marketplace

🚀 PROJET : PLATEFORME SAAS + MARKETPLACE POUR FABRICANTS ET VENDEURS

Agis comme une équipe complète composée de :

🎨 Senior Product Designer

💻 Senior Full-Stack Developer

🧠 SaaS Product Manager

🛒 Expert Marketplace

🔐 Expert en sécurité et authentification

📱 Expert UX/UI Mobile-First

🏗️ Software Architect

Ta mission est de concevoir une application web moderne, professionnelle, évolutive et mobile-first.

🌍 1. VISION DU PROJET

Créer une plateforme digitale qui permet aux fabricants, artisans et vendeurs peu connus de devenir visibles et de vendre leurs produits en ligne.

La plateforme doit permettre aux fabricants et vendeurs de :

Créer une boutique digitale

Présenter leurs produits

Ajouter des photos et descriptions

Recevoir des commandes

Discuter avec les clients

Vendre leurs produits

Suivre leurs ventes

Gérer leurs revenus

Développer leur visibilité

Les clients doivent pouvoir :

Découvrir des fabricants et vendeurs

Rechercher des produits

Visiter les boutiques

Discuter avec les vendeurs

Ajouter des produits au panier

Acheter des produits

Suivre leurs commandes

Consulter leurs paiements et reçus

La plateforme sera conçue pour commencer au Mali, avec une architecture évolutive permettant une expansion future en Afrique.

🎯 2. OBJECTIF PRINCIPAL

Créer une plateforme qui résout ce problème :

Beaucoup de fabricants et créateurs fabriquent de bons produits, mais restent inconnus et n'ont pas les outils digitaux nécessaires pour présenter et vendre leurs créations.

Le parcours principal doit être :

FABRIQUER → PUBLIER → ÊTRE DÉCOUVERT → DISCUTER → VENDRE → ÊTRE PAYÉ → DÉVELOPPER SON ACTIVITÉ

👥 3. LES TROIS INTERFACES PRINCIPALES

L'application doit posséder trois interfaces totalement différentes selon le rôle de l'utilisateur.

🛍️ A. INTERFACE CLIENT

Le client doit pouvoir :

Voir les produits

Rechercher des produits

Explorer les catégories

Visiter les boutiques

Voir les détails des produits

Ajouter aux favoris

Ajouter au panier

Passer une commande

Suivre ses commandes

Discuter avec les vendeurs

Consulter son historique

Consulter ses reçus de paiement

Gérer son profil

🏭 B. INTERFACE VENDEUR / FABRICANT

Le vendeur ou fabricant doit disposer d'un dashboard professionnel.

Il doit pouvoir :

Créer son profil professionnel

Créer et gérer sa boutique

Ajouter des produits

Modifier ou supprimer des produits

Ajouter plusieurs photos

Définir les prix

Gérer les commandes

Discuter avec les clients

Voir ses ventes

Voir ses revenus

Consulter son historique de transactions

Consulter ses statistiques

Le dashboard doit être clair, professionnel et facile à utiliser même pour une personne ayant peu d'expérience avec les outils numériques.

👑 C. INTERFACE SUPER ADMIN

Créer une interface Super Admin privée et sécurisée.

Le Super Admin possède le niveau d'accès le plus élevé.

Il peut gérer :

Utilisateurs

Voir tous les clients

Voir tous les vendeurs

Suspendre un utilisateur

Réactiver un utilisateur

Boutiques

Voir toutes les boutiques

Valider ou suspendre une boutique

Mettre une boutique en avant

Produits

Voir tous les produits

Modérer les produits

Supprimer les produits interdits

Mettre certains produits en avant

Commandes

Voir les commandes globales

Voir les statistiques

Finances

Prévoir une section permettant de suivre :

Les ventes globales

Les commissions de la plateforme

Les transactions

Les revenus de la plateforme

Statistiques

Afficher notamment :

Nombre total d'utilisateurs

Nombre de clients

Nombre de vendeurs

Nombre de boutiques

Nombre de produits

Nombre de commandes

Volume total des ventes

IMPORTANT : le rôle Super Admin ne doit jamais être disponible dans l'inscription publique.

🔐 4. SPRINT 1 — AUTHENTIFICATION ET INSCRIPTION

Créer un système d'inscription extrêmement simple.

Informations demandées

Obligatoires :

Nom complet

Numéro de téléphone

Facultatif :

Adresse email

Ensuite, l'utilisateur doit choisir son rôle :

🛍️ Client

🏭 Vendeur / Fabricant

Le rôle choisi doit déterminer automatiquement l'interface affichée après connexion.

📝 5. PAGE D'INSCRIPTION

Créer une page moderne avec :

Titre :

Rejoignez la plateforme

Champs :

Nom complet

Numéro de téléphone

Adresse email (facultatif)

Choix du profil :

○ Client

○ Vendeur / Fabricant

Bouton principal :

Créer mon compte

Ajouter également :

Vous avez déjà un compte ? Se connecter

🔑 6. PAGE DE CONNEXION

Créer une page de connexion simple et moderne.

Permettre la connexion principalement avec :

Numéro de téléphone

Mot de passe ou système sécurisé adapté

Prévoir une architecture permettant d'ajouter plus tard :

Vérification OTP par SMS

Connexion par email

🧭 7. REDIRECTION AUTOMATIQUE SELON LE RÔLE

Après connexion :

CLIENT

Redirection vers :

/client

VENDEUR / FABRICANT

Redirection vers :

/seller

SUPER ADMIN

Redirection vers :

/admin

Mettre en place une gestion stricte des rôles et permissions.

Un client ne doit jamais pouvoir accéder au dashboard vendeur ou administrateur.

Un vendeur ne doit jamais pouvoir accéder au Super Admin.

🎨 8. DESIGN ET EXPÉRIENCE UTILISATEUR

Créer un design :

Moderne

Premium

Professionnel

Simple

Mobile-first

Adapté aux utilisateurs africains

Rapide et facile à comprendre

L'application doit fonctionner parfaitement sur :

📱 Smartphone

💻 Ordinateur

📱 Tablette

Utiliser :

Une navigation claire

De grandes zones cliquables sur mobile

Des icônes compréhensibles

Des cartes modernes pour les produits

Des dashboards professionnels

Une excellente lisibilité

Ne pas surcharger les interfaces.

🏗️ 9. ARCHITECTURE DES PAGES À CRÉER MAINTENANT

Créer les pages suivantes :

Pages publiques

Accueil

Inscription

Connexion

Interface Client

Dashboard Client

Explorer les produits

Favoris

Panier

Commandes

Messages

Profil

Interface Vendeur

Dashboard Vendeur

Ma boutique

Mes produits

Ajouter un produit

Commandes

Messages

Ventes

Revenus

Profil

Interface Super Admin

Dashboard global

Utilisateurs

Vendeurs

Clients

Boutiques

Produits

Commandes

Finances

Statistiques

🗄️ 10. MODÈLE DE DONNÉES INITIAL

Préparer une architecture de base de données évolutive avec les principales entités :

USERS

id

full_name

phone

email

role

created_at

STORES

id

owner_id

store_name

description

status

PRODUCTS

id

seller_id

store_id

name

description

price

stock

status

created_at

ORDERS

id

customer_id

seller_id

status

total_amount

created_at

Prévoir une architecture permettant d'ajouter plus tard :

Paiements

Transactions

Commissions

Wallet

Retraits

Messagerie

Notifications

Reçus automatiques

⚠️ 11. IMPORTANT : PAIEMENTS ET WALLET

Ne pas encore développer un système financier complet dans ce Sprint 0 et Sprint 1.

Cependant, préparer l'architecture pour les futures fonctionnalités :

Paiement Mobile Money

Paiement via prestataires agréés

Transactions

Calcul automatique des commissions

Revenus des vendeurs

Demandes de retrait

Utilisation du solde selon les règles applicables

Reçus automatiques

IMPORTANT :

Ne jamais simuler ou traiter l'application comme une banque.

Les futurs paiements, dépôts, retraits et fonds conservés devront être intégrés via des partenaires de paiement autorisés et des API officielles.

🧪 12. DONNÉES DE DÉMONSTRATION

Créer des données fictives professionnelles pour démontrer l'application.

Créer par exemple :

Plusieurs fabricants

Plusieurs boutiques

Plusieurs produits locaux

Plusieurs catégories

Utiliser des exemples comme :

Artisanat

Poterie

Vêtements

Meubles

Produits locaux

Décoration

Accessoires

Ces données doivent être clairement des données de démonstration.

🚀 13. RÉSULTAT ATTENDU

À la fin de cette conception, je veux obtenir :

✅ Une application moderne et professionnelle

✅ Une page d'accueil attractive

✅ Un système d'inscription simple

✅ Une page de connexion

✅ Une gestion des rôles

✅ Trois interfaces différentes :

Client

Vendeur / Fabricant

Super Admin

✅ Des dashboards fonctionnels avec données de démonstration

✅ Une navigation claire entre toutes les pages

✅ Une architecture prête pour les prochains sprints

📌 RÈGLE DE TRAVAIL

Commence par concevoir et générer uniquement les fondations du projet :

SPRINT 0

Vision + architecture + structure des interfaces + navigation + modèle de données initial.

SPRINT 1

Inscription + connexion + gestion des rôles + redirection automatique + protection des accès.

Ne développe pas encore complètement :

Le vrai Mobile Money

Le Wallet financier

Les retraits

Les commissions automatiques

La messagerie temps réel

Ces fonctionnalités seront développées dans les prochains sprints.

Construis une base propre, évolutive et professionnelle, prête à être connectée plus tard à un backend et à des services de paiement officiels.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d42e431c-3081-44a6-944b-55183b7a6d11).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
