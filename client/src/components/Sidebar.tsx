import React from 'react';
import { 
  Plus, 
  Layers, 
  Settings, 
  Youtube, 
  Instagram, 
  Sun,
  Moon,
  Flame,
  LayoutGrid,
  Info
} from 'lucide-react';
import { useDeck } from '../context/DeckContext';
import { Platform } from '../types';

export const Sidebar: React.FC = () => {
  const { 
    systemStatus, 
    activePlatformFilter, 
    setActivePlatformFilter, 
    setIsAddModalOpen, 
    setIsAuthModalOpen, 
    setSelectedAuthPlatform,
    setIsSettingsModalOpen,
    setIsInfoModalOpen,
    theme,
    setTheme
  } = useDeck();

  const handleOpenAuth = (platform: Platform) => {
    setSelectedAuthPlatform(platform);
    setIsAuthModalOpen(true);
  };

  const platforms: { id: Platform | 'all'; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'all', label: 'Tous les flux', icon: <LayoutGrid className="w-5 h-5" />, color: 'theme-text-primary' },
    { id: 'twitter', label: 'X (Twitter)', icon: <span className="font-black text-sm">𝕏</span>, color: 'text-[#1d9bf0]' },
    { id: 'youtube', label: 'YouTube', icon: <Youtube className="w-5 h-5" />, color: 'text-red-500' },
    { id: 'tiktok', label: 'TikTok', icon: <Flame className="w-5 h-5" />, color: 'text-[#00f2fe]' },
    { id: 'instagram', label: 'Instagram', icon: <Instagram className="w-5 h-5" />, color: 'text-pink-500' },
  ];

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dim');
    else if (theme === 'dim') setTheme('black');
    else setTheme('light');
  };

  return (
    <aside className="w-16 md:w-20 h-screen theme-bg-sidebar theme-border border-r flex flex-col items-center py-3.5 justify-between select-none z-20 flex-shrink-0 shadow-xl transition-colors duration-150">
      {/* Haut : Logo & Bouton Ajouter une colonne */}
      <div className="flex flex-col items-center gap-4 w-full">
        <div 
          className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#1d9bf0] via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 hover:scale-105 transition-transform cursor-pointer"
          title="MultiDeck Universal Social Dashboard"
        >
          <Layers className="w-6 h-6" />
        </div>

        {/* Bouton Ajouter Colonne */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-11 h-11 rounded-full bg-[#1d9bf0]/15 hover:bg-[#1d9bf0] text-[#1d9bf0] hover:text-white flex items-center justify-center transition-all duration-200 group relative shadow-md"
          title="Ajouter une colonne (+)"
        >
          <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
        </button>

        <div className="w-8 h-[1px] theme-border border-b opacity-50 my-1" />

        {/* Filtres par réseau social */}
        <div className="flex flex-col items-center gap-2 w-full px-2">
          {platforms.map((p) => {
            const isActive = activePlatformFilter === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActivePlatformFilter(p.id)}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all relative ${
                  isActive
                    ? 'theme-bg-surface ring-2 ring-[#1d9bf0] theme-text-primary shadow-lg'
                    : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-surface'
                }`}
                title={`Afficher : ${p.label}`}
              >
                <div className={p.color}>{p.icon}</div>
                {isActive && (
                  <span className="absolute -right-1.5 w-1.5 h-4 bg-[#1d9bf0] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Centre : Statuts de connexion des plateformes */}
      <div className="flex flex-col items-center gap-2 w-full px-2 py-1">
        <span className="text-[9px] font-bold theme-text-secondary uppercase tracking-wider">Comptes</span>

        {/* Statut X */}
        <button
          onClick={() => handleOpenAuth('twitter')}
          className="w-8 h-8 rounded-lg theme-bg-surface hover:opacity-80 flex items-center justify-center relative hover:scale-105 transition-all shadow-sm theme-border border"
          title={`X (Twitter) : ${systemStatus?.twitter.isAuthenticated ? 'Connecté' : 'Non connecté'}`}
        >
          <span className="text-xs font-bold text-[#1d9bf0]">𝕏</span>
          <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 theme-border ${
            systemStatus?.twitter.isAuthenticated ? 'bg-emerald-400' : 'bg-amber-400'
          }`} />
        </button>

        {/* Statut Instagram */}
        <button
          onClick={() => handleOpenAuth('instagram')}
          className="w-8 h-8 rounded-lg theme-bg-surface hover:opacity-80 flex items-center justify-center relative hover:scale-105 transition-all shadow-sm theme-border border"
          title={`Instagram : ${systemStatus?.instagram.isAuthenticated ? 'Connecté' : 'Non connecté'}`}
        >
          <Instagram className="w-4 h-4 text-pink-500" />
          <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 theme-border ${
            systemStatus?.instagram.isAuthenticated ? 'bg-emerald-400' : 'bg-amber-400'
          }`} />
        </button>

        {/* Statut TikTok */}
        <button
          onClick={() => handleOpenAuth('tiktok')}
          className="w-8 h-8 rounded-lg theme-bg-surface hover:opacity-80 flex items-center justify-center relative hover:scale-105 transition-all shadow-sm theme-border border"
          title={`TikTok : ${systemStatus?.tiktok.isAuthenticated ? 'Connecté' : 'Non connecté'}`}
        >
          <Flame className="w-4 h-4 text-[#00f2fe]" />
          <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 theme-border ${
            systemStatus?.tiktok.isAuthenticated ? 'bg-emerald-400' : 'bg-amber-400'
          }`} />
        </button>

        {/* Statut YouTube */}
        <button
          onClick={() => handleOpenAuth('youtube')}
          className="w-8 h-8 rounded-lg theme-bg-surface hover:opacity-80 flex items-center justify-center relative hover:scale-105 transition-all shadow-sm theme-border border"
          title={`YouTube : ${systemStatus?.youtube.isAuthenticated || systemStatus?.youtube.hasApiKey ? 'Connecté' : 'Non connecté'}`}
        >
          <Youtube className="w-4 h-4 text-red-500" />
          <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 theme-border ${
            systemStatus?.youtube.isAuthenticated || systemStatus?.youtube.hasApiKey ? 'bg-emerald-400' : 'bg-amber-400'
          }`} />
        </button>
      </div>

      {/* Bas : Guide/Info, Thème et Paramètres */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        {/* Page / Guide d'Information & Sécurité (juste au-dessus des paramètres) */}
        <button
          onClick={() => setIsInfoModalOpen(true)}
          className="w-10 h-10 rounded-xl hover:theme-bg-surface text-[#1d9bf0] hover:text-[#1d9bf0] hover:scale-105 flex items-center justify-center transition-all relative group"
          title="Guide du projet, Sécurité & Confidentialité"
        >
          <Info className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#1d9bf0] animate-pulse" />
        </button>

        {/* Bascule de thème */}
        <button
          onClick={cycleTheme}
          className="w-10 h-10 rounded-xl hover:theme-bg-surface theme-text-secondary hover:theme-text-primary flex items-center justify-center transition-colors"
          title={`Thème actuel : ${theme === 'light' ? 'Mode Clair' : theme === 'dim' ? 'Bleu Nuit' : 'Noir Absolu'} (cliquer pour changer)`}
        >
          {theme === 'light' ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : theme === 'dim' ? (
            <Moon className="w-4 h-4 text-[#1d9bf0]" />
          ) : (
            <span className="text-xs">🖤</span>
          )}
        </button>

        {/* Paramètres */}
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="w-10 h-10 rounded-xl hover:theme-bg-surface theme-text-secondary hover:theme-text-primary flex items-center justify-center transition-colors"
          title="Paramètres de l'application"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
};
