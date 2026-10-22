import { Router, Request, Response } from 'express';
import { twitterService } from '../services/twitterService';
import { youtubeService } from '../services/youtubeService';
import { instagramService } from '../services/instagramService';
import { tiktokService } from '../services/tiktokService';
import { blueskyService } from '../services/blueskyService';
import { threadsService } from '../services/threadsService';
import { redditService } from '../services/redditService';
import { cacheManager } from '../cacheManager';
import { playwrightManager } from '../playwrightManager';
import { Platform, FeedResponse } from '../types';
import { isPlatform, escapeHtml } from '../security';

const router = Router();

// Toute route /:platform/... n'accepte qu'une plateforme connue
router.param('platform', (req: Request, res: Response, next, value) => {
  if (!isPlatform(value)) {
    return res.status(400).json({ error: 'Plateforme inconnue' });
  }
  return next();
});

// GET /api/feed/:platform/user?id={username}
router.get('/:platform/user', async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform as Platform;
    const username = (req.query.id as string) || (req.query.username as string) || '';
    const forceRefresh = req.query.refresh === 'true';

    let feed: FeedResponse;
    const cursor = (req.query.cursor as string) || undefined;
    if (platform === 'youtube') {
      const filter = (req.query.filter as any) || 'all';
      feed = await youtubeService.getChannelFeed(username, filter, forceRefresh);
    } else if (platform === 'instagram') {
      feed = await instagramService.getUserPosts(username, forceRefresh);
    } else if (platform === 'tiktok') {
      feed = await tiktokService.getUserVideos(username, forceRefresh);
    } else if (platform === 'bluesky') {
      feed = await blueskyService.getUserFeed(username, forceRefresh, cursor);
    } else if (platform === 'threads') {
      feed = await threadsService.getUserFeed(username, forceRefresh);
    } else if (platform === 'reddit') {
      feed = await redditService.getUserFeed(username, forceRefresh, cursor);
    } else {
      feed = await twitterService.getUserFeed(username, forceRefresh);
    }

    return res.json(feed);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erreur lors de la récupération du compte' });
  }
});

// GET /api/feed/twitter/list?id={listIdOrUrl}
router.get('/twitter/list', async (req: Request, res: Response) => {
  try {
    const listIdOrUrl = (req.query.id as string) || (req.query.url as string) || '';
    const forceRefresh = req.query.refresh === 'true';
    const feed = await twitterService.getListFeed(listIdOrUrl, forceRefresh);
    return res.json(feed);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erreur lors de la récupération de la liste X' });
  }
});

// GET /api/feed/:platform/subscriptions
router.get('/:platform/subscriptions', async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform as Platform;
    const mode = (req.query.mode as any) || 'recent';
    const filter = (req.query.filter as any) || 'all';
    const forceRefresh = req.query.refresh === 'true';

    let feed: FeedResponse;
    if (platform === 'youtube') {
      feed = await youtubeService.getSubscriptionsFeed(mode, filter, forceRefresh);
    } else if (platform === 'twitter') {
      feed = await twitterService.getHomeFeed('following_latest', forceRefresh);
    } else if (platform === 'instagram') {
      feed = await instagramService.getHomeFeed('following_latest', forceRefresh);
    } else if (platform === 'bluesky') {
      feed = await blueskyService.getHomeFeed('for_you', forceRefresh);
    } else if (platform === 'reddit') {
      feed = await redditService.getHomeFeed('for_you', forceRefresh);
    } else {
      feed = await tiktokService.getHomeFeed('following', forceRefresh);
    }

    return res.json(feed);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erreur lors de la récupération des abonnements' });
  }
});

// GET /api/feed/:platform/search?q={query}
router.get('/:platform/search', async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform as Platform;
    const query = (req.query.q as string) || '';
    const forceRefresh = req.query.refresh === 'true';
    const cursor = (req.query.cursor as string) || undefined;

    let feed: FeedResponse;
    if (platform === 'youtube') {
      feed = await youtubeService.searchVideos(query, false, forceRefresh);
    } else if (platform === 'instagram') {
      feed = await instagramService.searchHashtag(query, forceRefresh);
    } else if (platform === 'tiktok') {
      feed = await tiktokService.searchHashtag(query, forceRefresh);
    } else if (platform === 'bluesky') {
      feed = await blueskyService.searchFeed(query, forceRefresh, cursor);
    } else if (platform === 'threads') {
      feed = await threadsService.searchFeed(query, forceRefresh);
    } else if (platform === 'reddit') {
      feed = await redditService.searchFeed(query, forceRefresh, cursor);
    } else {
      feed = await twitterService.searchFeed(query, forceRefresh);
    }

    return res.json(feed);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erreur lors de la recherche' });
  }
});

// GET /api/feed/:platform/home
router.get('/:platform/home', async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform as Platform;
    const mode = (req.query.mode as any) || 'for_you';
    const forceRefresh = req.query.refresh === 'true';

    const username = (req.query.username as string) || (req.query.id as string) || '';
    const cursor = (req.query.cursor as string) || undefined;

    let feed: FeedResponse;
    if (platform === 'youtube') {
      if (mode.startsWith('sub_') || mode === 'following_latest' || mode === 'subscriptions') {
        const filter = mode === 'sub_shorts' ? 'shorts' : (mode === 'sub_videos' ? 'videos' : 'all');
        feed = await youtubeService.getSubscriptionsFeed('recent', filter, forceRefresh);
      } else {
        feed = await youtubeService.getTrendingFeed(forceRefresh);
      }
    } else if (platform === 'instagram') {
      feed = await instagramService.getHomeFeed(mode, forceRefresh);
    } else if (platform === 'tiktok') {
      feed = await tiktokService.getHomeFeed(mode === 'following_latest' ? 'following' : 'for_you', forceRefresh);
    } else if (platform === 'bluesky') {
      feed = await blueskyService.getHomeFeed(mode, forceRefresh, username, cursor);
    } else if (platform === 'threads') {
      feed = await threadsService.getHomeFeed(mode, forceRefresh);
    } else if (platform === 'reddit') {
      feed = await redditService.getHomeFeed(mode, forceRefresh, username, cursor);
    } else {
      feed = await twitterService.getHomeFeed(mode, forceRefresh);
    }

    return res.json(feed);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erreur fil accueil' });
  }
});

// GET /api/feed/:platform/thread?id=...&url=... - Récupération de la conversation complète
router.get('/:platform/thread', async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform as Platform;
    const target = (req.query.id as string) || (req.query.url as string) || (req.query.uri as string) || '';
    const forceRefresh = req.query.refresh === 'true';

    if (!target) {
      return res.status(400).json({ error: 'Identifiant ou URL du post requis pour charger la conversation' });
    }

    if (platform === 'bluesky') {
      const thread = await blueskyService.getPostThread(target, forceRefresh);
      return res.json(thread);
    }

    if (platform === 'twitter') {
      const thread = await twitterService.getPostThread(target, forceRefresh);
      return res.json(thread);
    }

    if (platform === 'threads') {
      const thread = await threadsService.getPostThread(target, forceRefresh);
      return res.json(thread);
    }

    if (platform === 'reddit') {
      const thread = await redditService.getPostThread(target, forceRefresh);
      return res.json(thread);
    }

    return res.status(400).json({ error: `La vue conversation n'est pas encore disponible pour ${platform}` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erreur lors du chargement de la discussion' });
  }
});

// GET /api/feed/:platform/shorts
router.get('/:platform/shorts', async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform as Platform;
    const query = (req.query.q as string) || 'trending';
    const forceRefresh = req.query.refresh === 'true';

    let feed: FeedResponse;
    if (platform === 'youtube') {
      feed = await youtubeService.searchVideos(query, true, forceRefresh);
    } else if (platform === 'tiktok') {
      feed = await tiktokService.searchHashtag(query, forceRefresh);
    } else if (platform === 'instagram') {
      feed = await instagramService.getReelsFeed(forceRefresh);
    } else {
      feed = await twitterService.searchFeed(`${query} filter:media`, forceRefresh);
    }

    return res.json(feed);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erreur format court' });
  }
});

// GET /api/feed/viewer/twitter - Page HTML Proxy pour iframe sans connexion
router.get('/viewer/twitter', (req: Request, res: Response) => {
  const query = ((req.query.q as string) || '#MercatOM').trim();
  const cleanQ = query.startsWith('#') ? query : `#${query}`;
  // encodeURIComponent laisse passer ' ( ) ! * : on les encode aussi car la valeur est insérée dans des chaînes JS
  const encodedQ = encodeURIComponent(cleanQ).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  const safeQ = escapeHtml(cleanQ);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Viewer X - ${safeQ}</title>
  <style>
    * { box-sizing: border-box; }
    body, html {
      margin: 0; padding: 0; width: 100%; height: 100%;
      background-color: #0f172a; color: #f7f9f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex; flex-direction: column; overflow: hidden;
    }
    .top-bar {
      padding: 8px 12px; background: #0f172a; border-b: 1px solid rgba(56, 68, 77, 0.5);
      display: flex; items-center; justify-content: space-between; font-size: 11px;
    }
    .query-tag {
      font-weight: bold; color: #1d9bf0; background: rgba(29, 155, 240, 0.15);
      padding: 2px 8px; border-radius: 6px;
    }
    .mode-btn {
      background: #1e293b; color: #8b98a5; border: 1px solid #38444d;
      padding: 3px 8px; border-radius: 6px; cursor: pointer; font-size: 10px; font-weight: 600;
    }
    .mode-btn:hover, .mode-btn.active { background: #1d9bf0; color: #fff; border-color: #1d9bf0; }
    .content-area { flex: 1; position: relative; width: 100%; height: 100%; overflow-y: auto; padding: 6px; }
    iframe { width: 100%; height: 100%; border: none; border-radius: 8px; }
    .twitter-timeline { display: block; width: 100%; }
  </style>
</head>
<body>
  <div class="top-bar">
    <div>Fil X : <span class="query-tag">${safeQ}</span></div>
    <div style="display: flex; gap: 4px;">
      <button class="mode-btn active" id="btn-nitter" onclick="switchMode('nitter')">Mode Nitter Proxy</button>
      <button class="mode-btn" id="btn-widget" onclick="switchMode('widget')">Widget X</button>
      <a href="https://x.com/search?q=${encodedQ}&f=live" target="_blank" style="color:#8b98a5; text-decoration:none; margin-left:6px; margin-top:2px;">Ouvrir sur X ↗</a>
    </div>
  </div>
  <div class="content-area" id="view-container">
    <iframe id="nitter-frame" src="https://xcancel.com/search?f=tweets&q=${encodedQ}"></iframe>
  </div>

  <script>
    function switchMode(mode) {
      const container = document.getElementById('view-container');
      const btnNitter = document.getElementById('btn-nitter');
      const btnWidget = document.getElementById('btn-widget');

      if (mode === 'nitter') {
        btnNitter.classList.add('active');
        btnWidget.classList.remove('active');
        container.innerHTML = '<iframe id="nitter-frame" src="https://xcancel.com/search?f=tweets&q=${encodedQ}"></iframe>';
      } else {
        btnWidget.classList.add('active');
        btnNitter.classList.remove('active');
        container.innerHTML = '<a class="twitter-timeline" data-theme="dark" data-chrome="noheader nofooter transparent" href="https://twitter.com/search?q=${encodedQ}">Chargement...</a>';
        var s = document.createElement('script');
        s.src = "https://platform.twitter.com/widgets.js";
        s.async = true;
        document.body.appendChild(s);
      }
    }
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// GET /api/feed/storage-info
router.get('/storage-info', (_req: Request, res: Response) => {
  const info = playwrightManager.getStorageInfo();
  return res.json(info);
});

// POST /api/feed/clear-cache
router.post('/clear-cache', async (_req: Request, res: Response) => {
  try {
    cacheManager.clear();
    const disk = await playwrightManager.purgeDiskCache();
    return res.json({
      success: true,
      freedMb: disk.freedMb,
      message: parseFloat(disk.freedMb) > 0
        ? `Cache multi-plateformes purgé : ${disk.freedMb} Mo d'espace libérés !`
        : 'Cache mémoire et requêtes purgé avec succès.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: `Erreur lors de la purge : ${err.message}` });
  }
});

// POST /api/feed/action - Exécution d'une interaction (Like, Repost, Reply)
router.post('/action', async (req: Request, res: Response) => {
  try {
    const { platform, postId, postUrl, action, value, text } = req.body;
    if (!platform || !postId || !action) {
      return res.status(400).json({ success: false, error: 'Paramètres requis manquants' });
    }

    let intentUrl: string | undefined;

    if (platform === 'reddit') {
      if (action === 'like') {
        // Vote Reddit : 1 = upvote, -1 = downvote, 0 = annulation (booléen accepté pour compatibilité)
        const dir = typeof value === 'number' ? Math.max(-1, Math.min(1, Math.round(value))) : (value ? 1 : 0);
        const ok = await redditService.vote(postId, dir);
        if (!ok) {
          return res.json({ success: false, platform, postId, action, message: 'Reddit a refusé le vote (session expirée ?)' });
        }
      } else if (action === 'reply' && text) {
        await redditService.submitComment(postId, text);
      }
    } else if (platform === 'twitter') {
      const cleanTweetId = (postId || '').replace(/[^0-9]/g, '');
      if (action === 'like') {
        intentUrl = `https://twitter.com/intent/like?tweet_id=${cleanTweetId}`;
      } else if (action === 'repost') {
        intentUrl = `https://twitter.com/intent/retweet?tweet_id=${cleanTweetId}`;
      } else if (action === 'reply') {
        intentUrl = `https://twitter.com/intent/tweet?in_reply_to=${cleanTweetId}${text ? `&text=${encodeURIComponent(text)}` : ''}`;
      }
    } else if (platform === 'threads') {
      if (postUrl) {
        intentUrl = postUrl;
      }
    }

    return res.json({
      success: true,
      platform,
      postId,
      action,
      intentUrl,
      message: `Action ${action} enregistrée pour ${platform}`,
    });
  } catch (err: any) {
    console.error('[Action] Erreur :', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
