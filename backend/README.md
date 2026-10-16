# Backend Residence Cheliel

API REST Node.js/Express + MariaDB, prévue pour un déploiement o2switch.

## Installation locale

1. Copier `.env.example` vers `.env` et renseigner MariaDB.
2. Exécuter `database/schema.sql` dans la base.
3. Installer les dépendances avec `npm install`.
4. Lancer `npm run dev`.

## Déploiement o2switch

Créer une application Node.js depuis cPanel, définir le fichier de démarrage `src/server.js`, renseigner les variables `.env`, importer `database/schema.sql` et donner au processus les droits d'écriture sur `uploads/`.

Le frontend doit utiliser `VITE_API_URL=https://api.example.com`.
