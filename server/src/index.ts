// Doit rester le premier import : les services lisent process.env dès leur chargement
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import net from 'net';
import http from 'http';
import authRoutes from './routes/auth';
import feedRoutes from './routes/feed';
import { playwrightManager } from './playwrightManager';
import { requestGuard, corsOptions } from './security';

const app = express();

// Middlewares globaux
app.use(requestGuard);
app.use(cors(corsOptions));
app.use(express.json());

// Enregistrement des routes d'API
app.use('/api', authRoutes);
app.use('/api/feed', feedRoutes);

// Vérification de santé du serveur
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'MultiDeck Universal Backend', timestamp: new Date().toISOString() });
});

// Service du frontend React (client/dist) pour le mode production unifié
const clientDistPath = path.resolve(__dirname, '../../client/dist');
const altClientDistPath = path.resolve(__dirname, '../client/dist');
const finalClientDist = fs.existsSync(clientDistPath)
  ? clientDistPath
  : (fs.existsSync(altClientDistPath) ? altClientDistPath : null);

if (finalClientDist) {
  console.log(`[MultiDeck] 📦 Frontend compilé détecté : ${finalClientDist}`);
  app.use(express.static(finalClientDist));

  // Fallback SPA : redirige les routes non-API vers index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(finalClientDist, 'index.html'));
  });
} else {
  console.log(`[MultiDeck] ℹ️ Dossier client/dist non trouvé (mode API autonome ou dev).`);
}

// Fonction d'extraction du port souhaité (CLI --port / -p > .env / process.env > 3001)
function getRequestedPort(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--port' || args[i] === '-p') && args[i + 1]) {
      const p = parseInt(args[i + 1], 10);
      if (!isNaN(p) && p > 0 && p < 65536) return p;
    }
  }
  if (process.env.PORT) {
    const p = parseInt(process.env.PORT, 10);
    if (!isNaN(p) && p > 0 && p < 65536) return p;
  }
  return 3001;
}

// Recherche du premier port disponible si le port demandé est déjà utilisé
function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const testServer = net.createServer();
    testServer.unref();

    testServer.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        console.warn(`[MultiDeck] ⚠️ Port ${startPort} occupé ou inaccessible, tentative sur ${startPort + 1}...`);
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });

    testServer.listen(startPort, () => {
      testServer.close(() => {
        resolve(startPort);
      });
    });
  });
}

// Fichier runtime pour transmettre l'URL et le port au lanceur Tray / scripts externes
const runtimeInfoPath = path.resolve(__dirname, '../runtime-info.json');

let server: http.Server;

async function startServer() {
  const requestedPort = getRequestedPort();
  const actualPort = await findAvailablePort(requestedPort);

  if (actualPort !== requestedPort) {
    console.log(`[MultiDeck] 🔄 Port initial (${requestedPort}) réassigné automatiquement sur : ${actualPort}`);
  }

  // Écriture du fichier de runtime pour les outils externes / lanceurs
  try {
    fs.writeFileSync(
      runtimeInfoPath,
      JSON.stringify(
        {
          port: actualPort,
          url: `http://localhost:${actualPort}`,
          pid: process.pid,
          startedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  } catch (e) {
    console.warn('[MultiDeck] Impossible d\'écrire runtime-info.json:', e);
  }

  server = app.listen(actualPort, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 MultiDeck Multi-Plateformes en écoute sur http://localhost:${actualPort}`);
    console.log(`📡 Endpoints standardisés :`);
    console.log(`   - GET  /api/status                       (Statut global des 4 réseaux)`);
    console.log(`   - GET  /api/feed/:platform/user?id=...   (Posts d'un créateur/compte)`);
    console.log(`   - GET  /api/feed/:platform/search?q=...  (Recherche ou Hashtag)`);
    console.log(`   - GET  /api/feed/:platform/home          (Fil principal / Tendances)`);
    console.log(`   - GET  /api/feed/:platform/shorts        (Shorts / Reels / TikToks)`);
    console.log(`   - POST /api/auth/:platform/login         (Connexion interactive Playwright)`);
    console.log(`   - POST /api/config/youtube-key           (Configuration clé API YouTube)`);
    console.log(`=================================================\n`);
  });
}

// Arrêt propre du serveur et des instances Playwright
const gracefulShutdown = async () => {
  console.log('\n[MultiDeck] Arrêt des services et des navigateurs Playwright...');
  
  if (fs.existsSync(runtimeInfoPath)) {
    try {
      fs.unlinkSync(runtimeInfoPath);
    } catch {}
  }

  await playwrightManager.closeAll();
  if (server) {
    server.close(() => {
      console.log('[MultiDeck] Serveur arrêté proprement.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

startServer().catch((err) => {
  console.error('[MultiDeck] ❌ Erreur fatale au démarrage du serveur:', err);
  process.exit(1);
});
