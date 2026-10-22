import React, { useState, useEffect } from 'react';
import { 
  X, 
  RefreshCw, 
  ExternalLink, 
  MessageCircle, 
  Heart, 
  Repeat2, 
  BadgeCheck, 
  Layers, 
  ArrowLeft,
  ChevronRight,
  Share2,
  AlertCircle,
  Send,
  Loader2,
  Check
} from 'lucide-react';
import { useDeck } from '../context/DeckContext';
import { SocialPost, ThreadResponse, Platform } from '../types';
import { api } from '../services/api';
import { canLike, canRepost, canReply } from '../services/capabilities';
import { RedditVoteButtons } from './cards/RedditVoteButtons';

export const ThreadModal: React.FC = () => {
  const { activeThreadPost, setActiveThreadPost, setActiveMediaPreview } = useDeck();
  const [threadData, setThreadData] = useState<ThreadResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Historique de navigation interne dans la modale
  const [postHistory, setPostHistory] = useState<SocialPost[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  // État de Réponse Rapide (Quick Reply)
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [localReplies, setLocalReplies] = useState<SocialPost[]>([]);
  const [replySuccess, setReplySuccess] = useState(false);

  // Interactions sur le post ciblé
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [isReposted, setIsReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState<number>(0);

  const handleCopyLink = () => {
    const target = threadData?.focusedPost || activeThreadPost;
    const targetUrl = target?.postUrl;
    if (targetUrl) {
      navigator.clipboard.writeText(targetUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleLikeFocusPost = async () => {
    const target = threadData?.focusedPost || activeThreadPost;
    if (!target) return;
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount((prev) => Math.max(0, prev + (nextState ? 1 : -1)));

    try {
      const res = await api.postAction(
        target.platform,
        target.id,
        'like',
        {
          value: nextState,
          postUrl: target.postUrl,
        }
      );
      if (res.intentUrl && target.platform === 'twitter') {
        window.open(res.intentUrl, '_blank', 'width=550,height=420');
      }
    } catch (err) {
      console.error('[ThreadModal] Erreur like :', err);
    }
  };

  const handleRepostFocusPost = async () => {
    const target = threadData?.focusedPost || activeThreadPost;
    if (!target) return;
    const nextState = !isReposted;
    setIsReposted(nextState);
    setRepostsCount((prev) => Math.max(0, prev + (nextState ? 1 : -1)));

    try {
      const res = await api.postAction(
        target.platform,
        target.id,
        'repost',
        {
          value: nextState,
          postUrl: target.postUrl,
        }
      );
      if (res.intentUrl && target.platform === 'twitter') {
        window.open(res.intentUrl, '_blank', 'width=550,height=420');
      }
    } catch (err) {
      console.error('[ThreadModal] Erreur repost :', err);
    }
  };

  const handleSubmitReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = threadData?.focusedPost || activeThreadPost;
    if (!target || !replyText.trim() || isSubmittingReply) return;

    const trimmed = replyText.trim();
    setIsSubmittingReply(true);

    const newReply: SocialPost = {
      id: `local-reply-${Date.now()}`,
      platform: target.platform,
      type: 'post',
      author: {
        id: 'me',
        name: 'Vous',
        username: 'vous',
        avatarUrl: `https://ui-avatars.com/api/?name=Vous&background=0285ff&color=fff&bold=true`,
      },
      text: trimmed,
      createdAt: new Date().toISOString(),
      stats: { likes: 0, comments: 0, sharesOrRetweets: 0 },
      replyTo: { id: target.id },
      postUrl: target.postUrl || '',
    };

    setLocalReplies((prev) => [newReply, ...prev]);
    setReplyText('');
    setReplySuccess(true);
    setTimeout(() => setReplySuccess(false), 2500);

    try {
      const res = await api.postAction(
        target.platform,
        target.id,
        'reply',
        {
          text: trimmed,
          postUrl: target.postUrl,
        }
      );
      if (res.intentUrl && target.platform === 'twitter') {
        window.open(res.intentUrl, '_blank', 'width=550,height=420');
      }
    } catch (err: any) {
      console.error('[ThreadModal] Erreur réponse :', err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const fetchThread = async (post: SocialPost, forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const target = post.uri || post.postUrl || post.id;
      const res = await api.getThread(post.platform, target, forceRefresh);
      setThreadData(res);
    } catch (err: any) {
      console.error('[ThreadModal] Erreur de chargement :', err);
      setError(err.message || 'Impossible de charger la conversation');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeThreadPost) {
      setPostHistory([activeThreadPost]);
      setIsLiked(false);
      setLikesCount(activeThreadPost.stats.likes || 0);
      setIsReposted(false);
      setRepostsCount(activeThreadPost.stats.sharesOrRetweets || 0);
      setLocalReplies([]);
      setReplyText('');
      setReplySuccess(false);
      fetchThread(activeThreadPost);
    } else {
      setThreadData(null);
      setError(null);
      setPostHistory([]);
      setLocalReplies([]);
    }
  }, [activeThreadPost]);

  // Écoute de la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeThreadPost) {
        if (postHistory.length > 1) {
          handleGoBack();
        } else {
          setActiveThreadPost(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeThreadPost, postHistory]);

  if (!activeThreadPost) return null;

  const handleNavigateToPost = (post: SocialPost) => {
    setPostHistory((prev) => [...prev, post]);
    fetchThread(post);
  };

  const handleGoBack = () => {
    if (postHistory.length > 1) {
      const nextHistory = [...postHistory];
      nextHistory.pop();
      const previousPost = nextHistory[nextHistory.length - 1];
      setPostHistory(nextHistory);
      fetchThread(previousPost);
    } else {
      setActiveThreadPost(null);
    }
  };

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case 'bluesky':
        return <span className="text-sm font-bold text-[#0285ff]">🦋 Bluesky</span>;
      case 'threads':
        return <span className="text-sm font-bold text-white">🧵 Threads</span>;
      case 'reddit':
        return <span className="text-sm font-bold text-[#ff4500]">🤖 Reddit</span>;
      case 'twitter':
        return <span className="text-sm font-bold text-[#1d9bf0]">𝕏 (Twitter)</span>;
      case 'instagram':
        return <span className="text-sm font-bold text-[#e1306c]">Instagram</span>;
      case 'tiktok':
        return <span className="text-sm font-bold text-[#00f2fe]">TikTok</span>;
      case 'youtube':
        return <span className="text-sm font-bold text-red-500">YouTube</span>;
      default:
        return <span className="text-sm font-bold">Discussion</span>;
    }
  };

  const formatNumber = (num?: number) => {
    if (!num && num !== 0) return null;
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toString();
  };

  const formatTimeAgo = (isoDate: string) => {
    try {
      if (!isoDate) return '';
      const now = Date.now();
      const past = new Date(isoDate).getTime();
      if (isNaN(past)) return isoDate;
      const diffSec = Math.floor((now - past) / 1000);
      if (diffSec < 60) return `${Math.max(1, diffSec)}s`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h`;
      const diffDay = Math.floor(diffHr / 24);
      return `${diffDay}j`;
    } catch {
      return '';
    }
  };

  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\bhttps?:\/\/[^\s]+|#[a-zA-Z0-9_]+|@[a-zA-Z0-9_.]+)/g);
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
            {part.replace(/^https?:\/\//, '').substring(0, 30)}...
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

  const currentFocusPost = threadData?.focusedPost || activeThreadPost;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 animate-fadeIn"
      onClick={() => setActiveThreadPost(null)}
    >
      <div 
        className="relative w-full max-w-2xl theme-bg-surface theme-text-primary rounded-2xl shadow-2xl border theme-border flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête de la modale Thread */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b theme-border theme-bg-app/80 backdrop-blur-sm z-10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {postHistory.length > 1 ? (
              <button
                onClick={handleGoBack}
                className="p-1.5 rounded-xl hover:theme-bg-surface theme-text-secondary hover:theme-text-primary transition-all flex items-center gap-1 text-xs font-semibold"
                title="Retour au message précédent"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour</span>
              </button>
            ) : (
              <div className="p-2 rounded-xl bg-[#0285ff]/15 text-[#0285ff]">
                <MessageCircle className="w-4 h-4" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold">Discussion</h2>
                <span className="text-xs theme-text-secondary">·</span>
                {getPlatformIcon(currentFocusPost.platform)}
              </div>
              <p className="text-[11px] theme-text-secondary truncate max-w-[280px] sm:max-w-md">
                Fil de discussion complet et réponses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fetchThread(currentFocusPost, true)}
              disabled={isLoading}
              className={`p-2 rounded-xl hover:theme-bg-app theme-text-secondary hover:theme-text-primary transition-colors ${
                isLoading ? 'animate-spin text-[#1d9bf0]' : ''
              }`}
              title="Rafraîchir la discussion"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleCopyLink}
              className="p-2 rounded-xl hover:theme-bg-app theme-text-secondary hover:theme-text-primary transition-colors relative"
              title={copiedLink ? "Lien copié !" : "Copier le lien"}
            >
              <Share2 className="w-4 h-4" />
              {copiedLink && (
                <span className="absolute -bottom-8 right-0 text-[10px] bg-emerald-500 text-white font-semibold px-2 py-0.5 rounded shadow whitespace-nowrap z-30">
                  Copié !
                </span>
              )}
            </button>

            <a
              href={currentFocusPost.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl hover:theme-bg-app theme-text-secondary hover:theme-text-primary transition-colors"
              title="Ouvrir sur le réseau"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={() => setActiveThreadPost(null)}
              className="p-2 rounded-xl hover:theme-bg-app theme-text-secondary hover:theme-text-primary transition-colors"
              title="Fermer (Échap)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Corps défilant du fil de discussion */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 space-y-4">
          {/* Erreur éventuelle */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs theme-text-primary flex items-start gap-3 my-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-400 mb-1">Impossible de charger les réponses</p>
                <p className="theme-text-secondary mb-3">{error}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchThread(currentFocusPost, true)}
                    className="px-3 py-1.5 rounded-lg bg-red-500 text-white font-semibold text-xs hover:bg-red-600 transition-colors"
                  >
                    Réessayer
                  </button>
                  <a
                    href={currentFocusPost.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg border theme-border theme-text-secondary hover:theme-text-primary text-xs flex items-center gap-1.5 transition-colors"
                  >
                    Ouvrir sur {currentFocusPost.platform} <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 1 : ANCESTORS (Parents du post avec ligne de connexion si présents) */}
          {threadData && threadData.ancestors.length > 0 && (
            <div className="space-y-0 relative">
              <div className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary mb-2 px-1">
                Contexte de la discussion ({threadData.ancestors.length})
              </div>
              {threadData.ancestors.map((anc, idx) => (
                <div 
                  key={anc.id || idx}
                  onClick={() => handleNavigateToPost(anc)}
                  className="relative flex gap-3 p-3 rounded-xl hover:theme-bg-app transition-colors cursor-pointer group"
                >
                  {/* Ligne verticale de connexion */}
                  <div className="absolute left-7 top-12 bottom-0 w-0.5 bg-[#38444d]/50 group-hover:bg-[#1d9bf0]/50 transition-colors" />

                  <img
                    src={anc.author.avatarUrl}
                    alt={anc.author.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(anc.author.name)}&background=0285ff&color=fff`;
                    }}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0 z-10 ring-2 theme-border-subtle theme-bg-surface"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-bold theme-text-primary truncate group-hover:underline">
                        {anc.author.name}
                      </span>
                      {anc.author.verified && <BadgeCheck className="w-3 h-3 text-[#1d9bf0]" />}
                      <span className="theme-text-secondary truncate">@{anc.author.username}</span>
                      <span className="theme-text-secondary">·</span>
                      <span className="theme-text-secondary">{formatTimeAgo(anc.createdAt)}</span>
                    </div>

                    <p className="text-xs theme-text-primary whitespace-pre-wrap leading-relaxed mt-1 break-words">
                      {renderFormattedText(anc.text)}
                    </p>

                    {anc.media && anc.media.length > 0 && (
                      <div className="mt-2 rounded-xl overflow-hidden border theme-border max-h-48">
                        <img 
                          src={anc.media[0].previewUrl || anc.media[0].url} 
                          alt="Media"
                          className="w-full max-h-48 object-cover" 
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SECTION 2 : POST PRINCIPAL SÉLECTIONNÉ (AFFICHÉ IMMÉDIATEMENT À 0MS) */}
          {currentFocusPost && (
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-[#0285ff]/40 theme-bg-app/90 shadow-lg relative my-1">
              {/* Repost éventuel */}
              {currentFocusPost.retweetedBy && (
                <div className="flex items-center gap-1.5 text-xs font-semibold theme-text-secondary mb-2 pl-1">
                  <Repeat2 className="w-3.5 h-3.5 text-[#00ba7c]" />
                  <span>{currentFocusPost.retweetedBy.name} a reposté</span>
                </div>
              )}

              {/* En réponse à */}
              {currentFocusPost.replyTo && (
                <div className="text-xs theme-text-secondary mb-2 flex items-center gap-1">
                  <span>En réponse à</span>
                  <span className="text-[#0285ff] font-semibold">@{currentFocusPost.replyTo.author?.username}</span>
                </div>
              )}

              {/* Auteur principal */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={currentFocusPost.author.avatarUrl}
                    alt={currentFocusPost.author.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentFocusPost.author.name)}&background=0285ff&color=fff`;
                    }}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-[#0285ff]/30 shadow-md flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm sm:text-base theme-text-primary truncate">
                        {currentFocusPost.author.name}
                      </span>
                      {currentFocusPost.author.verified && <BadgeCheck className="w-4 h-4 text-[#1d9bf0]" />}
                    </div>
                    <span className="text-xs theme-text-secondary block truncate">
                      @{currentFocusPost.author.username}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#0285ff]/15 text-[#0285ff]">
                  Post Sélectionné
                </span>
              </div>

              {/* Contenu textuel grand format */}
              {currentFocusPost.text && (
                <p className="text-sm sm:text-base theme-text-primary whitespace-pre-wrap leading-relaxed break-words my-2 selection:bg-[#0285ff]/30 font-normal">
                  {renderFormattedText(currentFocusPost.text)}
                </p>
              )}

              {/* Médias du post principal */}
              {currentFocusPost.media && currentFocusPost.media.length > 0 && (
                <div className="mt-3 rounded-xl overflow-hidden border theme-border max-h-[460px] bg-black/40 relative">
                  <img
                    src={currentFocusPost.media[0].previewUrl || currentFocusPost.media[0].url}
                    alt="Media"
                    className="w-full max-h-[460px] object-cover cursor-pointer hover:scale-[1.01] transition-transform"
                    onClick={() => setActiveMediaPreview({ post: currentFocusPost })}
                  />
                  {currentFocusPost.media.length > 1 && (
                    <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/75 text-white text-[11px] font-semibold flex items-center gap-1 shadow-md">
                      <Layers className="w-3.5 h-3.5 text-[#0285ff]" />
                      <span>{currentFocusPost.media.length} médias</span>
                    </div>
                  )}
                </div>
              )}

              {/* Citation de post éventuelle */}
              {currentFocusPost.quotedPost && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentFocusPost.quotedPost?.postUrl) {
                      window.open(currentFocusPost.quotedPost.postUrl, '_blank');
                    }
                  }}
                  className="mt-3 rounded-xl border theme-border p-3 theme-bg-surface hover:opacity-95 transition-opacity cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <img
                      src={currentFocusPost.quotedPost.author.avatarUrl}
                      alt={currentFocusPost.quotedPost.author.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="font-bold text-xs theme-text-primary truncate">
                      {currentFocusPost.quotedPost.author.name}
                    </span>
                    <span className="text-xs theme-text-secondary truncate">
                      @{currentFocusPost.quotedPost.author.username}
                    </span>
                  </div>
                  <p className="text-xs theme-text-primary whitespace-pre-wrap leading-relaxed">
                    {renderFormattedText(currentFocusPost.quotedPost.text)}
                  </p>
                </div>
              )}

              {/* Date complète et métriques interactives (Like, Repost, Cmt) */}
              <div className="mt-3.5 pt-3 border-t theme-border flex flex-wrap items-center justify-between gap-3 text-xs theme-text-secondary">
                <span>
                  {new Date(currentFocusPost.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {new Date(currentFocusPost.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>

                <div className="flex items-center gap-4 text-xs font-semibold">
                  {/* Bouton Like direct (Reddit, X) ; simple compteur ailleurs */}
                  {currentFocusPost.platform === 'reddit' ? (
                    <RedditVoteButtons key={currentFocusPost.id} post={currentFocusPost} size="md" />
                  ) : canLike(currentFocusPost.platform) ? (
                  <button
                    onClick={handleLikeFocusPost}
                    className={`flex items-center gap-1.5 p-1 rounded-lg transition-all duration-150 hover:bg-pink-500/10 ${
                      isLiked 
                        ? 'text-pink-500 font-bold' 
                        : 'hover:text-pink-500'
                    }`}
                    title={isLiked ? "Je n'aime plus" : "J'aime"}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{formatNumber(likesCount) || '0'}</span>
                  </button>
                  ) : (
                    <div className="flex items-center gap-1.5 p-1">
                      <Heart className="w-4 h-4" />
                      <span>{formatNumber(likesCount) || '0'}</span>
                    </div>
                  )}

                  {/* Bouton Repost direct (X) ; simple compteur ailleurs */}
                  {canRepost(currentFocusPost.platform) ? (
                  <button
                    onClick={handleRepostFocusPost}
                    className={`flex items-center gap-1.5 p-1 rounded-lg transition-all duration-150 hover:bg-emerald-500/10 ${
                      isReposted ? 'text-emerald-400 font-bold' : 'hover:text-emerald-400'
                    }`}
                    title={isReposted ? 'Annuler le repost' : 'Republier / Retweeter'}
                  >
                    <Repeat2 className="w-4 h-4" />
                    <span>{formatNumber(repostsCount) || '0'}</span>
                  </button>
                  ) : (
                    <div className="flex items-center gap-1.5 p-1">
                      <Repeat2 className="w-4 h-4" />
                      <span>{formatNumber(repostsCount) || '0'}</span>
                    </div>
                  )}

                  {/* Nombre de commentaires */}
                  <div className="flex items-center gap-1 text-[#0285ff] p-1">
                    <MessageCircle className="w-4 h-4" />
                    <span>{formatNumber(currentFocusPost.stats.comments) || '0'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2.5 : QUICK REPLY (Formulaire de réponse rapide directe) */}
          {currentFocusPost && canReply(currentFocusPost.platform) && (
            <div className="rounded-2xl border theme-border theme-bg-surface p-3 sm:p-4 shadow-sm transition-all focus-within:border-[#0285ff]/60">
              <div className="flex items-start gap-3">
                <img
                  src="https://ui-avatars.com/api/?name=Moi&background=0285ff&color=fff&bold=true"
                  alt="Vous"
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1"
                />
                <div className="flex-1 min-w-0">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        handleSubmitReply();
                      }
                    }}
                    placeholder={`Répondre à @${currentFocusPost.author.username}...`}
                    rows={2}
                    className="w-full bg-transparent resize-none text-xs sm:text-sm theme-text-primary placeholder:theme-text-secondary focus:outline-none"
                  />

                  <div className="flex items-center justify-between pt-2 border-t theme-border-subtle mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] theme-text-secondary hidden sm:inline">
                        Ctrl+Entrée pour envoyer
                      </span>
                      {replySuccess && (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold animate-fadeIn">
                          <Check className="w-3.5 h-3.5" /> {currentFocusPost.platform === 'twitter' ? 'Fenêtre X ouverte pour confirmer' : 'Réponse envoyée'}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleSubmitReply()}
                      disabled={!replyText.trim() || isSubmittingReply}
                      className="px-4 py-1.5 rounded-xl bg-[#0285ff] hover:bg-[#0285ff]/90 text-white font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-[#0285ff]/30 active:scale-95"
                    >
                      {isSubmittingReply ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Envoi...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Répondre</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3 : RÉPONSES (REPLIES) AVEC OPTIMISATION DE CHARGEMENT */}
          <div className="mt-4 pt-2">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-2">
                <span>Réponses</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[10px]">
                  {localReplies.length + (threadData?.replies?.length || 0)}
                </span>
              </h3>
              {isLoading && (
                <div className="flex items-center gap-1.5 text-xs text-[#0285ff] animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Chargement des réponses...</span>
                </div>
              )}
            </div>

            {/* Spinner local discret si les réponses sont en cours de chargement */}
            {isLoading && !threadData && (
              <div className="py-8 flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed theme-border p-4 bg-black/5 dark:bg-white/5">
                <div className="w-6 h-6 rounded-full border-2 border-[#0285ff] border-t-transparent animate-spin" />
                <p className="text-xs theme-text-secondary">Récupération des réponses du fil en temps réel...</p>
              </div>
            )}

            {/* Liste combinée (Réponses locales envoyées + Réponses distantes) */}
            {(() => {
              const allReplies = [...localReplies, ...(threadData?.replies || [])];
              if (!isLoading && allReplies.length === 0) {
                return (
                  <div className="py-8 text-center text-xs theme-text-secondary border theme-border-subtle rounded-xl p-4">
                    Aucune réponse pour le moment sous cette publication. Soyez le premier à répondre !
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  {allReplies.map((reply, rIdx) => {
                    const isLocal = reply.id.startsWith('local-reply-');
                    return (
                      <div
                        key={reply.id || rIdx}
                        onClick={() => !isLocal && handleNavigateToPost(reply)}
                        className={`p-3 sm:p-3.5 rounded-xl border ${
                          isLocal
                            ? 'border-[#0285ff]/50 bg-[#0285ff]/5'
                            : 'theme-border-subtle hover:theme-border theme-bg-card-hover'
                        } transition-all cursor-pointer group`}
                      >
                        <div className="flex items-start gap-2.5">
                          <img
                            src={reply.author.avatarUrl}
                            alt={reply.author.name}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.author.name)}&background=0285ff&color=fff`;
                            }}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 text-xs">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-bold theme-text-primary truncate group-hover:underline">
                                  {reply.author.name}
                                </span>
                                {reply.author.verified && <BadgeCheck className="w-3 h-3 text-[#1d9bf0]" />}
                                <span className="theme-text-secondary truncate">@{reply.author.username}</span>
                                <span className="theme-text-secondary">·</span>
                                <span className="theme-text-secondary">
                                  {isLocal ? 'À l’instant' : formatTimeAgo(reply.createdAt)}
                                </span>
                                {isLocal && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#0285ff]/20 text-[#0285ff] font-semibold">
                                    Votre réponse
                                  </span>
                                )}
                              </div>

                              {!isLocal && (
                                <ChevronRight className="w-3.5 h-3.5 theme-text-secondary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              )}
                            </div>

                            {/* Texte de la réponse */}
                            <p className="text-xs theme-text-primary whitespace-pre-wrap leading-relaxed mt-1 break-words">
                              {renderFormattedText(reply.text)}
                            </p>

                            {/* Médias éventuels */}
                            {reply.media && reply.media.length > 0 && (
                              <div className="mt-2 rounded-xl overflow-hidden border theme-border max-h-48">
                                <img
                                  src={reply.media[0].previewUrl || reply.media[0].url}
                                  alt="Media"
                                  className="w-full max-h-48 object-cover"
                                />
                              </div>
                            )}

                            {/* Métriques */}
                            <div className="mt-2 flex items-center gap-4 text-[11px] theme-text-secondary">
                              <div className="flex items-center gap-1 hover:text-pink-500 transition-colors">
                                <Heart className="w-3 h-3" />
                                <span>{formatNumber(reply.stats.likes) || '0'}</span>
                              </div>
                              <div className="flex items-center gap-1 hover:text-[#0285ff] transition-colors">
                                <MessageCircle className="w-3 h-3" />
                                <span>{formatNumber(reply.stats.comments) || '0'}</span>
                              </div>
                              <div className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                                <Repeat2 className="w-3 h-3" />
                                <span>{formatNumber(reply.stats.sharesOrRetweets) || '0'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
