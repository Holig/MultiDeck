import { Page } from 'playwright';
import { playwrightManager } from '../playwrightManager';
import { cacheManager } from '../cacheManager';
import { SocialPost, FeedResponse, SocialAuthor, SocialMedia, ThreadResponse } from '../types';

export class ThreadsService {
  private threadCache = new Map<string, { data: ThreadResponse; timestamp: number }>();
  private sessionImportAttempted = false;

  /**
   * S'assure que les cookies Threads sont importés depuis le navigateur local
   */
  private async ensureSession(): Promise<void> {
    if (this.sessionImportAttempted) return;
    this.sessionImportAttempted = true;
    try {
      const auth = await playwrightManager.checkSession('threads');
      if (!auth.isAuthenticated) {
        await playwrightManager.autoImportCookies('threads');
      }
    } catch (e) {}
  }

  /**
   * Tente de fermer ou d'accepter la boîte modale de cookies de Meta
   */
  private async dismissCookieConsent(page: Page): Promise<void> {
    try {
      const cookieSelectors = [
        'div[role="dialog"] button:has-text("Autoriser")',
        'button:has-text("Autoriser tous les cookies")',
        'button:has-text("Autoriser les cookies")',
        'div[role="button"]:has-text("Autoriser tous les cookies")',
        'div[role="button"]:has-text("Autoriser")',
        'button:has-text("Allow all cookies")',
        'button:has-text("Allow essential and optional cookies")',
        'div[role="button"]:has-text("Allow")',
      ];

      for (const sel of cookieSelectors) {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click().catch(() => {});
          await page.waitForTimeout(1500);
          break;
        }
      }
    } catch (e) {}
  }

  /**
   * Extrait les vrais posts Threads depuis les éléments DOM de la page
   */
  private async extractPostsFromPage(page: Page, defaultAuthor?: string): Promise<SocialPost[]> {
    try {
      // 1. Fermer le consentement aux cookies s'il est affiché
      await this.dismissCookieConsent(page);

      const rawItems = await page.evaluate((fallbackUser) => {
        const results: any[] = [];
        const containers = Array.from(document.querySelectorAll('div[data-pressable-container="true"]'));

        containers.forEach((container, idx) => {
          try {
            const el = container as HTMLElement;
            const fullText = (el.innerText || '').trim();

            // Filtrage anti-bannières RGPD / Cookies
            const lowerText = fullText.toLowerCase();
            if (
              lowerText.includes('how we use these cookies') ||
              lowerText.includes('if you allow these cookies') ||
              lowerText.includes('controls in your instagram account') ||
              lowerText.includes('more information about online advertising') ||
              lowerText.includes('controlling cookies with browser settings') ||
              lowerText.includes('politique d’utilisation des cookies') ||
              lowerText.includes('autoriser l’utilisation des cookies')
            ) {
              return; // Ignorer immédiatement ce bloc de dialogue
            }

            // 1. Recherche du lien permanent du post
            const links = Array.from(container.querySelectorAll('a'));
            let postUrl = '';
            let authorHandle = fallbackUser || '';
            let authorName = '';

            for (const a of links) {
              const href = a.getAttribute('href') || '';
              if (href.includes('/post/')) {
                postUrl = href.startsWith('http') ? href : `https://www.threads.net${href}`;
              } else if (href.startsWith('/@') && !authorHandle) {
                authorHandle = href.replace('/@', '').split('/')[0].split('?')[0];
              }
            }

            // CRUCIAL : Un vrai post Threads DOIT avoir un lien vers sa publication (/post/)
            if (!postUrl || !postUrl.includes('/post/')) {
              return; // Ce n'est pas un post (c'est un bouton d'en-tête, accordéon ou menu)
            }

            // Extraction du username depuis l'URL si manquant
            if (!authorHandle || authorHandle === 'threads_user') {
              const match = postUrl.match(/@([a-zA-Z0-9_.]+)\/post\//);
              if (match) authorHandle = match[1];
            }

            if (!authorHandle) authorHandle = 'threads_user';
            authorName = authorHandle;

            // 2. Avatar de l'auteur & Médias du post
            const imgs = Array.from(container.querySelectorAll('img'));
            let avatarUrl = '';
            const postMediaUrls: string[] = [];

            imgs.forEach((img) => {
              const src = img.src || '';
              if (!src) return;
              // Si image de profil
              if (src.includes('profile_pic') || (src.includes('scontent') && (img.width < 50 || img.height < 50))) {
                if (!avatarUrl) avatarUrl = src;
              } else if (src.includes('scontent') || src.includes('cdninstagram')) {
                postMediaUrls.push(src);
              }
            });

            // 3. Texte du post
            const lines = fullText.split('\n').map((l: string) => l.trim()).filter(Boolean);
            let text = '';
            let relativeDate = '';
            const statNumbers: number[] = [];

            if (lines.length > 0) {
              let startIdx = 1;
              if (lines[0].toLowerCase() === authorHandle.toLowerCase() || lines[0].includes('@')) {
                startIdx = 1;
              }

              // Détecter si la ligne suivante est un timestamp (ex: "15h", "2j", "3m", "hier", "12/25/25")
              if (lines[startIdx] && /^\d+[smhjdwy]$|^\d{1,2}\/\d{1,2}\/\d{2,4}$/i.test(lines[startIdx])) {
                relativeDate = lines[startIdx];
                startIdx++;
              }

              const textLines: string[] = [];
              for (let i = startIdx; i < lines.length; i++) {
                const line = lines[i];
                const numMatch = line.match(/^(\d+(?:[.,]\d+)?\s*[kKmM]?)$/);
                if (numMatch && i >= lines.length - 4) {
                  const rawNum = line.toUpperCase().replace(/\s/g, '');
                  let val = parseFloat(rawNum.replace(',', '.'));
                  if (rawNum.includes('K')) val *= 1000;
                  if (rawNum.includes('M')) val *= 1000000;
                  statNumbers.push(Math.round(val));
                } else if (!['Aimer', 'Répondre', 'Republier', 'Partager', 'Like', 'Reply', 'Repost', 'Share'].includes(line)) {
                  textLines.push(line);
                }
              }
              text = textLines.join('\n');
            }

            // 4. Vidéos éventuelles
            const videos = Array.from(container.querySelectorAll('video')).map((v) => v.src).filter(Boolean);

            // 5. Post ID
            const postId = postUrl.split('/post/')[1]?.split('?')[0]?.replace(/\//g, '') || `th-${Date.now()}-${idx}`;

            const hasRepost = fullText.includes('a republié') || fullText.includes('reposted');

            results.push({
              id: postId,
              authorHandle,
              authorName,
              avatarUrl,
              postUrl,
              text: text || fullText,
              relativeDate,
              mediaUrls: postMediaUrls,
              videoUrls: videos,
              statNumbers,
              hasRepost,
            });
          } catch (e) {}
        });

        return results;
      }, defaultAuthor || '');

      return rawItems.map((item) => {
        const mediaList: SocialMedia[] = [];

        for (const url of item.mediaUrls) {
          mediaList.push({
            type: 'image',
            url,
            previewUrl: url,
            aspectRatio: '1:1',
          });
        }

        for (const vUrl of item.videoUrls) {
          mediaList.push({
            type: 'video',
            url: vUrl,
            previewUrl: item.mediaUrls[0] || vUrl,
            aspectRatio: '9:16',
          });
        }

        const author: SocialAuthor = {
          id: item.authorHandle,
          name: item.authorName || `@${item.authorHandle}`,
          username: item.authorHandle,
          avatarUrl: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.authorHandle)}&background=000&color=fff&bold=true`,
          profileUrl: `https://www.threads.net/@${item.authorHandle}`,
        };

        const likes = item.statNumbers[0] || 0;
        const comments = item.statNumbers[1] || 0;
        const reposts = item.statNumbers[2] || 0;

        return {
          id: item.id,
          platform: 'threads',
          type: 'post',
          author,
          text: item.text,
          createdAt: new Date().toISOString(),
          stats: {
            likes,
            comments,
            sharesOrRetweets: reposts,
          },
          media: mediaList.length > 0 ? mediaList : undefined,
          postUrl: item.postUrl,
          retweetedBy: item.hasRepost ? { name: item.authorName } : undefined,
        };
      });
    } catch (err: any) {
      console.error('[ThreadsService] Erreur extractPostsFromPage :', err.message);
      return [];
    }
  }

  /**
   * Récupère les publications d'un profil Threads (@username)
   */
  public async getUserFeed(username: string, forceRefresh = false): Promise<FeedResponse> {
    await this.ensureSession();
    const cleanUser = username.replace('@', '').trim();
    if (!cleanUser) {
      return { platform: 'threads', posts: [], source: 'live', message: 'Nom d’utilisateur Threads manquant.' };
    }

    const cacheKey = `threads:user:${cleanUser.toLowerCase()}`;
    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) return { platform: 'threads', posts: cached.data, source: 'cache', cachedAt: new Date(cached.timestamp).toISOString() };
    }

    try {
      const posts = await playwrightManager.executeWithLock('threads', async (ctx) => {
        const page = await ctx.newPage();
        try {
          const targetUrl = `https://www.threads.net/@${cleanUser}`;
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await page.waitForTimeout(3000);

          return await this.extractPostsFromPage(page, cleanUser);
        } finally {
          await page.close();
        }
      });

      if (posts.length > 0) {
        cacheManager.set(cacheKey, posts, 'live');
        return { platform: 'threads', posts, source: 'live' };
      }

      return {
        platform: 'threads',
        posts: [],
        source: 'live',
        message: `Aucune publication trouvée pour le compte Threads @${cleanUser}.`,
      };
    } catch (err: any) {
      console.error(`[ThreadsService] Erreur getUserFeed (${cleanUser}) :`, err.message);
      return {
        platform: 'threads',
        posts: [],
        source: 'live',
        message: `Impossible de charger le profil Threads @${cleanUser} : ${err.message}`,
      };
    }
  }

  /**
   * Recherche de publications par mots-clés ou sujets sur Threads
   */
  public async searchFeed(query: string, forceRefresh = false): Promise<FeedResponse> {
    await this.ensureSession();
    const cleanQuery = query.trim() || 'trending';
    const cacheKey = `threads:search:${cleanQuery.toLowerCase()}`;

    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) return { platform: 'threads', posts: cached.data, source: 'cache', cachedAt: new Date(cached.timestamp).toISOString() };
    }

    try {
      const posts = await playwrightManager.executeWithLock('threads', async (ctx) => {
        const page = await ctx.newPage();
        try {
          const targetUrl = `https://www.threads.net/search?q=${encodeURIComponent(cleanQuery)}`;
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await page.waitForTimeout(3000);

          return await this.extractPostsFromPage(page);
        } finally {
          await page.close();
        }
      });

      if (posts.length > 0) {
        cacheManager.set(cacheKey, posts, 'live');
        return { platform: 'threads', posts, source: 'live' };
      }

      return {
        platform: 'threads',
        posts: [],
        source: 'live',
        message: `Aucun post trouvé sur Threads pour la recherche "${cleanQuery}".`,
      };
    } catch (err: any) {
      console.error(`[ThreadsService] Erreur searchFeed (${cleanQuery}) :`, err.message);
      return {
        platform: 'threads',
        posts: [],
        source: 'live',
        message: `Erreur lors de la recherche Threads "${cleanQuery}" : ${err.message}`,
      };
    }
  }

  /**
   * Fil d'actualité général / Abonnements Threads
   */
  public async getHomeFeed(mode = 'for_you', forceRefresh = false): Promise<FeedResponse> {
    await this.ensureSession();
    const cacheKey = `threads:home:${mode}`;

    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) return { platform: 'threads', posts: cached.data, source: 'cache', cachedAt: new Date(cached.timestamp).toISOString() };
    }

    try {
      const posts = await playwrightManager.executeWithLock('threads', async (ctx) => {
        const page = await ctx.newPage();
        try {
          const targetUrl = 'https://www.threads.net/';
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await page.waitForTimeout(3000);

          // Si l'utilisateur demande "Mes Abonnements", tenter de basculer sur l'onglet Suivi(e)s
          if (mode === 'following_latest' || mode === 'following') {
            try {
              const followingTab = await page.$(
                'div[role="tab"]:has-text("Suivi"), div[role="tab"]:has-text("Following"), a[href*="following"], button:has-text("Suivi"), button:has-text("Following")'
              );
              if (followingTab) {
                await followingTab.click().catch(() => {});
                await page.waitForTimeout(2500);
              }
            } catch (e) {}
          }

          const extracted = await this.extractPostsFromPage(page);
          if (extracted.length > 0) return extracted;

          // Si la page d'accueil est vide (ex: non connecté ou bloqué), repli sur la recherche d'actualité
          await page.goto('https://www.threads.net/search?q=France', { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(3000);
          return await this.extractPostsFromPage(page);
        } finally {
          await page.close();
        }
      });

      if (posts.length > 0) {
        cacheManager.set(cacheKey, posts, 'live');
        return { platform: 'threads', posts, source: 'live' };
      }

      return {
        platform: 'threads',
        posts: [],
        source: 'live',
        message: 'Impossible de charger le fil Threads. Connectez votre compte Threads via la barre latérale.',
      };
    } catch (err: any) {
      console.error('[ThreadsService] Erreur getHomeFeed :', err.message);
      return {
        platform: 'threads',
        posts: [],
        source: 'live',
        message: `Erreur lors du chargement du fil Threads : ${err.message}`,
      };
    }
  }

  /**
   * Récupère la conversation complète d'une publication Threads (Thread Viewer)
   */
  public async getPostThread(target: string, forceRefresh = false): Promise<ThreadResponse> {
    await this.ensureSession();
    let cleanTarget = target.trim();
    if (!cleanTarget.startsWith('http')) {
      if (cleanTarget.includes('/post/')) {
        cleanTarget = `https://www.threads.net${cleanTarget.startsWith('/') ? '' : '/'}${cleanTarget}`;
      } else {
        cleanTarget = `https://www.threads.net/post/${cleanTarget}`;
      }
    }

    const cacheKey = `threads:thread:${cleanTarget}`;
    if (!forceRefresh) {
      const cached = this.threadCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 60000) {
        return { ...cached.data, source: 'cache' };
      }
    }

    try {
      const rawPosts = await playwrightManager.executeWithLock('threads', async (ctx) => {
        const page = await ctx.newPage();
        try {
          await page.goto(cleanTarget, { waitUntil: 'domcontentloaded', timeout: 25000 });
          // Détection réactive dès que les conteneurs de posts Threads sont présents dans le DOM
          await page.waitForSelector('div[data-pressable-container="true"]', { timeout: 6000 }).catch(() => {});
          await page.waitForTimeout(400);

          return await this.extractPostsFromPage(page);
        } finally {
          await page.close();
        }
      });

      if (rawPosts.length === 0) {
        throw new Error('Publication introuvable ou supprimée sur Threads.');
      }

      const focusedPost = rawPosts[0];
      const replies = rawPosts.slice(1);

      const result: ThreadResponse = {
        platform: 'threads',
        focusedPost,
        ancestors: [],
        replies,
        source: 'live',
      };

      this.threadCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (err: any) {
      console.error(`[ThreadsService] Erreur getPostThread (${cleanTarget}) :`, err.message);
      throw new Error(`Impossible de charger la conversation Threads : ${err.message}`);
    }
  }
}

export const threadsService = new ThreadsService();
