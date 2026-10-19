import * as ftp from 'basic-ftp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Helper pour charger un fichier d'environnement
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const envDeploy = loadEnv(path.join(projectRoot, '.env.deploy'));
const envMain = loadEnv(path.join(projectRoot, '.env'));
const config = { ...envMain, ...envDeploy };

const args = process.argv.slice(2);
const deployBackendOnly = args.includes('--backend');
const deployAll = args.includes('--all');
const skipBuild = args.includes('--skip-build');
const deployFrontend = deployAll || !deployBackendOnly;
const deployBackend = deployAll || deployBackendOnly;

// Préparer un dossier propre pour le backend avant upload
function prepareBackendStaging() {
  const stagingDir = path.join(projectRoot, 'deploy', '_staging_backend');
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(stagingDir, { recursive: true });

  const backendSrcDir = path.join(projectRoot, 'backend', 'src');
  const backendDbDir = path.join(projectRoot, 'backend', 'database');
  const backendScriptsDir = path.join(projectRoot, 'backend', 'scripts');
  const backendPkg = path.join(projectRoot, 'backend', 'package.json');
  const backendPkgLock = path.join(projectRoot, 'backend', 'package-lock.json');
  const backendEnvEx = path.join(projectRoot, 'backend', '.env.example');
  const backendHtaccess = path.join(projectRoot, 'backend', '.htaccess');

  if (fs.existsSync(backendSrcDir)) fs.cpSync(backendSrcDir, path.join(stagingDir, 'src'), { recursive: true });
  if (fs.existsSync(backendDbDir)) fs.cpSync(backendDbDir, path.join(stagingDir, 'database'), { recursive: true });
  if (fs.existsSync(backendScriptsDir)) fs.cpSync(backendScriptsDir, path.join(stagingDir, 'scripts'), { recursive: true });
  if (fs.existsSync(backendPkg)) fs.copyFileSync(backendPkg, path.join(stagingDir, 'package.json'));
  if (fs.existsSync(backendPkgLock)) fs.copyFileSync(backendPkgLock, path.join(stagingDir, 'package-lock.json'));
  if (fs.existsSync(backendEnvEx)) fs.copyFileSync(backendEnvEx, path.join(stagingDir, '.env.example'));
  if (fs.existsSync(backendHtaccess)) fs.copyFileSync(backendHtaccess, path.join(stagingDir, '.htaccess'));

  const dbHost = config.DB_HOST || process.env.DB_HOST || 'localhost';
  const dbPort = config.DB_PORT || process.env.DB_PORT || '3306';
  const dbName = config.DB_NAME || process.env.DB_NAME || 'fuke3268_cheliel_db';
  const dbUser = config.DB_USER || process.env.DB_USER || 'fuke3268_cheliel';
  const dbPassword = config.DB_PASSWORD || process.env.DB_PASSWORD;
  const jwtSecret = config.JWT_SECRET || process.env.JWT_SECRET;

  if (!dbPassword || !jwtSecret) {
    throw new Error('Variables DB_PASSWORD et JWT_SECRET requises dans .env.deploy pour générer la configuration de production.');
  }

  // Fichier .env avec les variables de production réelles (chargées depuis .env.deploy)
  const backendEnvProd = `NODE_ENV=production
PORT=3000
FRONTEND_ORIGIN=${config.FRONTEND_ORIGIN || 'https://residencescheliel.com,https://www.residencescheliel.com'}
DB_HOST=${dbHost}
DB_PORT=${dbPort}
DB_NAME=${dbName}
DB_USER=${dbUser}
DB_PASSWORD=${dbPassword}
JWT_SECRET=${jwtSecret}
UPLOAD_DIR=uploads
PUBLIC_API_URL=${config.PUBLIC_API_URL || 'https://api.residencescheliel.com'}
`;
  fs.writeFileSync(path.join(stagingDir, '.env'), backendEnvProd);

  // Dossier uploads et tmp/restart.txt pour Passenger
  fs.mkdirSync(path.join(stagingDir, 'uploads'), { recursive: true });
  const uploadsHtaccess = path.join(projectRoot, 'backend', 'uploads', '.htaccess');
  if (fs.existsSync(uploadsHtaccess)) {
    fs.copyFileSync(uploadsHtaccess, path.join(stagingDir, 'uploads', '.htaccess'));
  }
  fs.mkdirSync(path.join(stagingDir, 'tmp'), { recursive: true });
  fs.writeFileSync(path.join(stagingDir, 'tmp', 'restart.txt'), `Restart requested at ${new Date().toISOString()}\n`);

  return stagingDir;
}

async function main() {
  console.log('\n🚀 [o2switch] Déploiement direct sans fichier ZIP\n');

  const host = config.FTP_HOST || process.env.FTP_HOST;
  const user = config.FTP_USER || process.env.FTP_USER;
  const password = config.FTP_PASSWORD || process.env.FTP_PASSWORD;
  const port = Number(config.FTP_PORT || process.env.FTP_PORT || 21);
  const secure = (config.FTP_SECURE || process.env.FTP_SECURE || 'true').toLowerCase() === 'true';
  const frontendRemoteDir = config.FTP_FRONTEND_REMOTE_DIR || process.env.FTP_FRONTEND_REMOTE_DIR || 'public_html';
  const backendRemoteDir = config.FTP_BACKEND_REMOTE_DIR || process.env.FTP_BACKEND_REMOTE_DIR || 'api.residencescheliel.com';

  if (!host || !user || !password) {
    console.error('❌ Configuration manquante dans .env.deploy !\n');
    console.log('Veuillez renseigner vos identifiants FTP o2switch dans le fichier :');
    console.log('👉 .env.deploy\n');
    process.exit(1);
  }

  // 1. Compilation Frontend si nécessaire
  if (deployFrontend && !skipBuild) {
    console.log('📦 [1/3] Compilation du Frontend (Vite + PWA)...');
    try {
      execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
    } catch (err) {
      console.error('\n❌ Erreur pendant le build du Frontend.');
      process.exit(1);
    }
  }

  // S'assurer que .htaccess est toujours à jour dans dist/
  const distHtaccess = path.join(projectRoot, 'dist', '.htaccess');
  const srcHtaccess = path.join(projectRoot, 'public', '.htaccess');
  if (fs.existsSync(srcHtaccess)) {
    fs.copyFileSync(srcHtaccess, distHtaccess);
  }

  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    console.log(`\n🔌 [2/3] Connexion au serveur o2switch (${host}:${port})...`);
    await client.access({
      host,
      user,
      password,
      port,
      secure,
      secureOptions: {
        rejectUnauthorized: false,
      },
    });

    console.log('✅ Connecté avec succès !');

    // Afficher la liste des dossiers distants existants pour vérification
    try {
      const rootList = await client.list();
      const folderNames = rootList.filter(item => item.isDirectory).map(item => item.name);
      console.log(`📁 Dossiers distants visibles : ${folderNames.slice(0, 10).join(', ')}${folderNames.length > 10 ? '...' : ''}`);
    } catch {
      // Ignorer si la liste n'est pas autorisée
    }

    // 2. Déploiement Frontend
    if (deployFrontend) {
      const distDir = path.join(projectRoot, 'dist');
      if (!fs.existsSync(distDir)) {
        console.error('❌ Le dossier dist/ est introuvable. Exécutez npm run build.');
        process.exit(1);
      }

      console.log(`\n📤 [3/3] Synchronisation du Frontend vers "${frontendRemoteDir}"...`);
      // Revenir à la racine avant upload
      await client.cd('/');
      await client.uploadFromDir(distDir, frontendRemoteDir);
      console.log(`✅ Frontend déployé avec succès dans "${frontendRemoteDir}" !`);
    }

    // 3. Déploiement Backend
    if (deployBackend) {
      console.log(`\n📤 [3/3] Synchronisation du Backend vers "${backendRemoteDir}"...`);
      const stagingDir = prepareBackendStaging();

      try {
        // Revenir à la racine avant upload
        await client.cd('/');
        await client.uploadFromDir(stagingDir, backendRemoteDir);
        console.log(`✅ Backend déployé avec succès dans "${backendRemoteDir}" !`);
        console.log(`✅ Application Node.js redémarrée automatiquement (tmp/restart.txt mis à jour).`);
      } finally {
        // Nettoyer le dossier temporaire local
        try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch {}
      }
    }

    console.log('\n🎉 =======================================================');
    console.log('   DÉPLOIEMENT O2SWITCH TERMINÉ AVEC SUCCÈS !');
    console.log('   Fichiers transférés directement sans aucun ZIP.');
    console.log('=======================================================\n');
  } catch (err) {
    console.error('\n❌ Erreur de transfert FTP :', err.message);
    if (err.message.includes('553')) {
      console.log(`\n💡 Aide Erreur 553 :`);
      console.log(`Le serveur o2switch indique que le dossier cible est introuvable ou restreint.`);
      console.log(`Vérifiez la variable FTP_BACKEND_REMOTE_DIR ou FTP_FRONTEND_REMOTE_DIR dans .env.deploy.`);
      console.log(`Assurez-vous que le dossier correspondant a bien été créé dans cPanel (ex: dans Setup Node.js App).`);
    } else if (err.message.includes('530') || err.message.includes('Login')) {
      console.log('👉 Vérifiez vos identifiants (FTP_USER et FTP_PASSWORD) dans .env.deploy');
    }
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
