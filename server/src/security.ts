import { Request, Response, NextFunction } from 'express';
import { CorsOptions } from 'cors';
import { Platform, BrowserEngine } from './types';

// Listes blanches partagées par les routes (toute valeur hors liste est refusée)
export const PLATFORMS: Platform[] = ['twitter', 'youtube', 'tiktok', 'instagram', 'bluesky', 'threads', 'reddit'];
export const ENGINES: BrowserEngine[] = ['chromium', 'firefox', 'webkit'];

export function isPlatform(value: unknown): value is Platform {
  return typeof value === 'string' && (PLATFORMS as string[]).includes(value);
}

export function isEngine(value: unknown): value is BrowserEngine {
  return typeof value === 'string' && (ENGINES as string[]).includes(value);
}

/**
 * Accès distant (Tailscale, LAN...) : désactivé par défaut, seul le poste local peut joindre l'API.
 * MULTIDECK_ALLOW_REMOTE=true      -> accepte les connexions venant d'autres machines
 * MULTIDECK_ALLOWED_HOSTS=a,b      -> noms d'hôte supplémentaires autorisés (ex : monpc.tailnet.ts.net, deck.mondomaine.fr)
 * MULTIDECK_ALLOWED_HOSTS=*        -> désactive le contrôle des en-têtes Host / Origin (déconseillé)
 */
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]'];

function readEnvList(name: string): string[] {
  return (process.env[name] || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

const allowRemote = (process.env.MULTIDECK_ALLOW_REMOTE || '').toLowerCase() === 'true';
const extraHosts = readEnvList('MULTIDECK_ALLOWED_HOSTS');
const allowAnyHost = extraHosts.includes('*');
const allowedHosts = new Set([...LOCAL_HOSTS, ...extraHosts]);

function isLoopbackAddress(address?: string): boolean {
  if (!address) return false;
  return address === '::1' || address.startsWith('127.') || address.startsWith('::ffff:127.');
}

// "localhost:3001" -> "localhost", "[::1]:3001" -> "[::1]"
function hostnameFromHostHeader(host: string): string {
  const h = host.trim().toLowerCase();
  if (h.startsWith('[')) return h.slice(0, h.indexOf(']') + 1);
  return h.split(':')[0];
}

function isAllowedHostname(hostname: string): boolean {
  return allowAnyHost || allowedHosts.has(hostname.toLowerCase());
}

export function isAllowedOrigin(origin: string): boolean {
  if (allowAnyHost) return true;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return isAllowedHostname(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Bloque :
 *  - les connexions d'autres machines du réseau (sauf MULTIDECK_ALLOW_REMOTE=true)
 *  - le DNS rebinding (en-tête Host inconnu)
 *  - les requêtes inter-sites (CSRF) envoyées par un site tiers ouvert dans le navigateur (en-tête Origin inconnu)
 */
export function requestGuard(req: Request, res: Response, next: NextFunction) {
  if (!allowRemote && !isLoopbackAddress(req.socket.remoteAddress)) {
    return res.status(403).json({ error: 'Accès distant désactivé (définissez MULTIDECK_ALLOW_REMOTE=true dans server/.env).' });
  }

  const host = req.headers.host;
  if (!host || !isAllowedHostname(hostnameFromHostHeader(host))) {
    return res.status(403).json({ error: 'Hôte non autorisé (ajoutez-le à MULTIDECK_ALLOWED_HOSTS dans server/.env).' });
  }

  const origin = req.headers.origin;
  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'Origine non autorisée.' });
  }

  return next();
}

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => callback(null, !origin || isAllowedOrigin(origin)),
  credentials: true,
};

// Échappement HTML pour toute valeur insérée dans une page générée côté serveur
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
