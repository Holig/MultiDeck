import { SystemStatus, FeedResponse, Platform, BrowserEngine, FeedMode } from '../types';

const API_BASE = '/api';

export const api = {
  // Récupère le statut global de tous les réseaux
  getStatus: async (): Promise<SystemStatus> => {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) throw new Error('Erreur lors de la vérification du statut système');
    return res.json();
  },

  // Lance l'authentification interactive pour une plateforme
  startLogin: async (platform: Platform, engine: BrowserEngine = 'chromium'): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE}/auth/${platform}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engine }),
    });
    if (!res.ok) throw new Error('Impossible de lancer le navigateur de connexion');
    return res.json();
  },

  // Déconnexion d'une plateforme
  logout: async (platform: Platform): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE}/auth/${platform}/logout`, { method: 'POST' });
    if (!res.ok) throw new Error('Erreur de déconnexion');
    return res.json();
  },

  // Injection manuelle des cookies auth_token et ct0 / sessionid
  injectCookies: async (platform: Platform, authToken: string, ct0?: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE}/auth/${platform}/cookies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authToken, ct0 }),
    });
    if (!res.ok) throw new Error('Erreur lors de l’injection des cookies');
    return res.json();
  },

  // Récupération automatique 1-clic depuis les navigateurs locaux
  autoImportCookies: async (platform: Platform, engine: BrowserEngine | 'all' = 'all'): Promise<{ success: boolean; message: string; browserName?: string; cookiesCount?: number }> => {
    const res = await fetch(`${API_BASE}/auth/${platform}/auto-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engine }),
    });
    if (!res.ok) throw new Error('Erreur lors de la détection automatique des cookies');
    return res.json();
  },

  // Importation globale 1-clic pour tous les réseaux (X, Instagram, TikTok)
  autoImportAll: async (engine: BrowserEngine | 'all' = 'all'): Promise<{
    success: boolean;
    summary: Record<string, { success: boolean; message: string; username?: string }>;
    connectedCount: number;
    totalCount: number;
    message: string;
  }> => {
    const res = await fetch(`${API_BASE}/auth/auto-import-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engine }),
    });
    if (!res.ok) throw new Error('Erreur lors de l’importation globale des sessions');
    return res.json();
  },

  // Configuration de la clé YouTube API
  setYouTubeKey: async (apiKey: string): Promise<{ success: boolean; message: string; hasKey: boolean }> => {
    const res = await fetch(`${API_BASE}/config/youtube-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    if (!res.ok) throw new Error('Erreur de configuration YouTube API');
    return res.json();
  },

  // Récupération de flux par compte / créateur
  getUserFeed: async (platform: Platform, username: string, refresh = false): Promise<FeedResponse> => {
    const res = await fetch(`${API_BASE}/feed/${platform}/user?id=${encodeURIComponent(username)}&refresh=${refresh}`);
    if (!res.ok) throw new Error(`Erreur lors du chargement des posts de ${username}`);
    return res.json();
  },

  // Recherche ou Hashtag
  getSearchFeed: async (platform: Platform, query: string, refresh = false): Promise<FeedResponse> => {
    const res = await fetch(`${API_BASE}/feed/${platform}/search?q=${encodeURIComponent(query)}&refresh=${refresh}`);
    if (!res.ok) throw new Error(`Erreur lors de la recherche pour ${query}`);
    return res.json();
  },

  // Fil d'actualité principal / tendances (Pour vous, Abonnements récents, Abonnements populaires)
  getHomeFeed: async (platform: Platform, mode: FeedMode = 'for_you', refresh = false): Promise<FeedResponse> => {
    const res = await fetch(`${API_BASE}/feed/${platform}/home?mode=${encodeURIComponent(mode)}&refresh=${refresh}`);
    if (!res.ok) throw new Error(`Erreur lors du chargement du fil`);
    return res.json();
  },

  // Shorts / Reels / TikToks
  getShortsFeed: async (platform: Platform, query = 'trending', refresh = false): Promise<FeedResponse> => {
    const res = await fetch(`${API_BASE}/feed/${platform}/shorts?q=${encodeURIComponent(query)}&refresh=${refresh}`);
    if (!res.ok) throw new Error(`Erreur lors du chargement des formats courts`);
    return res.json();
  },

  // Listes X / Twitter
  getListFeed: async (platform: Platform, listIdOrUrl: string, refresh = false): Promise<FeedResponse> => {
    const res = await fetch(`${API_BASE}/feed/${platform}/list?id=${encodeURIComponent(listIdOrUrl)}&refresh=${refresh}`);
    if (!res.ok) throw new Error(`Erreur lors du chargement de la liste`);
    return res.json();
  },

  // Informations d'espace disque et de stockage
  getStorageInfo: async (): Promise<{ totalBytes: number; totalMb: string; details: Record<string, string> }> => {
    const res = await fetch(`${API_BASE}/feed/storage-info`);
    if (!res.ok) throw new Error('Impossible de récupérer l’espace de stockage');
    return res.json();
  },

  // Purge complète du cache mémoire et disque
  clearCache: async (): Promise<{ success: boolean; freedMb?: string; message: string }> => {
    const res = await fetch(`${API_BASE}/feed/clear-cache`, { method: 'POST' });
    if (!res.ok) throw new Error('Erreur lors de la purge du cache');
    return res.json();
  },
};
