import { chromium, firefox, webkit, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { PlatformAuthStatus, SystemStatus, BrowserEngine, Platform } from './types';
import { youtubeService } from './services/youtubeService';

// Empêche Playwright Firefox d'interagir avec les instances Firefox déjà ouvertes par l'utilisateur
process.env.MOZ_NO_REMOTE = '1';

export class PlaywrightManager {
  private contexts: Map<string, BrowserContext> = new Map();
  private userDataDir: string;
  private currentEngine: BrowserEngine = 'chromium';
  private openInteractivePlatforms: Set<string> = new Set();
  private queueLocks: Map<string, Promise<void>> = new Map();

  constructor() {
    this.userDataDir = path.resolve(process.cwd(), 'user_data');
    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }
  }

  private getCookiesFilePath(platform: Platform): string {
    const dir = path.join(this.userDataDir, platform);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, 'cookies.json');
  }

  public loadSavedCookies(platform: Platform): any[] {
    try {
      const file = this.getCookiesFilePath(platform);
      if (fs.existsSync(file)) {
        const data = fs.readFileSync(file, 'utf-8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  }

  private saveCookiesToFile(platform: Platform, cookies: any[]): void {
    if (!cookies || cookies.length === 0) return;
    try {
      const file = this.getCookiesFilePath(platform);
      if (fs.existsSync(file)) {
        try {
          const current = JSON.parse(fs.readFileSync(file, 'utf-8'));
          if (Array.isArray(current) && current.length > cookies.length && current.length > 50) {
            return; // Conserver le jeu complet de cookies
          }
        } catch (e) {}
      }
      fs.writeFileSync(file, JSON.stringify(cookies, null, 2), 'utf-8');
    } catch (e) {}
  }

  private getEngineLauncher(engine: BrowserEngine = this.currentEngine) {
    switch (engine) {
      case 'firefox':
        return firefox;
      case 'webkit':
        return webkit;
      case 'chromium':
      default:
        return chromium;
    }
  }

  public getEngineForPlatform(platform: Platform): BrowserEngine {
    // Firefox est le moteur optimal pour Twitter, Instagram, Threads et Reddit
    if (platform === 'twitter' || platform === 'instagram' || platform === 'threads' || platform === 'reddit') {
      return 'firefox';
    }
    return this.currentEngine;
  }

  /**
   * Verrou de file d'attente par plateforme pour éviter les accès simultanés
   */
  public async executeWithLock<T>(platform: Platform, task: (context: BrowserContext) => Promise<T>): Promise<T> {
    const currentLock = this.queueLocks.get(platform) || Promise.resolve();
    let release: () => void;
    const nextLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.queueLocks.set(platform, currentLock.then(() => nextLock));

    await currentLock;
    try {
      const engine = this.getEngineForPlatform(platform);
      const ctx = await this.getContext(platform, { headless: true, engine });
      return await task(ctx);
    } finally {
      release!();
    }
  }

  /**
   * Récupère ou instancie un contexte Playwright persistant
   */
  public async getContext(platform: Platform, options: { headless?: boolean; engine?: BrowserEngine } = { headless: true }): Promise<BrowserContext> {
    const engine = options.engine || this.getEngineForPlatform(platform);
    const key = `${platform}:${engine}`;
    const existing = this.contexts.get(key);
    if (existing) return existing;

    const engineLauncher = this.getEngineLauncher(engine);
    const platformDataDir = path.join(this.userDataDir, platform, engine);

    if (!fs.existsSync(platformDataDir)) {
      fs.mkdirSync(platformDataDir, { recursive: true });
    }

    if (engine === 'firefox') {
      const lockFiles = ['parent.lock', 'lock', '.parentlock'];
      for (const lf of lockFiles) {
        const fp = path.join(platformDataDir, lf);
        if (fs.existsSync(fp)) {
          try { fs.unlinkSync(fp); } catch (e) {}
        }
      }
    }

    try {
      const context = await engineLauncher.launchPersistentContext(platformDataDir, {
        headless: options.headless ?? true,
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        args: engine === 'chromium' ? [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disk-cache-size=52428800',
          '--media-cache-size=26214400',
        ] : [
          '-no-remote',
          '-new-instance',
        ],
        firefoxUserPrefs: engine === 'firefox' ? {
          'browser.cache.disk.capacity': 51200,
          'browser.cache.disk.smart_size.enabled': false,
          'media.cache_size': 25600,
          'toolkit.startup.max_resumed_crashes': -1,
          'browser.sessionstore.resume_from_crash': false,
        } : undefined,
      });

      // Injection automatique des cookies sauvegardés sur disque
      const savedCookies = this.loadSavedCookies(platform);
      if (savedCookies.length > 0) {
        try {
          const safe = this.sanitizeCookiesForPlaywright(savedCookies);
          if (safe.length > 0) await context.addCookies(safe);
        } catch (e) {}
      }

      context.on('close', () => {
        this.contexts.delete(key);
        this.openInteractivePlatforms.delete(platform);
      });

      this.contexts.set(key, context);
      return context;
    } catch (err) {
      console.error(`[PlaywrightManager] Erreur contexte ${platform} :`, err);
      throw err;
    }
  }

  /**
   * Ferme le contexte d'une plateforme
   */
  public async closePlatformContext(platform: Platform): Promise<void> {
    for (const [key, ctx] of this.contexts.entries()) {
      if (key.startsWith(`${platform}:`)) {
        try {
          const cookies = await ctx.cookies();
          if (cookies.length > 0) this.saveCookiesToFile(platform, cookies);
          await ctx.close();
        } catch (e) {}
        this.contexts.delete(key);
      }
    }
    this.openInteractivePlatforms.delete(platform);
  }

  /**
   * Vérifie le statut de session réel pour chaque plateforme
   * SANS lancer de navigateur lourd en tâche de fond (utilise les cookies sauvegardés ou le contexte actif)
   */
  public async checkSession(platform: Platform): Promise<PlatformAuthStatus> {
    try {
      let allCookies: any[] = [];

      // 1. Si un contexte est déjà actif en mémoire, on lit les cookies récents
      for (const [key, ctx] of this.contexts.entries()) {
        if (key.startsWith(`${platform}:`)) {
          try {
            allCookies = await ctx.cookies();
            if (allCookies.length > 0) this.saveCookiesToFile(platform, allCookies);
          } catch (e) {}
          break;
        }
      }

      // 2. Sinon, on lit directement le fichier de cookies sauvegardés (instantané, 0 RAM, 0 conflit de processus)
      if (allCookies.length === 0) {
        allCookies = this.loadSavedCookies(platform);
      }

      let isAuthenticated = false;
      let username: string | undefined = undefined;

      if (platform === 'twitter') {
        const hasAuthToken = allCookies.some((c) => c.name === 'auth_token' && c.value && c.value.length > 5);
        const hasCt0 = allCookies.some((c) => c.name === 'ct0');
        isAuthenticated = hasAuthToken || hasCt0;

        const twid = allCookies.find((c) => c.name === 'twid');
        if (twid) username = decodeURIComponent(twid.value).replace(/^u=/, '');
      } else if (platform === 'instagram') {
        const hasSessionId = allCookies.some((c) => (c.name === 'sessionid' || c.name === 'ds_user_id') && c.value && c.value.length > 2);
        const hasCsrf = allCookies.some((c) => c.name === 'csrftoken' && (c.domain || '').includes('instagram.com'));
        isAuthenticated = hasSessionId || hasCsrf;

        const dsUser = allCookies.find((c) => c.name === 'ds_user_id' || c.name === 'ds_user');
        if (dsUser) username = decodeURIComponent(dsUser.value);
      } else if (platform === 'tiktok') {
        const hasSession = allCookies.some((c) => (c.name === 'sessionid' || c.name === 'sid_tt') && c.value && c.value.length > 3);
        isAuthenticated = hasSession;
      } else if (platform === 'youtube') {
        const hasLogin = allCookies.some((c) => (c.name === 'LOGIN_INFO' || c.name === 'SAPISID' || c.name === 'SID' || c.name === '__Secure-1PSID') && c.value && c.value.length > 5);
        if (hasLogin) {
          // Vérification rapide que la session est réellement active et non expirée
          try {
            const h = youtubeService.getAuthCookieHeader();
            if (h) {
              const res = await fetch('https://www.youtube.com/feed/subscriptions', {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                  'Cookie': h,
                },
              });
              if (res.ok) {
                const text = await res.text();
                isAuthenticated = !text.includes('backgroundPromoRenderer') && !text.includes('Connectez-vous pour découvrir les nouveautés');
              }
            }
          } catch (e) {
            isAuthenticated = false;
          }
        }
      } else if (platform === 'threads') {
        const hasSessionId = allCookies.some((c) => (c.name === 'sessionid' || c.name === 'ds_user_id') && c.value && c.value.length > 2);
        const hasCsrf = allCookies.some((c) => c.name === 'csrftoken' && ((c.domain || '').includes('threads.net') || (c.domain || '').includes('threads.com')));
        isAuthenticated = hasSessionId || hasCsrf;

        const dsUser = allCookies.find((c) => c.name === 'ds_user_id' || c.name === 'ds_user');
        if (dsUser) username = decodeURIComponent(dsUser.value);
      } else if (platform === 'reddit') {
        const hasSession = allCookies.some((c) => (c.name === 'reddit_session' || c.name === 'token_v2') && c.value && c.value.length > 5);
        isAuthenticated = hasSession;

        const tokenCookie = allCookies.find((c) => c.name === 'token_v2');
        if (tokenCookie && tokenCookie.value) {
          try {
            const parts = tokenCookie.value.split('.');
            if (parts[1]) {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
              if (payload.sub && payload.sub !== 'user') username = payload.sub;
            }
          } catch (e) {}
        }
      }

      return {
        isAuthenticated,
        isBrowserOpen: this.openInteractivePlatforms.has(platform),
        cookiesDetected: allCookies.length > 0,
        username,
        engine: this.getEngineForPlatform(platform),
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        isAuthenticated: false,
        isBrowserOpen: this.openInteractivePlatforms.has(platform),
        cookiesDetected: false,
        engine: this.getEngineForPlatform(platform),
        lastChecked: new Date().toISOString(),
        loginError: err.message,
      };
    }
  }

  /**
   * Statut global de tous les réseaux
   */
  public async getSystemStatus(): Promise<SystemStatus> {
    const [twitter, instagram, tiktok, youtubeSession, threadsSession, redditSession] = await Promise.all([
      this.checkSession('twitter'),
      this.checkSession('instagram'),
      this.checkSession('tiktok'),
      this.checkSession('youtube'),
      this.checkSession('threads'),
      this.checkSession('reddit'),
    ]);

    return {
      twitter,
      instagram,
      tiktok,
      youtube: {
        ...youtubeSession,
        hasApiKey: youtubeService.hasApiKey(),
        channelConnected: youtubeSession.isAuthenticated,
      },
      bluesky: {
        isAuthenticated: true,
        isBrowserOpen: false,
        cookiesDetected: false,
        lastChecked: new Date().toISOString(),
      },
      threads: threadsSession,
      reddit: redditSession,
    };
  }

  /**
   * Lance la fenêtre interactive pour se connecter
   */
  public async launchInteractiveLogin(platform: Platform, engine: BrowserEngine = 'chromium'): Promise<{ success: boolean; message: string }> {
    await this.closePlatformContext(platform);
    this.currentEngine = engine;
    this.openInteractivePlatforms.add(platform);

    let targetUrl = 'https://x.com/login';
    if (platform === 'instagram') targetUrl = 'https://www.instagram.com/accounts/login/';
    if (platform === 'tiktok') targetUrl = 'https://www.tiktok.com/login';
    if (platform === 'threads') targetUrl = 'https://www.threads.net/login';
    if (platform === 'reddit') targetUrl = 'https://www.reddit.com/login';
    if (platform === 'youtube') targetUrl = 'https://accounts.google.com/ServiceLogin?service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2Ffeed%2Fsubscriptions';
    if (platform === 'bluesky') targetUrl = 'https://bsky.app';
    if (platform === 'threads') targetUrl = 'https://www.threads.net/login';

    const platformDataDir = path.join(this.userDataDir, platform, engine);
    if (!fs.existsSync(platformDataDir)) fs.mkdirSync(platformDataDir, { recursive: true });

    try {
      const launcher = this.getEngineLauncher(engine);
      const context = await launcher.launchPersistentContext(platformDataDir, {
        headless: false,
        viewport: { width: 1050, height: 750 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        args: engine === 'chromium' ? [
          '--disable-blink-features=AutomationControlled',
          '--disk-cache-size=52428800',
        ] : [],
        firefoxUserPrefs: engine === 'firefox' ? {
          'browser.cache.disk.capacity': 51200,
          'browser.cache.disk.smart_size.enabled': false,
        } : undefined,
      });

      const key = `${platform}:${engine}`;
      this.contexts.set(key, context);

      const page = context.pages()[0] || (await context.newPage());
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

      context.on('close', () => {
        this.contexts.delete(key);
        this.openInteractivePlatforms.delete(platform);
        this.checkSession(platform);
      });

      return {
        success: true,
        message: `Fenêtre de connexion ouverte pour ${platform.toUpperCase()}. Connectez-vous pour enregistrer votre session locale.`,
      };
    } catch (err: any) {
      this.openInteractivePlatforms.delete(platform);
      return { success: false, message: err.message || 'Erreur lors de l’ouverture du navigateur' };
    }
  }

  /**
   * Injecte des cookies directement dans le contexte persistant
   */
  public async injectCookies(platform: Platform, authToken: string, ct0?: string): Promise<{ success: boolean; message: string }> {
    try {
      const ctx = await this.getContext(platform, { headless: true });
      const cookiesToSet: any[] = [];
      const val = authToken.trim();

      if (platform === 'twitter') {
        const domains = ['.x.com', '.twitter.com'];
        for (const domain of domains) {
          cookiesToSet.push({
            name: 'auth_token',
            value: val,
            domain,
            path: '/',
            secure: true,
            httpOnly: true,
          });
          if (ct0 && ct0.trim()) {
            cookiesToSet.push({
              name: 'ct0',
              value: ct0.trim(),
              domain,
              path: '/',
              secure: true,
            });
          }
        }
      } else if (platform === 'instagram') {
        const domains = ['.instagram.com', 'www.instagram.com'];
        for (const domain of domains) {
          cookiesToSet.push({
            name: val.length < 20 && !isNaN(Number(val)) ? 'ds_user_id' : 'sessionid',
            value: val,
            domain,
            path: '/',
            secure: true,
            httpOnly: true,
          });
        }
      } else if (platform === 'tiktok') {
        const domains = ['.tiktok.com', 'www.tiktok.com'];
        for (const domain of domains) {
          cookiesToSet.push({
            name: 'sessionid',
            value: val,
            domain,
            path: '/',
            secure: true,
            httpOnly: true,
          });
        }
      } else if (platform === 'reddit') {
        const domains = ['.reddit.com', 'www.reddit.com'];
        for (const domain of domains) {
          cookiesToSet.push({
            name: 'reddit_session',
            value: val,
            domain,
            path: '/',
            secure: true,
            httpOnly: true,
          });
        }
      }

      await ctx.addCookies(cookiesToSet);
      const allCookies = await ctx.cookies();
      this.saveCookiesToFile(platform, allCookies);

      const status = await this.checkSession(platform);
      return {
        success: status.isAuthenticated,
        message: status.isAuthenticated
          ? `Cookies enregistrés avec succès pour ${platform.toUpperCase()} ! Session active.`
          : `Jeton enregistré mais la session requiert un cookie complet.`,
      };
    } catch (err: any) {
      return { success: false, message: `Erreur injection cookies : ${err.message}` };
    }
  }

  /**
   * Exécute le script d'extraction directe des cookies (Firefox SQLite + Chromium DPAPI/AES-GCM)
   */
  public runCookieExtractor(
    platform: Platform | 'all',
    engine: BrowserEngine | 'all' = 'all'
  ): Record<string, { success: boolean; browserName?: string; cookiesCount: number; cookies: any[]; message: string }> {
    const { execSync } = require('child_process');
    let scriptPath = path.join(__dirname, 'cookie_extractor.py');
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.join(__dirname, '..', 'src', 'cookie_extractor.py');
    }

    if (!fs.existsSync(scriptPath)) {
      console.warn('[PlaywrightManager] cookie_extractor.py introuvable à', scriptPath);
      return {};
    }

    try {
      const cmd = `python "${scriptPath}" ${platform} ${engine}`;
      const output = execSync(cmd, { encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'ignore'] });
      const parsed = JSON.parse(output.trim());
      return parsed;
    } catch (e: any) {
      console.error('[PlaywrightManager] Erreur exécution cookie_extractor.py :', e.message);
      return {};
    }
  }

  /**
   * Valide et normalise les cookies pour Playwright (expires en secondes Unix <= 2147483647 ou -1)
   */
  public sanitizeCookiesForPlaywright(cookies: any[]): any[] {
    if (!Array.isArray(cookies)) return [];
    return cookies
      .filter((c) => c && typeof c === 'object' && c.name && c.domain)
      .map((c) => {
        let exp: number = -1;
        if (typeof c.expires === 'number') {
          if (c.expires > 10000000000) {
            exp = Math.floor(c.expires / 1000);
          } else if (c.expires > 0) {
            exp = Math.floor(c.expires);
          }
          if (exp > 2147483647) exp = 2147483647;
          if (exp <= 0 && exp !== -1) exp = -1;
        }

        let sameSite: 'Strict' | 'Lax' | 'None' = 'Lax';
        if (c.sameSite === 'Strict' || c.sameSite === 'None') {
          sameSite = c.sameSite;
        }

        return {
          name: String(c.name).trim(),
          value: String(c.value ?? ''),
          domain: String(c.domain).trim(),
          path: String(c.path || '/'),
          expires: exp,
          httpOnly: Boolean(c.httpOnly),
          secure: Boolean(c.secure),
          sameSite,
        };
      });
  }

  /**
   * Tente d'importer automatiquement les cookies de session depuis les navigateurs locaux installés
   */
  public async autoImportCookies(
    platform: Platform,
    engine: BrowserEngine | 'all' = 'all'
  ): Promise<{ success: boolean; message: string; browserName?: string; cookiesCount?: number }> {
    // 1. Extraction directe via le module d'extraction natif (SQLite Firefox + AES-GCM Chromium)
    const extractorResult = this.runCookieExtractor(platform, engine);
    const platformData = extractorResult[platform];

    if (platformData && platformData.success && platformData.cookies && platformData.cookies.length > 0) {
      await this.closePlatformContext(platform);
      this.saveCookiesToFile(platform, platformData.cookies);

      const ctx = await this.getContext(platform, { headless: true });
      const safe = this.sanitizeCookiesForPlaywright(platformData.cookies);
      if (safe.length > 0) await ctx.addCookies(safe);

      const status = await this.checkSession(platform);
      if (status.isAuthenticated) {
        return {
          success: true,
          message: `Session ${platform.toUpperCase()} importée avec succès depuis ${platformData.browserName} (${platformData.cookiesCount} cookies) !`,
          browserName: platformData.browserName,
          cookiesCount: platformData.cookiesCount,
        };
      }
    }

    return {
      success: false,
      message: `Aucune session ${platform.toUpperCase()} active trouvée dans vos navigateurs locaux (${engine}). Connectez-vous sur votre navigateur habituel ou lancez la connexion interactive.`,
    };
  }

  /**
   * Importation globale : tente de connecter automatiquement tous les réseaux sociaux (X, Instagram, TikTok)
   */
  public async autoImportAll(engine: BrowserEngine | 'all' = 'all'): Promise<{
    success: boolean;
    summary: Record<string, { success: boolean; message: string; username?: string }>;
    connectedCount: number;
    totalCount: number;
    message: string;
  }> {
    const platforms: Platform[] = ['twitter', 'instagram', 'tiktok', 'youtube', 'threads', 'reddit'];
    const summary: Record<string, { success: boolean; message: string; username?: string }> = {};
    let connectedCount = 0;

    // 1. Exécution de l'extracteur universel pour tous les réseaux
    const allExtracted = this.runCookieExtractor('all', engine);

    for (const p of platforms) {
      // Si déjà authentifié
      const currentStatus = await this.checkSession(p);
      if (currentStatus.isAuthenticated) {
        summary[p] = {
          success: true,
          message: `Déjà connecté (${currentStatus.username || 'Session active'})`,
          username: currentStatus.username,
        };
        connectedCount++;
        continue;
      }

      // Si extrait par l'extracteur
      const pData = allExtracted[p];
      if (pData && pData.success && pData.cookies && pData.cookies.length > 0) {
        await this.closePlatformContext(p);
        this.saveCookiesToFile(p, pData.cookies);

        const ctx = await this.getContext(p, { headless: true });
        const safe = this.sanitizeCookiesForPlaywright(pData.cookies);
        if (safe.length > 0) await ctx.addCookies(safe);

        const newStatus = await this.checkSession(p);
        if (newStatus.isAuthenticated) {
          summary[p] = {
            success: true,
            message: `Connecté via ${pData.browserName} (${pData.cookiesCount} cookies)`,
            username: newStatus.username,
          };
          connectedCount++;
          continue;
        }
      }

      // Échec pour ce réseau
      summary[p] = {
        success: false,
        message: `Aucune session ${p.toUpperCase()} active trouvée.`,
      };
    }

    const success = connectedCount > 0;
    const message = connectedCount === platforms.length
      ? `Tous vos réseaux sociaux (${connectedCount}/${platforms.length}) sont connectés et opérationnels !`
      : connectedCount > 0
      ? `${connectedCount}/${platforms.length} réseaux connectés avec succès (${Object.keys(summary).filter((k) => summary[k].success).join(', ')}).`
      : `Aucune session active détectée automatiquement. Veuillez vous connecter sur vos navigateurs ou utiliser la fenêtre de connexion.`;

    return {
      success,
      summary,
      connectedCount,
      totalCount: platforms.length,
      message,
    };
  }

  /**
   * Déconnexion
   */
  public async logout(platform: Platform): Promise<void> {
    try {
      const file = this.getCookiesFilePath(platform);
      if (fs.existsSync(file)) {
        try { fs.unlinkSync(file); } catch (e) {}
      }
      const ctx = await this.getContext(platform, { headless: true });
      await ctx.clearCookies();
      await this.closePlatformContext(platform);
    } catch (e) {}
  }

  /**
   * Fermeture globale
   */
  public async closeAll(): Promise<void> {
    for (const ctx of this.contexts.values()) {
      try {
        await ctx.close();
      } catch (e) {}
    }
    this.contexts.clear();
    this.openInteractivePlatforms.clear();
  }

  /**
   * Calcule la taille totale d'un dossier
   */
  public getDirectorySize(dirPath: string): number {
    let total = 0;
    if (!fs.existsSync(dirPath)) return 0;
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dirPath, e.name);
        try {
          if (e.isDirectory()) {
            total += this.getDirectorySize(full);
          } else {
            total += fs.statSync(full).size;
          }
        } catch (err) {}
      }
    } catch (err) {}
    return total;
  }

  /**
   * Analyse et renvoie l'espace disque occupé par les caches du projet
   */
  public getStorageInfo(): { totalBytes: number; totalMb: string; details: Record<string, string> } {
    const details: Record<string, string> = {};
    let total = 0;

    const platforms: Platform[] = ['twitter', 'instagram', 'tiktok', 'youtube'];
    for (const p of platforms) {
      const pDir = path.join(this.userDataDir, p);
      if (fs.existsSync(pDir)) {
        const sz = this.getDirectorySize(pDir);
        total += sz;
        details[p] = `${(sz / (1024 * 1024)).toFixed(1)} Mo`;
      }
    }

    const legacyRootUserData = path.resolve(__dirname, '../../../user_data');
    if (fs.existsSync(legacyRootUserData)) {
      const sz = this.getDirectorySize(legacyRootUserData);
      total += sz;
      details['legacy_cache'] = `${(sz / (1024 * 1024)).toFixed(1)} Mo`;
    }

    return {
      totalBytes: total,
      totalMb: (total / (1024 * 1024)).toFixed(1),
      details,
    };
  }

  /**
   * Purge les dossiers de cache volumineux (cache2, startupCache, Chromium Cache, GPUCache)
   * tout en préservant scrupuleusement les cookies et sessions d'authentification
   */
  public async purgeDiskCache(): Promise<{ freedBytes: number; freedMb: string }> {
    // 1. Fermer les contextes Playwright en cours pour libérer les verrous fichiers
    await this.closeAll();

    let freedBytes = 0;

    const safeRemove = (targetPath: string) => {
      if (fs.existsSync(targetPath)) {
        const size = this.getDirectorySize(targetPath);
        try {
          fs.rmSync(targetPath, { recursive: true, force: true });
          freedBytes += size;
        } catch (err) {
          try {
            const items = fs.readdirSync(targetPath);
            for (const it of items) {
              const full = path.join(targetPath, it);
              try {
                const subSize = this.getDirectorySize(full);
                fs.rmSync(full, { recursive: true, force: true });
                freedBytes += subSize;
              } catch (e) {}
            }
          } catch (e) {}
        }
      }
    };

    const platforms: Platform[] = ['twitter', 'instagram', 'tiktok', 'youtube'];
    for (const p of platforms) {
      const base = path.join(this.userDataDir, p);
      if (!fs.existsSync(base)) continue;

      // Caches Firefox (images, vidéos, JS bytecode temporaires)
      safeRemove(path.join(base, 'firefox', 'cache2'));
      safeRemove(path.join(base, 'firefox', 'startupCache'));
      safeRemove(path.join(base, 'firefox', 'thumbnails'));

      // Caches Chromium
      const crBase = path.join(base, 'chromium');
      safeRemove(path.join(crBase, 'Default', 'Cache'));
      safeRemove(path.join(crBase, 'Default', 'Code Cache'));
      safeRemove(path.join(crBase, 'Default', 'GPUCache'));
      safeRemove(path.join(crBase, 'Default', 'Service Worker', 'CacheStorage'));
      safeRemove(path.join(crBase, 'Default', 'ShaderCache'));
      safeRemove(path.join(crBase, 'ShaderCache'));
      safeRemove(path.join(crBase, 'GrShaderCache'));

      // Supprimer le profil Chromium s'il n'est pas utilisé (Twitter/Instagram/TikTok utilisent Firefox)
      if (p === 'twitter' || p === 'instagram' || p === 'tiktok') {
        const crCookies = path.join(crBase, 'Default', 'Network', 'Cookies');
        if (!fs.existsSync(crCookies)) {
          safeRemove(crBase);
        }
      }
    }

    // Purger le dossier legacy root user_data s'il existe
    const legacyRootUserData = path.resolve(__dirname, '../../../user_data');
    if (fs.existsSync(legacyRootUserData)) {
      safeRemove(legacyRootUserData);
    }

    return {
      freedBytes,
      freedMb: (freedBytes / (1024 * 1024)).toFixed(1),
    };
  }
}

export const playwrightManager = new PlaywrightManager();
