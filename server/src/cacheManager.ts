import { SocialPost } from './types';

interface CacheEntry {
  data: SocialPost[];
  timestamp: number;
  source: 'live' | 'cache' | 'demo';
  nextCursor?: string;
}

export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private lastFetchTime: Map<string, number> = new Map();
  private readonly defaultTtlMs: number;
  private readonly minCooldownMs: number;

  private readonly maxEntries: number;

  constructor(defaultTtlSeconds: number = 240, minCooldownSeconds: number = 30, maxEntries: number = 500) {
    this.defaultTtlMs = defaultTtlSeconds * 1000;
    this.minCooldownMs = minCooldownSeconds * 1000;
    this.maxEntries = maxEntries;
  }

  public get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.defaultTtlMs) {
      return null;
    }

    // Invalide le cache si les auteurs sont marqués comme Anonyme ou unknown
    const hasCorruptAuthors = entry.data.some((p) => p.author.name === 'Anonyme' || p.author.username === 'unknown');
    if (hasCorruptAuthors) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  public getStaleOrNull(key: string): CacheEntry | null {
    return this.cache.get(key) || null;
  }

  public set(key: string, data: SocialPost[], source: 'live' | 'cache' | 'demo' = 'live', nextCursor?: string): void {
    // Réinsertion en fin de Map : l'ordre d'insertion sert d'ordre d'ancienneté pour l'éviction
    this.cache.delete(key);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      source,
      nextCursor,
    });
    this.lastFetchTime.set(key, Date.now());

    // Éviction des entrées les plus anciennes au-delà de la limite (évite une croissance mémoire illimitée)
    while (this.cache.size > this.maxEntries) {
      const oldestKey = this.cache.keys().next().value as string;
      this.cache.delete(oldestKey);
      this.lastFetchTime.delete(oldestKey);
    }
  }

  public canFetch(key: string): { allowed: boolean; waitSeconds: number } {
    const last = this.lastFetchTime.get(key);
    if (!last) return { allowed: true, waitSeconds: 0 };

    const elapsed = Date.now() - last;
    if (elapsed < this.minCooldownMs) {
      const waitSeconds = Math.ceil((this.minCooldownMs - elapsed) / 1000);
      return { allowed: false, waitSeconds };
    }
    return { allowed: true, waitSeconds: 0 };
  }

  public clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
      this.lastFetchTime.delete(key);
    } else {
      this.cache.clear();
      this.lastFetchTime.clear();
    }
  }
}

export const cacheManager = new CacheManager();
