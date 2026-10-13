import { Page } from 'playwright';
import { playwrightManager } from '../playwrightManager';
import { cacheManager } from '../cacheManager';
import { SocialPost, SocialMedia, FeedResponse, SocialAuthor, FeedMode } from '../types';

export class InstagramService {
  /**
   * Récupère les publications récentes d'un compte Instagram spécifique
   */
  public async getUserPosts(username: string, forceRefresh = false): Promise<FeedResponse> {
    const cleanUser = username.replace('@', '').trim();
    if (!cleanUser) {
      return { platform: 'instagram', posts: [], source: 'live', message: 'Nom d’utilisateur Instagram manquant.' };
    }

    const cacheKey = `instagram:user:${cleanUser.toLowerCase()}`;
    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return { platform: 'instagram', posts: cached.data, source: 'cache', cachedAt: new Date(cached.timestamp).toISOString() };
      }
    }

    const auth = await playwrightManager.checkSession('instagram');
    if (!auth.isAuthenticated) {
      return {
        platform: 'instagram',
        posts: [],
        source: 'live',
        message: 'Non connecté à Instagram. Cliquez sur l’icône Instagram dans la barre latérale gauche pour vous connecter.',
      };
    }

    try {
      const posts = await playwrightManager.executeWithLock('instagram', async (ctx) => {
        const page = await ctx.newPage();
        const capturedPosts: SocialPost[] = [];
        let realAuthorAvatar = '';
        let realAuthorName = `@${cleanUser}`;
        let isVerified = false;

        // 1. Interception des flux GraphQL et API web_profile_info
        page.on('response', async (response) => {
          try {
            const url = response.url();
            if (url.includes('/web_profile_info/') || url.includes('/graphql/query') || url.includes('/api/graphql') || url.includes('/api/v1/feed/user/')) {
              const contentType = response.headers()['content-type'] || '';
              if (contentType.includes('application/json')) {
                const json = await response.json();

                // 1. Format moderne Instagram : xdt_api__v1__feed__user_timeline_graphql_connection
                const timelineConn = json.data?.xdt_api__v1__feed__user_timeline_graphql_connection;
                if (timelineConn?.edges && Array.isArray(timelineConn.edges)) {
                  for (const edge of timelineConn.edges) {
                    const node = edge.node || edge;
                    const post = this.parseTimelineMedia(node);
                    if (post && !capturedPosts.some((p) => p.id === post.id || (p.postUrl && post.postUrl && p.postUrl === post.postUrl))) {
                      if (node.user) {
                        realAuthorAvatar = node.user.profile_pic_url || node.user.profile_pic_url_hd || realAuthorAvatar;
                        realAuthorName = node.user.full_name || realAuthorName;
                        isVerified = node.user.is_verified || isVerified;
                      }
                      post.author.id = cleanUser;
                      post.author.username = cleanUser;
                      post.author.name = realAuthorName;
                      post.author.avatarUrl = realAuthorAvatar || post.author.avatarUrl;
                      post.author.verified = isVerified;
                      capturedPosts.push(post);
                    }
                  }
                }

                // 2. Format alternatif user / edge_owner_to_timeline_media
                const userNode = json.data?.user || json.user;
                if (userNode) {
                  realAuthorAvatar = userNode.profile_pic_url_hd || userNode.profile_pic_url || realAuthorAvatar;
                  realAuthorName = userNode.full_name || realAuthorName;
                  isVerified = userNode.is_verified || false;

                  const edges = userNode.edge_owner_to_timeline_media?.edges || json.items || [];
                  for (const edge of edges) {
                    const node = edge.node || edge;
                    const post = this.parseTimelineMedia(node);
                    if (post && !capturedPosts.some((p) => p.id === post.id || (p.postUrl && post.postUrl && p.postUrl === post.postUrl))) {
                      post.author.id = cleanUser;
                      post.author.username = cleanUser;
                      post.author.name = realAuthorName;
                      post.author.avatarUrl = realAuthorAvatar || post.author.avatarUrl;
                      post.author.verified = isVerified;
                      if (userNode.edge_followed_by?.count) {
                        post.author.subscribersOrFollowers = `${userNode.edge_followed_by.count} abonnés`;
                      }
                      capturedPosts.push(post);
                    }
                  }
                }
              }
            }
          } catch (e) {}
        });

        try {
          await page.goto(`https://www.instagram.com/${cleanUser}/`, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await page.waitForTimeout(3000);

          // 2. Récupération de la photo de profil réelle et des données depuis la page
          const domHeaderData = await page.evaluate(() => {
            const headerImg = (document.querySelector('header img') || 
                               document.querySelector('img[alt*="photo de profil"]') || 
                               document.querySelector('img[alt*="profile picture"]')) as HTMLImageElement;
            const headerNameEl = document.querySelector('header h2, header h1');
            return {
              avatarUrl: headerImg ? headerImg.src : '',
              name: headerNameEl ? headerNameEl.textContent || '' : '',
            };
          });

          if (domHeaderData.avatarUrl) {
            realAuthorAvatar = domHeaderData.avatarUrl;
          }
          if (domHeaderData.name) {
            realAuthorName = domHeaderData.name;
          }

          // Si GraphQL n'a pas encore capté de posts, tentative d'appel direct
          if (capturedPosts.length === 0) {
            try {
              const profileData = await page.evaluate(async (user) => {
                try {
                  const res = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${user}`, {
                    headers: {
                      'x-ig-app-id': '936619743392459',
                      'x-requested-with': 'XMLHttpRequest',
                    },
                  });
                  if (res.ok) return await res.json();
                } catch (e) {}
                return null;
              }, cleanUser);

              if (profileData?.data?.user) {
                const u = profileData.data.user;
                realAuthorAvatar = u.profile_pic_url_hd || u.profile_pic_url || realAuthorAvatar;
                realAuthorName = u.full_name || realAuthorName;
                isVerified = u.is_verified || false;

                const edges = u.edge_owner_to_timeline_media?.edges || [];
                for (const edge of edges) {
                  const node = edge.node;
                  const isVideo = node.is_video;
                  const displayUrl = node.display_url || node.thumbnail_src;
                  const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || '';
                  const shortcode = node.shortcode;

                  if (displayUrl && !capturedPosts.some((p) => p.id === (node.id || shortcode))) {
                    capturedPosts.push({
                      id: node.id || `ig-${shortcode}`,
                      platform: 'instagram',
                      type: isVideo ? 'reel' : 'post',
                      author: {
                        id: cleanUser,
                        name: realAuthorName,
                        username: cleanUser,
                        avatarUrl: realAuthorAvatar,
                        verified: isVerified,
                      },
                      text: caption,
                      createdAt: node.taken_at_timestamp ? new Date(node.taken_at_timestamp * 1000).toISOString() : new Date().toISOString(),
                      stats: {
                        likes: node.edge_liked_by?.count || 0,
                        comments: node.edge_media_to_comment?.count || 0,
                        views: node.video_view_count || undefined,
                      },
                      media: [
                        {
                          type: isVideo ? 'video' : 'image',
                          url: displayUrl,
                          previewUrl: displayUrl,
                          aspectRatio: isVideo ? '9:16' : '4:5',
                        },
                      ],
                      postUrl: `https://www.instagram.com/p/${shortcode}/`,
                    });
                  }
                }
              }
            } catch (e) {}
          }

          // 3. Extraction DOM de secours
          if (capturedPosts.length === 0) {
            const domPosts = await this.extractFromDOM(page, cleanUser, realAuthorAvatar, realAuthorName);
            capturedPosts.push(...domPosts);
          }
        } finally {
          await page.close();
        }

        // Mettre à jour les avatars réels sur les posts capturés
        return capturedPosts.map((p) => ({
          ...p,
          author: {
            ...p.author,
            avatarUrl: realAuthorAvatar || p.author.avatarUrl,
            name: realAuthorName || p.author.name,
          },
        }));
      });

      if (posts.length > 0) {
        cacheManager.set(cacheKey, posts, 'live');
        return { platform: 'instagram', posts, source: 'live' };
      } else {
        return {
          platform: 'instagram',
          posts: [],
          source: 'live',
          message: `Aucun post trouvé pour @${cleanUser} ou compte privé.`,
        };
      }
    } catch (err: any) {
      console.error('[InstagramService] Erreur scraping :', err);
      return { platform: 'instagram', posts: [], source: 'live', message: err.message || 'Erreur lors du scraping Instagram' };
    }
  }

  /**
   * Récupère le fil d'actualité Instagram (Pour vous ou Suivi(e)s)
   * Modes : 'for_you' (?variant=home) ou 'following_latest' (?variant=following)
   */
  public async getHomeFeed(mode: FeedMode = 'for_you', forceRefresh = false): Promise<FeedResponse> {
    const cacheKey = `instagram:feed:home:${mode}`;
    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return { platform: 'instagram', posts: cached.data, source: 'cache', cachedAt: new Date(cached.timestamp).toISOString() };
      }
    }

    const auth = await playwrightManager.checkSession('instagram');
    if (!auth.isAuthenticated) {
      return {
        platform: 'instagram',
        posts: [],
        source: 'live',
        message: 'Non connecté à Instagram. Cliquez sur l’icône Instagram dans la barre latérale pour vous connecter.',
      };
    }

    try {
      const posts = await playwrightManager.executeWithLock('instagram', async (ctx) => {
        const page = await ctx.newPage();
        const capturedTimeline: SocialPost[] = [];

        // Helper pour extraire récursivement les objets média des réponses JSON Instagram
        const extractMediaNodes = (obj: any): any[] => {
          const nodes: any[] = [];
          if (!obj || typeof obj !== 'object') return nodes;

          // Si c'est un post valide (avec ID/shortcode et auteur/caption/carrousel)
          if (obj.media_or_ad) {
            nodes.push(obj.media_or_ad);
          } else if (obj.node && (obj.node.id || obj.node.shortcode) && (obj.node.user || obj.node.owner || obj.node.edge_media_to_caption || obj.node.caption || obj.node.carousel_media || obj.node.edge_sidecar_to_children)) {
            nodes.push(obj.node);
          } else if (obj.id && (obj.user || obj.owner || obj.caption || obj.edge_media_to_caption || obj.carousel_media || obj.edge_sidecar_to_children)) {
            nodes.push(obj);
          }

          // Ne pas descendre dans les sous-structures internes d'un post pour éviter les doublons de carrousel
          const blockedKeys = new Set([
            'user', 'owner', 'caption', 'edge_media_to_caption',
            'carousel_media', 'edge_sidecar_to_children', 'sidecar_children',
            'image_versions2', 'video_versions', 'candidates', 'display_resources'
          ]);

          for (const key of Object.keys(obj)) {
            if (blockedKeys.has(key)) continue;

            if (Array.isArray(obj[key])) {
              for (const item of obj[key]) {
                nodes.push(...extractMediaNodes(item));
              }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
              nodes.push(...extractMediaNodes(obj[key]));
            }
          }
          return nodes;
        };

        // Interception des réponses timeline GraphQL & API
        page.on('response', async (response) => {
          try {
            const url = response.url();
            if (url.includes('/graphql/query') || url.includes('/api/v1/feed/') || url.includes('/feed/')) {
              const contentType = response.headers()['content-type'] || '';
              if (contentType.includes('application/json')) {
                const json = await response.json();
                const mediaNodes = extractMediaNodes(json);

                for (const mediaNode of mediaNodes) {
                  if (mediaNode && (mediaNode.id || mediaNode.code || mediaNode.shortcode)) {
                    const post = this.parseTimelineMedia(mediaNode);
                    if (post && !capturedTimeline.some((p) => p.id === post.id || (p.postUrl && post.postUrl && p.postUrl === post.postUrl))) {
                      capturedTimeline.push(post);
                    }
                  }
                }
              }
            }
          } catch (e) {}
        });

        try {
          const targetUrl = mode === 'following_latest' 
            ? 'https://www.instagram.com/?variant=following' 
            : 'https://www.instagram.com/?variant=home';

          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
          // Laisser le temps aux requêtes initiales GraphQL et aux médias de s'initialiser
          await page.waitForTimeout(4000);

          // Défilement fluide pour forcer le chargement de toutes les images et des posters de vidéos
          for (let i = 0; i < 5; i++) {
            await page.evaluate(() => window.scrollBy(0, 800));
            await page.waitForTimeout(1200);
          }

          // Remonter légèrement pour s'assurer que les premiers articles dans le DOM ont leurs images/avatars chargés
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(1000);

          // Extraction DOM si GraphQL est différé ou incomplet
          if (capturedTimeline.length < 15) {
            const domFeed = await this.extractTimelineFromDOM(page);
            for (const dp of domFeed) {
              if (!capturedTimeline.some((p) => p.id === dp.id || (p.postUrl && dp.postUrl && p.postUrl === dp.postUrl))) {
                capturedTimeline.push(dp);
              }
            }
          }
        } finally {
          await page.close();
        }

        // Tri chronologique strict (plus récent en haut) pour le mode Suivi(e)s
        if (mode === 'following_latest') {
          capturedTimeline.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return capturedTimeline;
      });

      if (posts.length > 0) {
        cacheManager.set(cacheKey, posts, 'live');
        return { platform: 'instagram', posts, source: 'live' };
      } else {
        return {
          platform: 'instagram',
          posts: [],
          source: 'live',
          message: 'Aucun post trouvé sur votre fil d’actualité Instagram.',
        };
      }
    } catch (err: any) {
      return { platform: 'instagram', posts: [], source: 'live', message: err.message };
    }
  }

  public async getFollowingFeed(forceRefresh = false): Promise<FeedResponse> {
    return this.getHomeFeed('following_latest', forceRefresh);
  }

  private parseTimelineMedia(node: any): SocialPost | null {
    if (!node) return null;
    const isVideo = Boolean(node.is_video || node.media_type === 2 || node.video_versions);

    const mediaList: SocialMedia[] = [];

    // 1. Carrousel Instagram (Multi-photos / multi-vidéos)
    const carouselItems = node.carousel_media || node.edge_sidecar_to_children?.edges || node.sidecar_children || [];
    if (Array.isArray(carouselItems) && carouselItems.length > 0) {
      for (const item of carouselItems) {
        const child = item.node || item;
        const isChildVideo = Boolean(child.is_video || child.media_type === 2 || child.video_versions);
        const childUrl = child.image_versions2?.candidates?.[0]?.url ||
                         child.display_url ||
                         child.display_resources?.[child.display_resources.length - 1]?.src ||
                         child.thumbnail_src ||
                         child.video_versions?.[0]?.url;
        if (childUrl) {
          mediaList.push({
            type: isChildVideo ? 'video' : 'image',
            url: childUrl,
            previewUrl: childUrl,
            aspectRatio: isChildVideo ? '9:16' : '4:5',
          });
        }
      }
    }

    // 2. Média unique si aucun carrousel
    if (mediaList.length === 0) {
      const displayUrl = node.image_versions2?.candidates?.[0]?.url || 
                         node.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url || 
                         node.carousel_media?.[0]?.display_url || 
                         node.display_url || 
                         node.display_resources?.[node.display_resources.length - 1]?.src || 
                         node.thumbnail_src || 
                         node.video_versions?.[0]?.url;
      if (displayUrl) {
        mediaList.push({
          type: isVideo ? 'video' : 'image',
          url: displayUrl,
          previewUrl: displayUrl,
          aspectRatio: isVideo ? '9:16' : '4:5',
        });
      }
    }

    const user = node.user || node.owner || node.caption?.user || {};
    const username = user.username || user.screen_name || '';
    const fullName = user.full_name || user.name || (username ? `@${username}` : 'Instagram');
    const avatarUrl = user.profile_pic_url_hd || user.profile_pic_url || (username ? `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=e1306c&color=fff&bold=true` : 'https://abs.twimg.com/sticky/default_profile_images/default_profile_bigger.png');
    const shortcode = node.shortcode || node.code || node.id;
    const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || node.caption?.text || node.title || '';

    return {
      id: node.id || `ig-${shortcode}`,
      platform: 'instagram',
      type: isVideo ? 'reel' : 'post',
      author: {
        id: username || 'user',
        name: fullName,
        username: username || 'instagram',
        avatarUrl,
        verified: user.is_verified || false,
      },
      text: caption,
      createdAt: node.taken_at_timestamp || node.taken_at ? new Date((node.taken_at_timestamp || node.taken_at) * 1000).toISOString() : new Date().toISOString(),
      stats: {
        likes: node.edge_liked_by?.count || node.like_count || 0,
        comments: node.edge_media_to_comment?.count || node.comment_count || 0,
        views: node.video_view_count || node.play_count || undefined,
      },
      media: mediaList.length > 0 ? mediaList : undefined,
      postUrl: `https://www.instagram.com/p/${shortcode}/`,
    };
  }

  /**
   * Extraction des articles de la timeline d'abonnements depuis le DOM
   */
  private async extractTimelineFromDOM(page: Page): Promise<SocialPost[]> {
    try {
      const posts = await page.evaluate(() => {
        const articles = document.querySelectorAll('article, div[role="presentation"] > div > div > article, main article');
        const list: any[] = [];

        articles.forEach((art, idx) => {
          try {
            // 1. Détection de l'auteur et de l'avatar
            const header = art.querySelector('header') || art.querySelector('div[role="button"]:has(img)');
            const allArticleImgs = Array.from(art.querySelectorAll('img'));
            
            // Trouver l'image d'avatar : dans le header, ou image avec alt contenant profile/profil, ou première petite image carrée (<70px)
            let avatarImg = (header ? header.querySelector('img') : null) ||
                            allArticleImgs.find(img => {
                              const alt = (img.alt || '').toLowerCase();
                              if (alt.includes('profil') || alt.includes('profile')) return true;
                              const rect = img.getBoundingClientRect();
                              return rect.width > 0 && rect.width <= 70 && rect.height > 0 && rect.height <= 70;
                            }) as HTMLImageElement || null;

            let avatarUrl = avatarImg ? (avatarImg.src || avatarImg.currentSrc || '') : '';
            let authorUsername = '';
            let authorName = '';

            // Si l'avatar est dans un élément avec style background-image
            if (!avatarUrl) {
              const bgAvatarCandidates = Array.from(art.querySelectorAll('span[style*="background-image"], div[style*="background-image"], canvas + div[style*="background-image"]'));
              for (const el of bgAvatarCandidates) {
                const rect = el.getBoundingClientRect();
                if (rect.width <= 75) {
                  const style = el.getAttribute('style') || '';
                  const m = style.match(/background-image:\s*url\(["']?([^"']+)["']?\)/i);
                  if (m && m[1] && m[1].startsWith('http')) {
                    avatarUrl = m[1];
                    break;
                  }
                }
              }
            }

            // Extraction du username depuis l'alt de l'avatar
            if (avatarImg && avatarImg.alt) {
              const m1 = avatarImg.alt.match(/photo de profil de\s+([A-Za-z0-9_.]+)/i);
              const m2 = avatarImg.alt.match(/([A-Za-z0-9_.]+)'s profile picture/i);
              const m3 = avatarImg.alt.match(/profile picture of\s+([A-Za-z0-9_.]+)/i);
              if (m1 && m1[1]) authorUsername = m1[1];
              else if (m2 && m2[1]) authorUsername = m2[1];
              else if (m3 && m3[1]) authorUsername = m3[1];
            }

            // Extraction du nom / username depuis les liens de l'article (hors liens de post /p/ ou /reel/)
            if (!authorUsername) {
              const profileLinks = Array.from(art.querySelectorAll('a[href]')).filter(l => {
                const href = l.getAttribute('href') || '';
                const clean = href.split('?')[0].replace(/^\/|\/$/g, '');
                return clean && !['explore', 'reels', 'stories', 'p', 'reel', 'direct', 'home', 'accounts', 'legal'].includes(clean) && !clean.includes('/');
              });

              if (profileLinks.length > 0) {
                const firstLink = profileLinks[0];
                const href = firstLink.getAttribute('href') || '';
                authorUsername = href.split('?')[0].replace(/^\/|\/$/g, '');
                const t = (firstLink.textContent || '').trim();
                if (t && t !== authorUsername) authorName = t;
              }
            }

            if (!authorUsername && header) {
              const headerText = header.textContent || '';
              const match = headerText.match(/([A-Za-z0-9_.]+)/);
              if (match && match[1] && !['explore', 'reels'].includes(match[1])) authorUsername = match[1];
            }

            if (!authorUsername) authorUsername = 'instagram_creator';
            if (!authorName) authorName = `@${authorUsername}`;

            // Si avatar non trouvé ou URL invalide, fallback SVG propre Instagram
            if (!avatarUrl || avatarUrl.includes('default_profile')) {
              avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorUsername)}&background=e1306c&color=fff&bold=true`;
            }

            // 2. Détection média (Images & Vidéos / Reels)
            let displayUrl = '';
            let isVideo = false;

            // A. Chercher dans les vidéos / Reels
            const videoEl = art.querySelector('video') as HTMLVideoElement;
            if (videoEl) {
              isVideo = true;
              const poster = videoEl.poster || videoEl.getAttribute('poster') || '';
              if (poster && poster.startsWith('http')) {
                displayUrl = poster;
              } else if (videoEl.src && videoEl.src.startsWith('http')) {
                displayUrl = videoEl.src;
              }
            }

            // B. Si pas de poster ou pas de vidéo, chercher dans les images de contenu (taille > 150px)
            if (!displayUrl) {
              const contentImgs = allArticleImgs.filter(img => {
                if (img === avatarImg) return false;
                const alt = (img.alt || '').toLowerCase();
                if (alt.includes('profil') || alt.includes('profile')) return false;
                const src = img.currentSrc || img.src || '';
                if (src.includes('profile_images') || src.includes('150x150')) return false;
                return src.startsWith('http') || Boolean(img.srcset);
              });

              for (const img of contentImgs) {
                if (img.srcset) {
                  const candidates = img.srcset.split(',').map(s => {
                    const parts = s.trim().split(/\s+/);
                    const w = parts[1] ? parseInt(parts[1].replace('w', ''), 10) : 0;
                    return { url: parts[0], width: w };
                  });
                  candidates.sort((a, b) => b.width - a.width);
                  if (candidates.length > 0 && candidates[0].url) {
                    displayUrl = candidates[0].url;
                    break;
                  }
                }
                const src = img.currentSrc || img.src;
                if (src && src.startsWith('http')) {
                  displayUrl = src;
                  break;
                }
              }
            }

            // C. Chercher dans les styles background-image des conteneurs média (taille > 150px)
            if (!displayUrl) {
              const bgElements = Array.from(art.querySelectorAll('div[style*="background-image"], span[style*="background-image"]'));
              for (const el of bgElements) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 120 || rect.height > 120) {
                  const style = el.getAttribute('style') || '';
                  const match = style.match(/background-image:\s*url\(["']?([^"']+)["']?\)/i);
                  if (match && match[1] && match[1].startsWith('http') && !match[1].includes('profile_images')) {
                    displayUrl = match[1];
                    break;
                  }
                }
              }
            }

            // 3. Shortcode / URL du post
            const postLinks = art.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');
            let postHref = '';
            let shortcode = '';
            postLinks.forEach((l) => {
              const href = l.getAttribute('href') || '';
              if (href.includes('/p/') || href.includes('/reel/')) {
                postHref = href;
                const match = href.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
                if (match && match[2]) shortcode = match[2];
                if (href.includes('/reel/')) isVideo = true;
              }
            });

            // 4. Extraction complète de la légende (Texte du post)
            let caption = '';

            const captionContainers = Array.from(art.querySelectorAll('h1, span[dir="auto"], div[dir="auto"], div > span')).filter(el => {
              if (header && header.contains(el)) return false;
              if (el.closest('header')) return false;
              if (el.closest('a[href*="/audio/"], a[href*="/music/"], a[href*="/explore/"]')) return false;
              if (el.closest('button')) return false;
              return true;
            });

            const rejectPatterns = [
              /^original audio$/i,
              /^audio d'origine$/i,
              /^son d'origine$/i,
              /^musique d'origine$/i,
              /^(voir|afficher) les \d+ commentaires/i,
              /^aimé par/i,
              /^liked by/i,
              /^\d+[\s\u00a0]*(j’aime|likes)/i,
              /^il y a \d+/i,
              /^[0-9]+$/,
            ];

            for (const el of captionContainers) {
              let t = (el.textContent || '').trim();
              if (!t || t.length < 2) continue;
              if (rejectPatterns.some(p => p.test(t))) continue;

              const authorPrefixRegex = new RegExp(`^(${authorUsername}|${authorName}|[A-Za-z0-9_.]+)\\s*(Verified|Vérifié)?\\s*`, 'i');
              if (authorPrefixRegex.test(t)) {
                t = t.replace(authorPrefixRegex, '').trim();
              }

              t = t.replace(/(\.\.\.|…)\s*(plus|more)$/i, '').trim();

              if (t && t.length > 2 && !rejectPatterns.some(p => p.test(t))) {
                if (!caption || t.length > caption.length) {
                  caption = t;
                }
              }
            }

            // Si aucune légende dans les spans ou trop courte (< 15 car.), vérifier l'attribut alt de l'image
            const altCandidates = allArticleImgs
              .filter(img => img !== avatarImg)
              .map(img => (img.getAttribute('alt') || '').trim())
              .filter(alt => alt.length > 5 && !alt.toLowerCase().includes('profil') && !alt.toLowerCase().includes('profile'));

            for (const altText of altCandidates) {
              let cleanAlt = altText.replace(/^Photo (de|partagée par) [^:]+:\s*/i, '').trim();
              const quoteMatch = cleanAlt.match(/[:"]\s*([^"]{8,})/);
              if (quoteMatch && quoteMatch[1]) {
                cleanAlt = quoteMatch[1].trim();
              }
              if (cleanAlt && (!caption || cleanAlt.length > caption.length)) {
                caption = cleanAlt;
              }
            }

            // 5. Date
            const timeEl = art.querySelector('time');
            const createdAt = timeEl ? timeEl.getAttribute('datetime') || new Date().toISOString() : new Date().toISOString();

            if (displayUrl || caption) {
              list.push({
                id: shortcode ? `ig-${shortcode}` : `ig-timeline-${idx}-${Date.now()}`,
                platform: 'instagram',
                type: isVideo ? 'reel' : 'post',
                author: {
                  id: authorUsername,
                  name: authorName,
                  username: authorUsername,
                  avatarUrl,
                  verified: !!(art.querySelector('svg[aria-label*="Vérifié"], svg[aria-label*="Verified"]') || art.querySelector('span[title*="Vérifié"]')),
                },
                text: caption,
                createdAt,
                stats: { likes: 0, comments: 0 },
                media: displayUrl
                  ? [
                      {
                        type: isVideo ? 'video' : 'image',
                        url: displayUrl,
                        previewUrl: displayUrl,
                        aspectRatio: isVideo ? '9:16' : '4:5',
                      },
                    ]
                  : undefined,
                postUrl: postHref ? (postHref.startsWith('http') ? postHref : `https://www.instagram.com${postHref}`) : 'https://www.instagram.com',
              });
            }
          } catch (e) {}
        });

        return list;
      });

      return posts;
    } catch {
      return [];
    }
  }

  /**
   * Extraction DOM profil utilisateur
   */
  private async extractFromDOM(page: Page, username: string, avatarUrl: string, name: string): Promise<SocialPost[]> {
    try {
      const posts = await page.evaluate(({ user, avatar, displayName }) => {
        const links = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');
        const list: any[] = [];

        links.forEach((link, idx) => {
          const img = link.querySelector('img') as HTMLImageElement;
          const href = link.getAttribute('href') || '';
          if (img && img.src && !list.some((item) => item.postUrl.includes(href))) {
            const isReel = href.includes('/reel/');
            // Calcul d'une date réaliste dans le passé (environ 1 jour d'écart par post si pas de date explicite)
            let postDate = new Date(Date.now() - (idx + 1) * 24 * 3600 * 1000).toISOString();
            const timeEl = link.closest('article')?.querySelector('time') || link.querySelector('time');
            if (timeEl && timeEl.getAttribute('datetime')) {
              postDate = timeEl.getAttribute('datetime')!;
            }

            list.push({
              id: `ig-dom-${idx}-${Date.now()}`,
              platform: 'instagram',
              type: isReel ? 'reel' : 'post',
              author: {
                id: user,
                name: displayName || `@${user}`,
                username: user,
                avatarUrl: avatar || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_bigger.png',
                verified: false,
              },
              text: img.alt || `Publication de @${user}`,
              createdAt: postDate,
              stats: { likes: 0, comments: 0 },
              media: [
                {
                  type: isReel ? 'video' : 'image',
                  url: img.src,
                  previewUrl: img.src,
                  aspectRatio: isReel ? '9:16' : '4:5',
                },
              ],
              postUrl: href.startsWith('http') ? href : `https://www.instagram.com${href}`,
            });
          }
        });

        return list;
      }, { user: username, avatar: avatarUrl, displayName: name });

      return posts;
    } catch {
      return [];
    }
  }

  /**
   * Recherche par hashtag Instagram
   */
  public async searchHashtag(tag: string, forceRefresh = false): Promise<FeedResponse> {
    const cleanTag = tag.replace('#', '').trim();
    return this.getUserPosts(`explore/tags/${cleanTag}`, forceRefresh);
  }
}

export const instagramService = new InstagramService();
