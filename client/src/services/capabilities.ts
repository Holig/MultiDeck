import { Platform } from '../types';

// Actions réellement exécutées par le serveur (/api/feed/action) ou par la fenêtre officielle du réseau.
// Sur les autres réseaux, les compteurs restent affichés mais ne sont pas cliquables.
export const canLike = (platform: Platform) => platform === 'reddit' || platform === 'twitter';
export const canRepost = (platform: Platform) => platform === 'twitter';
export const canReply = (platform: Platform) => platform === 'reddit' || platform === 'twitter';

// Vue conversation disponible côté serveur (/api/feed/:platform/thread)
export const canOpenThread = (platform: Platform) =>
  platform === 'twitter' || platform === 'bluesky' || platform === 'threads' || platform === 'reddit';
