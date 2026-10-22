import { playwrightManager } from '../playwrightManager';
import { cacheManager } from '../cacheManager';
import { SocialPost, FeedResponse, SocialAuthor } from '../types';

// Endpoints renvoyant le contenu réel de chaque page ; les autres "item_list" (stories, reposts,
// explore/prefetch, recommandations latérales) ne correspondent pas au flux demandé
const TIKTOK_ENDPOINTS = {
  user: ['/api/post/item_list/'],
  for_you: ['/api/recommend/item_list/', '/api/preload/item_list/'],
  following: ['/api/following/item_list/'],
  search: ['/api/search/general/full/', '/api/search/item/full/', '/api/challenge/item_list/'],
};

const matchesEndpoint = (url: string, endpoints: string[]) => endpoints.some((e) => url.includes(e));

export class TikTokService {
  /**
   * Convertit un objet vidéo TikTok (API JSON) en SocialPost standard
   */
  private parseTikTokItem(rawItem: any): SocialPost | null {
    if (!rawItem) return null;
    const item = rawItem.item || rawItem;
    if (!item.id && !item.video?.id) return null;

    const id = String(item.id || item.video?.id);
    const authorObj = item.author || {};
    const username = authorObj.uniqueId || authorObj.nickname || 'tiktok_user';
    const name = authorObj.nickname || username;
    const avatarUrl = authorObj.avatarThumb || authorObj.avatarMedium || authorObj.avatarLarger ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00f2fe&color=000&bold=true`;

    const desc = item.desc || item.title || `Vidéo de @${username}`;
    const stats = item.stats || item.statistics || {};
    const videoObj = item.video || {};

    const thumb = videoObj.cover || videoObj.originCover || videoObj.dynamicCover || '';
    const videoUrl = `https://www.tiktok.com/@${username}/video/${id}`;
    const createdAt = item.createTime ? new Date(parseInt(item.createTime, 10) * 1000).toISOString() : new Date().toISOString();

    const author: SocialAuthor = {
      id: String(authorObj.id || username),
      name,
      username,
      avatarUrl,
      verified: !!authorObj.verified,
      profileUrl: `https://www.tiktok.com/@${username}`,
    };

    return {
      id,
      platform: 'tiktok',
      type: 'tiktok',
      author,
      title: desc.length > 60 ? desc.substring(0, 60) + '...' : desc,
      text: desc,
      createdAt,
      stats: {
        views: parseInt(stats.playCount || '0', 10),
        likes: parseInt(stats.diggCount || '0', 10),
        comments: parseInt(stats.commentCount || '0', 10),
        sharesOrRetweets: parseInt(stats.shareCount || '0', 10),
      },
      media: [
        {
          type: 'video',
          url: videoUrl,
          previewUrl: thumb,
          aspectRatio: '9:16',
        },
      ],
      postUrl: videoUrl,
    };
  }

  /**
   * Récupère les vidéos réelles d'un créateur TikTok via Playwright
   */
  public async getUserVideos(username: string, forceRefresh = false): Promise<FeedResponse> {
    const cleanUser = username.replace('@', '').trim();
    if (!cleanUser) {
      return { platform: 'tiktok', posts: [], source: 'live', message: 'Nom d’utilisateur TikTok manquant.' };
    }

    const cacheKey = `tiktok:user:${cleanUser.toLowerCase()}`;
    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return { platform: 'tiktok', posts: cached.data, source: 'cache', cachedAt: new Date(cached.timestamp).toISOString() };
      }
    }

    try {
      const posts = await playwrightManager.executeWithLock('tiktok', async (ctx) => {
        const page = await ctx.newPage();
        const captured: SocialPost[] = [];

        page.on('response', async (res) => {
          try {
            const url = res.url();
            if (matchesEndpoint(url, TIKTOK_ENDPOINTS.user)) {
              const ct = res.headers()['content-type'] || '';
              if (ct.includes('application/json')) {
                const json = await res.json();
                const list = json.itemList || json.data || [];
                for (const it of list) {
                  const p = this.parseTikTokItem(it);
                  if (p) captured.push(p);
                }
              }
            }
          } catch (e) {}
        });

        try {
          await page.goto(`https://www.tiktok.com/@${cleanUser}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await page.waitForTimeout(3500);

          if (captured.length === 0) {
            const domScraped = await this.scrapeVideosFromDOM(page, cleanUser);
            captured.push(...domScraped);
          }
        } finally {
          await page.close();
        }

        const unique = new Map<string, SocialPost>();
        for (const p of captured) {
          if (!unique.has(p.id)) unique.set(p.id, p);
        }
        const all = Array.from(unique.values());
        const ownVideos = all.filter((p) => p.author.username.toLowerCase() === cleanUser.toLowerCase());
        return ownVideos.length > 0 ? ownVideos : all;
      });

      if (posts.length > 0) {
        cacheManager.set(cacheKey, posts, 'live');
        return { platform: 'tiktok', posts, source: 'live' };
      }
    } catch (err: any) {
      console.warn('[TikTokService] Erreur créateur :', err.message);
    }

    return {
      platform: 'tiktok',
      posts: [],
      source: 'live',
      message: `Aucune vidéo trouvée pour @${cleanUser} ou compte privé.`,
    };
  }

  /**
   * Recherche par hashtag ou mot-clé sur TikTok via Playwright (utilise la session active)
   */
  public async searchHashtag(query: string, forceRefresh = false): Promise<FeedResponse> {
    const cleanTag = query.trim() || 'trending';
    const cacheKey = `tiktok:search:${cleanTag.toLowerCase()}`;

    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return { platform: 'tiktok', posts: cached.data, source: 'cache', cachedAt: new Date(cached.timestamp).toISOString() };
      }
    }

    try {
      const posts = await playwrightManager.executeWithLock('tiktok', async (ctx) => {
        const page = await ctx.newPage();
        const captured: SocialPost[] = [];

        page.on('response', async (res) => {
          try {
            const url = res.url();
            if (matchesEndpoint(url, TIKTOK_ENDPOINTS.search)) {
              const ct = res.headers()['content-type'] || '';
              if (ct.includes('application/json')) {
                const json = await res.json();
                const list = json.data || json.itemList || [];
                for (const it of list) {
                  const p = this.parseTikTokItem(it);
                  if (p) captured.push(p);
                }
              }
            }
          } catch (e) {}
        });

        try {
          const targetUrl = cleanTag.startsWith('#')
            ? `https://www.tiktok.com/tag/${encodeURIComponent(cleanTag.replace('#', ''))}`
            : `https://www.tiktok.com/search?q=${encodeURIComponent(cleanTag)}`;

          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await page.waitForTimeout(4000);

          if (captured.length === 0) {
            const domScraped = await this.scrapeVideosFromDOM(page);
            captured.push(...domScraped);
          }
        } finally {
          await page.close();
        }

        // Déduplication par identifiant
        const unique = new Map<string, SocialPost>();
        for (const p of captured) {
          if (!unique.has(p.id)) unique.set(p.id, p);
        }
        return Array.from(unique.values());
      });

      if (posts.length > 0) {
        cacheManager.set(cacheKey, posts, 'live');
        return { platform: 'tiktok', posts, source: 'live' };
      }
    } catch (err: any) {
      console.warn('[TikTokService] Erreur recherche :', err.message);
    }

    return {
      platform: 'tiktok',
      posts: [],
      source: 'live',
      message: `Aucune vidéo TikTok trouvée pour "${cleanTag}".`,
    };
  }

  /**
   * Fil d'actualité TikTok ("Pour toi" ou "Abonnements")
   */
  public async getHomeFeed(mode: 'for_you' | 'following' = 'for_you', forceRefresh = false): Promise<FeedResponse> {
    const cacheKey = `tiktok:feed:${mode}`;

    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return { platform: 'tiktok', posts: cached.data, source: 'cache', cachedAt: new Date(cached.timestamp).toISOString() };
      }
    }

    try {
      const posts = await playwrightManager.executeWithLock('tiktok', async (ctx) => {
        const page = await ctx.newPage();
        const captured: SocialPost[] = [];

        page.on('response', async (res) => {
          try {
            const url = res.url();
            if (matchesEndpoint(url, mode === 'following' ? TIKTOK_ENDPOINTS.following : TIKTOK_ENDPOINTS.for_you)) {
              const ct = res.headers()['content-type'] || '';
              if (ct.includes('application/json')) {
                const json = await res.json();
                const list = json.itemList || json.data || [];
                for (const it of list) {
                  const p = this.parseTikTokItem(it);
                  if (p) captured.push(p);
                }
              }
            }
          } catch (e) {}
        });

        try {
          const targetUrl = mode === 'following' ? 'https://www.tiktok.com/following' : 'https://www.tiktok.com/foryou';
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await page.waitForTimeout(4000);

          if (captured.length === 0) {
            const domScraped = await this.scrapeVideosFromDOM(page);
            captured.push(...domScraped);
          }
        } finally {
          await page.close();
        }

        const unique = new Map<string, SocialPost>();
        for (const p of captured) {
          if (!unique.has(p.id)) unique.set(p.id, p);
        }
        return Array.from(unique.values());
      });

      if (posts.length > 0) {
        cacheManager.set(cacheKey, posts, 'live');
        return { platform: 'tiktok', posts, source: 'live' };
      }
    } catch (err: any) {
      console.warn('[TikTokService] Erreur fil d’accueil :', err.message);
    }

    return this.searchHashtag('trending', forceRefresh);
  }

  /**
   * Extraction de secours directement depuis le DOM de TikTok
   */
  private async scrapeVideosFromDOM(page: any, defaultAuthor = ''): Promise<SocialPost[]> {
    try {
      const scraped = await page.evaluate((authorFallback: string) => {
        const results: any[] = [];
        const seenUrls = new Set<string>();

        const videoLinks = Array.from(document.querySelectorAll('a[href*="/video/"]'));
        videoLinks.forEach((linkEl: any, idx: number) => {
          const href = linkEl.href;
          if (!href || seenUrls.has(href)) return;
          seenUrls.add(href);

          const container = linkEl.closest('div[class*="ItemContainer"]') || linkEl.closest('div[data-e2e*="item"]') || linkEl.parentElement;
          const imgEl = container ? container.querySelector('img') : linkEl.querySelector('img');
          const thumb = imgEl ? (imgEl.src || imgEl.getAttribute('data-src') || '') : '';

          let username = authorFallback;
          if (!username && href.includes('/@')) {
            const match = href.match(/@([^/]+)/);
            if (match) username = match[1];
          }
          if (!username) username = 'tiktok_creator';

          const viewsEl = container ? (container.querySelector('strong') || container.querySelector('[data-e2e="video-views"]')) : null;
          const views = viewsEl ? (viewsEl.textContent || '0') : '0';

          const descEl = container ? container.querySelector('[data-e2e*="desc"]') : null;
          const desc = descEl ? (descEl.textContent || '') : `Vidéo de @${username}`;

          const idMatch = href.match(/\/video\/(\d+)/);
          const id = idMatch ? idMatch[1] : `tt-${Date.now()}-${idx}`;

          results.push({
            id,
            url: href,
            thumbnail: thumb,
            username,
            desc,
            views,
          });
        });

        return results;
      }, defaultAuthor);

      return scraped.map((s: any) => ({
        id: s.id,
        platform: 'tiktok' as const,
        type: 'tiktok' as const,
        author: {
          id: s.username,
          name: `@${s.username}`,
          username: s.username,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(s.username)}&background=00f2fe&color=000&bold=true`,
          verified: false,
          profileUrl: `https://www.tiktok.com/@${s.username}`,
        },
        title: s.desc.length > 60 ? s.desc.substring(0, 60) + '...' : s.desc,
        text: s.desc,
        createdAt: new Date().toISOString(),
        stats: {
          views: parseInt(s.views.replace(/\D/g, ''), 10) || 0,
          likes: 0,
          comments: 0,
        },
        media: [
          {
            type: 'video' as const,
            url: s.url,
            previewUrl: s.thumbnail,
            aspectRatio: '9:16' as const,
          },
        ],
        postUrl: s.url,
      }));
    } catch {
      return [];
    }
  }
}

export const tiktokService = new TikTokService();
