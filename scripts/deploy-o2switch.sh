#!/usr/bin/env bash
# ==============================================================================
# Script de déploiement et packaging o2switch — Résidence Cheliel
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "🚀 [1/5] Initialisation du déploiement o2switch..."

DEPLOY_DIR="$DIR/deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# 1. Compilation Frontend
echo "📦 [2/5] Compilation du Frontend (Vite + PWA)..."
npm run build

# S'assurer que .htaccess est présent dans dist/
if [ -f "$DIR/public/.htaccess" ] && [ ! -f "$DIR/dist/.htaccess" ]; then
    cp "$DIR/public/.htaccess" "$DIR/dist/.htaccess"
fi

# 2. Packaging Frontend
echo "🗜️ [3/5] Création de l'archive ZIP Frontend..."
(cd "$DIR/dist" && zip -r "$DEPLOY_DIR/residence-cheliel-frontend.zip" .)
echo "✅ Archive Frontend créée : $DEPLOY_DIR/residence-cheliel-frontend.zip"

# 3. Packaging Backend
echo "🗜️ [4/5] Préparation et compression du Backend Node.js..."
TEMP_BACKEND="$DEPLOY_DIR/_temp_backend"
mkdir -p "$TEMP_BACKEND"

cp -r "$DIR/backend/src" "$TEMP_BACKEND/src"
cp -r "$DIR/backend/database" "$TEMP_BACKEND/database"
cp -r "$DIR/backend/scripts" "$TEMP_BACKEND/scripts"
cp "$DIR/backend/package.json" "$TEMP_BACKEND/package.json"
cp "$DIR/backend/package-lock.json" "$TEMP_BACKEND/package-lock.json"
cp "$DIR/backend/.env.example" "$TEMP_BACKEND/.env.example"
mkdir -p "$TEMP_BACKEND/uploads"
mkdir -p "$TEMP_BACKEND/tmp"
touch "$TEMP_BACKEND/tmp/restart.txt"

cat << 'EOF' > "$TEMP_BACKEND/O2SWITCH_README.txt"
Instructions de mise en service Backend o2switch :
1. Décompresser dans le dossier de votre application Node.js (ex: api.residencescheliel.com).
2. Dans cPanel > Setup Node.js App :
   - Version Node.js : 20.x ou 22.x
   - Application startup file : src/server.js
3. Renseigner le fichier .env (accès base MariaDB créée dans cPanel).
4. Cliquer sur "Run NPM Install" dans cPanel.
5. Redémarrer via le bouton Restart ou en modifiant tmp/restart.txt.
EOF

(cd "$TEMP_BACKEND" && zip -r "$DEPLOY_DIR/residence-cheliel-backend.zip" .)
rm -rf "$TEMP_BACKEND"
echo "✅ Archive Backend créée : $DEPLOY_DIR/residence-cheliel-backend.zip"

echo "🎉 [5/5] Packaging terminé avec succès dans $DEPLOY_DIR !"
