import { SocialPost, SocialMedia, QuotedPost, FeedResponse, ThreadResponse } from '../types';
import { cacheManager } from '../cacheManager';

class BlueskyService {
  private apiBase = 'https://api.bsky.app/xrpc';

  /**
   * Extrait les médias (images, aperçus vidéo, liens externes) d'un embed Bluesky
   */
  private extractMedia(embed: any): SocialMedia[] {
    if (!embed) return [];
    const media: SocialMedia[] = [];

    // 1. Images directes
    if (embed.$type === 'app.bsky.embed.images#view' && Array.isArray(embed.images)) {
      for (const img of embed.images) {
        media.push({
          type: 'image',
          url: img.fullsize || img.thumb,
          previewUrl: img.thumb || img.fullsize,
          altText: img.alt,
          aspectRatio: img.aspectRatio ? (img.aspectRatio.width > img.aspectRatio.height ? '16:9' : '9:16') : undefined,
        });
      }
    }

    // 2. Vidéo
    if (embed.$type === 'app.bsky.embed.video#view') {
      media.push({
        type: 'video',
        url: embed.playlist || embed.thumbnail,
        previewUrl: embed.thumbnail,
        aspectRatio: embed.aspectRatio ? (embed.aspectRatio.width > embed.aspectRatio.height ? '16:9' : '9:16') : '16:9',
      });
    }

    // 3. Carte de lien externe avec image
    if (embed.$type === 'app.bsky.embed.external#view' && embed.external?.thumb) {
      media.push({
        type: 'image',
        url: embed.external.thumb,
        previewUrl: embed.external.thumb,
        altText: embed.external.title,
      });
    }

    // 4. Citation combinée avec médias (recordWithMedia)
    if (embed.$type === 'app.bsky.embed.recordWithMedia#view' && embed.media) {
      return this.extractMedia(embed.media);
    }

    return media;
  }

  /**
   * Extrait une citation de post (Quote Post)
   */
  private extractQuotedPost(embed: any): QuotedPost | undefined {
    if (!embed) return undefined;

    let targetRecord: any = null;
    if (embed.$type === 'app.bsky.embed.record#view') {
      targetRecord = embed.record;
    } else if (embed.$type === 'app.bsky.embed.recordWithMedia#view' && embed.record) {
      targetRecord = embed.record.record;
    }

    if (!targetRecord || targetRecord.$type !== 'app.bsky.embed.record#viewRecord') {
      return undefined;
    }

    const rkey = (targetRecord.uri || '').split('/').pop() || '';
    const authorHandle = targetRecord.author?.handle || 'user';
    const quoteMedia: SocialMedia[] = [];

    if (Array.isArray(targetRecord.embeds)) {
      for (const emb of targetRecord.embeds) {
        quoteMedia.push(...this.extractMedia(emb));
      }
    }

    return {
      id: targetRecord.cid || rkey,
      text: targetRecord.value?.text || '',
      createdAt: targetRecord.value?.createdAt,
      postUrl: `https://bsky.app/profile/${authorHandle}/post/${rkey}`,
      author: {
        id: targetRecord.author?.did || '',
        name: targetRecord.author?.displayName || authorHandle,
        username: authorHandle,
        avatarUrl: targetRecord.author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorHandle)}&background=0285ff&color=fff`,
      },
      media: quoteMedia.length > 0 ? quoteMedia : undefined,
    };
  }

  /**
   * Convertit un objet post Bluesky de l'API en modèle unifié SocialPost
   */
  public mapPost(post: any, options?: { retweetedBy?: { name: string; username?: string }; replyTo?: any }): SocialPost {
    const rkey = (post.uri || '').split('/').pop() || post.cid;
    const authorHandle = post.author?.handle || 'user';
    const authorName = post.author?.displayName || authorHandle;
    const postUrl = `https://bsky.app/profile/${authorHandle}/post/${rkey}`;

    const media = this.extractMedia(post.embed);
    const quotedPost = this.extractQuotedPost(post.embed);

    let replyTo = undefined;
    if (options?.replyTo?.author) {
      replyTo = {
        id: options.replyTo.cid || '',
        author: {
          id: options.replyTo.author.did || '',
          name: options.replyTo.author.displayName || options.replyTo.author.handle,
          username: options.replyTo.author.handle,
          avatarUrl: options.replyTo.author.avatar || '',
        },
        text: options.replyTo.record?.text || '',
      };
    }

    return {
      id: post.cid || rkey,
      platform: 'bluesky',
      type: 'post',
      text: post.record?.text || '',
      createdAt: post.record?.createdAt || post.indexedAt || new Date().toISOString(),
      postUrl,
      uri: post.uri,
      author: {
        id: post.author?.did || '',
        name: authorName,
        username: authorHandle,
        avatarUrl: post.author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=0285ff&color=fff`,
        profileUrl: `https://bsky.app/profile/${authorHandle}`,
      },
      stats: {
        likes: post.likeCount || 0,
        comments: post.replyCount || 0,
        sharesOrRetweets: post.repostCount || 0,
      },
      media: media.length > 0 ? media : undefined,
      quotedPost,
      retweetedBy: options?.retweetedBy,
      replyTo,
      extra: {
        quoteCount: post.quoteCount || 0,
      },
    };
  }

  /**
   * Convertit une URL Bluesky ou un identifiant en URI AT Protocol valide
   */
  public normalizeToAtUri(uriOrUrl: string): string {
    const trimmed = uriOrUrl.trim();
    if (trimmed.startsWith('at://')) return trimmed;

    // Format web: https://bsky.app/profile/:handle/post/:rkey
    const match = trimmed.match(/bsky\.app\/profile\/([^/]+)\/post\/([^/?#]+)/i);
    if (match) {
      const handle = match[1];
      const rkey = match[2];
      return `at://${handle}/app.bsky.feed.post/${rkey}`;
    }

    return trimmed;
  }

  private threadCache: Map<string, { data: ThreadResponse; timestamp: number }> = new Map();

  /**
   * Récupère le fil d'un utilisateur / créateur
   */
  public async getUserFeed(handle: string, refresh = false, cursor?: string): Promise<FeedResponse> {
    const cleanHandle = handle.trim().replace(/^@/, '');
    const cacheKey = `bsky:user:${cleanHandle.toLowerCase()}${cursor ? `:${cursor}` : ''}`;

    if (!refresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) return { platform: 'bluesky', posts: cached.data, nextCursor: cached.nextCursor, source: 'cache' };
    }

    try {
      let url = `${this.apiBase}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(cleanHandle)}&limit=30`;
      if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Erreur Bluesky HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawFeed = data.feed || [];
      const nextCursor = data.cursor || undefined;

      const posts: SocialPost[] = rawFeed.map((item: any) => {
        let retweetedBy = undefined;
        if (item.reason?.$type === 'app.bsky.feed.defs#reasonRepost') {
          retweetedBy = {
            name: item.reason.by?.displayName || item.reason.by?.handle,
            username: item.reason.by?.handle,
          };
        }

        return this.mapPost(item.post, {
          retweetedBy,
          replyTo: item.reply?.parent,
        });
      });

      cacheManager.set(cacheKey, posts, 'live', nextCursor);
      return { platform: 'bluesky', posts, nextCursor, source: 'live' };
    } catch (err: any) {
      console.error(`[BlueskyService] Erreur getUserFeed (${cleanHandle}) :`, err.message);
      return {
        platform: 'bluesky',
        posts: [],
        source: 'live',
        message: `Impossible de charger le compte Bluesky @${cleanHandle} : ${err.message}`,
      };
    }
  }

  /**
   * Recherche par mots-clés ou hashtags
   */
  public async searchFeed(query: string, refresh = false, cursor?: string): Promise<FeedResponse> {
    const cleanQuery = query.trim();
    const cacheKey = `bsky:search:${cleanQuery.toLowerCase()}${cursor ? `:${cursor}` : ''}`;

    if (!refresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) return { platform: 'bluesky', posts: cached.data, nextCursor: cached.nextCursor, source: 'cache' };
    }

    try {
      // L'API publique refuse le paramètre "cursor" sans authentification (403) :
      // la page suivante est demandée avec "until" = date du post le plus ancien déjà reçu
      // Hashtag seul (#art) : filtre "tag" dédié, car l'API rejette "until" quand la requête contient un #
      const hashtagMatch = cleanQuery.match(/^#([\p{L}\p{N}_]+)$/u);
      const searchParams = hashtagMatch
        ? `q=${encodeURIComponent(hashtagMatch[1])}&tag=${encodeURIComponent(hashtagMatch[1])}`
        : `q=${encodeURIComponent(cleanQuery)}`;
      let url = `${this.apiBase}/app.bsky.feed.searchPosts?${searchParams}&limit=30&sort=latest`;
      if (cursor) {
        url += cursor.startsWith('until:')
          ? `&until=${encodeURIComponent(cursor.slice('until:'.length))}`
          : `&cursor=${encodeURIComponent(cursor)}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Erreur recherche Bluesky HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawPosts = data.posts || [];
      const oldestIndexedAt = rawPosts
        .map((p: any) => p.indexedAt)
        .filter((d: any) => typeof d === 'string' && !isNaN(Date.parse(d)))
        .sort()[0];
      const nextCursor = rawPosts.length > 0 && oldestIndexedAt ? `until:${oldestIndexedAt}` : undefined;
      const posts: SocialPost[] = rawPosts.map((post: any) => this.mapPost(post));

      cacheManager.set(cacheKey, posts, 'live', nextCursor);
      return { platform: 'bluesky', posts, nextCursor, source: 'live' };
    } catch (err: any) {
      console.error(`[BlueskyService] Erreur searchFeed (${cleanQuery}) :`, err.message);
      return {
        platform: 'bluesky',
        posts: [],
        source: 'live',
        message: `Erreur lors de la recherche Bluesky "${cleanQuery}" : ${err.message}`,
      };
    }
  }

  /**
   * Fil d'accueil / Découverte (« What's Hot ») ou Abonnements chronologiques
   */
  public async getHomeFeed(mode = 'for_you', refresh = false, userHandle?: string, cursor?: string): Promise<FeedResponse> {
    if (mode === 'following_latest' || mode === 'following' || mode === 'subscriptions') {
      return this.getFollowingFeed(userHandle, refresh, cursor);
    }

    const cacheKey = `bsky:home:${mode}${cursor ? `:${cursor}` : ''}`;

    if (!refresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) return { platform: 'bluesky', posts: cached.data, nextCursor: cached.nextCursor, source: 'cache' };
    }

    try {
      // Feed générateur officiel "What's Hot"
      const feedUri = 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot';
      let url = `${this.apiBase}/app.bsky.feed.getFeed?feed=${encodeURIComponent(feedUri)}&limit=30`;
      if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`;
      }
      const res = await fetch(url);

      if (res.ok) {
        const data = await res.json();
        const rawFeed = data.feed || [];
        const nextCursor = data.cursor || undefined;
        const posts: SocialPost[] = rawFeed.map((item: any) => this.mapPost(item.post));
        // Tri par date décroissante (plus récent en haut)
        posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        cacheManager.set(cacheKey, posts, 'live', nextCursor);
        return { platform: 'bluesky', posts, nextCursor, source: 'live' };
      }

      // Fallback recherche populaire
      return await this.searchFeed('popular', refresh, cursor);
    } catch (err: any) {
      console.error(`[BlueskyService] Erreur getHomeFeed :`, err.message);
      return {
        platform: 'bluesky',
        posts: [],
        source: 'live',
        message: `Erreur fil d'accueil Bluesky : ${err.message}`,
      };
    }
  }

  /**
   * Flux des abonnements (Following Timeline) trié du plus récent au plus ancien
   */
  public async getFollowingFeed(userHandle?: string, refresh = false, _cursor?: string): Promise<FeedResponse> {
    const cleanHandle = (userHandle || '').replace('@', '').trim();
    if (!cleanHandle) {
      return {
        platform: 'bluesky',
        posts: [],
        source: 'live',
        message: 'Veuillez configurer un compte Bluesky (@handle.bsky.social) pour charger vos abonnements.',
      };
    }

    const cacheKey = `bsky:following:${cleanHandle.toLowerCase()}`;
    if (!refresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) return { platform: 'bluesky', posts: cached.data, source: 'cache' };
    }

    try {
      // 1. Récupérer les comptes suivis par l'utilisateur
      const followsUrl = `${this.apiBase}/app.bsky.graph.getFollows?actor=${encodeURIComponent(cleanHandle)}&limit=60`;
      const followsRes = await fetch(followsUrl);
      if (!followsRes.ok) {
        const errJson = await followsRes.json().catch(() => ({}));
        throw new Error(errJson.message || `Impossible de récupérer les abonnements de @${cleanHandle}`);
      }

      const followsData = await followsRes.json();
      const follows: any[] = followsData.follows || [];

      if (follows.length === 0) {
        return {
          platform: 'bluesky',
          posts: [],
          source: 'live',
          message: `@${cleanHandle} ne suit aucun compte pour le moment sur Bluesky.`,
        };
      }

      // 2. Récupérer en parallèle les dernières publications des 20 premiers comptes suivis
      const targetFollows = follows.slice(0, 20);
      const postPromises = targetFollows.map(async (f) => {
        try {
          const authorUrl = `${this.apiBase}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(f.handle || f.did)}&limit=4`;
          const authorRes = await fetch(authorUrl);
          if (!authorRes.ok) return [];
          const aData = await authorRes.json();
          const items = aData.feed || [];
          return items.map((item: any) => {
            let retweetedBy = undefined;
            if (item.reason?.$type === 'app.bsky.feed.defs#reasonRepost') {
              retweetedBy = {
                name: item.reason.by?.displayName || item.reason.by?.handle,
                username: item.reason.by?.handle,
              };
            }
            return this.mapPost(item.post, { retweetedBy, replyTo: item.reply?.parent });
          });
        } catch {
          return [];
        }
      });

      const feedArrays = await Promise.all(postPromises);
      const allPosts = feedArrays.flat();

      // 3. Déduplication par URI ou ID
      const seen = new Set<string>();
      const uniquePosts: SocialPost[] = [];
      for (const p of allPosts) {
        const key = p.uri || p.id;
        if (!seen.has(key)) {
          seen.add(key);
          uniquePosts.push(p);
        }
      }

      // 4. Tri strict chronologique : le plus récent tout en haut
      uniquePosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      cacheManager.set(cacheKey, uniquePosts, 'live');
      return { platform: 'bluesky', posts: uniquePosts, source: 'live' };
    } catch (err: any) {
      console.error(`[BlueskyService] Erreur getFollowingFeed (${cleanHandle}) :`, err.message);
      return {
        platform: 'bluesky',
        posts: [],
        source: 'live',
        message: `Erreur lors de la récupération des abonnements de @${cleanHandle} : ${err.message}`,
      };
    }
  }

  /**
   * Récupère l'intégralité d'un fil de discussion (Thread / Conversation) :
   * - Les ancêtres / parents du post
   * - Le post central sélectionné
   * - L'arborescence complète de toutes les réponses imbriquées
   */
  public async getPostThread(uriOrUrl: string, refresh = false): Promise<ThreadResponse> {
    const atUri = this.normalizeToAtUri(uriOrUrl);
    const cacheKey = `bsky:thread:${atUri}`;

    if (!refresh) {
      const cached = this.threadCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 60000) {
        return { ...cached.data, source: 'cache' };
      }
    }

    const url = `${this.apiBase}/app.bsky.feed.getPostThread?uri=${encodeURIComponent(atUri)}&depth=10&parentHeight=10`;
    const res = await fetch(url);
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || `Impossible de charger la conversation Bluesky HTTP ${res.status}`);
    }

    const data = await res.json();
    const thread = data.thread;

    if (!thread || !thread.post) {
      throw new Error('Post introuvable ou supprimé sur Bluesky.');
    }

    // 1. Post ciblé principal
    const focusedPost = this.mapPost(thread.post);

    // 2. Remontée récursive de la chaîne des parents (Ancêtres)
    const ancestors: SocialPost[] = [];
    let currParent = thread.parent;
    while (currParent && currParent.post) {
      ancestors.unshift(this.mapPost(currParent.post));
      currParent = currParent.parent;
    }

    // 3. Parcours récursif des réponses
    const replies: SocialPost[] = [];
    const traverseReplies = (node: any) => {
      if (!node || !Array.isArray(node.replies)) return;
      for (const rep of node.replies) {
        if (rep && rep.post) {
          replies.push(this.mapPost(rep.post, { replyTo: node.post }));
          traverseReplies(rep);
        }
      }
    };
    traverseReplies(thread);

    const result: ThreadResponse = {
      platform: 'bluesky',
      focusedPost,
      ancestors,
      replies,
      source: 'live',
    };

    this.threadCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  }
}

export const blueskyService = new BlueskyService();
