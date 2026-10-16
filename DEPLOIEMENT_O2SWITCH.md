# 🚀 Guide Complet de Déploiement o2switch — Résidence Cheliel

Ce guide détaille pas-à-pas la mise en production de la **Résidence Cheliel** sur un hébergement **o2switch** (cPanel).

---

## 🏗️ Architecture du Déploiement

Sur o2switch, le projet est séparé en deux environnements complémentaires :

| Composant | Emplacement o2switch | Rôle |
|---|---|---|
| **Frontend (PWA)** | `public_html/` (ou sous-dossier domaine) | Site React 19 statique optimisé, Service Worker, cache hors-ligne et manifeste PWA |
| **Backend (API)** | `~/api.residencescheliel.com` (ou dossier hors web root) | Application Node.js (Express + MariaDB) exécutée par Passenger |
| **Base de données** | MariaDB o2switch (gérée via phpMyAdmin) | Stockage des chambres, réservations, administrateurs et notifications |

---

## ⚡ Méthode Directe : Déploiement en 1 Clic (Sans Uploader de ZIP)

C'est la méthode la plus rapide et la plus confortable. Vos fichiers sont compilés et transférés directement vers o2switch sans aucune manipulation manuelle de fichiers ZIP.

### 1. Renseigner vos identifiants FTP o2switch

Ouvrez le fichier [`.env.deploy`](file:///c:/Users/bagui/Desktop/Mes_projets_developpement_web/residence-cheliel/.env.deploy) à la racine du projet et indiquez vos identifiants :

```env
# Nom de domaine ou hôte de votre serveur o2switch
FTP_HOST=residencescheliel.com

# Identifiant cPanel ou compte FTP o2switch
FTP_USER=fuke3268

# Mot de passe du compte
FTP_PASSWORD=VotreMotDePasse

# Dossier distant du site (public_html pour le domaine principal)
FTP_FRONTEND_REMOTE_DIR=public_html

# Dossier distant de l'API Node.js
FTP_BACKEND_REMOTE_DIR=api.residencescheliel.com
```

> [!NOTE]
> Le fichier `.env.deploy` est déjà automatiquement ignoré par Git (`.gitignore`), vos identifiants ne risquent donc pas d'être partagés par inadvertance.

### 2. Lancer le déploiement

Exécutez simplement la commande de votre choix dans votre terminal :

```bash
# Déployer le Frontend PWA directement dans public_html
npm run deploy

# Déployer le Backend API Node.js et redémarrer l'application
npm run deploy:backend

# Déployer TOUT en une seule fois (Frontend + Backend)
npm run deploy:all
```

Le script :
1. Compile le frontend en mode production avec Vite.
2. Génère le Service Worker PWA et vérifie le fichier `.htaccess`.
3. Se connecte de façon sécurisée (FTPS) à votre serveur o2switch.
4. Transfère directement les fichiers dans `public_html` (ou le dossier backend).
5. Redémarre l'application Node.js automatiquement sur o2switch (via `tmp/restart.txt`).

---

## 📦 Méthode Alternative : Via Archive ZIP manuelle (cPanel File Manager)

Si vous préférez uploader des archives ZIP via l'interface cPanel :

```powershell
npm run package:o2switch
```
Cette commande génère deux archives dans le dossier `deploy/` :
1. `residence-cheliel-frontend.zip` (à extraire dans `public_html`)
2. `residence-cheliel-backend.zip` (à extraire dans le dossier Node.js)


## 🗄️ Étape 1 : Créer la Base de Données MariaDB sur o2switch

1. Connectez-vous à votre interface **cPanel o2switch**.
2. Allez dans **Bases de données MySQL** :
   - **Créer une nouvelle base** : ex. `votrecompte_cheliel`.
   - **Créer un utilisateur MySQL** : ex. `votrecompte_user` avec un mot de passe fort (notez-le).
   - **Ajouter l'utilisateur à la base** : cochez **TOUS LES PRIVILÈGES** et validez.
3. Revenez sur le cPanel et ouvrez **phpMyAdmin** :
   - Sélectionnez votre base `votrecompte_cheliel` à gauche.
   - Cliquez sur l'onglet **Importer** en haut.
   - Cliquez sur **Choisir un fichier** et sélectionnez : `backend/database/schema.sql` (ou celui inclus dans l'archive backend).
   - Cliquez sur **Importer** en bas. Les tables `admins`, `rooms`, `reservations`, etc. sont créées.

---

## ⚙️ Étape 2 : Configurer le Backend Node.js dans cPanel

1. Dans cPanel, recherchez et cliquez sur **Setup Node.js App** (Configuration de l'application Node.js).
2. Cliquez sur le bouton **Create Application** :
   - **Node.js version** : Sélectionnez **20.x** ou **22.x** (version LTS recommandée).
   - **Application mode** : `Production`.
   - **Application root** : Le chemin vers le dossier de votre API, par exemple : `api.residencescheliel.com` (ou `backend-cheliel`).
   - **Application URL** : Choisissez le sous-domaine de l'API (ex. `api.residencescheliel.com`).
   - **Application startup file** : `src/server.js`.
3. Cliquez sur **Create** (en haut à droite).
4. Ouvrez le **Gestionnaire de fichiers** (File Manager) de cPanel :
   - Rendez-vous dans le dossier de l'application créé à l'étape précédente (ex: `/home/votre_user/api.residencescheliel.com`).
   - Cliquez sur **Charger** (Upload) et envoyez l'archive `deploy/residence-cheliel-backend.zip`.
   - Faites un clic droit sur le fichier ZIP sur le serveur > **Extract** (Extraire ici).
5. Créez ou modifiez le fichier `.env` dans ce dossier avec vos identifiants réels :
   ```env
   PORT=3000
   FRONTEND_ORIGIN=https://residencescheliel.com,https://www.residencescheliel.com
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=votrecompte_cheliel
   DB_USER=votrecompte_user
   DB_PASSWORD=votre_mot_de_passe_fort
   JWT_SECRET=generer_une_chaine_aleatoire_tres_longue_et_securisee
   UPLOAD_DIR=uploads
   PUBLIC_API_URL=https://api.residencescheliel.com
   ```
6. Retournez dans **Setup Node.js App** :
   - Cliquez sur l'icône de modification de votre application.
   - Cliquez sur **Run NPM Install** pour installer les dépendances du backend.
   - Vérifiez que les permissions du dossier `uploads` permettent l'écriture (`755`).
7. Créez le premier compte administrateur :
   - Dans cPanel, ouvrez le **Terminal**.
   - Tapez la commande indiquée en haut de l'interface Node.js (ex: `source /home/votre_user/nodevenv/.../activate`).
   - Placez-vous dans le dossier de l'API : `cd ~/api.residencescheliel.com`.
   - Exécutez :
     ```bash
     node scripts/create-admin.js admin@residencescheliel.com VotreMotDePasseAdmin
     ```

---

## 🌐 Étape 3 : Déployer le Frontend (PWA)

1. Dans cPanel, ouvrez le **Gestionnaire de fichiers** (File Manager).
2. Rendez-vous dans le dossier racine de votre site web :
   - Domaine principal : `public_html/`.
   - Domaine additionnel / sous-domaine : le dossier correspondant (ex: `public_html/residence-cheliel`).
3. *(Optionnel si mise à jour)* : Supprimez les anciens assets ou sauvegardez-les.
4. Cliquez sur **Charger** (Upload) et téléversez :
   👉 `deploy/residence-cheliel-frontend.zip`
5. Clic droit sur le fichier ZIP > **Extract** (Extraire dans le dossier courant).
6. Vérifiez la présence des fichiers clés à la racine de `public_html/` :
   - `index.html`
   - `.htaccess` *(assurez-vous que l'option « Afficher les fichiers masqués » est cochée dans les préférences de File Manager)*
   - `sw.js` (le Service Worker)
   - `manifest.webmanifest` (le manifeste PWA)
   - `pwa-192x192.png`, `pwa-512x512.png`, etc.
   - Dossier `assets/`
   - Dossier `images/`

---

## 🔒 Étape 4 : Activer le Certificat SSL / HTTPS (Obligatoire pour la PWA)

> [!IMPORTANT]
> Les fonctionnalités PWA (Service Worker, installation sur mobile, mise en cache hors-ligne) exigent **impérativement** une connexion HTTPS sécurisée.

1. Dans cPanel, allez dans **SSL/TLS Status** ou **Let's Encrypt SSL**.
2. Cochez votre nom de domaine (`residencescheliel.com`, `www.residencescheliel.com`, ainsi que `api.residencescheliel.com`).
3. Cliquez sur **Run AutoSSL** ou **Issue** (Let's Encrypt).
4. Le cadenas vert apparaîtra en quelques minutes.

---

## 🔄 Étape 5 : Mises à jour ultérieures

Lorsque vous apportez des modifications au site :

1. **Reconstruire les archives localement** :
   ```powershell
   npm run package:o2switch
   ```
2. **Pour le Frontend** :
   - Uploader et extraire `deploy/residence-cheliel-frontend.zip` dans `public_html/`.
   - Grâce aux en-têtes configurés dans `.htaccess`, les navigateurs détecteront la mise à jour immédiatement et mettront à jour le Service Worker PWA.
3. **Pour le Backend** :
   - Uploader le nouveau code dans le dossier Node.js.
   - Pour forcer le rechargement sans couper le service : dans le terminal ou via File Manager, modifiez simplement le fichier `tmp/restart.txt` ou cliquez sur **Restart** dans **Setup Node.js App**.

---

## ✅ Checklist de Validation Finale

- [ ] Le site s'ouvre bien en **HTTPS** sans avertissement de sécurité.
- [ ] La bannière d'installation PWA s'affiche et le bouton **Installer l'app** est présent dans le menu.
- [ ] Sur mobile (Android / Chrome ou iOS / Safari), l'installation ajoute bien l'icône sur l'écran d'accueil.
- [ ] En coupant le réseau (Mode avion), l'indicateur hors-ligne s'affiche et les pages/chambres restent consultables.
- [ ] L'accès `/admin` fonctionne et permet de se connecter avec les identifiants créés.
- [ ] Une réservation de test est enregistrée avec succès dans la base MariaDB.
