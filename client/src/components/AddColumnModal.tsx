import React, { useState } from 'react';
import { 
  X, 
  PlusCircle, 
  Youtube, 
  Instagram, 
  Flame, 
  Search, 
  User, 
  Film, 
  Sparkles, 
  Users, 
  Clock, 
  TrendingUp, 
  Hash, 
  CheckCircle2,
  SlidersHorizontal,
  ListFilter
} from 'lucide-react';
import { useDeck } from '../context/DeckContext';
import { Platform, ColumnContentType, FeedMode } from '../types';

interface FeedOptionConfig {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  contentType: ColumnContentType;
  feedMode?: FeedMode;
  requiresInput?: 'query' | 'username' | 'hashtag' | null;
  inputLabel?: string;
  inputPlaceholder?: string;
  defaultTitle: string;
}

export const AddColumnModal: React.FC = () => {
  const { isAddModalOpen, setIsAddModalOpen, addColumn } = useDeck();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('twitter');
  const [selectedOptionId, setSelectedOptionId] = useState<string>('x_foryou');
  const [query, setQuery] = useState('');
  const [username, setUsername] = useState('');

  if (!isAddModalOpen) return null;

  const platforms: { id: Platform; label: string; icon: React.ReactNode; color: string; activeBorder: string; desc: string }[] = [
    { 
      id: 'twitter', 
      label: 'X (Twitter)', 
      icon: <span className="font-bold text-sm text-[#1d9bf0]">𝕏</span>, 
      color: 'border-[#1d9bf0]/50 bg-[#1d9bf0]/10', 
      activeBorder: 'border-[#1d9bf0] ring-[#1d9bf0]',
      desc: 'Timelines, tweets & mentions' 
    },
    { 
      id: 'instagram', 
      label: 'Instagram', 
      icon: <Instagram className="w-5 h-5 text-pink-500" />, 
      color: 'border-pink-500/50 bg-pink-500/10', 
      activeBorder: 'border-pink-500 ring-pink-500',
      desc: 'Abonnements, photos & Reels' 
    },
    { 
      id: 'youtube', 
      label: 'YouTube', 
      icon: <Youtube className="w-5 h-5 text-red-500" />, 
      color: 'border-red-500/50 bg-red-500/10', 
      activeBorder: 'border-red-500 ring-red-500',
      desc: 'Vidéos longues, chaînes & Shorts' 
    },
    { 
      id: 'tiktok', 
      label: 'TikTok', 
      icon: <Flame className="w-5 h-5 text-[#00f2fe]" />, 
      color: 'border-cyan-500/50 bg-cyan-500/10', 
      activeBorder: 'border-cyan-500 ring-cyan-500',
      desc: 'Vidéos verticales & créateurs' 
    },
  ];

  // Options de flux spécifiques et dynamiques par réseau social
  const platformFeedOptions: Record<Platform, FeedOptionConfig[]> = {
    twitter: [
      {
        id: 'x_foryou',
        label: '✨ Pour vous',
        desc: 'Recommandations algorithmiques personnalisées de X',
        icon: <Sparkles className="w-4 h-4 text-[#1d9bf0]" />,
        contentType: 'home',
        feedMode: 'for_you',
        requiresInput: null,
        defaultTitle: 'X : Pour vous',
      },
      {
        id: 'x_following_latest',
        label: '⏱️ Abonnements (Récents)',
        desc: 'Tweets de vos abonnements par ordre chronologique direct',
        icon: <Clock className="w-4 h-4 text-[#1d9bf0]" />,
        contentType: 'home',
        feedMode: 'following_latest',
        requiresInput: null,
        defaultTitle: 'X : Abonnements (Récents)',
      },
      {
        id: 'x_following_top',
        label: '🔥 Abonnements (Populaire)',
        desc: 'Meilleurs tweets récents de vos abonnements',
        icon: <Flame className="w-4 h-4 text-orange-400" />,
        contentType: 'home',
        feedMode: 'following_top',
        requiresInput: null,
        defaultTitle: 'X : Abonnements (Populaire)',
      },
      {
        id: 'x_search',
        label: '🔍 Recherche en direct',
        desc: 'Tweets en direct sur un sujet, mot-clé ou actualité',
        icon: <Search className="w-4 h-4 text-[#1d9bf0]" />,
        contentType: 'search',
        requiresInput: 'query',
        inputLabel: 'Mots-clés ou sujet à rechercher :',
        inputPlaceholder: 'Ex: Intelligence Artificielle, Ligue 1, Gaming...',
        defaultTitle: 'X : Recherche',
      },
      {
        id: 'x_hashtag',
        label: '🏷️ Hashtag (#)',
        desc: 'Tweets publiés sous un hashtag spécifique',
        icon: <Hash className="w-4 h-4 text-[#1d9bf0]" />,
        contentType: 'search',
        requiresInput: 'hashtag',
        inputLabel: 'Hashtag (avec ou sans #) :',
        inputPlaceholder: 'Ex: #MercatOM, #WebDev, #AI...',
        defaultTitle: 'X : #',
      },
      {
        id: 'x_user',
        label: '👤 Compte / Profil',
        desc: 'Tweets et reposts d’un profil spécifique',
        icon: <User className="w-4 h-4 text-[#1d9bf0]" />,
        contentType: 'user',
        requiresInput: 'username',
        inputLabel: 'Nom d’utilisateur X (@) :',
        inputPlaceholder: 'Ex: elonmusk, verge, nasa...',
        defaultTitle: 'X : @',
      },
      {
        id: 'x_list',
        label: '📋 Liste X',
        desc: 'Tweets d’une liste X spécifique (URL ou ID numérique)',
        icon: <ListFilter className="w-4 h-4 text-[#1d9bf0]" />,
        contentType: 'list',
        requiresInput: 'query',
        inputLabel: 'URL ou identifiant de la Liste X :',
        inputPlaceholder: 'Ex: https://x.com/i/lists/899624369873354753 ou 899624369873354753',
        defaultTitle: 'X : Liste',
      },
    ],
    instagram: [
      {
        id: 'insta_foryou',
        label: '✨ Pour vous (Accueil)',
        desc: 'Fil d’actualité général avec suggestions et algorithme',
        icon: <Sparkles className="w-4 h-4 text-pink-500" />,
        contentType: 'home',
        feedMode: 'for_you',
        requiresInput: null,
        defaultTitle: 'Instagram : Pour vous',
      },
      {
        id: 'insta_following',
        label: '👥 Suivi(e)s (Abonnements)',
        desc: 'Derniers posts chronologiques des personnes que vous suivez',
        icon: <Users className="w-4 h-4 text-pink-500" />,
        contentType: 'home',
        feedMode: 'following_latest',
        requiresInput: null,
        defaultTitle: 'Instagram : Suivi(e)s',
      },
      {
        id: 'insta_reels',
        label: '🎬 Reels',
        desc: 'Flux de vidéos courtes immersives et tendances Reels',
        icon: <Film className="w-4 h-4 text-pink-500" />,
        contentType: 'shorts',
        requiresInput: null,
        defaultTitle: 'Instagram : Reels',
      },
      {
        id: 'insta_user',
        label: '👤 Profil / Créateur',
        desc: 'Galerie de photos et vidéos d’un profil Instagram',
        icon: <User className="w-4 h-4 text-pink-500" />,
        contentType: 'user',
        requiresInput: 'username',
        inputLabel: 'Nom d’utilisateur Instagram (@) :',
        inputPlaceholder: 'Ex: natgeo, nasa, zuck...',
        defaultTitle: 'Instagram : @',
      },
      {
        id: 'insta_hashtag',
        label: '🏷️ Hashtag (#)',
        desc: 'Publications taguées sous un hashtag précis',
        icon: <Hash className="w-4 h-4 text-pink-500" />,
        contentType: 'search',
        requiresInput: 'hashtag',
        inputLabel: 'Hashtag Instagram :',
        inputPlaceholder: 'Ex: #architecture, #travel, #food...',
        defaultTitle: 'Instagram : #',
      },
    ],
    youtube: [
      {
        id: 'yt_sub_all',
        label: '🔔 Abonnements (Récents)',
        desc: 'Dernières vidéos et Shorts de vos abonnements (feed/subscriptions)',
        icon: <Users className="w-4 h-4 text-red-500" />,
        contentType: 'home',
        feedMode: 'sub_all' as any,
        requiresInput: null,
        defaultTitle: 'YouTube : Abonnements',
      },
      {
        id: 'yt_sub_videos',
        label: '🎬 Abonnements (Vidéos)',
        desc: 'Uniquement les vidéos longues de vos abonnements',
        icon: <Film className="w-4 h-4 text-red-500" />,
        contentType: 'home',
        feedMode: 'sub_videos' as any,
        requiresInput: null,
        defaultTitle: 'YouTube : Abonnements (Vidéos)',
      },
      {
        id: 'yt_sub_shorts',
        label: '⚡ Abonnements (Shorts)',
        desc: 'Uniquement les shorts verticaux de vos abonnements',
        icon: <Flame className="w-4 h-4 text-red-500" />,
        contentType: 'home',
        feedMode: 'sub_shorts' as any,
        requiresInput: null,
        defaultTitle: 'YouTube : Abonnements (Shorts)',
      },
      {
        id: 'yt_channel',
        label: '👤 Chaîne / Créateur',
        desc: 'Vidéos et Shorts publiés par une chaîne (@username)',
        icon: <User className="w-4 h-4 text-red-500" />,
        contentType: 'user',
        requiresInput: 'username',
        inputLabel: 'Nom de chaîne ou identifiant (@) :',
        inputPlaceholder: 'Ex: MarquesBrownlee, Squeezie, fireship...',
        defaultTitle: 'YouTube : @',
      },
      {
        id: 'yt_search',
        label: '🔍 Recherche de vidéos',
        desc: 'Rechercher des vidéos sur n’importe quel sujet',
        icon: <Search className="w-4 h-4 text-red-500" />,
        contentType: 'search',
        requiresInput: 'query',
        inputLabel: 'Mots-clés ou titre recherché :',
        inputPlaceholder: 'Ex: Tech, Tutoriel React, Documentaire...',
        defaultTitle: 'YouTube : Recherche',
      },
      {
        id: 'yt_trending',
        label: '📈 Tendances (Trending)',
        desc: 'Les vidéos les plus regardées et populaires du moment',
        icon: <TrendingUp className="w-4 h-4 text-red-500" />,
        contentType: 'home',
        feedMode: 'for_you',
        requiresInput: null,
        defaultTitle: 'YouTube : Tendances',
      },
    ],
    tiktok: [
      {
        id: 'tiktok_foryou',
        label: '🔥 Pour toi (For You)',
        desc: 'Flux viral et algorithme personnalisé Pour toi',
        icon: <Flame className="w-4 h-4 text-[#00f2fe]" />,
        contentType: 'home',
        feedMode: 'for_you',
        requiresInput: null,
        defaultTitle: 'TikTok : Pour toi',
      },
      {
        id: 'tiktok_following',
        label: '👥 Abonnements (Following)',
        desc: 'Dernières vidéos publiées par les comptes que vous suivez',
        icon: <Users className="w-4 h-4 text-[#00f2fe]" />,
        contentType: 'home',
        feedMode: 'following_latest',
        requiresInput: null,
        defaultTitle: 'TikTok : Abonnements',
      },
      {
        id: 'tiktok_hashtag',
        label: '🏷️ Hashtag / Découvrir',
        desc: 'Vidéos sous un hashtag ou un défi TikTok',
        icon: <Hash className="w-4 h-4 text-[#00f2fe]" />,
        contentType: 'search',
        requiresInput: 'hashtag',
        inputLabel: 'Hashtag TikTok :',
        inputPlaceholder: 'Ex: #webdev, #humour, #learnontiktok...',
        defaultTitle: 'TikTok : #',
      },
      {
        id: 'tiktok_user',
        label: '👤 Profil / Créateur',
        desc: 'Vidéos publiées par un tiktokeur spécifique',
        icon: <User className="w-4 h-4 text-[#00f2fe]" />,
        contentType: 'user',
        requiresInput: 'username',
        inputLabel: 'Nom d’utilisateur TikTok (@) :',
        inputPlaceholder: 'Ex: khaby.lame, tiktok, zachking...',
        defaultTitle: 'TikTok : @',
      },
      {
        id: 'tiktok_search',
        label: '🔍 Recherche vidéos',
        desc: 'Rechercher des vidéos TikTok par mots-clés',
        icon: <Search className="w-4 h-4 text-[#00f2fe]" />,
        contentType: 'shorts',
        requiresInput: 'query',
        inputLabel: 'Mots-clés de recherche :',
        inputPlaceholder: 'Ex: recettes cuisine, astuces voyage...',
        defaultTitle: 'TikTok : Recherche',
      },
    ],
  };

  const currentOptions = platformFeedOptions[selectedPlatform] || [];
  const currentSelectedOption = currentOptions.find((opt) => opt.id === selectedOptionId) || currentOptions[0];

  const handlePlatformChange = (p: Platform) => {
    setSelectedPlatform(p);
    const newOptions = platformFeedOptions[p] || [];
    if (newOptions.length > 0) {
      setSelectedOptionId(newOptions[0].id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedOption) return;

    const cleanQ = query.trim();
    const cleanUser = username.replace('@', '').trim();

    let title = currentSelectedOption.defaultTitle;
    if (currentSelectedOption.requiresInput === 'username') {
      title = `${selectedPlatform.toUpperCase()} : @${cleanUser || 'compte'}`;
    } else if (currentSelectedOption.requiresInput === 'hashtag') {
      const formattedTag = cleanQ.startsWith('#') ? cleanQ : `#${cleanQ}`;
      title = `${selectedPlatform.toUpperCase()} : ${formattedTag || '#Tendances'}`;
    } else if (currentSelectedOption.requiresInput === 'query') {
      if (currentSelectedOption.contentType === 'list') {
        const listMatch = cleanQ.match(/lists\/(\d+)/);
        const listId = listMatch ? listMatch[1] : cleanQ.replace(/\D/g, '') || cleanQ;
        title = `X : Liste ${listId ? `#${listId}` : ''}`;
      } else {
        title = cleanQ ? `${selectedPlatform.toUpperCase()} : ${cleanQ}` : currentSelectedOption.defaultTitle;
      }
    }

    let finalQuery = cleanQ;
    if (currentSelectedOption.requiresInput === 'hashtag' && finalQuery) {
      if (!finalQuery.startsWith('#')) {
        finalQuery = `#${finalQuery}`;
      }
    }

    addColumn({
      platform: selectedPlatform,
      contentType: currentSelectedOption.contentType,
      feedMode: currentSelectedOption.feedMode,
      title,
      query: finalQuery || undefined,
      username: cleanUser || undefined,
      width: 'md',
      refreshInterval: 120,
    });

    setQuery('');
    setUsername('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="theme-bg-column theme-border border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* En-tête */}
        <div className="px-6 py-4 theme-border border-b flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold theme-text-primary flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-[#1d9bf0]" />
            Ajouter une colonne multi-réseaux
          </h2>
          <button
            onClick={() => setIsAddModalOpen(false)}
            className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire défilant */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Étape 1 : Choix de la plateforme */}
          <div>
            <label className="text-xs font-bold text-[#8b98a5] uppercase tracking-wider block mb-2">
              1. Choisissez la plateforme :
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {platforms.map((p) => {
                const isSelected = selectedPlatform === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handlePlatformChange(p.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                      isSelected
                        ? `${p.color} ring-2 ${p.activeBorder} text-white font-bold shadow-lg`
                        : 'border-[#38444d]/50 bg-[#1e293b]/40 hover:bg-[#1e293b] text-[#8b98a5]'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-black/40 flex-shrink-0">{p.icon}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#f7f9f9]">{p.label}</div>
                      <div className="text-[11px] text-[#8b98a5] truncate">{p.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Étape 2 : Types de flux adaptés spécifiquement à la plateforme */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#8b98a5] uppercase tracking-wider block">
                2. Flux disponible sur {platforms.find((p) => p.id === selectedPlatform)?.label} :
              </label>
              <span className="text-[11px] font-semibold text-[#1d9bf0] flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" /> Adapté au réseau
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {currentOptions.map((opt) => {
                const isSelected = currentSelectedOption?.id === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'border-[#1d9bf0] bg-[#1d9bf0]/15 text-white font-semibold ring-1 ring-[#1d9bf0]'
                        : 'border-[#38444d]/50 bg-[#1e293b]/40 hover:bg-[#1e293b] text-[#8b98a5]'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">{opt.icon}</div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#f7f9f9] flex items-center gap-1">
                        {opt.label}
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-[#1d9bf0] ml-auto flex-shrink-0" />}
                      </div>
                      <div className="text-[10px] text-[#8b98a5] leading-tight mt-0.5 line-clamp-2">
                        {opt.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Étape 3 : Saisie conditionnelle adaptée au flux choisi */}
          {currentSelectedOption?.requiresInput === 'username' && (
            <div className="space-y-1.5 bg-[#1e293b]/60 p-3 rounded-xl border border-[#38444d]/60">
              <label className="text-xs font-semibold text-[#f7f9f9] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#1d9bf0]" />
                {currentSelectedOption.inputLabel || "Nom d'utilisateur (@) :"}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={currentSelectedOption.inputPlaceholder || "Ex: elonmusk..."}
                autoFocus
                required
                className="w-full px-3.5 py-2 bg-[#0f172a] border border-[#38444d] rounded-xl text-[#f7f9f9] text-sm focus:outline-none focus:border-[#1d9bf0] transition-colors"
              />
            </div>
          )}

          {(currentSelectedOption?.requiresInput === 'query' || currentSelectedOption?.requiresInput === 'hashtag') && (
            <div className="space-y-1.5 bg-[#1e293b]/60 p-3 rounded-xl border border-[#38444d]/60">
              <label className="text-xs font-semibold text-[#f7f9f9] flex items-center gap-1.5">
                {currentSelectedOption.requiresInput === 'hashtag' ? (
                  <Hash className="w-3.5 h-3.5 text-[#1d9bf0]" />
                ) : (
                  <Search className="w-3.5 h-3.5 text-[#1d9bf0]" />
                )}
                {currentSelectedOption.inputLabel || 'Recherche :'}
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={currentSelectedOption.inputPlaceholder || 'Ex: #design, IA...'}
                autoFocus
                className="w-full px-3.5 py-2 bg-[#0f172a] border border-[#38444d] rounded-xl text-[#f7f9f9] text-sm focus:outline-none focus:border-[#1d9bf0] transition-colors"
              />
            </div>
          )}

          {!currentSelectedOption?.requiresInput && (
            <div className="p-2.5 rounded-xl bg-[#1e293b]/40 border border-[#38444d]/40 flex items-center gap-2 text-xs text-[#8b98a5]">
              <Sparkles className="w-4 h-4 text-[#1d9bf0] flex-shrink-0" />
              <span>Ce flux est directement synchronisé avec votre session {platforms.find((p) => p.id === selectedPlatform)?.label}.</span>
            </div>
          )}

          {/* Raccourcis rapides adaptés */}
          <div className="flex items-center gap-1.5 text-xs text-[#8b98a5] flex-wrap pt-1">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#f7f9f9]">
              <Sparkles className="w-3 h-3 text-[#1d9bf0]" /> Raccourcis :
            </span>
            {selectedPlatform === 'twitter' && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedOptionId('x_foryou')}
                  className="px-2 py-0.5 rounded-md bg-[#1e293b] hover:bg-[#1d9bf0]/20 hover:text-[#1d9bf0] text-[11px] transition-colors"
                >
                  ✨ Pour vous
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOptionId('x_following_latest')}
                  className="px-2 py-0.5 rounded-md bg-[#1e293b] hover:bg-[#1d9bf0]/20 hover:text-[#1d9bf0] text-[11px] transition-colors"
                >
                  ⏱️ Abonnements (Récents)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOptionId('x_following_top')}
                  className="px-2 py-0.5 rounded-md bg-[#1e293b] hover:bg-[#1d9bf0]/20 hover:text-[#1d9bf0] text-[11px] transition-colors"
                >
                  🔥 Populaires
                </button>
              </>
            )}

            {selectedPlatform === 'instagram' && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedOptionId('insta_following')}
                  className="px-2 py-0.5 rounded-md bg-[#1e293b] hover:bg-pink-500/20 hover:text-pink-400 text-[11px] transition-colors"
                >
                  ⏱️ Suivi(e)s
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOptionId('insta_foryou')}
                  className="px-2 py-0.5 rounded-md bg-[#1e293b] hover:bg-pink-500/20 hover:text-pink-400 text-[11px] transition-colors"
                >
                  ✨ Pour vous
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOptionId('insta_reels')}
                  className="px-2 py-0.5 rounded-md bg-[#1e293b] hover:bg-pink-500/20 hover:text-pink-400 text-[11px] transition-colors"
                >
                  🎬 Reels
                </button>
              </>
            )}

            {selectedPlatform === 'youtube' && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedOptionId('yt_sub_all')}
                  className="px-2 py-0.5 rounded-md bg-[#1e293b] hover:bg-red-500/20 hover:text-red-400 text-[11px] transition-colors"
                >
                  🔔 Abonnements
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOptionId('yt_sub_videos')}
                  className="px-2 py-0.5 rounded-md bg-[#1e293b] hover:bg-red-500/20 hover:text-red-400 text-[11px] transition-colors"
                >
                  🎬 Vidéos
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOptionId('yt_sub_shorts')}
                  className="px-2 py-0.5 rounded-md bg-[#1e293b] hover:bg-red-500/20 hover:text-red-400 text-[11px] transition-colors"
                >
                  ⚡ Shorts
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOptionId('yt_trending')}
                  className="px-2 py-0.5 rounded-md bg-[#1e293b] hover:bg-red-500/20 hover:text-red-400 text-[11px] transition-colors"
                >
                  📈 Tendances
                </button>
              </>
            )}

            {selectedPlatform === 'tiktok' && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedOptionId('tiktok_foryou')}
                  className="px-2 py-0.5 rounded-md bg-[#1e293b] hover:bg-cyan-500/20 hover:text-[#00f2fe] text-[11px] transition-colors"
                >
                  🔥 Pour toi
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOptionId('tiktok_following')}
                  className="px-2 py-0.5 rounded-md bg-[#1e293b] hover:bg-cyan-500/20 hover:text-[#00f2fe] text-[11px] transition-colors"
                >
                  👥 Abonnements
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOptionId('tiktok_hashtag')}
                  className="px-2 py-0.5 rounded-md bg-[#1e293b] hover:bg-cyan-500/20 hover:text-[#00f2fe] text-[11px] transition-colors"
                >
                  🏷️ #Hashtag
                </button>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#38444d]/30">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-[#8b98a5] hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-sm font-bold rounded-xl shadow-lg transition-all"
            >
              Créer la colonne
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
