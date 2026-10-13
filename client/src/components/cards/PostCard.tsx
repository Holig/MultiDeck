import React from 'react';
import { 
  Heart, 
  MessageCircle, 
  Repeat2, 
  Share2, 
  Eye, 
  Play, 
  ExternalLink, 
  BadgeCheck, 
  Music,
  Youtube,
  Instagram,
  ChevronLeft,
  ChevronRight,
  Layers,
  Flame,
  Globe
} from 'lucide-react';
import { SocialPost } from '../../types';
import { useDeck } from '../../context/DeckContext';
import { api } from '../../services/api';
import { translateText } from '../../i18n/translations';

interface PostCardProps {
  post: SocialPost;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { setActiveMediaPreview, setActiveThreadPost, language, autoTranslatePosts, t } = useDeck();
  const [currentMediaIdx, setCurrentMediaIdx] = React.useState(0);

  // Traduction automatique / manuelle
  const [translatedText, setTranslatedText] = React.useState<string | null>(null);
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [showOriginal, setShowOriginal] = React.useState(false);

  React.useEffect(() => {
    // Si l'option Traduction automatique est activée dans les paramètres
    if (autoTranslatePosts && post.text && !translatedText && !isTranslating) {
      let isMounted = true;
      setIsTranslating(true);
      translateText(post.text, language)
        .then((res) => {
          if (isMounted) {
            if (!res.isSameLanguage && res.translatedText && res.translatedText !== post.text && !res.translatedText.includes('QUERY LENGTH LIMIT')) {
              setTranslatedText(res.translatedText);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setIsTranslating(false);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [autoTranslatePosts, post.text, language]);

  const handleTranslateToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (translatedText) {
      setShowOriginal(!showOriginal);
      return;
    }
    if (!post.text || isTranslating) return;
    try {
      setIsTranslating(true);
      const res = await translateText(post.text, language);
      if (res && !res.isSameLanguage && res.translatedText !== post.text && !res.translatedText.includes('QUERY LENGTH LIMIT')) {
        setTranslatedText(res.translatedText);
        setShowOriginal(false);
      }
    } catch {
      // Ignorer
    } finally {
      setIsTranslating(false);
    }
  };

  // États d'interactions directes optimistes
  const [isLiked, setIsLiked] = React.useState(false);
  const [likesCount, setLikesCount] = React.useState(post.stats.likes || 0);
  const [isLikeAnimating, setIsLikeAnimating] = React.useState(false);

  const [isReposted, setIsReposted] = React.useState(false);
  const [repostsCount, setRepostsCount] = React.useState(post.stats.sharesOrRetweets || 0);
  const [isRepostAnimating, setIsRepostAnimating] = React.useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount((prev) => Math.max(0, prev + (nextState ? 1 : -1)));
    setIsLikeAnimating(true);
    setTimeout(() => setIsLikeAnimating(false), 300);

    try {
      const res = await api.postAction(post.platform, post.id, 'like', {
        value: nextState,
        postUrl: post.postUrl,
      });
      if (res.intentUrl && post.platform === 'twitter') {
        window.open(res.intentUrl, '_blank', 'width=550,height=420');
      }
    } catch (err) {
      console.error('[PostCard] Erreur like :', err);
    }
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isReposted;
    setIsReposted(nextState);
    setRepostsCount((prev) => Math.max(0, prev + (nextState ? 1 : -1)));
    setIsRepostAnimating(true);
    setTimeout(() => setIsRepostAnimating(false), 300);

    try {
      const res = await api.postAction(post.platform, post.id, 'repost', {
        value: nextState,
        postUrl: post.postUrl,
      });
      if (res.intentUrl && post.platform === 'twitter') {
        window.open(res.intentUrl, '_blank', 'width=550,height=420');
      }
    } catch (err) {
      console.error('[PostCard] Erreur repost :', err);
    }
  };

  const mediaList = post.media || [];
  const hasMultipleMedia = mediaList.length > 1;
  const currentMedia = mediaList[currentMediaIdx] || mediaList[0] || null;

  const handlePrevMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMediaIdx((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1));
  };

  const handleNextMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMediaIdx((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0));
  };

  // Formatage de la date relative
  const formatTimeAgo = (isoDate: string) => {
    try {
      if (!isoDate) return '';
      const now = Date.now();
      const past = new Date(isoDate).getTime();
      if (isNaN(past)) return isoDate;

      const diffSec = Math.floor((now - past) / 1000);
      if (diffSec < 0) return 'maintenant';
      if (diffSec < 60) return `${Math.max(1, diffSec)}s`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h`;
      const diffDay = Math.floor(diffHr / 24);
      if (diffDay < 7) return `${diffDay}j`;
      const diffWeek = Math.floor(diffDay / 7);
      if (diffWeek < 4) return `${diffWeek}sem`;
      const diffMonth = Math.floor(diffDay / 30);
      if (diffMonth < 12) return `${diffMonth}mois`;
      const diffYear = Math.floor(diffDay / 365);
      return `${diffYear}a`;
    } catch {
      return '';
    }
  };

  // Formatage des grands chiffres
  const formatNumber = (num?: number) => {
    if (!num && num !== 0) return null;
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toString();
  };

  // Badge et icône de plateforme
  const renderPlatformBadge = () => {
    switch (post.platform) {
      case 'youtube':
        if (post.type === 'short' || post.postUrl.includes('/shorts/')) {
          return (
            <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 px-2 py-0.5 rounded shadow-sm">
              <Flame className="w-3 h-3 text-yellow-300" /> Short
            </span>
          );
        }
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
            <Youtube className="w-3 h-3" /> Vidéo
          </span>
        );
      case 'tiktok':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#00f2fe] bg-cyan-500/10 px-1.5 py-0.5 rounded">
            TikTok
          </span>
        );
      case 'instagram':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#e1306c] bg-pink-500/10 px-1.5 py-0.5 rounded">
            <Instagram className="w-3 h-3" /> Instagram {post.type === 'reel' ? 'Reel' : ''}
          </span>
        );
      case 'bluesky':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#0285ff] bg-[#0285ff]/15 px-1.5 py-0.5 rounded shadow-sm">
            🦋 Bluesky
          </span>
        );
      case 'threads':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-black/75 dark:bg-white/20 px-1.5 py-0.5 rounded shadow-sm border border-white/10">
            🧵 Threads
          </span>
        );
      case 'reddit':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#ff4500] bg-[#ff4500]/15 px-1.5 py-0.5 rounded shadow-sm border border-[#ff4500]/30">
            🤖 Reddit
          </span>
        );
      case 'twitter':
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#1d9bf0] bg-[#1d9bf0]/10 px-1.5 py-0.5 rounded">
            X
          </span>
        );
    }
  };

  // Mise en forme intelligente du texte
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\bhttps?:\/\/[^\s]+|#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g);

    return parts.map((part, index) => {
      if (part.startsWith('http://') || part.startsWith('https://')) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[#1d9bf0] hover:underline break-all"
          >
            {part.replace(/^https?:\/\//, '').substring(0, 26)}...
          </a>
        );
      } else if (part.startsWith('#') || part.startsWith('@')) {
        return (
          <span key={index} className="text-[#1d9bf0] hover:underline cursor-pointer font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <article className="border-b theme-border-subtle p-3 theme-bg-card-hover transition-colors duration-150 group">
      {/* Indicateur de Repost / Retweet */}
      {post.retweetedBy && (
        <div className="flex items-center gap-1.5 text-xs font-semibold theme-text-secondary mb-1.5 pl-3">
          <Repeat2 className="w-3.5 h-3.5 text-[#00ba7c] flex-shrink-0 stroke-[2.5]" />
          <span className="truncate hover:underline cursor-pointer theme-text-primary transition-colors">
            {post.retweetedBy.name} a reposté
          </span>
        </div>
      )}

      {/* Indicateur En réponse à (cliquable pour ouvrir la discussion) */}
      {post.replyTo && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            setActiveThreadPost(post);
          }}
          className="flex items-center gap-1.5 text-xs font-medium theme-text-secondary mb-1.5 pl-3 hover:text-[#0285ff] cursor-pointer group/rep"
          title="Ouvrir la discussion"
        >
          <MessageCircle className="w-3 h-3 text-[#0285ff] flex-shrink-0" />
          <span className="truncate">
            En réponse à <strong className="group-hover/rep:underline">@{post.replyTo.author?.username}</strong>
          </span>
        </div>
      )}

      {/* En-tête de la publication */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={post.author.avatarUrl}
            alt={post.author.name}
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              const nameOrUser = post.author.name || post.author.username || 'User';
              const bgColor = post.platform === 'instagram' ? 'e1306c' : (post.platform === 'youtube' ? 'ef4444' : (post.platform === 'reddit' ? 'ff4500' : '1d9bf0'));
              const cleanFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameOrUser)}&background=${bgColor}&color=fff&bold=true`;
              if (target.src !== cleanFallback) {
                target.src = cleanFallback;
              }
            }}
            className="w-9 h-9 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10 flex-shrink-0 theme-bg-surface"
          />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-bold text-sm theme-text-primary truncate hover:underline cursor-pointer">
                {post.author.name}
              </span>
              {post.author.verified && <BadgeCheck className="w-3.5 h-3.5 text-[#1d9bf0] flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-1.5 text-xs theme-text-secondary mt-0.5">
              <span className="truncate">@{post.author.username}</span>
              <span>·</span>
              <span className="flex-shrink-0">{formatTimeAgo(post.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {renderPlatformBadge()}
          <a
            href={post.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="theme-text-secondary hover:text-[#1d9bf0] opacity-0 group-hover:opacity-100 transition-opacity p-1"
            title="Ouvrir sur le réseau"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Titre spécifique YouTube ou Reddit */}
      {post.title && (
        <h3 
          onClick={() => {
            if (post.platform === 'reddit') {
              setActiveThreadPost(post);
            } else {
              setActiveMediaPreview({ post });
            }
          }}
          className="text-sm font-semibold theme-text-primary mb-1.5 line-clamp-2 leading-snug cursor-pointer hover:text-[#1d9bf0] transition-colors"
        >
          {post.title}
        </h3>
      )}

      {/* Texte / Contenu intégral du Tweet ou Post */}
      {post.text && (
        <div className="my-1.5">
          <p className="text-xs theme-text-primary whitespace-pre-wrap leading-relaxed break-words selection:bg-[#1d9bf0]/30">
            {renderFormattedText(translatedText && !showOriginal ? translatedText : post.text)}
          </p>

          {/* Bouton de traduction rapide (uniquement si une traduction différente et valide est disponible) */}
          {translatedText && translatedText !== post.text && !translatedText.includes('QUERY LENGTH LIMIT') && (
            <button
              onClick={handleTranslateToggle}
              className="text-[11px] theme-text-secondary hover:text-[#1d9bf0] flex items-center gap-1 mt-1 transition-colors group/tr cursor-pointer"
            >
              <Globe className="w-3 h-3 group-hover/tr:scale-110 text-[#1d9bf0] transition-transform" />
              <span>
                {isTranslating
                  ? t('post.translating')
                  : showOriginal
                  ? t('post.translate')
                  : t('post.showOriginal')}
              </span>
              {!showOriginal && (
                <span className="text-[9px] px-1 rounded bg-[#1d9bf0]/15 text-[#1d9bf0] font-semibold">
                  IA
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Carte Média Spécifique / Carrousel */}
      {currentMedia && (currentMedia.previewUrl || currentMedia.url) && (
        <div 
          onClick={() => setActiveMediaPreview({ post, mediaIndex: currentMediaIdx })}
          className="mt-2.5 rounded-xl overflow-hidden border border-[#38444d]/60 bg-black/40 relative cursor-pointer group/media max-h-[420px] flex items-center justify-center select-none"
        >
          <img
            key={currentMedia.url || currentMedia.previewUrl}
            src={currentMedia.previewUrl || currentMedia.url}
            alt={currentMedia.altText || post.title || post.text?.substring(0, 30) || 'Media'}
            referrerPolicy="no-referrer"
            className="w-full max-h-[420px] object-cover group-hover/media:scale-[1.01] transition-transform duration-200"
            loading="lazy"
          />

          {/* Badge indicateur de Carrousel (ex: 1 / 4) */}
          {hasMultipleMedia && (
            <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-lg z-10 ring-1 ring-white/10">
              <Layers className="w-3.5 h-3.5 text-[#1d9bf0]" />
              <span>{currentMediaIdx + 1} / {mediaList.length}</span>
            </div>
          )}

          {/* Boutons de navigation Carrousel */}
          {hasMultipleMedia && (
            <>
              <button
                onClick={handlePrevMedia}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/75 hover:bg-[#1d9bf0] text-white flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition-all backdrop-blur-sm z-10 hover:scale-110 shadow-xl ring-1 ring-white/15"
                title="Média précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMedia}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/75 hover:bg-[#1d9bf0] text-white flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition-all backdrop-blur-sm z-10 hover:scale-110 shadow-xl ring-1 ring-white/15"
                title="Média suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Indicateurs / Puces en bas */}
              <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5 z-10">
                {mediaList.map((_, idx) => (
                  <span
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentMediaIdx(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all cursor-pointer shadow-sm ${
                      idx === currentMediaIdx ? 'w-4 bg-[#1d9bf0]' : 'w-1.5 bg-white/60 hover:bg-white'
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Bouton de lecture vidéo au centre */}
          {(currentMedia.type === 'video' || post.platform === 'youtube' || post.platform === 'tiktok') && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/media:bg-black/10 transition-colors pointer-events-none">
              <div className="w-11 h-11 rounded-full bg-[#1d9bf0]/90 group-hover/media:bg-[#1d9bf0] text-white flex items-center justify-center shadow-xl backdrop-blur-sm transition-transform group-hover/media:scale-110">
                <Play className="w-5 h-5 fill-white ml-0.5" />
              </div>
            </div>
          )}

          {/* Durée de la vidéo (YouTube) */}
          {currentMedia.duration && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white backdrop-blur-sm">
              {currentMedia.duration}
            </div>
          )}

          {/* Tag de son TikTok */}
          {post.extra?.soundName && (
            <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-lg bg-black/70 text-[10px] text-white backdrop-blur-sm flex items-center gap-1.5 truncate">
              <Music className="w-3 h-3 text-[#00f2fe] flex-shrink-0 animate-spin" />
              <span className="truncate">{post.extra.soundName}</span>
            </div>
          )}
        </div>
      )}

      {/* Citation de Tweet / Quote Tweet */}
      {post.quotedPost && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (post.quotedPost?.postUrl) {
              window.open(post.quotedPost.postUrl, '_blank');
            }
          }}
          className="mt-2.5 rounded-2xl border theme-border hover:border-[#1d9bf0]/60 theme-bg-surface hover:opacity-95 p-3 transition-all duration-150 cursor-pointer group/quote select-none"
        >
          {/* Auteur du tweet cité */}
          <div className="flex items-center gap-2 mb-1.5 min-w-0">
            <img
              src={post.quotedPost.author.avatarUrl}
              alt={post.quotedPost.author.name}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const nameOrUser = post.quotedPost?.author.name || post.quotedPost?.author.username || 'X';
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameOrUser)}&background=1d9bf0&color=fff&bold=true`;
              }}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10 flex-shrink-0 theme-bg-surface"
            />
            <span className="font-bold text-xs theme-text-primary group-quote:underline truncate">
              {post.quotedPost.author.name}
            </span>
            {post.quotedPost.author.verified && (
              <BadgeCheck className="w-3.5 h-3.5 text-[#1d9bf0] flex-shrink-0" />
            )}
            <span className="text-xs theme-text-secondary truncate">
              @{post.quotedPost.author.username}
            </span>
            {post.quotedPost.createdAt && (
              <>
                <span className="theme-text-secondary text-xs">·</span>
                <span className="text-xs theme-text-secondary flex-shrink-0">
                  {formatTimeAgo(post.quotedPost.createdAt)}
                </span>
              </>
            )}
          </div>

          {/* Texte du tweet cité */}
          {post.quotedPost.text && (
            <p className="text-xs theme-text-primary leading-relaxed break-words whitespace-pre-wrap">
              {renderFormattedText(post.quotedPost.text)}
            </p>
          )}

          {/* Médias éventuels du tweet cité */}
          {post.quotedPost.media && post.quotedPost.media.length > 0 && (
            <div className="mt-2 rounded-xl overflow-hidden border theme-border max-h-56">
              <img
                src={post.quotedPost.media[0].previewUrl || post.quotedPost.media[0].url}
                alt="Media cité"
                referrerPolicy="no-referrer"
                className="w-full max-h-56 object-cover"
                loading="lazy"
              />
            </div>
          )}
        </div>
      )}

      {/* Barre de métriques et d'interactions directes */}
      <div className="mt-3 flex items-center justify-between theme-text-secondary text-xs pt-1 border-t theme-border-subtle">
        {/* Likes / Upvote interactif */}
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 transition-all duration-150 group/like p-1 -m-1 rounded-md hover:bg-pink-500/10 ${
            isLiked 
              ? (post.platform === 'reddit' ? 'text-[#ff4500]' : 'text-pink-500 font-semibold')
              : 'hover:text-pink-500'
          }`}
          title={isLiked ? t('post.unlike') : (post.platform === 'reddit' ? t('post.upvote') : t('post.like'))}
        >
          <Heart 
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              isLikeAnimating ? 'scale-125' : 'group-hover/like:scale-110'
            } ${isLiked ? 'fill-current' : ''}`} 
          />
          <span>{formatNumber(likesCount) || '0'}</span>
        </button>

        {/* Commentaires / Réponses (Ouvre la discussion complète + boîte de réponse) */}
        {(post.stats.comments !== undefined || post.platform === 'bluesky' || post.platform === 'twitter' || post.platform === 'threads' || post.platform === 'reddit') && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setActiveThreadPost(post);
            }}
            className="flex items-center gap-1.5 hover:text-[#1d9bf0] transition-colors p-1 -m-1 rounded-md hover:bg-[#1d9bf0]/10 group/cmt"
            title={t('post.thread')}
          >
            <MessageCircle className="w-3.5 h-3.5 group-hover/cmt:scale-110 transition-transform" />
            <span>{formatNumber(post.stats.comments) || '0'}</span>
          </button>
        )}

        {/* Partages / Retweets / Repost interactif */}
        {(post.stats.sharesOrRetweets !== undefined || post.platform === 'twitter' || post.platform === 'threads' || post.platform === 'bluesky') && (
          <button 
            onClick={handleRepost}
            className={`flex items-center gap-1.5 transition-all duration-150 p-1 -m-1 rounded-md hover:bg-emerald-500/10 group/repost ${
              isReposted ? 'text-emerald-400 font-semibold' : 'hover:text-emerald-400'
            }`}
            title={isReposted ? t('post.unrepost') : t('post.repost')}
          >
            <Repeat2 
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                isRepostAnimating ? 'scale-125' : 'group-hover/repost:scale-110'
              }`} 
            />
            <span>{formatNumber(repostsCount) || '0'}</span>
          </button>
        )}

        {/* Vues (si fournies) */}
        {post.stats.views !== undefined && (
          <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-default">
            <Eye className="w-3.5 h-3.5" />
            <span>{formatNumber(post.stats.views)}</span>
          </div>
        )}

        {/* Bouton de copie / partage du lien */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (navigator.clipboard && post.postUrl) {
              navigator.clipboard.writeText(post.postUrl);
            }
          }}
          className="p-1 rounded hover:text-white hover:bg-white/10 transition-colors"
          title={t('post.copyLink')}
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </article>
  );
};
