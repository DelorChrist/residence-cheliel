# 🏨 Résidence Cheliel

Application web de réservation en ligne pour la **Résidence Cheliel**, un hébergement hôtelier. Elle permet aux clients de consulter les chambres disponibles, de faire des réservations en ligne, et aux administrateurs de gérer l'ensemble des réservations via un tableau de bord dédié.

---

## 🛠️ Stack technique

| Technologie | Rôle |
|---|---|
| React 19 + TypeScript | Framework UI et typage statique |
| Vite 7 | Bundler et serveur de développement |
| Tailwind CSS 4 | Styles et design system |
| React Router 7 | Routing côté client (SPA) |
| Node.js + Express | API REST et authentification administrateur |
| MariaDB | Base de données locale et production |
| Cloudflare Turnstile | Protection CAPTCHA anti-bot |
| jsPDF | Génération de PDF (bons de réservation) |
| Lucide React | Icônes |
| o2switch | Hébergement du frontend et du backend |

---

## 📁 Structure du projet

```
residence-cheliel/
├── public/                   # Assets statiques
├── src/
│   ├── components/           # Composants réutilisables
│   │   ├── Header.tsx        # Navigation principale
│   │   ├── Footer.tsx        # Pied de page
│   │   ├── ReservationModal.tsx  # Formulaire de réservation
│   │   ├── SplashScreen.tsx  # Écran de chargement
│   │   ├── WhatsAppButton.tsx # Bouton WhatsApp flottant
│   │   └── ScrollToTop.tsx   # Remonte en haut lors de navigation
│   ├── pages/                # Pages de l'application
│   │   ├── ClientHome.tsx    # Page d'accueil publique
│   │   ├── ChambresPage.tsx  # Catalogue des chambres
│   │   ├── ChambreDetail.tsx # Détail d'une chambre
│   │   ├── AProposPage.tsx   # Page "À propos"
│   │   ├── MesReservationsPage.tsx  # Suivi des réservations client
│   │   └── AdminDashboard.tsx       # Tableau de bord administrateur
│   ├── contexts/
│   │   └── RoomsContext.tsx  # Context React pour les données des chambres
│   ├── lib/
│   │   └── api.ts            # Client REST du backend
│   ├── hooks/                # Custom hooks React
│   ├── utils/                # Fonctions utilitaires
│   ├── data/                 # Données statiques (types, constantes)
│   ├── App.tsx               # Définition des routes
│   └── main.tsx              # Point d'entrée de l'application
├── backend/                  # API Node.js et schéma MariaDB
├── .env.example              # Modèle des variables d'environnement
├── vercel.json               # Configuration déploiement Vercel
├── vite.config.ts            # Configuration Vite
└── tsconfig.json             # Configuration TypeScript
```

---

## 🗺️ Routes de l'application

| Route | Page | Description |
|---|---|---|
| `/` | ClientHome | Page d'accueil avec présentation et appel à l'action |
| `/chambres` | ChambresPage | Liste de toutes les chambres disponibles |
| `/chambres/:id` | ChambreDetail | Détail et réservation d'une chambre spécifique |
| `/a-propos` | AProposPage | Informations sur la résidence |
| `/mes-reservations` | MesReservationsPage | Suivi des réservations par le client |
| `/admin` | AdminDashboard | Tableau de bord protégé par mot de passe |

---

## ⚙️ Prérequis

- **Node.js** v18 ou supérieur
- **npm** v9 ou supérieur
- MariaDB 10.6 ou supérieur
- Un site **Cloudflare Turnstile** (gratuit sur https://dash.cloudflare.com)

---

## 🚀 Installation et lancement en local

### 1. Cloner le dépôt

```bash
git clone <url-du-repo>
cd residence-cheliel
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Copier le fichier `.env.example` en `.env` :

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```

Puis renseigner les valeurs dans `.env` :

```env
# URL de votre backend REST
VITE_API_URL=http://localhost:3000

# Clé publique Cloudflare Turnstile (anti-bot CAPTCHA)
VITE_TURNSTILE_SITE_KEY=votre_cle_turnstile_ici
```

### 4. Initialiser la base de données MariaDB

Dans phpMyAdmin ou le client MariaDB, exécutez le fichier :

```
backend/database/schema.sql
```

Ce fichier crée les tables et les contraintes nécessaires. Les autorisations sont gérées par l'API.

### 5. Lancer le serveur de développement

```bash
npm run dev
```

L'application est accessible sur **http://localhost:5173**

---

## 🏗️ Build de production

```bash
npm run build
```

Les fichiers compilés sont générés dans le dossier `dist/`.

Pour prévisualiser le build localement :

```bash
npm run preview
```

---

## ☁️ Déploiement

Le frontend peut être servi comme site statique. Le backend doit être déployé comme application Node.js o2switch :
- **Rewrites SPA** : toutes les routes renvoient vers `index.html`
- **Headers de sécurité** : HSTS, CSP, X-Frame-Options, etc.

### Déployer

1. Construire le frontend avec `npm run build`.
2. Déployer le contenu de `dist/` sur le domaine o2switch.
3. Créer l’application Node.js pour le dossier `backend/`.
4. Configurer `VITE_API_URL`, la base MariaDB et `JWT_SECRET`.

---

## 🔑 Accès administrateur

Le tableau de bord admin est accessible à l'adresse `/admin`.
Créer le premier compte avec `node backend/scripts/create-admin.js email mot-de-passe`.

---

## 🛡️ Sécurité

- **Cloudflare Turnstile** : protection anti-bot sur le formulaire de réservation
- **Authentification JWT** : accès administrateur protégé par token
- **Headers HTTP** : HSTS, CSP, X-Frame-Options configurés via `vercel.json`
- **Variables d'environnement** : aucune clé secrète dans le code source
