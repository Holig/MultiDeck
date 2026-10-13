import fs from 'fs';
import path from 'path';
import { SocialPost, FeedResponse } from '../types';
import { cacheManager } from '../cacheManager';
import { playwrightManager } from '../playwrightManager';

export class YouTubeService {
  private apiKey: string = process.env.YOUTUBE_API_KEY || '';

  public setApiKey(key: string) {
    this.apiKey = key.trim();
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  public hasApiKey(): boolean {
    return !!this.apiKey && this.apiKey.length > 10;
  }

  private formatDuration(isoDuration?: string): string {
    if (!isoDuration) return '00:00';
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '00:00';
    const hours = match[1] ? `${match[1]}:` : '';
    const minutes = match[2] ? (match[1] ? match[2].padStart(2, '0') : match[2]) : '0';
    const seconds = (match[3] || '0').padStart(2, '0');
    return `${hours}${minutes}:${seconds}`;
  }

  /**
   * Convertit un texte de date relative YouTube (ex: "il y a 2 jours", "3 weeks ago") en date ISO réelle
   */
  public parseRelativeTimeToIso(relativeText?: string): string {
    if (!relativeText) return new Date().toISOString();
    const text = relativeText.trim();
    if (!text) return new Date().toISOString();

    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text;

    const lower = text.toLowerCase();
    if (lower.includes('en direct') || lower.includes('live')) {
      return new Date().toISOString();
    }

    // Gestion des diffusions planifiées (ex: "Planifié pour le 08/10/2026 17:30")
    const planMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2})/);
    if (planMatch) {
      const scheduledDate = new Date(`${planMatch[3]}-${planMatch[2]}-${planMatch[1]}T${planMatch[4]}:${planMatch[5]}:00`);
      if (!isNaN(scheduledDate.getTime())) {
        // Si planifié aujourd'hui ou dans les prochaines 24 heures, on le place au sommet (contenu d'actualité immédiate)
        if (scheduledDate.getTime() <= Date.now() + 24 * 3600 * 1000) {
          return scheduledDate.toISOString();
        }
        // Si planifié dans un futur lointain (> 24h), on ne le place pas devant les vidéos fraîches du jour
        return new Date(Date.now() - 30 * 86400 * 1000).toISOString();
      }
    }

    const now = Date.now();
    const match = text.match(/(\d+)\s*(seconde|second|sec|minute|min|heure|hour|h|jour|day|j|semaine|week|sem|mois|month|an|année|year)/i);
    if (match) {
      const count = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();

      let deltaMs = 0;
      if (unit.startsWith('sec')) {
        deltaMs = count * 1000;
      } else if (unit.startsWith('min')) {
        deltaMs = count * 60 * 1000;
      } else if (unit.startsWith('h')) {
        deltaMs = count * 3600 * 1000;
      } else if (unit.startsWith('j') || unit.startsWith('day')) {
        deltaMs = count * 86400 * 1000;
      } else if (unit.startsWith('sem') || unit.startsWith('week')) {
        deltaMs = count * 7 * 86400 * 1000;
      } else if (unit.startsWith('mois') || unit.startsWith('month')) {
        deltaMs = count * 30 * 86400 * 1000;
      } else if (unit.startsWith('an') || unit.startsWith('year')) {
        deltaMs = count * 365 * 86400 * 1000;
      }

      if (deltaMs > 0) {
        return new Date(now - deltaMs).toISOString();
      }
    }

    return new Date().toISOString();
  }

  /**
   * Récupère la chaîne de cookies pour les requêtes authentifiées YouTube
   */
  public getAuthCookieHeader(): string {
    try {
      let cookies: any[] = [];
      const userDataFile = path.resolve(__dirname, '../../user_data/youtube/cookies.json');
      if (fs.existsSync(userDataFile)) {
        try {
          cookies = JSON.parse(fs.readFileSync(userDataFile, 'utf-8'));
        } catch (e) {}
      }

      if (!cookies || cookies.length === 0) {
        const extracted = playwrightManager.runCookieExtractor('youtube', 'all');
        const ytData = extracted['youtube'];
        if (ytData && ytData.cookies && ytData.cookies.length > 0) {
          cookies = ytData.cookies;
          try {
            const dir = path.dirname(userDataFile);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(userDataFile, JSON.stringify(cookies, null, 2));
          } catch (e) {}
        }
      }

      // Priorité stricte : ajouter d'abord .google.com, puis écraser par .youtube.com
      const map = new Map<string, string>();
      for (const c of cookies) {
        if (c.domain && c.domain === '.google.com' && c.name && c.value) {
          if (/^[\x20-\x7E]*$/.test(c.value)) map.set(c.name, c.value);
        }
      }
      for (const c of cookies) {
        if (c.domain && c.domain.includes('youtube.com') && c.name && c.value) {
          if (/^[\x20-\x7E]*$/.test(c.value)) map.set(c.name, c.value);
        }
      }

      // S'assurer que le cookie de consentement Google SOCS est toujours présent pour éviter les redirections GDPR
      if (!map.has('SOCS')) {
        map.set('SOCS', 'CAESEwgDEgk2NTY5MTA2MTkaAmZyIAEaBgiA_L20Bg');
      }

      if (map.size > 0) {
        return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
      }
    } catch (e) {}
    return '';
  }

  /**
   * Récupère le flux RSS public officiel de la chaîne pour obtenir les dates exactes ISO de chaque vidéo et Short
   */
  public async fetchChannelRssDates(channelId: string): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (!channelId) return map;
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const res = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });
      if (res.ok) {
        const xml = await res.text();
        const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
        for (const entry of entries) {
          const vidMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
          const pubMatch = entry.match(/<published>([^<]+)<\/published>/);
          if (vidMatch && pubMatch) {
            map.set(vidMatch[1], pubMatch[1]);
          }
        }
      }
    } catch (err: any) {
      console.warn(`[YouTubeService] Erreur récupération RSS pour channel ${channelId} :`, err.message);
    }
    return map;
  }

  /**
   * Recherche publique de vidéos ou Shorts
   */
  public async searchVideos(query: string, isShorts = false, forceRefresh = false): Promise<FeedResponse> {
    const cleanQuery = query.trim() || 'Tech';
    const cacheKey = `youtube:search:${cleanQuery.toLowerCase()}:${isShorts ? 'shorts' : 'videos'}`;

    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return { platform: 'youtube', posts: cached.data, source: 'cache', cachedAt: new Date(cached.timestamp).toISOString() };
      }
    }

    // 1. Si une clé API est configurée, tenter l'API officielle
    if (this.hasApiKey()) {
      try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(
          cleanQuery + (isShorts ? ' #shorts' : '')
        )}&type=video&key=${this.apiKey}`;

        const res = await fetch(searchUrl);
        if (res.ok) {
          const json = await res.json();
          const videoIds = (json.items || []).map((item: any) => item.id?.videoId).filter(Boolean).join(',');

          let statsMap: Record<string, any> = {};
          if (videoIds) {
            const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${this.apiKey}`;
            const detailsRes = await fetch(detailsUrl);
            if (detailsRes.ok) {
              const detailsJson = await detailsRes.json();
              (detailsJson.items || []).forEach((item: any) => {
                statsMap[item.id] = item;
              });
            }
          }

          const posts: SocialPost[] = (json.items || [])
            .filter((item: any) => item.id?.videoId)
            .map((item: any) => {
              const vidId = item.id.videoId;
              const detail = statsMap[vidId];
              const duration = this.formatDuration(detail?.contentDetails?.duration);
              const viewCount = parseInt(detail?.statistics?.viewCount || '0', 10);
              const likeCount = parseInt(detail?.statistics?.likeCount || '0', 10);
              const commentCount = parseInt(detail?.statistics?.commentCount || '0', 10);

              return {
                id: vidId,
                platform: 'youtube',
                type: isShorts ? 'short' : 'video',
                author: {
                  id: item.snippet.channelId,
                  name: item.snippet.channelTitle,
                  username: item.snippet.channelTitle,
                  avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.snippet.channelTitle)}&background=ff0000&color=fff&bold=true`,
                  verified: true,
                  profileUrl: `https://www.youtube.com/channel/${item.snippet.channelId}`,
                },
                title: item.snippet.title,
                text: item.snippet.description || '',
                createdAt: item.snippet.publishedAt,
                stats: {
                  views: viewCount,
                  likes: likeCount,
                  comments: commentCount,
                },
                media: [
                  {
                    type: 'video',
                    url: `https://www.youtube.com/watch?v=${vidId}`,
                    previewUrl: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
                    duration,
                    aspectRatio: isShorts ? '9:16' : '16:9',
                    embedId: vidId,
                  },
                ],
                postUrl: isShorts ? `https://www.youtube.com/shorts/${vidId}` : `https://www.youtube.com/watch?v=${vidId}`,
              };
            });

          if (posts.length > 0) {
            cacheManager.set(cacheKey, posts, 'live');
            return { platform: 'youtube', posts, source: 'live' };
          }
        }
      } catch (e) {}
    }

    // 2. Extraction directe sans clé API via ytInitialData
    try {
      const posts = await this.scrapeDirectYouTube(cleanQuery, isShorts);
      if (posts.length > 0) {
        cacheManager.set(cacheKey, posts, 'live');
        return { platform: 'youtube', posts, source: 'live' };
      }
    } catch (err: any) {
      console.warn('[YouTubeService] Erreur extraction directe :', err.message);
    }

    return { platform: 'youtube', posts: [], source: 'live', message: `Aucune vidéo trouvée pour "${cleanQuery}".` };
  }

  /**
   * Recherche directe sans clé API
   */
  private async scrapeDirectYouTube(query: string, isShorts = false): Promise<SocialPost[]> {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + (isShorts ? ' #shorts' : ''))}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!res.ok) return [];
    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match) return [];

    const data = JSON.parse(match[1]);
    const sections = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const posts: SocialPost[] = [];

    for (const sec of sections) {
      const items = sec.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const v = item.videoRenderer;
        if (!v || !v.videoId) continue;

        const vidId = v.videoId;
        const title = v.title?.runs?.map((r: any) => r.text).join('') || 'Vidéo YouTube';
        const channelName = v.ownerText?.runs?.[0]?.text || 'Chaîne YouTube';
        const channelId = v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
        const duration = v.lengthText?.simpleText || '00:00';
        const rawViews = v.viewCountText?.simpleText || '0';
        const viewsNum = parseInt(rawViews.replace(/\D/g, ''), 10) || 0;
        const snippetText = v.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r: any) => r.text).join('') || '';
        const publishedText = v.publishedTimeText?.simpleText || '';

        const thumbs = v.thumbnail?.thumbnails || [];
        const thumbUrl = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;

        const channelThumb = v.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails?.[0]?.url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(channelName)}&background=ff0000&color=fff&bold=true`;

        posts.push({
          id: vidId,
          platform: 'youtube',
          type: isShorts ? 'short' : 'video',
          author: {
            id: channelId || channelName,
            name: channelName,
            username: channelName,
            avatarUrl: channelThumb,
            verified: true,
            profileUrl: channelId ? `https://www.youtube.com/channel/${channelId}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(channelName)}`,
          },
          title,
          text: snippetText || title,
          createdAt: this.parseRelativeTimeToIso(publishedText),
          stats: {
            views: viewsNum,
            likes: 0,
            comments: 0,
          },
          media: [
            {
              type: 'video',
              url: `https://www.youtube.com/watch?v=${vidId}`,
              previewUrl: thumbUrl,
              duration,
              aspectRatio: isShorts ? '9:16' : '16:9',
              embedId: vidId,
            },
          ],
          postUrl: isShorts ? `https://www.youtube.com/shorts/${vidId}` : `https://www.youtube.com/watch?v=${vidId}`,
        });
      }
    }

    return posts;
  }

  /**
   * Profil / Chaîne YouTube : Récupère les vraies vidéos et shorts d'un compte @username
   */
  public async getChannelFeed(channelQuery: string, filterType: 'all' | 'videos' | 'shorts' = 'all', forceRefresh = false): Promise<FeedResponse> {
    const rawClean = channelQuery.replace(/^@/, '').trim();
    if (!rawClean) {
      return { platform: 'youtube', posts: [], source: 'live', message: 'Nom de chaîne requis.' };
    }

    const cacheKey = `youtube:channel:${rawClean.toLowerCase()}:${filterType}`;
    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return { platform: 'youtube', posts: cached.data, source: 'cache', cachedAt: new Date(cached.timestamp).toISOString() };
      }
    }

    try {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      };

      let channelName = `@${rawClean}`;
      let channelAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(rawClean)}&background=ff0000&color=fff&bold=true`;
      let channelId = '';
      const posts: SocialPost[] = [];

      // 1. Récupération des Vidéos longues de la chaîne
      if (filterType === 'all' || filterType === 'videos') {
        const vUrl = `https://www.youtube.com/@${rawClean}/videos`;
        const res = await fetch(vUrl, { headers });
        if (res.ok) {
          const html = await res.text();
          const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
          if (match) {
            const data = JSON.parse(match[1]);
            const header = data.header?.pageHeaderRenderer?.content?.pageHeaderViewModel;
            const channelMetadata = data.metadata?.channelMetadataRenderer;
            if (channelMetadata?.externalId) {
              channelId = channelMetadata.externalId;
            }
            if (header?.title?.dynamicTextViewModel?.text?.content) {
              channelName = header.title.dynamicTextViewModel.text.content;
            }
            if (header?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources?.[0]?.url) {
              channelAvatar = header.image.decoratedAvatarViewModel.avatar.avatarViewModel.image.sources[0].url;
            }

            // Récupération des vraies dates de publication ISO via le flux RSS officiel de la chaîne
            const rssDates = channelId ? await this.fetchChannelRssDates(channelId) : new Map<string, string>();

            const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
            const videosTab = tabs.find((t: any) => t.tabRenderer?.selected || t.tabRenderer?.content?.richGridRenderer);
            const contents = videosTab?.tabRenderer?.content?.richGridRenderer?.contents || [];

            for (const c of contents) {
              // Nouveau format YouTube lockupViewModel
              const l = c.richItemRenderer?.content?.lockupViewModel;
              if (l) {
                const vidId = l.contentId;
                const m = l.metadata?.lockupMetadataViewModel;
                const title = m?.title?.content || 'Vidéo';
                const rows = m?.metadata?.contentMetadataViewModel?.metadataRows || [];
                let viewsStr = '0';
                let publishedText = '';
                for (const row of rows) {
                  const parts = row.metadataParts || row.parts || [];
                  for (const p of parts) {
                    const txt = p.text?.content || '';
                    if (txt.includes('vue') || txt.includes('view')) {
                      viewsStr = txt;
                    } else if (txt.includes('il y a') || txt.includes('ago') || txt.includes('an') || txt.includes('mois') || txt.includes('jour') || txt.includes('sem') || txt.includes('heur') || txt.includes('min')) {
                      publishedText = txt;
                    }
                  }
                }
                const views = parseInt(viewsStr.replace(/\D/g, ''), 10) || 0;
                const thumb = `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;
                const createdAtIso = rssDates.get(vidId) || this.parseRelativeTimeToIso(publishedText);

                posts.push({
                  id: vidId,
                  platform: 'youtube',
                  type: 'video',
                  author: {
                    id: channelId || rawClean,
                    name: channelName,
                    username: `@${rawClean}`,
                    avatarUrl: channelAvatar,
                    verified: true,
                    profileUrl: `https://www.youtube.com/@${rawClean}`,
                  },
                  title,
                  text: title,
                  createdAt: createdAtIso,
                  stats: { views, likes: 0, comments: 0 },
                  media: [
                    {
                      type: 'video',
                      url: `https://www.youtube.com/watch?v=${vidId}`,
                      previewUrl: thumb,
                      duration: publishedText || 'Vidéo',
                      aspectRatio: '16:9',
                      embedId: vidId,
                    },
                  ],
                  postUrl: `https://www.youtube.com/watch?v=${vidId}`,
                });
                continue;
              }

              // Ancien format videoRenderer
              const v = c.richItemRenderer?.content?.videoRenderer;
              if (v && v.videoId) {
                const vidId = v.videoId;
                const title = v.title?.runs?.[0]?.text || 'Vidéo';
                const duration = v.lengthText?.simpleText || '00:00';
                const views = parseInt((v.viewCountText?.simpleText || '').replace(/\D/g, ''), 10) || 0;
                const thumb = v.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;
                const publishedText = v.publishedTimeText?.simpleText || '';
                const createdAtIso = rssDates.get(vidId) || this.parseRelativeTimeToIso(publishedText);

                posts.push({
                  id: vidId,
                  platform: 'youtube',
                  type: 'video',
                  author: {
                    id: channelId || rawClean,
                    name: channelName,
                    username: `@${rawClean}`,
                    avatarUrl: channelAvatar,
                    verified: true,
                    profileUrl: `https://www.youtube.com/@${rawClean}`,
                  },
                  title,
                  text: title,
                  createdAt: createdAtIso,
                  stats: { views, likes: 0, comments: 0 },
                  media: [
                    {
                      type: 'video',
                      url: `https://www.youtube.com/watch?v=${vidId}`,
                      previewUrl: thumb,
                      duration,
                      aspectRatio: '16:9',
                      embedId: vidId,
                    },
                  ],
                  postUrl: `https://www.youtube.com/watch?v=${vidId}`,
                });
              }
            }
          }
        }
      }

      // 2. Récupération des Shorts de la chaîne
      if (filterType === 'all' || filterType === 'shorts') {
        const sUrl = `https://www.youtube.com/@${rawClean}/shorts`;
        const res = await fetch(sUrl, { headers });
        if (res.ok) {
          const html = await res.text();
          const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
          if (match) {
            const data = JSON.parse(match[1]);
            if (!channelId) {
              const extId = data.metadata?.channelMetadataRenderer?.externalId;
              if (extId) channelId = extId;
            }
            const rssDates = channelId ? await this.fetchChannelRssDates(channelId) : new Map<string, string>();

            const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
            const shortsTab = tabs.find((t: any) => t.tabRenderer?.selected || t.tabRenderer?.content?.richGridRenderer);
            const contents = shortsTab?.tabRenderer?.content?.richGridRenderer?.contents || [];

            let shortIdx = 0;
            for (const c of contents) {
              const s = c.richItemRenderer?.content?.shortsLockupViewModel;
              if (s) {
                const sUrlPath = s.onTap?.innertubeCommand?.commandMetadata?.webCommandMetadata?.url || '';
                const sId = sUrlPath.split('/shorts/')[1]?.split('?')[0];
                if (!sId) continue;

                const title = s.overlayMetadata?.primaryText?.content || 'Short';
                const rawViews = s.overlayMetadata?.secondaryText?.content || '';
                const views = parseInt(rawViews.replace(/\D/g, ''), 10) || 0;
                const thumb = s.thumbnailViewModel?.thumbnailViewModel?.image?.sources?.[0]?.url || `https://i.ytimg.com/vi/${sId}/hqdefault.jpg`;
                const a11yLabel = s.accessibility?.accessibilityData?.label || s.onTap?.innertubeCommand?.accessibility?.accessibilityData?.label || '';
                const publishedFromA11y = (a11yLabel.match(/(il y a [^,]+|\d+ (?:days|hours|weeks|months|years) ago)/i) || [])[1] || '';

                // Résolution de la date réelle :
                // 1) Flux RSS officiel (exact à la seconde près)
                // 2) Label d'accessibilité YouTube
                // 3) Échelonnage réaliste dans le temps (jamais la date courante de rafraîchissement)
                let shortCreatedAt = rssDates.get(sId);
                if (!shortCreatedAt && publishedFromA11y) {
                  shortCreatedAt = this.parseRelativeTimeToIso(publishedFromA11y);
                }
                if (!shortCreatedAt) {
                  const fallbackDays = shortIdx + 2;
                  shortCreatedAt = new Date(Date.now() - fallbackDays * 86400 * 1000).toISOString();
                }
                shortIdx++;

                posts.push({
                  id: sId,
                  platform: 'youtube',
                  type: 'short',
                  author: {
                    id: channelId || rawClean,
                    name: channelName,
                    username: `@${rawClean}`,
                    avatarUrl: channelAvatar,
                    verified: true,
                    profileUrl: `https://www.youtube.com/@${rawClean}`,
                  },
                  title,
                  text: title,
                  createdAt: shortCreatedAt,
                  stats: { views, likes: 0, comments: 0 },
                  media: [
                    {
                      type: 'video',
                      url: `https://www.youtube.com/shorts/${sId}`,
                      previewUrl: thumb,
                      aspectRatio: '9:16',
                      embedId: sId,
                    },
                  ],
                  postUrl: `https://www.youtube.com/shorts/${sId}`,
                });
              }
            }
          }
        }
      }

      if (posts.length > 0) {
        cacheManager.set(cacheKey, posts, 'live');
        return { platform: 'youtube', posts, source: 'live' };
      } else {
        // Fallback recherche classique
        return this.searchVideos(`@${rawClean}`, false, forceRefresh);
      }
    } catch (err: any) {
      console.error('[YouTubeService] Erreur getChannelFeed :', err.message);
      return this.searchVideos(`@${rawClean}`, false, forceRefresh);
    }
  }

  /**
   * Flux des Abonnements YouTube de l'utilisateur (https://www.youtube.com/feed/subscriptions)
   * Permet de trier et de filtrer entre Vidéos classiques et Shorts
   */
  public async getSubscriptionsFeed(
    mode: 'recent' | 'relevant' = 'recent',
    filterType: 'all' | 'videos' | 'shorts' = 'all',
    forceRefresh = false
  ): Promise<FeedResponse> {
    const cacheKey = `youtube:subscriptions:${mode}:${filterType}`;
    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return { platform: 'youtube', posts: cached.data, source: 'cache', cachedAt: new Date(cached.timestamp).toISOString() };
      }
    }

    const cookieHeader = this.getAuthCookieHeader();
    if (!cookieHeader) {
      return {
        platform: 'youtube',
        posts: [],
        source: 'live',
        message: 'Connexion requise pour les Abonnements YouTube. Utilisez le bouton "Tout Connecter en 1-Clic" pour synchroniser votre session.',
      };
    }

    try {
      const subUrl = `https://www.youtube.com/feed/subscriptions${mode === 'relevant' ? '?flow=1' : ''}`;
      const res = await fetch(subUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cookie': cookieHeader,
        },
      });

      if (!res.ok) {
        return {
          platform: 'youtube',
          posts: [],
          source: 'live',
          message: `Impossible d'accéder au flux Abonnements (code HTTP ${res.status}).`,
        };
      }

      const html = await res.text();

      // Détection de la demande de connexion YouTube (Non connecté)
      if (html.includes('backgroundPromoRenderer') || html.includes('Connectez-vous pour découvrir les nouveautés')) {
        return {
          platform: 'youtube',
          posts: [],
          source: 'live',
          message: "Connexion requise : Vous n'êtes pas connecté à votre compte YouTube. Ouvrez la modale de connexion aux réseaux pour connecter votre compte YouTube et afficher vos abonnements.",
        };
      }

      const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
      if (!match) {
        return {
          platform: 'youtube',
          posts: [],
          source: 'live',
          message: 'Erreur lors de la lecture des abonnements YouTube.',
        };
      }

      const data = JSON.parse(match[1]);
      const posts: SocialPost[] = [];
      const seenIds = new Set<string>();

      // Extracteur récursif universel pour n'importe quelle structure (sectionListRenderer, richGridRenderer, gridRenderer, etc.)
      const parseItem = (item: any) => {
        if (!item || typeof item !== 'object') return;

        // 1. Vidéos standard via lockupViewModel (nouveau format YouTube)
        const l = item.lockupViewModel || item.content?.lockupViewModel || item.richItemRenderer?.content?.lockupViewModel;
        if (l && (filterType === 'all' || filterType === 'videos')) {
          const vidId = l.contentId;
          if (vidId && !seenIds.has(vidId)) {
            seenIds.add(vidId);
            const meta = l.metadata?.lockupMetadataViewModel;
            const title = meta?.title?.content || 'Vidéo';
            const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows || [];

            const channel = rows[0]?.metadataParts?.[0]?.text?.content || rows[0]?.parts?.[0]?.text?.content || 'Chaîne YouTube';
            const channelUrl = 
              rows[0]?.metadataParts?.[0]?.text?.commandRuns?.[0]?.onTap?.innertubeCommand?.browseEndpoint?.canonicalBaseUrl ||
              meta?.image?.decoratedAvatarViewModel?.rendererContext?.commandContext?.onTap?.innertubeCommand?.browseEndpoint?.canonicalBaseUrl || '';
            const channelId = 
              rows[0]?.metadataParts?.[0]?.text?.commandRuns?.[0]?.onTap?.innertubeCommand?.browseEndpoint?.browseId ||
              meta?.image?.decoratedAvatarViewModel?.rendererContext?.commandContext?.onTap?.innertubeCommand?.browseEndpoint?.browseId || channel;

            let viewsStr = '';
            let published = '';
            for (const row of rows) {
              const parts = row.metadataParts || row.parts || [];
              for (const p of parts) {
                const txt = p.text?.content || '';
                const a11y = p.accessibilityLabel || p.text?.accessibility?.accessibilityData?.label || '';
                const check = (txt + ' ' + a11y).toLowerCase();
                if (check.includes('vue') || check.includes('view')) {
                  viewsStr = txt;
                } else if (check.includes('en direct') || check.includes('live')) {
                  published = 'EN DIRECT';
                } else if (check.includes('planifié') || check.includes('première')) {
                  published = txt || a11y;
                } else if (
                  check.includes('il y a') ||
                  check.includes('ago') ||
                  check.includes('an') ||
                  check.includes('mois') ||
                  check.includes('jour') ||
                  check.includes('sem') ||
                  check.includes('heur') ||
                  check.includes('min') ||
                  check.includes('sec')
                ) {
                  published = a11y || txt;
                }
              }
            }

            // Détection badge live direct (EN DIRECT)
            const badges = l.contentImage?.thumbnailViewModel?.overlays?.[0]?.thumbnailBottomOverlayViewModel?.badges || [];
            for (const b of badges) {
              const bText = b.thumbnailBadgeViewModel?.text || '';
              if (bText === 'EN DIRECT' || b.thumbnailBadgeViewModel?.badgeStyle === 'THUMBNAIL_OVERLAY_BADGE_STYLE_LIVE') {
                published = 'EN DIRECT';
              }
            }

            const views = parseInt(viewsStr.replace(/\D/g, ''), 10) || 0;
            const avatar = 
              meta?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources?.[0]?.url ||
              meta?.image?.avatarStackViewModel?.avatars?.[0]?.avatarViewModel?.image?.sources?.[0]?.url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(channel)}&background=ff0000&color=fff&bold=true`;
            const thumb = `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;

            posts.push({
              id: vidId,
              platform: 'youtube',
              type: 'video',
              author: {
                id: channelId,
                name: channel,
                username: channelUrl ? channelUrl.replace('/', '') : channel,
                avatarUrl: avatar,
                verified: true,
                profileUrl: channelUrl ? `https://www.youtube.com${channelUrl}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(channel)}`,
              },
              title,
              text: title,
              createdAt: this.parseRelativeTimeToIso(published),
              stats: { views, likes: 0, comments: 0 },
              media: [
                {
                  type: 'video',
                  url: `https://www.youtube.com/watch?v=${vidId}`,
                  previewUrl: thumb,
                  duration: published || 'Vidéo',
                  aspectRatio: '16:9',
                  embedId: vidId,
                },
              ],
              postUrl: `https://www.youtube.com/watch?v=${vidId}`,
            });
            return;
          }
        }

        // 2. Vidéos standard via videoRenderer ou gridVideoRenderer
        const v = item.videoRenderer || item.gridVideoRenderer || item.richItemRenderer?.content?.videoRenderer;
        if (v && v.videoId && (filterType === 'all' || filterType === 'videos')) {
          const vidId = v.videoId;
          if (!seenIds.has(vidId)) {
            seenIds.add(vidId);
            const title = v.title?.runs?.[0]?.text || v.title?.simpleText || 'Vidéo';
            const channel = v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || 'Chaîne';
            const channelId = v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
            const duration = v.lengthText?.simpleText || '00:00';
            const views = parseInt((v.viewCountText?.simpleText || '').replace(/\D/g, ''), 10) || 0;
            const thumb = v.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;
            const published = v.publishedTimeText?.simpleText || '';

            posts.push({
              id: vidId,
              platform: 'youtube',
              type: 'video',
              author: {
                id: channelId || channel,
                name: channel,
                username: channel,
                avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(channel)}&background=ff0000&color=fff&bold=true`,
                verified: true,
                profileUrl: channelId ? `https://www.youtube.com/channel/${channelId}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(channel)}`,
              },
              title,
              text: title,
              createdAt: this.parseRelativeTimeToIso(published),
              stats: { views, likes: 0, comments: 0 },
              media: [
                {
                  type: 'video',
                  url: `https://www.youtube.com/watch?v=${vidId}`,
                  previewUrl: thumb,
                  duration,
                  aspectRatio: '16:9',
                  embedId: vidId,
                },
              ],
              postUrl: `https://www.youtube.com/watch?v=${vidId}`,
            });
            return;
          }
        }

        // 3. Shorts via shortsLockupViewModel
        const s = item.shortsLockupViewModel || item.content?.shortsLockupViewModel || item.richItemRenderer?.content?.shortsLockupViewModel;
        if (s && (filterType === 'all' || filterType === 'shorts')) {
          const sUrlPath = s.onTap?.innertubeCommand?.commandMetadata?.webCommandMetadata?.url || '';
          const sId = sUrlPath.split('/shorts/')[1]?.split('?')[0];
          if (sId && !seenIds.has(sId)) {
            seenIds.add(sId);
            const title = s.overlayMetadata?.primaryText?.content || 'Short';
            const rawViews = s.overlayMetadata?.secondaryText?.content || '';
            const views = parseInt(rawViews.replace(/\D/g, ''), 10) || 0;
            const thumb = s.thumbnailViewModel?.thumbnailViewModel?.image?.sources?.[0]?.url || `https://i.ytimg.com/vi/${sId}/hqdefault.jpg`;
            const a11yLabel = s.accessibility?.accessibilityData?.label || '';
            const publishedFromA11y = (a11yLabel.match(/(il y a [^,]+|\d+ (?:days|hours|weeks|months|years) ago)/i) || [])[1] || '';

            posts.push({
              id: sId,
              platform: 'youtube',
              type: 'short',
              author: {
                id: 'youtube-subscriptions',
                name: 'YouTube Shorts',
                username: 'Shorts',
                avatarUrl: 'https://ui-avatars.com/api/?name=Shorts&background=ff0000&color=fff&bold=true',
                verified: true,
                profileUrl: 'https://www.youtube.com/shorts',
              },
              title,
              text: title,
              createdAt: this.parseRelativeTimeToIso(publishedFromA11y),
              stats: { views, likes: 0, comments: 0 },
              media: [
                {
                  type: 'video',
                  url: `https://www.youtube.com/shorts/${sId}`,
                  previewUrl: thumb,
                  aspectRatio: '9:16',
                  embedId: sId,
                },
              ],
              postUrl: `https://www.youtube.com/shorts/${sId}`,
            });
            return;
          }
        }

        // Parcours récursif sans restriction de conteneur
        if (Array.isArray(item)) {
          for (const sub of item) parseItem(sub);
        } else {
          for (const key of Object.keys(item)) {
            if (key !== 'trackingParams' && key !== 'responseContext') {
              parseItem(item[key]);
            }
          }
        }
      };

      if (data.contents) {
        parseItem(data.contents);
      }

      if (posts.length > 0) {
        // Tri chronologique strict : les vidéos les plus récentes / directs en haut
        posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        cacheManager.set(cacheKey, posts, 'live');
        return { platform: 'youtube', posts, source: 'live' };
      } else {
        return {
          platform: 'youtube',
          posts: [],
          source: 'live',
          message: 'Aucun contenu récent trouvé dans vos abonnements YouTube.',
        };
      }
    } catch (err: any) {
      console.error('[YouTubeService] Erreur getSubscriptionsFeed :', err.message);
      return { platform: 'youtube', posts: [], source: 'live', message: err.message };
    }
  }
}

export const youtubeService = new YouTubeService();
