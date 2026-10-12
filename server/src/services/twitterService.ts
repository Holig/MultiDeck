import { Page } from 'playwright';
import { playwrightManager } from '../playwrightManager';
import { cacheManager } from '../cacheManager';
import { SocialPost, FeedResponse, SocialAuthor } from '../types';

export class TwitterService {
  private extractUserInfo(tweetObj: any): { name: string; username: string; avatarUrl: string; verified: boolean; id: string } {
    let name = '';
    let username = '';
    let avatarUrl = '';
    let verified = false;
    let id = '';

    const candidates = [
      tweetObj.core?.user_results?.result,
      tweetObj.core?.user_results?.result?.core,
      tweetObj.core?.user_results?.result?.legacy,
      tweetObj.core?.user_results?.result?.user?.legacy,
      tweetObj.user_results?.result,
      tweetObj.user_results?.result?.core,
      tweetObj.user_results?.result?.legacy,
      tweetObj.author?.legacy,
      tweetObj.legacy?.user,
    ];

    for (const c of candidates) {
      if (!c) continue;
      if (!name && (c.name || c.legacy?.name || c.core?.name || c.user_name)) {
        name = c.name || c.legacy?.name || c.core?.name || c.user_name;
      }
      if (!username && (c.screen_name || c.legacy?.screen_name || c.core?.screen_name || c.username)) {
        username = c.screen_name || c.legacy?.screen_name || c.core?.screen_name || c.username;
      }
      if (!avatarUrl) {
        avatarUrl = c.profile_image_url_https || c.legacy?.profile_image_url_https || c.avatar?.image_url || c.avatar_image_url || c.profile_image_url || '';
      }
      if (c.is_blue_verified || c.verified || c.legacy?.verified) verified = true;
      if (!id && (c.rest_id || c.id_str || c.id)) id = String(c.rest_id || c.id_str || c.id);
    }

    const deepSearch = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      if (!username && obj.screen_name && typeof obj.screen_name === 'string') username = obj.screen_name;
      if (!name && obj.name && typeof obj.name === 'string') name = obj.name;
      if (!avatarUrl) {
        for (const k of Object.keys(obj)) {
          const val = obj[k];
          if (typeof val === 'string' && (val.includes('pbs.twimg.com/profile_images') || val.includes('profile_images/'))) {
            avatarUrl = val;
            break;
          }
        }
      }
      for (const k of Object.keys(obj)) {
        if (typeof obj[k] === 'object' && obj[k] !== null) deepSearch(obj[k]);
      }
    };

    if (tweetObj.core) deepSearch(tweetObj.core);
    if (!avatarUrl) deepSearch(tweetObj);

    if (!username || username === 'user' || username === 'unknown') username = 'unknown';
    if (!name || name === 'Utilisateur' || name === 'Anonyme') {
      name = username !== 'unknown' ? `@${username}` : 'Utilisateur X';
    }

    if (avatarUrl) {
      avatarUrl = avatarUrl.replace('_normal.', '_bigger.');
    } else {
      avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || username)}&background=1d9bf0&color=fff&bold=true`;
    }

    return { name, username, avatarUrl, verified, id: id || username };
  }

  private parseGraphQLTweet(result: any, isInnerRetweet = false): SocialPost | null {
    if (!result) return null;

    // Ignorer les tweets sponsorisés / publicités
    if (result.__typename === 'TweetWithVisibilityResults') {
      if (result.tweet?.promoted_content || result.tweet?.legacy?.promoted_content) return null;
    }
    if (result.promoted_content || result.legacy?.promoted_content) return null;

    const tweetObj = result.__typename === 'TweetWithVisibilityResults' ? result.tweet : result;
    if (!tweetObj || !tweetObj.legacy) return null;

    const legacy = tweetObj.legacy;
    const authorInfo = this.extractUserInfo(tweetObj);

    // 1. GESTION DES RETWEETS (REPOSTS) PURS
    const rawRT = legacy.retweeted_status_result?.result || tweetObj.retweeted_status_result?.result;
    if (!isInnerRetweet && rawRT) {
      const origResult = rawRT;
      const parsedOrig = this.parseGraphQLTweet(origResult, true);
      if (parsedOrig) {
        parsedOrig.retweetedBy = {
          name: authorInfo.name || `@${authorInfo.username}`,
          username: authorInfo.username,
        };
        // Utiliser l'identifiant unique du repost pour la timeline
        parsedOrig.id = tweetObj.rest_id || legacy.id_str || `rt-${parsedOrig.id}`;
        return parsedOrig;
      }
    }

    const author: SocialAuthor = {
      id: authorInfo.id,
      name: authorInfo.name,
      username: authorInfo.username,
      avatarUrl: authorInfo.avatarUrl,
      verified: authorInfo.verified,
    };

    const mediaList: any[] = [];
    if (legacy.extended_entities?.media) {
      for (const m of legacy.extended_entities.media) {
        if (m.type === 'photo') {
          mediaList.push({
            type: 'image',
            url: m.media_url_https,
            previewUrl: m.media_url_https,
            aspectRatio: '16:9',
            altText: m.ext_alt_text,
          });
        } else if (m.type === 'video' || m.type === 'animated_gif') {
          const variants = m.video_info?.variants || [];
          const mp4s = variants
            .filter((v: any) => v.content_type === 'video/mp4')
            .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
          const best = mp4s[0] || variants[0];
          mediaList.push({
            type: 'video',
            url: best?.url || m.media_url_https,
            previewUrl: m.media_url_https,
            aspectRatio: '16:9',
          });
        }
      }
    }

    // 2. GESTION DES CITATIONS (QUOTE TWEETS)
    let quotedPost: any = undefined;
    const rawQuoted = tweetObj.quoted_status_result?.result;
    if (rawQuoted) {
      const quotedObj = rawQuoted.__typename === 'TweetWithVisibilityResults' ? rawQuoted.tweet : rawQuoted;
      if (quotedObj && quotedObj.legacy) {
        const quotedAuthorInfo = this.extractUserInfo(quotedObj);
        const quotedAuthor: SocialAuthor = {
          id: quotedAuthorInfo.id,
          name: quotedAuthorInfo.name,
          username: quotedAuthorInfo.username,
          avatarUrl: quotedAuthorInfo.avatarUrl,
          verified: quotedAuthorInfo.verified,
        };

        let quotedText = quotedObj.note_tweet?.note_tweet_results?.result?.text || quotedObj.legacy.full_text || '';
        const quotedMediaList: any[] = [];
        if (quotedObj.legacy.extended_entities?.media) {
          for (const m of quotedObj.legacy.extended_entities.media) {
            quotedText = quotedText.replace(m.url, '').trim();
            if (m.type === 'photo') {
              quotedMediaList.push({
                type: 'image',
                url: m.media_url_https,
                previewUrl: m.media_url_https,
                aspectRatio: '16:9',
              });
            } else if (m.type === 'video' || m.type === 'animated_gif') {
              const variants = m.video_info?.variants || [];
              const mp4s = variants
                .filter((v: any) => v.content_type === 'video/mp4')
                .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
              const best = mp4s[0] || variants[0];
              quotedMediaList.push({
                type: 'video',
                url: best?.url || m.media_url_https,
                previewUrl: m.media_url_https,
                aspectRatio: '16:9',
              });
            }
          }
        }

        quotedPost = {
          id: quotedObj.rest_id || quotedObj.legacy.id_str,
          author: quotedAuthor,
          text: quotedText.trim(),
          createdAt: quotedObj.legacy.created_at ? new Date(quotedObj.legacy.created_at).toISOString() : undefined,
          media: quotedMediaList.length > 0 ? quotedMediaList : undefined,
          postUrl: `https://x.com/${quotedAuthor.username}/status/${quotedObj.rest_id || quotedObj.legacy.id_str}`,
        };
      }
    }

    let cleanText = tweetObj.note_tweet?.note_tweet_results?.result?.text || legacy.full_text || '';
    if (legacy.entities?.media) {
      for (const m of legacy.entities.media) {
        cleanText = cleanText.replace(m.url, '').trim();
      }
    }

    // Si citation présente, retirer l'URL finale t.co vers la citation
    if (quotedPost) {
      if (legacy.quoted_status_permalink?.url) {
        cleanText = cleanText.replace(legacy.quoted_status_permalink.url, '').trim();
      }
      cleanText = cleanText.replace(/https:\/\/t\.co\/[A-Za-z0-9]+$/, '').trim();
    }

    return {
      id: tweetObj.rest_id || legacy.id_str,
      platform: 'twitter',
      type: 'tweet',
      author,
      text: cleanText,
      createdAt: legacy.created_at ? new Date(legacy.created_at).toISOString() : new Date().toISOString(),
      stats: {
        comments: legacy.reply_count || 0,
        sharesOrRetweets: legacy.retweet_count || 0,
        likes: legacy.favorite_count || 0,
        views: parseInt(tweetObj.views?.count || '0', 10) || undefined,
      },
      media: mediaList.length > 0 ? mediaList : undefined,
      postUrl: `https://x.com/${author.username}/status/${tweetObj.rest_id || legacy.id_str}`,
      isLiked: legacy.favorited,
      quotedPost,
    };
  }

  private extractTweetsFromGraphQLResponse(json: any): SocialPost[] {
    const posts: SocialPost[] = [];
    const seenIds = new Set<string>();

    const searchObj = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;

      // Ignorer les modules de suggestions d'abonnements, publicités, etc.
      if (obj.entryId && (
        obj.entryId.startsWith('promoted') ||
        obj.entryId.startsWith('who-to-follow') ||
        obj.entryId.startsWith('suggested') ||
        obj.entryId.startsWith('cursor') ||
        obj.entryId.startsWith('trend')
      )) {
        return;
      }

      if (obj.tweet_results?.result) {
        const parsed = this.parseGraphQLTweet(obj.tweet_results.result);
        if (parsed && !seenIds.has(parsed.id)) {
          seenIds.add(parsed.id);
          posts.push(parsed);
        }
      }

      if (obj.itemContent?.tweet_results?.result) {
        const parsed = this.parseGraphQLTweet(obj.itemContent.tweet_results.result);
        if (parsed && !seenIds.has(parsed.id)) {
          seenIds.add(parsed.id);
          posts.push(parsed);
        }
      }

      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'object') {
          searchObj(obj[key]);
        }
      }
    };

    searchObj(json);
    return posts;
  }

  private async extractFromDOM(page: Page): Promise<SocialPost[]> {
    try {
      const tweetsData = await page.evaluate(() => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        const list: any[] = [];

        articles.forEach((art, index) => {
          try {
            const userAvatarImg = (art.querySelector('div[data-testid="Tweet-User-Avatar"] img') || 
                                   art.querySelector('div[data-testid*="UserAvatar"] img') || 
                                   art.querySelector('img[src*="profile_images"]') || 
                                   art.querySelector('div[style*="profile_images"]')) as any;
            let avatarUrl = '';
            if (userAvatarImg) {
              if (userAvatarImg.src) {
                avatarUrl = userAvatarImg.src;
              } else if (userAvatarImg.currentSrc) {
                avatarUrl = userAvatarImg.currentSrc;
              } else if (userAvatarImg.style?.backgroundImage) {
                const match = userAvatarImg.style.backgroundImage.match(/url\(["']?([^"']+)["']?\)/);
                if (match) avatarUrl = match[1];
              }
            }

            let name = '';
            let username = '';
            let tweetUrl = '';

            const allLinks = Array.from(art.querySelectorAll('a'));
            for (const l of allLinks) {
              const href = l.getAttribute('href') || '';
              if (href.includes('/status/')) {
                tweetUrl = href.startsWith('http') ? href : `https://x.com${href}`;
              } else if (href.startsWith('/') && !username) {
                const candidate = href.split('/')[1]?.split('?')[0];
                if (candidate && !['home', 'explore', 'notifications', 'messages', 'i', 'search', 'hashtag', 'settings'].includes(candidate)) {
                  username = candidate;
                }
              }
            }

            const userNameDiv = art.querySelector('div[data-testid="User-Name"]');
            if (userNameDiv) {
              const allText = userNameDiv.textContent || '';
              const match = allText.match(/@([A-Za-z0-9_]+)/);
              if (match) {
                username = match[1];
                const namePart = allText.split('@')[0].trim();
                if (namePart) name = namePart;
              }

              if (!name) {
                const firstA = userNameDiv.querySelector('a');
                if (firstA) name = (firstA.textContent || '').trim();
              }
            }

            if (!username || username === 'user' || username === 'unknown') username = 'unknown';
            if (!name || name === 'Utilisateur' || name === 'Anonyme') {
              name = username !== 'unknown' ? `@${username}` : 'Utilisateur X';
            }

            if (!avatarUrl) {
              avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || username)}&background=1d9bf0&color=fff&bold=true`;
            } else {
              avatarUrl = avatarUrl.replace('_normal.', '_bigger.');
            }

            const timeEl = art.querySelector('time');
            const createdAt = timeEl ? timeEl.getAttribute('datetime') || new Date().toISOString() : new Date().toISOString();
            const timeParentLink = timeEl ? timeEl.closest('a') : null;
            if (timeParentLink && timeParentLink.href) {
              tweetUrl = timeParentLink.href;
            }

            const tweetTextEl = art.querySelector('div[data-testid="tweetText"]');
            const text = tweetTextEl ? tweetTextEl.textContent || '' : '';

            const mediaList: any[] = [];
            const photoImgs = art.querySelectorAll('div[data-testid="tweetPhoto"] img');
            photoImgs.forEach((img: any) => {
              if (img.src && !img.src.includes('profile_images')) {
                mediaList.push({
                  type: 'image',
                  url: img.src,
                  previewUrl: img.src,
                  aspectRatio: '16:9',
                });
              }
            });

            const tweetId = tweetUrl.split('/status/')[1]?.split('?')[0] || `dom-${Date.now()}-${index}`;

            // Détection du Retweet dans le DOM
            const socialContextEl = art.querySelector('div[data-testid="socialContext"]');
            let retweetedBy: { name: string; username?: string } | undefined = undefined;
            if (socialContextEl) {
              const scText = (socialContextEl.textContent || '').trim();
              if (scText) {
                const rtName = scText.replace(/\s*(a reposté|a republié|reposted|retweeted)\s*/i, '').trim();
                if (rtName) {
                  retweetedBy = { name: rtName };
                }
              }
            }

            // Détection Citation (Quote Tweet) dans le DOM
            let quotedPost: any = undefined;
            const allTweetTexts = Array.from(art.querySelectorAll('div[data-testid="tweetText"]'));
            if (allTweetTexts.length > 1) {
              const qTextEl = allTweetTexts[1];
              const qContainer = (qTextEl.closest('div[role="link"]') || qTextEl.closest('div[tabindex="0"]') || qTextEl.parentElement) as HTMLElement | null;

              if (qContainer) {
                const qUserEl = qContainer.querySelector('div[data-testid="User-Name"]');
                let qName = '';
                let qUsername = '';
                if (qUserEl) {
                  const qFullText = qUserEl.textContent || '';
                  const qMatch = qFullText.match(/@([A-Za-z0-9_]+)/);
                  if (qMatch) {
                    qUsername = qMatch[1];
                    qName = qFullText.split('@')[0].trim() || `@${qUsername}`;
                  }
                }
                const qAvatarImg = (qContainer.querySelector('img[src*="profile_images"]') || qContainer.querySelector('div[style*="profile_images"]')) as any;
                let qAvatar = '';
                if (qAvatarImg) {
                  qAvatar = qAvatarImg.src || qAvatarImg.currentSrc || '';
                  if (!qAvatar && qAvatarImg.style?.backgroundImage) {
                    const m = qAvatarImg.style.backgroundImage.match(/url\(["']?([^"']+)["']?\)/);
                    if (m) qAvatar = m[1];
                  }
                }
                if (!qAvatar) {
                  qAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(qName || qUsername || 'X')}&background=1d9bf0&color=fff&bold=true`;
                }
                const qTimeEl = qContainer.querySelector('time');
                const qCreatedAt = qTimeEl?.getAttribute('datetime') || undefined;

                const qPhotos: any[] = [];
                qContainer.querySelectorAll('div[data-testid="tweetPhoto"] img').forEach((img: any) => {
                  if (img.src && !img.src.includes('profile_images')) {
                    qPhotos.push({
                      type: 'image',
                      url: img.src,
                      previewUrl: img.src,
                      aspectRatio: '16:9',
                    });
                  }
                });

                quotedPost = {
                  id: `quote-${tweetId}`,
                  author: {
                    id: qUsername || 'quoted',
                    name: qName || `@${qUsername || 'Auteur'}`,
                    username: qUsername || 'inconnu',
                    avatarUrl: qAvatar,
                    verified: !!qContainer.querySelector('svg[data-testid="icon-verified"]'),
                  },
                  text: (qTextEl.textContent || '').trim(),
                  createdAt: qCreatedAt,
                  media: qPhotos.length > 0 ? qPhotos : undefined,
                  postUrl: tweetUrl,
                };
              }
            }

            list.push({
              id: tweetId,
              platform: 'twitter',
              type: 'tweet',
              author: {
                id: username,
                name,
                username,
                avatarUrl,
                verified: !!art.querySelector('svg[data-testid="icon-verified"]'),
              },
              text,
              createdAt,
              stats: {
                comments: 0,
                sharesOrRetweets: 0,
                likes: 0,
              },
              media: mediaList.length > 0 ? mediaList : undefined,
              postUrl: tweetUrl || `https://x.com/${username}/status/${tweetId}`,
              retweetedBy,
              quotedPost,
            });
          } catch (e) {}
        });

        return list;
      });

      return tweetsData;
    } catch {
      return [];
    }
  }

  /**
   * Fil d'actualité personnel (requiert une connexion à X)
   * Modes : 'for_you' (Pour vous), 'following_latest' (Abonnements - Récents), 'following_top' (Abonnements - Populaire)
   */
  public async getHomeFeed(feedMode: 'for_you' | 'following_latest' | 'following_top' = 'for_you', forceRefresh = false): Promise<FeedResponse> {
    const cacheKey = `twitter:feed:home:${feedMode}`;
    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return { platform: 'twitter', posts: cached.data, source: 'cache', cachedAt: new Date(cached.timestamp).toISOString() };
      }
    }

    const auth = await playwrightManager.checkSession('twitter');
    if (!auth.isAuthenticated) {
      return { platform: 'twitter', posts: [], source: 'live', message: 'Connexion requise pour le fil d’accueil X. Cliquez sur l’icône 𝕏 dans la barre latérale.' };
    }

    try {
      const posts = await playwrightManager.executeWithLock('twitter', async (ctx) => {
        const page = await ctx.newPage();
        const captured: SocialPost[] = [];

        page.on('response', async (response) => {
          try {
            const url = response.url();
            if (url.includes('/graphql/')) {
              const contentType = response.headers()['content-type'] || '';
              if (contentType.includes('application/json')) {
                // En mode Abonnements récents, ne pas capturer le flux HomeTimeline algorithmique (Pour vous)
                if (feedMode === 'following_latest' && url.includes('HomeTimeline') && !url.includes('HomeLatestTimeline')) {
                  return;
                }

                if (url.includes('Timeline') || url.includes('HomeLatestTimeline') || url.includes('HomeTimeline')) {
                  const json = await response.json();
                  captured.push(...this.extractTweetsFromGraphQLResponse(json));
                }
              }
            }
          } catch (e) {}
        });

        try {
          await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(1500);

          if (feedMode === 'for_you') {
            const forYouTab = page.locator('div[role="tablist"] [role="tab"], div[role="tablist"] a').filter({ hasText: /Pour vous|For you/i });
            if (await forYouTab.count() > 0) {
              await forYouTab.first().click().catch(() => {});
              await page.waitForTimeout(1500);
            }
          } else {
            // Mode Abonnements / Récents / Populaire : Vider le buffer initial issu de "Pour vous"
            captured.length = 0;

            // 1. Cliquer sur l'onglet "Trier par" ou "Abonnements"
            const sortTab = page.locator('div[role="tablist"] [role="tab"], div[role="tablist"] a').filter({ hasText: /Trier par|Abonnements|Following|Sort by/i });
            if (await sortTab.count() > 0) {
              await sortTab.first().click().catch(() => {});
              await page.waitForTimeout(600);
            } else {
              const allTabs = page.locator('div[role="tablist"] [role="tab"], div[role="tablist"] a');
              if (await allTabs.count() > 1) {
                await allTabs.nth(1).click().catch(() => {});
                await page.waitForTimeout(600);
              }
            }

            // 2. Sélectionner l'option dans le menu déroulant (Populaire vs Récents)
            if (feedMode === 'following_top') {
              const popOption = page.locator('[role="menuitem"], [role="option"], div[role="button"]').filter({ hasText: /Populaire|Top/i });
              if (await popOption.count() > 0) {
                captured.length = 0;
                await popOption.first().click().catch(() => {});
                await page.waitForTimeout(1500);
              }
            } else {
              // Mode Récents
              const recentsOption = page.locator('[role="menuitem"], [role="option"], div[role="button"]').filter({ hasText: /Récents|Recent|Latest|Chronologique/i });
              if (await recentsOption.count() > 0) {
                captured.length = 0;
                await recentsOption.first().click().catch(() => {});
                await page.waitForTimeout(1500);
              }
            }
          }

          await page.waitForTimeout(2000);

          if (captured.length === 0) {
            captured.push(...(await this.extractFromDOM(page)));
          }
        } finally {
          await page.close();
        }

        // Déduplication
        const uniqueMap = new Map<string, SocialPost>();
        for (const p of captured) {
          if (!uniqueMap.has(p.id)) {
            uniqueMap.set(p.id, p);
          }
        }
        let result = Array.from(uniqueMap.values());

        // Tri chronologique strict (le plus récent en haut) pour le mode Récents
        if (feedMode === 'following_latest') {
          result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return result;
      });

      if (posts.length > 0) {
        cacheManager.set(cacheKey, posts, 'live');
        return { platform: 'twitter', posts, source: 'live' };
      } else {
        return { platform: 'twitter', posts: [], source: 'live', message: 'Aucun tweet trouvé sur ce fil.' };
      }
    } catch (error: any) {
      return { platform: 'twitter', posts: [], source: 'live', message: error.message };
    }
  }

  /**
   * Recherche publique de tweets par Hashtag ou Mot-clé (ne nécessite pas de connexion préalable)
   */
  public async searchFeed(query: string, forceRefresh = false): Promise<FeedResponse> {
    const cleanQuery = query.trim() || 'Tech';
    const cacheKey = `twitter:search:${cleanQuery.toLowerCase()}`;

    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return { platform: 'twitter', posts: cached.data, source: 'cache', cachedAt: new Date(cached.timestamp).toISOString() };
      }
    }

    try {
      const posts = await playwrightManager.executeWithLock('twitter', async (ctx) => {
        const page = await ctx.newPage();
        const captured: SocialPost[] = [];

        page.on('response', async (response) => {
          try {
            const url = response.url();
            if (url.includes('/graphql/') || url.includes('/SearchTimeline') || url.includes('/TweetDetail')) {
              const contentType = response.headers()['content-type'] || '';
              if (contentType.includes('application/json')) {
                const json = await response.json();
                captured.push(...this.extractTweetsFromGraphQLResponse(json));
              }
            }
          } catch (e) {}
        });

        try {
          const targetUrl = cleanQuery.startsWith('#')
            ? `https://x.com/search?q=${encodeURIComponent(cleanQuery)}&f=live`
            : `https://x.com/search?q=${encodeURIComponent(cleanQuery)}&f=live`;

          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await page.waitForTimeout(3500);

          if (captured.length === 0) {
            captured.push(...(await this.extractFromDOM(page)));
          }
        } finally {
          await page.close();
        }

        return captured;
      });

      if (posts.length > 0) {
        cacheManager.set(cacheKey, posts, 'live');
        return { platform: 'twitter', posts, source: 'live' };
      }
    } catch (e) {}

    // Fallback automatique via miroirs Nitter RSS si Playwright retourne 0 post (sans login)
    const fallbackPosts = await this.fetchNitterFallback(cleanQuery, 'search');
    if (fallbackPosts.length > 0) {
      cacheManager.set(cacheKey, fallbackPosts, 'live');
      return {
        platform: 'twitter',
        posts: fallbackPosts,
        source: 'live',
        message: `Flux récupéré via miroir public Nitter pour "${cleanQuery}".`,
      };
    }

    return { 
      platform: 'twitter', 
      posts: [], 
      source: 'live', 
      message: `Recherche pour "${cleanQuery}" effectuée. Connectez-vous à 𝕏 via la barre latérale ou collez votre auth_token.` 
    };
  }

  /**
   * Récupère les tweets publics d'un compte spécifique
   */
  public async getUserFeed(username: string, forceRefresh = false): Promise<FeedResponse> {
    const cleanUser = username.replace('@', '').trim();
    if (!cleanUser) {
      return { platform: 'twitter', posts: [], source: 'live', message: 'Nom d’utilisateur X manquant.' };
    }

    const cacheKey = `twitter:user:${cleanUser.toLowerCase()}`;
    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return { platform: 'twitter', posts: cached.data, source: 'cache', cachedAt: new Date(cached.timestamp).toISOString() };
      }
    }

    try {
      const posts = await playwrightManager.executeWithLock('twitter', async (ctx) => {
        const page = await ctx.newPage();
        const captured: SocialPost[] = [];

        page.on('response', async (response) => {
          try {
            const url = response.url();
            if (url.includes('/graphql/') || url.includes('/UserTweets')) {
              const contentType = response.headers()['content-type'] || '';
              if (contentType.includes('application/json')) {
                const json = await response.json();
                captured.push(...this.extractTweetsFromGraphQLResponse(json));
              }
            }
          } catch (e) {}
        });

        try {
          await page.goto(`https://x.com/${cleanUser}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await page.waitForTimeout(3500);

          if (captured.length === 0) {
            captured.push(...(await this.extractFromDOM(page)));
          }
        } finally {
          await page.close();
        }

        return captured;
      });

      if (posts.length > 0) {
        cacheManager.set(cacheKey, posts, 'live');
        return { platform: 'twitter', posts, source: 'live' };
      }
    } catch (e) {}

    // Fallback Nitter user RSS
    const fallbackPosts = await this.fetchNitterFallback(cleanUser, 'user');
    if (fallbackPosts.length > 0) {
      cacheManager.set(cacheKey, fallbackPosts, 'live');
      return { platform: 'twitter', posts: fallbackPosts, source: 'live', message: `Tweets de @${cleanUser} récupérés.` };
    }

    return this.searchFeed(`from:${cleanUser}`, forceRefresh);
  }

  /**
   * Fallback serveur via plusieurs instances Nitter RSS
   */
  private async fetchNitterFallback(queryOrUser: string, mode: 'search' | 'user'): Promise<SocialPost[]> {
    const cleanStr = queryOrUser.trim();
    if (!cleanStr) return [];

    const encoded = encodeURIComponent(cleanStr);
    const instances = mode === 'search' 
      ? [
          `https://nitter.poast.org/search/rss?f=tweets&q=${encoded}`,
          `https://xcancel.com/search/rss?f=tweets&q=${encoded}`,
          `https://nitter.privacydev.net/search/rss?f=tweets&q=${encoded}`,
        ]
      : [
          `https://nitter.poast.org/${cleanStr}/rss`,
          `https://xcancel.com/${cleanStr}/rss`,
          `https://nitter.privacydev.net/${cleanStr}/rss`,
        ];

    for (const url of instances) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
        clearTimeout(timeoutId);

        if (res.ok) {
          const xml = await res.text();
          const posts = this.parseNitterRSS(xml);
          if (posts.length > 0) return posts;
        }
      } catch (e) {}
    }

    return [];
  }

  /**
   * Parseur XML RSS Nitter vers cartes SocialPost
   */
  private parseNitterRSS(xml: string): SocialPost[] {
    const posts: SocialPost[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1];

      const titleMatch = itemContent.match(/<title>(.*?)<\/title>/s);
      const linkMatch = itemContent.match(/<link>(.*?)<\/link>/s);
      const creatorMatch = itemContent.match(/<dc:creator>(.*?)<\/dc:creator>/s) || itemContent.match(/<author>(.*?)<\/author>/s);
      const dateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/s);
      const descMatch = itemContent.match(/<description>(.*?)<\/description>/s);

      let rawTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
      let postUrl = linkMatch ? linkMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
      let authorUsername = creatorMatch ? creatorMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace('@', '').trim() : '';
      let createdAt = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();
      let desc = descMatch ? descMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';

      let authorName = '';

      // Extraction du nom d'affichage et du pseudo depuis le titre Nitter (ex: "La Brigade Marseillaise (@LaBrigadeMarsei): ...")
      const titleAuthorMatch = rawTitle.match(/^(.*?)\s*\(@([A-Za-z0-9_]+)\):/);
      if (titleAuthorMatch) {
        authorName = titleAuthorMatch[1].trim();
        if (!authorUsername || authorUsername === 'x_user') {
          authorUsername = titleAuthorMatch[2].trim();
        }
      }

      if (!authorUsername && rawTitle.includes('RTo @')) {
        const parts = rawTitle.split('RTo @');
        authorUsername = parts[1]?.split(':')[0]?.trim() || '';
      }

      if (!authorUsername && rawTitle.includes(':')) {
        const parts = rawTitle.split(':');
        authorName = parts[0].trim();
        authorUsername = authorName.replace('@', '').trim();
      }

      if (!authorUsername || authorUsername === 'user') authorUsername = 'x_user';
      if (!authorName) authorName = authorUsername !== 'x_user' ? `@${authorUsername}` : 'Anonyme X';

      // Nettoyage du texte du tweet
      let cleanText = desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (titleAuthorMatch && rawTitle.includes(':')) {
        const tweetTextFromTitle = rawTitle.substring(rawTitle.indexOf(':') + 1).trim();
        if (tweetTextFromTitle && (!cleanText || cleanText.length < tweetTextFromTitle.length)) {
          cleanText = tweetTextFromTitle;
        }
      }

      const media: any[] = [];
      let detectedAvatarUrl = '';
      const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
      let imgMatch;
      while ((imgMatch = imgRegex.exec(desc)) !== null) {
        const imgSrc = imgMatch[1];
        if (imgSrc) {
          if (imgSrc.includes('profile_images')) {
            if (!detectedAvatarUrl) {
              if (imgSrc.includes('profile_images%2F')) {
                const rawPath = imgSrc.split('profile_images%2F')[1];
                detectedAvatarUrl = `https://pbs.twimg.com/profile_images/${decodeURIComponent(rawPath)}`.replace('_normal.', '_bigger.');
              } else {
                detectedAvatarUrl = imgSrc.replace('_normal.', '_bigger.');
              }
            }
          } else if (!imgSrc.includes('pic.twitter.com')) {
            media.push({
              type: 'image',
              url: imgSrc,
              previewUrl: imgSrc,
              aspectRatio: '16:9',
            });
          }
        }
      }

      if (!detectedAvatarUrl) {
        detectedAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName || authorUsername)}&background=1d9bf0&color=fff&bold=true`;
      }

      const postId = postUrl.split('/status/')[1]?.split('#')[0] || `nitter-${Date.now()}-${posts.length}`;

      posts.push({
        id: postId,
        platform: 'twitter',
        type: 'tweet',
        author: {
          id: authorUsername,
          name: authorName,
          username: authorUsername,
          avatarUrl: detectedAvatarUrl,
        },
        text: cleanText || rawTitle,
        createdAt,
        stats: { likes: 0, comments: 0 },
        media: media.length > 0 ? media : undefined,
        postUrl: postUrl ? postUrl.replace(/nitter\.[^\/]+/, 'x.com') : `https://x.com/${authorUsername}/status/${postId}`,
      });
    }

    return posts;
  }

  /**
   * Récupère le flux en direct d'une Liste X (URL ou ID de liste)
   * Ex: https://x.com/i/lists/899624369873354753 ou 899624369873354753
   */
  public async getListFeed(listIdOrUrl: string, forceRefresh = false): Promise<FeedResponse> {
    const listIdMatch = listIdOrUrl.match(/lists\/(\d+)/);
    const cleanListId = listIdMatch ? listIdMatch[1] : listIdOrUrl.trim().replace(/\D/g, '') || listIdOrUrl.trim();

    if (!cleanListId) {
      return { platform: 'twitter', posts: [], source: 'live', message: 'ID ou URL de liste X invalide.' };
    }

    const cacheKey = `twitter:list:${cleanListId}`;
    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return { platform: 'twitter', posts: cached.data, source: 'cache', cachedAt: new Date(cached.timestamp).toISOString() };
      }
    }

    const auth = await playwrightManager.checkSession('twitter');
    if (!auth.isAuthenticated) {
      return { platform: 'twitter', posts: [], source: 'live', message: 'Connexion à X requise pour afficher les Listes.' };
    }

    try {
      const posts = await playwrightManager.executeWithLock('twitter', async (ctx) => {
        const page = await ctx.newPage();
        const captured: SocialPost[] = [];
        let listTitle = '';

        page.on('response', async (response) => {
          try {
            const url = response.url();
            if (url.includes('/graphql/')) {
              const contentType = response.headers()['content-type'] || '';
              if (contentType.includes('application/json')) {
                if (url.includes('ListLatestTweetsTimeline') || url.includes('ListTweetsTimeline') || url.includes('Timeline')) {
                  const json = await response.json();
                  captured.push(...this.extractTweetsFromGraphQLResponse(json));
                }
                if (url.includes('ListByRestId')) {
                  try {
                    const json = await response.json();
                    const name = json.data?.list?.name;
                    if (name) listTitle = name;
                  } catch (e) {}
                }
              }
            }
          } catch (e) {}
        });

        try {
          const listUrl = `https://x.com/i/lists/${cleanListId}`;
          await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await page.waitForTimeout(3500);

          if (!listTitle) {
            try {
              const pageTitle = await page.title();
              const domName = await page.evaluate(() => {
                const h2 = document.querySelector('div[data-testid="header"] h2, h2[data-testid="header-detail"]');
                return h2 ? h2.textContent : '';
              });
              listTitle = domName || pageTitle.replace(/\s*\/\s*X$/, '').replace(/^\(\d+\)\s*/, '') || `Liste ${cleanListId}`;
            } catch (e) {}
          }

          if (captured.length === 0) {
            captured.push(...(await this.extractFromDOM(page)));
          }
        } finally {
          await page.close();
        }

        // Déduplication
        const uniqueMap = new Map<string, SocialPost>();
        for (const p of captured) {
          if (!uniqueMap.has(p.id)) {
            uniqueMap.set(p.id, p);
          }
        }
        const result = Array.from(uniqueMap.values());
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return result;
      });

      if (posts.length > 0) {
        cacheManager.set(cacheKey, posts, 'live');
        return { platform: 'twitter', posts, source: 'live' };
      } else {
        return { platform: 'twitter', posts: [], source: 'live', message: `Aucun tweet trouvé pour la liste ${cleanListId}.` };
      }
    } catch (err: any) {
      console.error('[TwitterService] Erreur getListFeed :', err);
      return { platform: 'twitter', posts: [], source: 'live', message: err.message || 'Erreur lors du chargement de la liste X.' };
    }
  }
}

export const twitterService = new TwitterService();
