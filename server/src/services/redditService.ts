import { playwrightManager } from '../playwrightManager';
import { cacheManager } from '../cacheManager';
import { SocialPost, FeedResponse, SocialAuthor, SocialMedia, ThreadResponse, QuotedPost } from '../types';

export class RedditService {
  private threadCache = new Map<string, { data: ThreadResponse; timestamp: number }>();
  private sessionImportAttempted = false;

  /**
   * S'assure que les cookies Reddit sont importés depuis le navigateur local
   */
  private async ensureSession(): Promise<void> {
    if (this.sessionImportAttempted) return;
    this.sessionImportAttempted = true;
    try {
      const auth = await playwrightManager.checkSession('reddit');
      if (!auth.isAuthenticated) {
        await playwrightManager.autoImportCookies('reddit');
      }
    } catch (e) {}
  }

  /**
   * Construit l'en-tête Cookie depuis les cookies sauvegardés sur disque
   */
  private getCookieHeader(): string {
    const cookies = playwrightManager.loadSavedCookies('reddit');
    if (!cookies || cookies.length === 0) return '';
    return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  }

  /**
   * Exécute une requête HTTP avec les cookies et le User-Agent Firefox
   */
  private async fetchRedditJson(url: string): Promise<any> {
    await this.ensureSession();
    const cookieHeader = this.getCookieHeader();

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Reddit API a répondu avec le statut ${response.status} (${response.statusText})`);
    }

    return await response.json();
  }

  /**
   * Nettoie les URLs d'images encodées par Reddit (&amp; -> &)
   */
  private cleanRedditUrl(url?: string): string {
    if (!url) return '';
    return url.replace(/&amp;/g, '&');
  }

  /**
   * Convertit un post Reddit JSON brut en SocialPost standardisé MultiDeck
   */
  private formatRedditPost(item: any): SocialPost | null {
    if (!item || !item.data) return null;
    const data = item.data;

    // Ignorer les annonces sponsorisées
    if (data.promoted || data.is_promoted) return null;

    const subreddit = data.subreddit || 'reddit';
    const authorName = data.author || '[supprimé]';
    const title = data.title || '';
    const selftext = data.selftext || '';
    const fullText = title ? (selftext ? `${title}\n\n${selftext}` : title) : selftext;

    // Auteur / Subreddit
    const author: SocialAuthor = {
      id: authorName,
      name: `r/${subreddit}`,
      username: `u/${authorName}`,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(subreddit)}&background=ff4500&color=fff&bold=true`,
      profileUrl: `https://www.reddit.com/r/${subreddit}`,
      verified: Boolean(data.distinguished),
    };

    // Médias
    const mediaList: SocialMedia[] = [];

    // 1. Vidéo Reddit native
    if (data.is_video && data.media?.reddit_video?.fallback_url) {
      const videoUrl = this.cleanRedditUrl(data.media.reddit_video.fallback_url);
      const thumb = this.cleanRedditUrl(data.preview?.images?.[0]?.source?.url) || this.cleanRedditUrl(data.thumbnail);
      mediaList.push({
        type: 'video',
        url: videoUrl,
        previewUrl: thumb && thumb.startsWith('http') ? thumb : undefined,
        aspectRatio: '16:9',
      });
    }
    // 2. Galerie d'images
    else if (data.is_gallery && data.gallery_data?.items && data.media_metadata) {
      for (const it of data.gallery_data.items) {
        const meta = data.media_metadata[it.media_id];
        if (meta?.s?.u) {
          mediaList.push({
            type: 'image',
            url: this.cleanRedditUrl(meta.s.u),
            previewUrl: this.cleanRedditUrl(meta.p?.[0]?.u || meta.s.u),
            aspectRatio: '1:1',
          });
        }
      }
    }
    // 3. Image simple / Preview
    else if (data.url_overridden_by_dest && /\.(jpg|jpeg|png|gif|webp)$/i.test(data.url_overridden_by_dest)) {
      mediaList.push({
        type: data.url_overridden_by_dest.endsWith('.gif') ? 'gif' : 'image',
        url: this.cleanRedditUrl(data.url_overridden_by_dest),
        previewUrl: this.cleanRedditUrl(data.preview?.images?.[0]?.source?.url) || this.cleanRedditUrl(data.url_overridden_by_dest),
        aspectRatio: '1:1',
      });
    } else if (data.preview?.images?.[0]?.source?.url) {
      const srcUrl = this.cleanRedditUrl(data.preview.images[0].source.url);
      if (srcUrl) {
        mediaList.push({
          type: 'image',
          url: srcUrl,
          previewUrl: srcUrl,
          aspectRatio: '16:9',
        });
      }
    }

    // 4. Crosspost (Quote Post)
    let quotedPost: QuotedPost | undefined = undefined;
    if (Array.isArray(data.crosspost_parent_list) && data.crosspost_parent_list.length > 0) {
      const parent = data.crosspost_parent_list[0];
      const parentMedia: SocialMedia[] = [];
      if (parent.url_overridden_by_dest && /\.(jpg|jpeg|png|gif|webp)$/i.test(parent.url_overridden_by_dest)) {
        parentMedia.push({
          type: 'image',
          url: this.cleanRedditUrl(parent.url_overridden_by_dest),
        });
      }

      quotedPost = {
        id: parent.id,
        author: {
          id: parent.author,
          name: `r/${parent.subreddit}`,
          username: `u/${parent.author}`,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(parent.subreddit)}&background=ff4500&color=fff&bold=true`,
        },
        text: parent.title ? `${parent.title}\n\n${parent.selftext || ''}`.trim() : (parent.selftext || ''),
        postUrl: `https://www.reddit.com${parent.permalink}`,
        media: parentMedia.length > 0 ? parentMedia : undefined,
      };
    }

    const permalink = data.permalink?.startsWith('http') ? data.permalink : `https://www.reddit.com${data.permalink}`;

    return {
      id: data.id || data.name,
      platform: 'reddit',
      type: 'post',
      author,
      title: title || undefined,
      text: fullText,
      createdAt: data.created_utc ? new Date(data.created_utc * 1000).toISOString() : new Date().toISOString(),
      stats: {
        likes: data.ups || data.score || 0,
        comments: data.num_comments || 0,
        sharesOrRetweets: data.num_crossposts || 0,
      },
      media: mediaList.length > 0 ? mediaList : undefined,
      postUrl: permalink,
      quotedPost,
      extra: {
        subreddit: data.subreddit,
        authorFlair: data.author_flair_text,
        linkFlair: data.link_flair_text,
        upvoteRatio: data.upvote_ratio,
        domain: data.domain,
      },
    };
  }

  /**
   * Convertit un commentaire Reddit en SocialPost pour le Thread Viewer
   */
  private formatRedditComment(item: any, parentSubreddit: string): SocialPost | null {
    if (!item || !item.data || !item.data.body) return null;
    const data = item.data;

    const authorName = data.author || '[supprimé]';
    const author: SocialAuthor = {
      id: authorName,
      name: `u/${authorName}`,
      username: `u/${authorName}`,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=333&color=fff&bold=true`,
      profileUrl: `https://www.reddit.com/user/${authorName}`,
    };

    return {
      id: data.id || data.name,
      platform: 'reddit',
      type: 'post',
      author,
      text: data.body,
      createdAt: data.created_utc ? new Date(data.created_utc * 1000).toISOString() : new Date().toISOString(),
      stats: {
        likes: data.ups || data.score || 0,
      },
      postUrl: data.permalink ? `https://www.reddit.com${data.permalink}` : '',
      extra: {
        subreddit: parentSubreddit,
        authorFlair: data.author_flair_text,
        depth: data.depth,
      },
      replyTo: data.parent_id
        ? {
            id: data.parent_id,
          }
        : undefined,
    };
  }

  /**
   * Fil d'actualité Reddit : Abonnements / Accueil / Populaire / Subreddit
   */
  public async getHomeFeed(mode = 'for_you', forceRefresh = false, subreddit?: string, cursor?: string): Promise<FeedResponse> {
    await this.ensureSession();
    const cleanSub = (subreddit || '').replace(/^r\//i, '').trim();
    const cacheKey = cleanSub 
      ? `reddit:sub:${cleanSub.toLowerCase()}:${mode}${cursor ? `:${cursor}` : ''}` 
      : `reddit:home:${mode}${cursor ? `:${cursor}` : ''}`;

    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) return { platform: 'reddit', posts: cached.data, nextCursor: cached.nextCursor, source: 'cache', cachedAt: new Date(cached.timestamp).toISOString() };
    }

    try {
      let targetUrl = 'https://www.reddit.com/.json?limit=25';

      if (cleanSub) {
        const sort = mode === 'following_latest' ? 'new' : (mode === 'following_top' ? 'top' : 'hot');
        targetUrl = `https://www.reddit.com/r/${encodeURIComponent(cleanSub)}/${sort}.json?limit=25`;
      } else {
        if (mode === 'following_latest') {
          targetUrl = 'https://www.reddit.com/new.json?limit=25';
        } else if (mode === 'following_top' || mode === 'popular') {
          targetUrl = 'https://www.reddit.com/r/popular.json?limit=25';
        } else if (mode === 'all') {
          targetUrl = 'https://www.reddit.com/r/all.json?limit=25';
        } else {
          // Accueil personnalisé (Abonnements réels de l'utilisateur)
          targetUrl = 'https://www.reddit.com/.json?limit=25';
        }
      }

      if (cursor) {
        targetUrl += `${targetUrl.includes('?') ? '&' : '?'}after=${encodeURIComponent(cursor)}`;
      }

      const json = await this.fetchRedditJson(targetUrl);
      const rawChildren = json?.data?.children || [];
      const nextCursor = json?.data?.after || undefined;
      const posts: SocialPost[] = [];

      for (const item of rawChildren) {
        const post = this.formatRedditPost(item);
        if (post) posts.push(post);
      }

      if (posts.length > 0) {
        cacheManager.set(cacheKey, posts, 'live', nextCursor);
        return { platform: 'reddit', posts, nextCursor, source: 'live' };
      }

      return {
        platform: 'reddit',
        posts: [],
        source: 'live',
        message: cleanSub ? `Aucun post trouvé dans le subreddit r/${cleanSub}.` : 'Aucun post trouvé sur Reddit.',
      };
    } catch (err: any) {
      console.error('[RedditService] Erreur getHomeFeed :', err.message);
      return {
        platform: 'reddit',
        posts: [],
        source: 'live',
        message: `Erreur Reddit : ${err.message}`,
      };
    }
  }

  /**
   * Recherche sur Reddit ou chargement direct de Subreddit
   */
  public async searchFeed(query: string, forceRefresh = false, cursor?: string): Promise<FeedResponse> {
    await this.ensureSession();
    const cleanQuery = query.trim();
    if (!cleanQuery) return this.getHomeFeed('popular', forceRefresh, undefined, cursor);

    // Si la recherche commence par "r/" ou ressemble à un subreddit direct
    if (/^r\/[a-zA-Z0-9_]+$/i.test(cleanQuery)) {
      return this.getHomeFeed('for_you', forceRefresh, cleanQuery, cursor);
    }

    const cacheKey = `reddit:search:${cleanQuery.toLowerCase()}${cursor ? `:${cursor}` : ''}`;
    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) return { platform: 'reddit', posts: cached.data, nextCursor: cached.nextCursor, source: 'cache', cachedAt: new Date(cached.timestamp).toISOString() };
    }

    try {
      let targetUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(cleanQuery)}&sort=relevance&limit=25`;
      if (cursor) {
        targetUrl += `&after=${encodeURIComponent(cursor)}`;
      }
      const json = await this.fetchRedditJson(targetUrl);
      const rawChildren = json?.data?.children || [];
      const nextCursor = json?.data?.after || undefined;
      const posts: SocialPost[] = [];

      for (const item of rawChildren) {
        const post = this.formatRedditPost(item);
        if (post) posts.push(post);
      }

      if (posts.length > 0) {
        cacheManager.set(cacheKey, posts, 'live', nextCursor);
        return { platform: 'reddit', posts, nextCursor, source: 'live' };
      }

      return {
        platform: 'reddit',
        posts: [],
        source: 'live',
        message: `Aucun résultat Reddit trouvé pour "${cleanQuery}".`,
      };
    } catch (err: any) {
      console.error('[RedditService] Erreur searchFeed :', err.message);
      return {
        platform: 'reddit',
        posts: [],
        source: 'live',
        message: `Erreur de recherche Reddit : ${err.message}`,
      };
    }
  }

  /**
   * Publications d'un utilisateur Reddit (u/username)
   */
  public async getUserFeed(username: string, forceRefresh = false, cursor?: string): Promise<FeedResponse> {
    await this.ensureSession();
    const cleanUser = username.replace(/^u\//i, '').trim();
    if (!cleanUser) {
      return { platform: 'reddit', posts: [], source: 'live', message: 'Nom d’utilisateur Reddit manquant.' };
    }

    const cacheKey = `reddit:user:${cleanUser.toLowerCase()}${cursor ? `:${cursor}` : ''}`;
    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) return { platform: 'reddit', posts: cached.data, nextCursor: cached.nextCursor, source: 'cache', cachedAt: new Date(cached.timestamp).toISOString() };
    }

    try {
      let targetUrl = `https://www.reddit.com/user/${encodeURIComponent(cleanUser)}/submitted.json?limit=25`;
      if (cursor) {
        targetUrl += `&after=${encodeURIComponent(cursor)}`;
      }
      const json = await this.fetchRedditJson(targetUrl);
      const rawChildren = json?.data?.children || [];
      const nextCursor = json?.data?.after || undefined;
      const posts: SocialPost[] = [];

      for (const item of rawChildren) {
        const post = this.formatRedditPost(item);
        if (post) posts.push(post);
      }

      if (posts.length > 0) {
        cacheManager.set(cacheKey, posts, 'live', nextCursor);
        return { platform: 'reddit', posts, nextCursor, source: 'live' };
      }

      return {
        platform: 'reddit',
        posts: [],
        source: 'live',
        message: `Aucune publication trouvée pour l'utilisateur u/${cleanUser}.`,
      };
    } catch (err: any) {
      console.error(`[RedditService] Erreur getUserFeed (${cleanUser}) :`, err.message);
      return {
        platform: 'reddit',
        posts: [],
        source: 'live',
        message: `Erreur lors du chargement du profil u/${cleanUser} : ${err.message}`,
      };
    }
  }

  /**
   * Récupère la discussion complète (Post + Commentaires hiérarchiques) pour le Thread Viewer
   */
  public async getPostThread(target: string, forceRefresh = false): Promise<ThreadResponse> {
    await this.ensureSession();
    let permalink = target.trim();

    // Normaliser l'URL en chemin relatif
    if (permalink.startsWith('http')) {
      try {
        const parsed = new URL(permalink);
        permalink = parsed.pathname;
      } catch (e) {}
    }

    if (!permalink.startsWith('/')) {
      permalink = `/${permalink}`;
    }

    // Retirer le .json ou les slashs superflus
    permalink = permalink.replace(/\.json$/, '').replace(/\/$/, '');
    const jsonUrl = `https://www.reddit.com${permalink}.json?limit=60&depth=5`;

    const cacheKey = `reddit:thread:${permalink}`;
    if (!forceRefresh) {
      const cached = this.threadCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 180000) return cached.data;
    }

    try {
      const data = await this.fetchRedditJson(jsonUrl);
      if (!Array.isArray(data) || data.length < 2) {
        throw new Error('Format de discussion Reddit invalide');
      }

      // 1. Post principal
      const postItem = data[0]?.data?.children?.[0];
      const focusedPost = this.formatRedditPost(postItem);
      if (!focusedPost) {
        throw new Error('Publication Reddit introuvable');
      }

      // 2. Commentaires imbriqués
      const replies: SocialPost[] = [];
      const parentSubreddit = focusedPost.author.name.replace('r/', '');

      const parseCommentsRecursive = (commentList: any[]) => {
        for (const c of commentList) {
          if (!c || c.kind !== 't1') continue; // t1 = commentaire Reddit
          const commentPost = this.formatRedditComment(c, parentSubreddit);
          if (commentPost) {
            replies.push(commentPost);
            if (c.data.replies?.data?.children) {
              parseCommentsRecursive(c.data.replies.data.children);
            }
          }
        }
      };

      const topComments = data[1]?.data?.children || [];
      parseCommentsRecursive(topComments);

      const threadResponse: ThreadResponse = {
        platform: 'reddit',
        focusedPost,
        ancestors: [],
        replies,
        source: 'live',
      };

      this.threadCache.set(cacheKey, { data: threadResponse, timestamp: Date.now() });
      return threadResponse;
    } catch (err: any) {
      console.error(`[RedditService] Erreur getPostThread (${permalink}) :`, err.message);
      throw new Error(`Impossible de charger la discussion Reddit : ${err.message}`);
    }
  }

  /**
   * Vote sur un post ou commentaire Reddit (1 = upvote, 0 = annuler, -1 = downvote)
   */
  public async vote(id: string, dir: number): Promise<boolean> {
    await this.ensureSession();
    const cookieHeader = this.getCookieHeader();
    const cleanId = id.startsWith('t3_') || id.startsWith('t1_') ? id : `t3_${id}`;

    try {
      const response = await fetch('https://www.reddit.com/api/vote', {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookieHeader,
        },
        body: new URLSearchParams({ id: cleanId, dir: dir.toString() }).toString(),
      });
      return response.ok;
    } catch (err: any) {
      console.error('[RedditService] Erreur vote :', err.message);
      return false;
    }
  }

  /**
   * Publie un commentaire en réponse sur Reddit
   */
  public async submitComment(parentId: string, text: string): Promise<any> {
    await this.ensureSession();
    const cookieHeader = this.getCookieHeader();
    const cleanId = parentId.startsWith('t3_') || parentId.startsWith('t1_') ? parentId : `t3_${parentId}`;

    try {
      const response = await fetch('https://www.reddit.com/api/comment', {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookieHeader,
        },
        body: new URLSearchParams({ thing_id: cleanId, text }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Reddit API a répondu avec le statut ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      console.error('[RedditService] Erreur submitComment :', err.message);
      throw err;
    }
  }
}

export const redditService = new RedditService();
