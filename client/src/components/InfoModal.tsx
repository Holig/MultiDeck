import React, { useState } from 'react';
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
  ServerOff
} from 'lucide-react';
import { useDeck } from '../context/DeckContext';

type TabId = 'overview' | 'security' | 'accounts' | 'cache' | 'shortcuts';

export const InfoModal: React.FC = () => {
  const { isInfoModalOpen, setIsInfoModalOpen } = useDeck();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  if (!isInfoModalOpen) return null;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Fonctionnement', icon: <Layers className="w-4 h-4" /> },
    { id: 'security', label: 'Sécurité & Vie Privée', icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> },
    { id: 'accounts', label: 'Récupération des Comptes', icon: <Key className="w-4 h-4 text-amber-400" /> },
    { id: 'cache', label: 'Performance & Cache', icon: <RefreshCw className="w-4 h-4 text-[#1d9bf0]" /> },
    { id: 'shortcuts', label: 'Astuces & Raccourcis', icon: <Sparkles className="w-4 h-4 text-pink-400" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div 
        className="relative w-full max-w-3xl theme-bg-surface theme-text-primary rounded-2xl shadow-2xl border theme-border flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1d9bf0] via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                MultiDeck
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#1d9bf0]/20 text-[#1d9bf0] border border-[#1d9bf0]/30">
                  v1.0.0 Self-Hosted
                </span>
              </h2>
              <p className="text-xs theme-text-secondary">
                Tableau de bord social universel — Guide, Sécurité & Confidentialité
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

        {/* Barre d'onglets */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-2 border-b theme-border theme-bg-app/50 overflow-x-auto select-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'theme-bg-surface text-[#1d9bf0] shadow-sm border theme-border'
                    : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-surface/50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Contenu défilant */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm leading-relaxed custom-scrollbar">
          {/* ONGLET 1 : FONCTIONNEMENT */}
          {activeTab === 'overview' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3">
                <Globe className="w-6 h-6 text-[#1d9bf0] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-[#1d9bf0] mb-1">Architecture Locale 100% Autonome</h3>
                  <p className="text-xs theme-text-secondary">
                    MultiDeck fusionne <strong>X (Twitter)</strong>, <strong>YouTube</strong>, <strong>TikTok</strong> et <strong>Instagram</strong> dans une interface unifiée type TweetDeck. L'application tourne <strong>entièrement sur votre machine</strong>, sans intermédiaire ni abonnement.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl theme-bg-app/60 border theme-border space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-purple-400">
                    <Cpu className="w-4 h-4" /> Moteur Hybride Playwright
                  </div>
                  <p className="text-xs theme-text-secondary">
                    Le backend Node.js utilise des navigateurs headless isolés pour communiquer directement avec les interfaces officielles des réseaux sociaux et récupérer vos flux en temps réel.
                  </p>
                </div>

                <div className="p-4 rounded-xl theme-bg-app/60 border theme-border space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-pink-400">
                    <Layers className="w-4 h-4" /> Organisation Multi-Colonnes
                  </div>
                  <p className="text-xs theme-text-secondary">
                    Créez autant de colonnes que vous le souhaitez : fils d'actualité, créateurs favoris, hashtags, tendances, shorts/reels ou listes personnalisées, avec rafraîchissement automatique.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl theme-bg-app/30 border theme-border space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Aucun algorithme imposé
                </h4>
                <p className="text-xs theme-text-secondary">
                  Vous reprenez le contrôle total de votre fil : choisissez entre le fil algorithmique "Pour vous", les abonnements chronologiques récents ou les plus populaires, sans publicités intrusives.
                </p>
              </div>
            </div>
          )}

          {/* ONGLET 2 : SÉCURITÉ & VIE PRIVÉE */}
          {activeTab === 'security' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-emerald-400 mb-1">Confidentialité Maximale (Zéro Cloud)</h3>
                  <p className="text-xs theme-text-secondary">
                    Contrairement aux applications SaaS en ligne, MultiDeck <strong>n'a aucun serveur distant</strong>. Vos données ne transitent par aucun serveur externe et restent confinées à votre ordinateur.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 rounded-xl theme-bg-app/50 border theme-border">
                  <ServerOff className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs">Aucun serveur centralisé</h4>
                    <p className="text-xs theme-text-secondary">
                      MultiDeck ne collecte aucune donnée personnelle, aucun identifiant, aucun journal d'activité ni statistique d'utilisation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl theme-bg-app/50 border theme-border">
                  <Lock className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs">Sessions stockées localement sur votre disque</h4>
                    <p className="text-xs theme-text-secondary">
                      Vos cookies de session et profils de navigation sont enregistrés exclusivement dans le sous-dossier sécurisé <code className="px-1.5 py-0.5 rounded bg-black/30 font-mono text-[11px]">server/user_data/</code> de votre PC.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl theme-bg-app/50 border theme-border">
                  <EyeOff className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs">Utilisation de votre adresse IP résidentielle</h4>
                    <p className="text-xs theme-text-secondary">
                      Toutes les requêtes vers X, Instagram ou TikTok proviennent directement de votre propre connexion internet. Vos comptes ne risquent aucun bannissement de masse lié aux serveurs mutualisés.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ONGLET 3 : RÉCUPÉRATION DES COMPTES */}
          {activeTab === 'accounts' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
                <Key className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-amber-400 mb-1">3 Méthodes de Connexion au Choix</h3>
                  <p className="text-xs theme-text-secondary">
                    MultiDeck vous propose plusieurs approches selon vos préférences pour vous connecter à vos réseaux sociaux en toute transparence.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl theme-bg-app/60 border theme-border">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#1d9bf0] mb-1">
                    <Sparkles className="w-4 h-4" /> 1. Détection automatique 1-Clic (Recommandé)
                  </div>
                  <p className="text-xs theme-text-secondary mb-2">
                    Si vous êtes déjà connecté à vos réseaux sur votre navigateur habituel (Google Chrome, Edge, Brave, Firefox, Opera ou Vivaldi), MultiDeck peut extraire directement votre session locale de façon chiffrée.
                  </p>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Vous n'avez aucun identifiant ni mot de passe à ressaisir.
                  </div>
                </div>

                <div className="p-4 rounded-xl theme-bg-app/60 border theme-border">
                  <div className="flex items-center gap-2 font-bold text-xs text-purple-400 mb-1">
                    <UserCheck className="w-4 h-4" /> 2. Connexion Interactive Sécurisée
                  </div>
                  <p className="text-xs theme-text-secondary mb-2">
                    Ouvre une fenêtre de navigateur isolée pointant vers la page officielle de connexion (ex: <code className="px-1.5 py-0.5 rounded bg-black/30 font-mono text-[11px]">x.com/login</code>).
                  </p>
                  <div className="text-[11px] theme-text-secondary">
                    Vous vous connectez directement auprès du service officiel. Dès la connexion réussie, la fenêtre se referme et votre session est prête.
                  </div>
                </div>

                <div className="p-4 rounded-xl theme-bg-app/60 border theme-border">
                  <div className="flex items-center gap-2 font-bold text-xs text-pink-400 mb-1">
                    <Lock className="w-4 h-4" /> 3. Injection Manuelle de Cookies
                  </div>
                  <p className="text-xs theme-text-secondary">
                    Pour les utilisateurs avancés : collez manuellement vos jetons de session (cookie <code className="px-1 py-0.5 rounded bg-black/30 font-mono text-[11px]">auth_token</code> pour X, <code className="px-1 py-0.5 rounded bg-black/30 font-mono text-[11px]">sessionid</code> pour Instagram/TikTok).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ONGLET 4 : PERFORMANCE & CACHE */}
          {activeTab === 'cache' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3">
                <RefreshCw className="w-6 h-6 text-[#1d9bf0] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-[#1d9bf0] mb-1">Système de Cache Intelligent</h3>
                  <p className="text-xs theme-text-secondary">
                    Pour garantir une navigation ultra-rapide et économiser votre bande passante, MultiDeck intègre un double cache mémoire et disque.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl theme-bg-app/60 border theme-border space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-400">
                    <HardDrive className="w-4 h-4" /> Durée de rétention (TTL)
                  </div>
                  <p className="text-xs theme-text-secondary">
                    Les flux sont mis en cache pendant <strong>3 à 5 minutes</strong>. Changer d'onglet ou naviguer entre colonnes affiche immédiatement les résultats sans recharger.
                  </p>
                </div>

                <div className="p-4 rounded-xl theme-bg-app/60 border theme-border space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-emerald-400">
                    <RefreshCw className="w-4 h-4" /> Rafraîchissement Forcé
                  </div>
                  <p className="text-xs theme-text-secondary">
                    Cliquez à tout moment sur l'icône de rafraîchissement d'une colonne pour forcer la récupération des tout derniers posts en temps réel.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl theme-bg-app/40 border theme-border space-y-2">
                <h4 className="font-bold text-xs text-purple-400">Purger le cache en 1 clic</h4>
                <p className="text-xs theme-text-secondary">
                  Vous pouvez vider intégralement le cache disque et mémoire à tout moment depuis la modale <strong>Paramètres</strong> ou via le menu de l'icône dans la <strong>barre des tâches Windows (System Tray)</strong>.
                </p>
              </div>
            </div>
          )}

          {/* ONGLET 5 : ASTUCES & RACCOURCIS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 flex gap-3">
                <Sparkles className="w-6 h-6 text-pink-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-pink-400 mb-1">Astuces & Personnalisation</h3>
                  <p className="text-xs theme-text-secondary">
                    Tirez le meilleur parti de votre espace de travail MultiDeck.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl theme-bg-app/50 border theme-border flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-[#1d9bf0]/20 text-[#1d9bf0] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">Filtrage instantané par réseau</h4>
                    <p className="text-xs theme-text-secondary">
                      Cliquez sur les icônes X, YouTube, TikTok ou Instagram dans la barre latérale pour isoler uniquement les colonnes du réseau concerné.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl theme-bg-app/50 border theme-border flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">Sauvegarde & Export de vos colonnes</h4>
                    <p className="text-xs theme-text-secondary">
                      Dans <strong>Paramètres</strong>, exportez votre disposition de colonnes sous forme de fichier JSON pour la restaurer sur un autre ordinateur ou la partager.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl theme-bg-app/50 border theme-border flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">Lecteur Média Plein Écran</h4>
                    <p className="text-xs theme-text-secondary">
                      Cliquez sur n'importe quelle vidéo, YouTube Shorts, TikTok ou image pour ouvrir la visionneuse interactive dédiée avec navigation au clavier.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t theme-border theme-bg-app/40">
          <span className="text-[11px] theme-text-secondary">
            MultiDeck — Open Source & Privacy First
          </span>
          <button
            onClick={() => setIsInfoModalOpen(false)}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#1d9bf0] to-purple-600 hover:opacity-90 text-white text-xs font-bold transition-all shadow-md"
          >
            Compris !
          </button>
        </div>
      </div>
    </div>
  );
};
