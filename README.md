# Gestion libre

Application Next.js de gestion des menus, effectifs, grammages et stocks. La base PostgreSQL est hébergée dans Supabase et accessible uniquement depuis le serveur Next.js avec Drizzle et node-postgres.

## Installation locale

Utiliser Node.js 22 ou plus récent (requis par le SDK OpenAI existant), puis `npm ci`.
Copier `.env.example` vers `.env.local` si ce fichier n'existe pas déjà.

Dans le projet Supabase, ouvrir **Connect → Transaction pooler**, copier l'URI PostgreSQL et renseigner `DATABASE_URL` dans `.env.local`. Remplacer le mot de passe et encoder ses caractères réservés dans l'URL. Ajouter `?sslmode=verify-full` (ou `&sslmode=verify-full` si l'URI contient déjà des paramètres) pour vérifier le certificat TLS. Ne jamais publier cette URI ni utiliser un nom de variable `NEXT_PUBLIC_`.

Pour les commandes de préparation, renseigner de préférence `DATABASE_MIGRATION_URL` avec la connexion directe ou **Session pooler** si le réseau ne prend pas en charge IPv6, avec le même paramètre TLS. À défaut, les commandes utilisent `DATABASE_URL`. Le compte doit pouvoir créer les tables et les lire malgré RLS (le compte `postgres` fourni par Supabase convient).

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

Les migrations SQL sont dans `supabase/migrations`. La commande les applique dans une transaction, conserve leur empreinte dans le schéma privé `gestion_migrations` et ignore celles déjà appliquées. Ne pas les appliquer manuellement dans l'éditeur SQL puis utiliser la commande : celle-ci gère son propre historique, distinct de celui de la CLI Supabase. Ajouter un nouveau fichier SQL pour les modifications futures, sans modifier une migration appliquée.

L'initialisation ajoute Menton et ses grammages manquants, sans modifier les valeurs existantes. Elle est relançable. Les autres centres reçoivent leurs grammages lors de leur création dans le site. Le démarrage ne crée ni tables ni données et ne revient jamais à SQLite si la connexion manque.

Les 12 tables conservent les identifiants et dates en texte, les nombres entiers pour les effectifs et les doubles pour les quantités. Les contraintes d'unicité existantes sont conservées ; les colonnes de liaison sont indexées. Les relations restent gérées par l'application comme auparavant.

## Accès aux données

RLS est activé sur toutes les tables, sans politique publique ; les droits des rôles `anon` et `authenticated` sont retirés. Le navigateur passe par les actions serveur existantes. Cela ne crée pas de connexion utilisateur au site : son accès reste inchangé. Aucun bucket Supabase Storage n'est nécessaire pour le fonctionnement actuel.

## Vercel (déploiement ultérieur)

Configurer Node.js 22 ou plus récent et `DATABASE_URL` avec le **Transaction pooler** dans les variables serveur du projet Vercel. Ajouter `OPENAI_API_KEY` et, si nécessaire, `OPENAI_MODEL` pour les imports de documents. Ne pas fournir la base de production aux déploiements Preview si ces derniers doivent rester isolés : utiliser un projet de test distinct.

Appliquer les migrations et l'initialisation avant le déploiement, depuis un poste configuré. Ne pas les ajouter au build Vercel. La commande de compilation reste `npm run build`. La variable de migration n'est pas nécessaire au fonctionnement du site. Le pool applicatif est limité à trois connexions par instance et n'utilise pas de requêtes préparées nommées.

## Vérification

```sh
npm run typecheck
npm run build
# Tests d’intégration : base de test migrée, avec les rôles Supabase anon/authenticated.
DATABASE_TEST_URL="postgresql://..." npm run test:db
```

Sur une base de test Supabase, exécuter deux fois migration et initialisation, modifier un grammage, relancer l'initialisation et vérifier que sa valeur est conservée. Vérifier ensuite centres, séjours, menus, effectifs, absences, commandes, stocks, confirmation des repas et persistance après redémarrage.

Référence : [connexions PostgreSQL Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).
