import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  Cpu, 
  Globe, 
  Key, 
  RefreshCw, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  HardDrive,
  UserCheck,
  EyeOff,
  ServerOff,
  ChevronLeft,
  ChevronRight,
  Share2,
  MessageCircle,
  Heart,
  ArrowUp,
  ChevronsLeft,
  Keyboard
} from 'lucide-react';
import { useDeck } from '../context/DeckContext';

type TabId = 'overview' | 'platforms' | 'security' | 'accounts' | 'cache' | 'shortcuts';

export const InfoModal: React.FC = () => {
  const { isInfoModalOpen, setIsInfoModalOpen } = useDeck();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Fonctionnement', icon: <Layers className="w-4 h-4 text-[#1d9bf0]" /> },
    { id: 'platforms', label: 'Réseaux Supportés', icon: <Globe className="w-4 h-4 text-purple-400" /> },
    { id: 'security', label: 'Sécurité & Vie Privée', icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> },
    { id: 'accounts', label: 'Comptes & Connexion', icon: <Key className="w-4 h-4 text-amber-400" /> },
    { id: 'cache', label: 'Performance & Cache', icon: <RefreshCw className="w-4 h-4 text-[#00f2fe]" /> },
    { id: 'shortcuts', label: 'Astuces & Interactions', icon: <Sparkles className="w-4 h-4 text-pink-400" /> },
  ];

  const currentTabIndex = tabs.findIndex((t) => t.id === activeTab);

  const handlePrevTab = () => {
    const prevIdx = currentTabIndex > 0 ? currentTabIndex - 1 : tabs.length - 1;
    setActiveTab(tabs[prevIdx].id);
  };

  const handleNextTab = () => {
    const nextIdx = currentTabIndex < tabs.length - 1 ? currentTabIndex + 1 : 0;
    setActiveTab(tabs[nextIdx].id);
  };

  // Raccourcis clavier : Échap pour fermer, Flèches Gauche/Droite pour naviguer entre onglets
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isInfoModalOpen) return;
      if (e.key === 'Escape') {
        setIsInfoModalOpen(false);
      } else if (e.key === 'ArrowLeft') {
        handlePrevTab();
      } else if (e.key === 'ArrowRight') {
        handleNextTab();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInfoModalOpen, currentTabIndex]);

  if (!isInfoModalOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn"
      onClick={() => setIsInfoModalOpen(false)}
    >
      <div 
        className="relative w-full max-w-4xl theme-bg-surface theme-text-primary rounded-2xl shadow-2xl border theme-border flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b theme-border bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1d9bf0] via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md flex-shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                MultiDeck
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#1d9bf0]/20 text-[#1d9bf0] border border-[#1d9bf0]/30">
                  v1.1.2
                </span>
              </h2>
              <p className="text-xs theme-text-secondary">
                Tableau de bord social universel — Guide, Sécurité & Nouveaux Réseaux
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsInfoModalOpen(false)}
            className="p-2 rounded-xl hover:theme-bg-app theme-text-secondary hover:theme-text-primary transition-colors"
            title="Fermer (Échap)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barre d'onglets responsive multi-lignes (flex-wrap) + curseurs de navigation */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-2.5 border-b theme-border theme-bg-app/50 flex-shrink-0 select-none">
          {/* Liste des onglets avec retour à la ligne automatique */}
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'theme-bg-surface text-[#1d9bf0] shadow-sm border theme-border ring-1 ring-[#1d9bf0]/30'
                      : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-surface/60'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Curseurs de changement d'onglets (Flèches Précédent / Suivant) */}
          <div className="flex items-center gap-1 pl-2 border-l theme-border flex-shrink-0">
            <button
              onClick={handlePrevTab}
              className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-surface border theme-border transition-colors"
              title="Onglet précédent (Flèche Gauche)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] theme-text-secondary font-mono px-1">
              {currentTabIndex + 1}/{tabs.length}
            </span>
            <button
              onClick={handleNextTab}
              className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-surface border theme-border transition-colors"
              title="Onglet suivant (Flèche Droite)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenu défilant */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-sm leading-relaxed custom-scrollbar">
          {/* ONGLET 1 : FONCTIONNEMENT */}
          {activeTab === 'overview' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3">
                <Globe className="w-6 h-6 text-[#1d9bf0] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-[#1d9bf0] mb-1">Architecture Locale 100% Autonome</h3>
                  <p className="text-xs theme-text-secondary">
                    MultiDeck fusionne <strong>7 plateformes sociales majeures</strong> : 𝕏 (Twitter), 🦋 Bluesky, 🧵 Threads (Meta), 🤖 Reddit, YouTube, TikTok et Instagram dans une interface unifiée type TweetDeck. L'application s'exécute <strong>exclusivement sur votre machine locale</strong>, sans abonnement ni intermédiaire cloud.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl theme-bg-app/60 border theme-border space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-purple-400">
                    <Cpu className="w-4 h-4" /> Moteur Hybride Haute Vitesse
                  </div>
                  <p className="text-xs theme-text-secondary">
                    Le backend Node.js combine des requêtes directes haute vitesse (APIs publiques pour Bluesky & Reddit JSON) et des contextes Playwright réactifs ultra-légers pour capturer les flux authentifiés en temps réel.
                  </p>
                </div>

                <div className="p-4 rounded-xl theme-bg-app/60 border theme-border space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-pink-400">
                    <Layers className="w-4 h-4" /> Organisation Multi-Colonnes
                  </div>
                  <p className="text-xs theme-text-secondary">
                    Créez autant de colonnes que vous le souhaitez : fils d'accueil, créateurs, hashtags, subreddits ciblés, Shorts/Reels, ou listes personnalisées, avec rafraîchissement automatique paramétrable.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl theme-bg-app/30 border theme-border space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Aucun algorithme imposé
                </h4>
                <p className="text-xs theme-text-secondary">
                  Vous reprenez le contrôle complet de vos flux : selon le réseau, choisissez entre le fil recommandé, les abonnements récents chronologiques ou les publications les plus populaires. Les contenus sponsorisés présents dans certains fils (X, Instagram) peuvent toutefois apparaître.
                </p>
              </div>
            </div>
          )}

          {/* ONGLET 2 : NOUVEAUX RÉSEAUX SUPPORTÉS */}
          {activeTab === 'platforms' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex gap-3">
                <Globe className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-purple-400 mb-1">7 Réseaux Sociaux Réunis dans un Seul Dashboard</h3>
                  <p className="text-xs theme-text-secondary">
                    MultiDeck intègre désormais les nouveaux réseaux sociaux émergents et décentralisés aux côtés des plateformes classiques.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bluesky */}
                <div className="p-4 rounded-xl theme-bg-app/60 border border-[#0285ff]/30 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#0285ff]">
                    <span>🦋 Bluesky (Social Décentralisé)</span>
                  </div>
                  <p className="text-xs theme-text-secondary">
                    Basé sur le protocole ouvert <strong>AT Protocol (XRPC)</strong>. Fonctionne immédiatement sans login requis via l'API publique ouverte.
                  </p>
                  <ul className="text-[11px] theme-text-secondary space-y-1 list-disc list-inside">
                    <li>Fil <strong>Découverte & Tendances</strong></li>
                    <li>Fil <strong>Mes Abonnements</strong> (publications récentes, en indiquant votre @handle)</li>
                    <li>Recherche de publications et de hashtags, colonnes de profils</li>
                    <li>Visualiseur de discussions complet</li>
                  </ul>
                </div>

                {/* Threads */}
                <div className="p-4 rounded-xl theme-bg-app/60 border border-white/20 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-white">
                    <span>🧵 Threads (Meta)</span>
                  </div>
                  <p className="text-xs theme-text-secondary">
                    Microblogging textuel rapide lié à votre compte Instagram.
                  </p>
                  <ul className="text-[11px] theme-text-secondary space-y-1 list-disc list-inside">
                    <li>Fil d'actualité <strong>Pour vous</strong> et <strong>Suivi(e)s</strong></li>
                    <li>Affichage des fils de créateurs (@username)</li>
                    <li>Recherche par mot-clé et thématique</li>
                    <li>Thread Viewer réactif optimisé</li>
                  </ul>
                </div>

                {/* Reddit */}
                <div className="p-4 rounded-xl theme-bg-app/60 border border-[#ff4500]/30 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#ff4500]">
                    <span>🤖 Reddit (Communautés & Forums)</span>
                  </div>
                  <p className="text-xs theme-text-secondary">
                    Accès ultra-rapide aux communautés mondiales via l'API JSON native.
                  </p>
                  <ul className="text-[11px] theme-text-secondary space-y-1 list-disc list-inside">
                    <li>Colonnes dédiées par <strong>Subreddit</strong> (ex: r/France, r/technology)</li>
                    <li>Fils <strong>Accueil</strong>, <strong>Populaire</strong> et <strong>Nouveautés</strong>, recherche et profils</li>
                    <li>Discussion avec <strong>commentaires hiérarchiques imbriqués</strong></li>
                    <li>Votes positifs / négatifs et commentaires envoyés avec votre session Reddit connectée</li>
                  </ul>
                </div>

                {/* X (Twitter) */}
                <div className="p-4 rounded-xl theme-bg-app/60 border border-[#1d9bf0]/30 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#1d9bf0]">
                    <span>𝕏 X (Twitter)</span>
                  </div>
                  <p className="text-xs theme-text-secondary">
                    Tableau de bord haute fidélité inspiré de l'historique TweetDeck.
                  </p>
                  <ul className="text-[11px] theme-text-secondary space-y-1 list-disc list-inside">
                    <li>Fils <strong>Pour vous</strong>, <strong>Abonnements</strong> et <strong>Listes X</strong></li>
                    <li>Recherche en direct et profils complets</li>
                    <li>Like, Repost et Réponse via la fenêtre officielle de X, Thread Viewer</li>
                  </ul>
                </div>

                {/* YouTube */}
                <div className="p-4 rounded-xl theme-bg-app/60 border border-red-500/30 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-red-500">
                    <span>📺 YouTube</span>
                  </div>
                  <p className="text-xs theme-text-secondary">
                    Colonnes de chaînes, recherche, tendances et flux d'abonnements (connexion requise) avec filtre spécialisé pour les <strong>YouTube Shorts</strong>.
                  </p>
                </div>

                {/* TikTok & Instagram */}
                <div className="p-4 rounded-xl theme-bg-app/60 border border-pink-500/30 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-pink-500">
                    <span>🎵 TikTok & Instagram</span>
                  </div>
                  <p className="text-xs theme-text-secondary">
                    Fils Pour toi / Pour vous et Abonnements, profils, hashtags, Reels et recherche TikTok, avec lecteur média intégré plein écran (connexion requise).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ONGLET 3 : SÉCURITÉ & VIE PRIVÉE */}
          {activeTab === 'security' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-emerald-400 mb-1">Confidentialité Totale (Zéro Cloud)</h3>
                  <p className="text-xs theme-text-secondary">
                    Contrairement aux applications SaaS tierces, MultiDeck <strong>ne possède aucun serveur central</strong> : il dialogue directement avec les réseaux sociaux depuis votre PC. Seules exceptions : la traduction automatique (si activée) envoie le texte des publications au service MyMemory, et certains avatars de remplacement sont générés par ui-avatars.com.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 rounded-xl theme-bg-app/50 border theme-border">
                  <ServerOff className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs">Aucune télémétrie ni pistage</h4>
                    <p className="text-xs theme-text-secondary">
                      MultiDeck ne collecte ni n'envoie aucune donnée personnelle ou statistique d'utilisation. Le seul journal est technique et reste sur votre PC (fichier multideck.log du lanceur).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl theme-bg-app/50 border theme-border">
                  <Lock className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs">Stockage local des sessions</h4>
                    <p className="text-xs theme-text-secondary">
                      Vos cookies de session et profils de navigation sont enregistrés localement dans <code className="px-1.5 py-0.5 rounded bg-black/30 font-mono text-[11px]">server/user_data/</code>, non chiffrés : ne partagez jamais ce dossier. Par défaut, l'application n'est accessible que depuis ce PC.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl theme-bg-app/50 border theme-border">
                  <EyeOff className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs">Adresse IP résidentielle préservée</h4>
                    <p className="text-xs theme-text-secondary">
                      Toutes les requêtes vers les réseaux sociaux proviennent directement de votre propre connexion internet, ce qui évite les blocages liés aux serveurs mutualisés. La lecture automatisée reste contraire aux conditions de certains réseaux (X, Meta, TikTok) : un usage raisonnable limite le risque pour vos comptes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ONGLET 4 : COMPTES & CONNEXION */}
          {activeTab === 'accounts' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
                <Key className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-amber-400 mb-1">Connexion & Synchronisation Simple</h3>
                  <p className="text-xs theme-text-secondary">
                    MultiDeck propose des options flexibles pour connecter vos différents comptes en toute simplicité.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl theme-bg-app/60 border theme-border">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#1d9bf0] mb-1">
                    <Sparkles className="w-4 h-4" /> 1. Détection automatique 1-Clic (Recommandé)
                  </div>
                  <p className="text-xs theme-text-secondary mb-2">
                    Si vous êtes déjà connecté sur votre navigateur habituel (Google Chrome, Edge, Brave, Firefox, Opera, Opera GX ou Vivaldi), MultiDeck peut importer automatiquement votre session pour <strong>X, Reddit, Threads, Instagram, TikTok et YouTube</strong>. Cette détection nécessite Python 3 installé sur le PC.
                  </p>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Vous n'avez pas besoin de ressaisir vos mots de passe.
                  </div>
                </div>

                <div className="p-4 rounded-xl theme-bg-app/60 border theme-border">
                  <div className="flex items-center gap-2 font-bold text-xs text-purple-400 mb-1">
                    <UserCheck className="w-4 h-4" /> 2. Connexion Interactive Sécurisée
                  </div>
                  <p className="text-xs theme-text-secondary mb-2">
                    Ouvre une fenêtre de navigateur isolée, propre à MultiDeck, sur la page de connexion officielle du réseau social. Connectez-vous normalement puis fermez la fenêtre : votre session est enregistrée localement.
                  </p>
                </div>

                <div className="p-4 rounded-xl theme-bg-app/60 border theme-border">
                  <div className="flex items-center gap-2 font-bold text-xs text-emerald-400 mb-1">
                    <Globe className="w-4 h-4" /> 3. Sans compte requis pour Bluesky
                  </div>
                  <p className="text-xs theme-text-secondary">
                    Grâce à la conception ouverte d'AT Protocol, <strong>Bluesky fonctionne immédiatement</strong> pour la recherche, les tendances et les flux publics sans aucune obligation de connexion.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ONGLET 5 : PERFORMANCE & CACHE */}
          {activeTab === 'cache' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3">
                <RefreshCw className="w-6 h-6 text-[#1d9bf0] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-[#1d9bf0] mb-1">Double Cache Mémoire & Disque</h3>
                  <p className="text-xs theme-text-secondary">
                    Pour garantir des temps de chargement quasi instantanés et soulager votre bande passante, MultiDeck intègre un cache automatique.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl theme-bg-app/60 border theme-border space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-400">
                    <HardDrive className="w-4 h-4" /> Durée de rétention (TTL)
                  </div>
                  <p className="text-xs theme-text-secondary">
                    Les flux sont conservés en cache rapide pendant <strong>environ 4 minutes</strong> (1 minute pour les conversations). Changer d'onglet ou basculer entre colonnes est instantané sans requête réseau superflue.
                  </p>
                </div>

                <div className="p-4 rounded-xl theme-bg-app/60 border theme-border space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-emerald-400">
                    <RefreshCw className="w-4 h-4" /> Rafraîchissement Forcé
                  </div>
                  <p className="text-xs theme-text-secondary">
                    Cliquez sur le bouton de rafraîchissement d'une colonne à tout moment pour forcer l'actualisation en temps réel.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl theme-bg-app/40 border theme-border space-y-2">
                <h4 className="font-bold text-xs text-purple-400">Purger le cache en 1 clic</h4>
                <p className="text-xs theme-text-secondary">
                  Vous pouvez vider l'ensemble du cache mémoire et disque à tout moment depuis les <strong>Paramètres</strong> ou via l'icône de la barre des tâches Windows (System Tray).
                </p>
              </div>
            </div>
          )}

          {/* ONGLET 6 : ASTUCES & INTERACTIONS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 flex gap-3">
                <Sparkles className="w-6 h-6 text-pink-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-pink-400 mb-1">Astuces & Nouvelles Interactions</h3>
                  <p className="text-xs theme-text-secondary">
                    Tirez le meilleur parti de votre espace de travail avec ces fonctionnalités interactives.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl theme-bg-app/50 border theme-border flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    <Keyboard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">Raccourcis clavier du deck</h4>
                    <ul className="text-xs theme-text-secondary space-y-1 mt-1">
                      <li><kbd className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[10px]">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[10px]">→</kbd> : colonne précédente / suivante (la colonne active est entourée de bleu ; un clic sur une colonne la rend active). Depuis la première colonne, ← sélectionne la barre latérale de gauche : Tab ou ↑ ↓ y parcourent les boutons, → revient aux colonnes</li>
                      <li><kbd className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[10px]">↓</kbd> : faire défiler la colonne active · <kbd className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[10px]">Page ↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[10px]">Page ↓</kbd> : d'un écran entier</li>
                      <li><kbd className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[10px]">Tab</kbd> <kbd className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[10px]">Maj + Tab</kbd> : parcourir les boutons de la colonne active (actualiser, réglages, déplacement, fermeture, onglets, publications…), puis <kbd className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[10px]">Entrée</kbd> pour activer</li>
                      <li><kbd className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[10px]">T</kbd> : revenir en haut de la colonne active</li>
                      <li><kbd className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[10px]">Début</kbd> <kbd className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[10px]">Fin</kbd> : aller à la première / dernière colonne</li>
                      <li><kbd className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[10px]">R</kbd> : actualiser toutes les colonnes</li>
                    </ul>
                    <p className="text-[11px] theme-text-secondary mt-1">Inactifs pendant la saisie de texte ou lorsqu'une fenêtre (guide, paramètres, conversation…) est ouverte.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl theme-bg-app/50 border theme-border flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#1d9bf0]/20 text-[#1d9bf0] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">Actualiser toutes les colonnes d’un clic</h4>
                    <p className="text-xs theme-text-secondary">
                      Cliquez sur le logo MultiDeck en haut de la barre latérale gauche : toutes les colonnes affichées sont actualisées en même temps, exactement comme si vous cliquiez sur le bouton « Actualiser » de chacune d'elles.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl theme-bg-app/50 border theme-border flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    <ArrowUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">Revenir en haut d’une colonne</h4>
                    <p className="text-xs theme-text-secondary">
                      Dès que vous faites défiler une colonne, l'icône du réseau dans son en-tête s'entoure d'un liseré bleu et se transforme en flèche ↑ au survol : un clic remonte la colonne tout en haut. Revenue en haut, l'icône redevient un simple repère visuel.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl theme-bg-app/50 border theme-border flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    <ChevronsLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">Aller à la première ou à la dernière colonne</h4>
                    <p className="text-xs theme-text-secondary">
                      Quand vos colonnes dépassent la largeur de l'écran, un bouton « Dernière colonne » apparaît en bas à droite tant que vous êtes au début du deck, et un bouton « Première colonne » apparaît en bas à gauche une fois arrivé au bout : un clic vous y amène directement.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl theme-bg-app/50 border theme-border flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">Interactions directes depuis les cartes</h4>
                    <p className="text-xs theme-text-secondary">
                      La bulle de discussion ouvre la conversation complète (X, Bluesky, Threads, Reddit). Sur Reddit, les flèches ⬆ / ⬇ envoient un vote positif ou négatif (un second clic l'annule) ; sur X, le cœur et le repost ouvrent la fenêtre officielle de X pour confirmer. Sur les autres réseaux, les compteurs (j'aime, reposts, commentaires) sont affichés à titre indicatif, sans bouton : ouvrez la publication d'origine pour interagir.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl theme-bg-app/50 border theme-border flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#0285ff]/20 text-[#0285ff] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">Réponse Rapide (Quick Reply) & Ctrl+Entrée</h4>
                    <p className="text-xs theme-text-secondary">
                      Proposée uniquement sur Reddit (réponse envoyée directement) et X (la fenêtre officielle s'ouvre pour confirmer). Dans le visualiseur de discussion, écrivez votre réponse et appuyez sur <kbd className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[10px]">Ctrl + Entrée</kbd> pour soumettre votre message instantanément.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl theme-bg-app/50 border theme-border flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">Pré-sélection intelligente des colonnes</h4>
                    <p className="text-xs theme-text-secondary">
                      Lorsque vous êtes sur le filtre d'un réseau (ex: Reddit ou Threads) et cliquez sur « Ajouter une colonne », la modale sélectionne directement ce réseau pour vous faire gagner du temps.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl theme-bg-app/50 border theme-border flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">Navigation au clavier dans le Guide</h4>
                    <p className="text-xs theme-text-secondary">
                      Utilisez les touches <kbd className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[10px]">←</kbd> et <kbd className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[10px]">→</kbd> pour feuilleter les onglets de ce guide ou <kbd className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[10px]">Échap</kbd> pour le fermer.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied de page avec boutons de navigation et fermeture */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t theme-border theme-bg-app/40 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevTab}
              className="px-3 py-1.5 rounded-xl border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-surface text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Précédent</span>
            </button>
            <button
              onClick={handleNextTab}
              className="px-3 py-1.5 rounded-xl border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-surface text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <span className="hidden sm:inline">Suivant</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] theme-text-secondary hidden md:inline">
              MultiDeck — Open Source & Privacy First
            </span>
            <button
              onClick={() => setIsInfoModalOpen(false)}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#1d9bf0] to-purple-600 hover:opacity-90 text-white text-xs font-bold transition-all shadow-md active:scale-95"
            >
              Compris !
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
