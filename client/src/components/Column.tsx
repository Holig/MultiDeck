import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  RefreshCw, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal, 
  Filter, 
  AlertCircle,
  Database,
  Sparkles,
  Wifi,
  Youtube,
  Instagram,
  Flame
} from 'lucide-react';
import { ColumnConfig, SocialPost, FeedResponse, ColumnWidth, Platform, FeedMode } from '../types';
import { useDeck } from '../context/DeckContext';
import { api } from '../services/api';
import { PostCard } from './cards/PostCard';

interface ColumnProps {
  column: ColumnConfig;
  isFirst: boolean;
  isLast: boolean;
}

export const Column: React.FC<ColumnProps> = ({ column, isFirst, isLast }) => {
  const { removeColumn, updateColumn, moveColumn, setIsAuthModalOpen, setSelectedAuthPlatform } = useDeck();
  
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceInfo, setSourceInfo] = useState<{ source: 'live' | 'cache' | 'demo'; message?: string }>({
    source: 'live',
  });
  const [filterQuery, setFilterQuery] = useState('');
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(column.refreshInterval);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Changement dynamique du mode de fil (X ou Instagram) avec rechargement immédiat
  const changeFeedMode = async (mode: FeedMode) => {
    const isSameMode = (column.feedMode || 'for_you') === mode;
    let newTitle = column.title;

    if (column.platform === 'twitter') {
      const titles: Partial<Record<FeedMode, string>> = {
        for_you: 'X : Pour vous',
        following_latest: 'X : Abonnements (Récents)',
        following_top: 'X : Abonnements (Populaire)',
      };
      newTitle = titles[mode] || 'X : Fil d’actualité';
    } else if (column.platform === 'instagram') {
      newTitle = mode === 'following_latest' ? 'Instagram : Suivi(e)s' : 'Instagram : Pour vous';
    }

    setPosts([]); // Réinitialiser immédiatement les posts visibles
    setIsLoading(true);
    setError(null);
    updateColumn(column.id, { feedMode: mode, title: newTitle });

    try {
      const res = await api.getHomeFeed(column.platform, mode, isSameMode);
      setPosts(res.posts || []);
      setSourceInfo({ source: res.source, message: res.message });
      setSecondsUntilRefresh(column.refreshInterval);
    } catch (err: any) {
      console.error(`Erreur chargement mode ${mode} :`, err);
      setError(err.message || 'Impossible de charger ce fil');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Chargement du flux selon la plateforme et le type de contenu
  const loadFeed = useCallback(async (force = false) => {
    try {
      if (force) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      let res: FeedResponse;
      if (column.contentType === 'home') {
        res = await api.getHomeFeed(column.platform, column.feedMode || 'for_you', force);
      } else if (column.contentType === 'search') {
        res = await api.getSearchFeed(column.platform, column.query || '', force);
      } else if (column.contentType === 'user') {
        res = await api.getUserFeed(column.platform, column.username || '', force);
      } else if (column.contentType === 'shorts') {
        res = await api.getShortsFeed(column.platform, column.query || 'trending', force);
      } else if (column.contentType === 'list') {
        res = await api.getListFeed(column.platform, column.query || column.username || '', force);
      } else {
        res = { platform: column.platform, posts: [], source: 'demo' };
      }

      setPosts(res.posts || []);
      setSourceInfo({ source: res.source, message: res.message });
      setSecondsUntilRefresh(column.refreshInterval);
    } catch (err: any) {
      console.error(`Erreur colonne ${column.id} :`, err);
      setError(err.message || 'Impossible de charger le flux');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [column.platform, column.contentType, column.feedMode, column.query, column.username, column.refreshInterval]);

  useEffect(() => {
    loadFeed(false);
  }, [loadFeed]);

  // Minuteur de rafraîchissement automatique
  useEffect(() => {
    if (column.refreshInterval <= 0) return;

    setSecondsUntilRefresh(column.refreshInterval);
    const timer = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          loadFeed(true);
          return column.refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [column.refreshInterval, loadFeed]);

  // Filtrage textuel local et tri chronologique
  const filteredPosts = posts
    .filter((p) => {
      if (!filterQuery.trim()) return true;
      const q = filterQuery.toLowerCase();
      return (
        (p.title && p.title.toLowerCase().includes(q)) ||
        p.text.toLowerCase().includes(q) ||
        p.author.name.toLowerCase().includes(q) ||
        p.author.username.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (
        column.feedMode === 'following_latest' ||
        column.feedMode === 'sub_all' ||
        column.feedMode === 'sub_videos' ||
        column.feedMode === 'sub_shorts' ||
        (column.platform === 'youtube' && column.contentType === 'home')
      ) {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (!isNaN(timeA) && !isNaN(timeB)) {
          return timeB - timeA; // Le plus récent en haut
        }
      }
      return 0;
    });

  // Icône et couleur de la plateforme
  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-4 h-4 text-red-500" />;
      case 'tiktok':
        return <Flame className="w-4 h-4 text-[#00f2fe]" />;
      case 'instagram':
        return <Instagram className="w-4 h-4 text-pink-500" />;
      case 'twitter':
      default:
        return <span className="text-xs font-black text-[#1d9bf0]">𝕏</span>;
    }
  };

  const widthClasses: Record<ColumnWidth, string> = {
    sm: 'w-[320px] min-w-[320px]',
    md: 'w-[380px] min-w-[380px]',
    lg: 'w-[480px] min-w-[480px]',
  };

  return (
    <div className={`h-full flex flex-col border-r theme-border theme-bg-column ${widthClasses[column.width]} flex-shrink-0 transition-colors duration-150`}>
      {/* En-tête de la colonne */}
      <div className="h-13 theme-bg-column-header backdrop-blur-md border-b theme-border px-3 py-2.5 flex items-center justify-between z-10 sticky top-0">
        {/* Infos à gauche */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg theme-bg-surface flex-shrink-0">
            {getPlatformIcon(column.platform)}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold theme-text-primary truncate leading-tight">
              {column.title}
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] theme-text-secondary">
              {sourceInfo.source === 'live' && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Direct
                </span>
              )}
              {sourceInfo.source === 'cache' && (
                <span className="flex items-center gap-1 text-[#1d9bf0]">
                  <Database className="w-2.5 h-2.5" /> Cache
                </span>
              )}
              {sourceInfo.source === 'demo' && (
                <span className="flex items-center gap-1 text-amber-400">
                  <Sparkles className="w-2.5 h-2.5" /> Démo
                </span>
              )}
              <span>·</span>
              <span>{filteredPosts.length} posts</span>
            </div>
          </div>
        </div>

        {/* Boutons d'action à droite */}
        <div className="flex items-center gap-0.5">

          {/* Rafraîchir */}
          <button
            onClick={() => loadFeed(true)}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg hover:theme-bg-surface theme-text-secondary hover:text-[#1d9bf0] transition-colors relative"
            title={`Rafraîchir (Auto dans ${secondsUntilRefresh}s)`}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#1d9bf0]' : ''}`} />
          </button>

          {/* Options */}
          <button
            onClick={() => setIsOptionsOpen(!isOptionsOpen)}
            className={`p-1.5 rounded-lg transition-colors ${
              isOptionsOpen ? 'theme-bg-surface text-[#1d9bf0]' : 'hover:theme-bg-surface theme-text-secondary hover:theme-text-primary'
            }`}
            title="Options de la colonne"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Déplacer */}
          {!isFirst && (
            <button
              onClick={() => moveColumn(column.id, 'left')}
              className="p-1.5 rounded-lg hover:theme-bg-surface theme-text-secondary hover:theme-text-primary transition-colors"
              title="Déplacer à gauche"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {!isLast && (
            <button
              onClick={() => moveColumn(column.id, 'right')}
              className="p-1.5 rounded-lg hover:theme-bg-surface theme-text-secondary hover:theme-text-primary transition-colors"
              title="Déplacer à droite"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* Fermer */}
          <button
            onClick={() => removeColumn(column.id)}
            className="p-1.5 rounded-lg hover:bg-rose-500/15 theme-text-secondary hover:text-rose-400 transition-colors"
            title="Fermer la colonne"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Onglets rapides Twitter (comme sur x.com) */}
      {column.platform === 'twitter' && column.contentType === 'home' && (
        <div className="flex items-center border-b theme-border theme-bg-column px-2 py-1.5 gap-1.5 text-xs">
          <button
            onClick={() => changeFeedMode('for_you')}
            className={`flex-1 py-1 px-2 rounded-lg font-semibold transition-all text-center text-[11px] ${
              (column.feedMode || 'for_you') === 'for_you'
                ? 'bg-[#1d9bf0]/20 text-[#1d9bf0] font-bold ring-1 ring-[#1d9bf0]/40'
                : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-surface'
            }`}
          >
            ✨ Pour vous
          </button>
          <button
            onClick={() => changeFeedMode('following_latest')}
            className={`flex-1 py-1 px-2 rounded-lg font-semibold transition-all text-center text-[11px] ${
              column.feedMode === 'following_latest'
                ? 'bg-[#1d9bf0]/20 text-[#1d9bf0] font-bold ring-1 ring-[#1d9bf0]/40'
                : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-surface'
            }`}
          >
            ⏱️ Récents
          </button>
          <button
            onClick={() => changeFeedMode('following_top')}
            className={`flex-1 py-1 px-2 rounded-lg font-semibold transition-all text-center text-[11px] ${
              column.feedMode === 'following_top'
                ? 'bg-[#1d9bf0]/20 text-[#1d9bf0] font-bold ring-1 ring-[#1d9bf0]/40'
                : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-surface'
            }`}
          >
            🔥 Populaire
          </button>
        </div>
      )}

      {/* Onglets rapides Instagram (comme sur instagram.com) */}
      {column.platform === 'instagram' && column.contentType === 'home' && (
        <div className="flex items-center border-b theme-border theme-bg-column px-2 py-1.5 gap-1.5 text-xs">
          <button
            onClick={() => changeFeedMode('for_you')}
            className={`flex-1 py-1 px-2 rounded-lg font-semibold transition-all text-center text-[11px] ${
              (column.feedMode || 'for_you') === 'for_you'
                ? 'bg-pink-500/20 text-pink-400 font-bold ring-1 ring-pink-500/40'
                : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-surface'
            }`}
          >
            ✨ Pour vous
          </button>
          <button
            onClick={() => changeFeedMode('following_latest')}
            className={`flex-1 py-1 px-2 rounded-lg font-semibold transition-all text-center text-[11px] ${
              column.feedMode === 'following_latest'
                ? 'bg-pink-500/20 text-pink-400 font-bold ring-1 ring-pink-500/40'
                : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-surface'
            }`}
          >
            ⏱️ Suivi(e)s (Récents)
          </button>
        </div>
      )}

      {/* Panneau d'options dépliable */}
      {isOptionsOpen && (
        <div className="theme-bg-surface border-b theme-border p-3 space-y-3 text-xs">
          {/* Mode de flux Twitter */}
          {column.platform === 'twitter' && column.contentType === 'home' && (
            <div className="space-y-1.5">
              <span className="theme-text-secondary font-medium block">Contenu du fil X :</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => changeFeedMode('for_you')}
                  className={`py-1.5 px-1 rounded-md text-[11px] font-semibold text-center transition-all ${
                    (column.feedMode || 'for_you') === 'for_you'
                      ? 'bg-[#1d9bf0] text-white font-bold'
                      : 'theme-bg-column theme-text-secondary hover:theme-text-primary border theme-border'
                  }`}
                >
                  ✨ Pour vous
                </button>
                <button
                  onClick={() => changeFeedMode('following_latest')}
                  className={`py-1.5 px-1 rounded-md text-[11px] font-semibold text-center transition-all ${
                    column.feedMode === 'following_latest'
                      ? 'bg-[#1d9bf0] text-white font-bold'
                      : 'theme-bg-column theme-text-secondary hover:theme-text-primary border theme-border'
                  }`}
                >
                  ⏱️ Récents
                </button>
                <button
                  onClick={() => changeFeedMode('following_top')}
                  className={`py-1.5 px-1 rounded-md text-[11px] font-semibold text-center transition-all ${
                    column.feedMode === 'following_top'
                      ? 'bg-[#1d9bf0] text-white font-bold'
                      : 'theme-bg-column theme-text-secondary hover:theme-text-primary border theme-border'
                  }`}
                >
                  🔥 Populaire
                </button>
              </div>
            </div>
          )}

          {/* Mode de flux Instagram */}
          {column.platform === 'instagram' && column.contentType === 'home' && (
            <div className="space-y-1.5">
              <span className="theme-text-secondary font-medium block">Contenu du fil Instagram :</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => changeFeedMode('for_you')}
                  className={`py-1.5 px-1 rounded-md text-[11px] font-semibold text-center transition-all ${
                    (column.feedMode || 'for_you') === 'for_you'
                      ? 'bg-pink-500 text-white font-bold'
                      : 'theme-bg-column theme-text-secondary hover:theme-text-primary border theme-border'
                  }`}
                >
                  ✨ Pour vous
                </button>
                <button
                  onClick={() => changeFeedMode('following_latest')}
                  className={`py-1.5 px-1 rounded-md text-[11px] font-semibold text-center transition-all ${
                    column.feedMode === 'following_latest'
                      ? 'bg-pink-500 text-white font-bold'
                      : 'theme-bg-column theme-text-secondary hover:theme-text-primary border theme-border'
                  }`}
                >
                  ⏱️ Suivi(e)s (Récents)
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="theme-text-secondary font-medium">Largeur :</span>
            <div className="flex theme-bg-column rounded-lg p-0.5 border theme-border">
              {(['sm', 'md', 'lg'] as ColumnWidth[]).map((w) => (
                <button
                  key={w}
                  onClick={() => updateColumn(column.id, { width: w })}
                  className={`px-2.5 py-1 rounded-md capitalize font-semibold transition-all ${
                    column.width === w
                      ? 'bg-[#1d9bf0] text-white'
                      : 'theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  {w === 'sm' ? 'Étroite' : w === 'md' ? 'Normale' : 'Large'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="theme-text-secondary font-medium">Intervalle auto :</span>
            <select
              value={column.refreshInterval}
              onChange={(e) => updateColumn(column.id, { refreshInterval: parseInt(e.target.value, 10) })}
              className="theme-bg-column border theme-border rounded-md px-2 py-1 theme-text-primary focus:outline-none focus:border-[#1d9bf0]"
            >
              <option value="0">Désactivé</option>
              <option value="60">1 minute</option>
              <option value="120">2 minutes</option>
              <option value="300">5 minutes</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="w-3.5 h-3.5 theme-text-secondary absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filtrer par mot-clé..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 theme-bg-column border theme-border rounded-lg theme-text-primary placeholder:opacity-50 focus:outline-none focus:border-[#1d9bf0]"
            />
            {filterQuery && (
              <button onClick={() => setFilterQuery('')} className="absolute right-2 top-2 theme-text-secondary hover:theme-text-primary">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bannière de message */}
      {sourceInfo.message && (
        <div className={`px-3 py-2 border-b text-[11px] flex items-center justify-between gap-2 ${
          sourceInfo.message.includes('Connexion requise')
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
            : 'bg-[#1e293b]/90 border-[#38444d]/50 text-[#8b98a5]'
        }`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <Wifi className={`w-3.5 h-3.5 flex-shrink-0 ${sourceInfo.message.includes('Connexion requise') ? 'text-amber-400' : 'text-[#1d9bf0]'}`} />
            <span className="truncate">{sourceInfo.message}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {sourceInfo.message.includes('Connexion requise') && (
              <button
                onClick={() => {
                  setSelectedAuthPlatform(column.platform);
                  setIsAuthModalOpen(true);
                }}
                className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] transition-colors cursor-pointer"
              >
                Se connecter
              </button>
            )}
            <button onClick={() => setSourceInfo((prev) => ({ ...prev, message: undefined }))} className="text-[#8b98a5] hover:text-white p-0.5">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Zone de contenu scrollable */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden divide-y divide-[#38444d]/20 select-text"
      >
        {isLoading && posts.length === 0 && (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1e2732]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-[#1e2732] rounded w-1/3" />
                  <div className="h-3 bg-[#1e2732] rounded w-full" />
                  <div className="h-32 bg-[#1e2732] rounded-xl w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 m-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
            <button
              onClick={() => loadFeed(true)}
              className="self-start px-3 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors font-semibold"
            >
              Réessayer
            </button>
          </div>
        )}

        {!isLoading && filteredPosts.length === 0 && (
          <div className="p-8 text-center text-[#8b98a5] text-xs space-y-3">
            <p className="font-medium">{sourceInfo.message || 'Aucun contenu trouvé.'}</p>
            {sourceInfo.message?.includes('Connexion requise') && (
              <div>
                <button
                  onClick={() => {
                    setSelectedAuthPlatform(column.platform);
                    setIsAuthModalOpen(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-xl text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Connecter mon compte {column.platform.toUpperCase()}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {filteredPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
};
