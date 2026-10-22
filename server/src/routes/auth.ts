import { Router, Request, Response } from 'express';
import { playwrightManager } from '../playwrightManager';
import { youtubeService } from '../services/youtubeService';
import { Platform, BrowserEngine } from '../types';
import { isPlatform, isEngine } from '../security';

const router = Router();

// Toute route /auth/:platform/... n'accepte qu'une plateforme connue (empêche l'injection de chemins / commandes)
router.param('platform', (req: Request, res: Response, next, value) => {
  if (!isPlatform(value)) {
    return res.status(400).json({ success: false, message: 'Plateforme inconnue' });
  }
  return next();
});

// Moteur demandé (corps ou query) : uniquement une valeur connue, sinon undefined
function readEngine(req: Request): BrowserEngine | 'all' | undefined {
  const raw = req.body?.engine || req.query?.engine;
  if (raw === 'all' || isEngine(raw)) return raw;
  return undefined;
}

// GET /api/status - Statut global des 4 plateformes
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await playwrightManager.getSystemStatus();
    return res.json(status);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erreur statut système' });
  }
});

// POST /api/auth/:platform/login - Connexion interactive pour une plateforme
router.post('/auth/:platform/login', async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform as Platform;
    const requested = readEngine(req);
    const engine: BrowserEngine = requested && requested !== 'all' ? requested : 'chromium';

    if (!['twitter', 'instagram', 'tiktok', 'threads', 'reddit', 'youtube'].includes(platform)) {
      return res.status(400).json({ success: false, message: 'Plateforme non supportée pour la connexion Playwright' });
    }

    const result = await playwrightManager.launchInteractiveLogin(platform, engine);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Erreur lancement login' });
  }
});

// POST /api/auth/:platform/logout - Déconnexion d'une plateforme
router.post('/auth/:platform/logout', async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform as Platform;
    await playwrightManager.logout(platform);
    return res.json({ success: true, message: `Déconnexion réussie pour ${platform}` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/:platform/cookies - Injection directe des cookies auth_token / sessionid
router.post('/auth/:platform/cookies', async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform as Platform;
    const { authToken, ct0 } = req.body;

    if (!authToken || typeof authToken !== 'string') {
      return res.status(400).json({ success: false, message: 'Le jeton de session est obligatoire' });
    }

    const result = await playwrightManager.injectCookies(platform, authToken, ct0);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/:platform/auto-import - Importation automatique 1-clic depuis les navigateurs locaux
router.post('/auth/:platform/auto-import', async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform as Platform;
    const engine = readEngine(req) || 'all';
    const result = await playwrightManager.autoImportCookies(platform, engine);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/auto-import-all - Importation globale 1-clic pour tous les réseaux (X, Instagram, TikTok)
router.post('/auth/auto-import-all', async (req: Request, res: Response) => {
  try {
    const engine = readEngine(req) || 'all';
    const result = await playwrightManager.autoImportAll(engine);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/config/youtube-key - Configuration de la clé API YouTube Data v3
router.post('/config/youtube-key', (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    if (typeof apiKey === 'string') {
      youtubeService.setApiKey(apiKey);
      return res.json({ success: true, message: 'Clé API YouTube mise à jour avec succès', hasKey: youtubeService.hasApiKey() });
    }
    return res.status(400).json({ success: false, message: 'Clé API invalide' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
