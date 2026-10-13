import React, { useState } from 'react';
import { 
  X, 
  Chrome, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  LogOut, 
  ExternalLink,
  KeyRound,
  Sparkles,
  Zap,
  Globe
} from 'lucide-react';
import { useDeck } from '../context/DeckContext';
import { Platform, BrowserEngine } from '../types';
import { api } from '../services/api';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    setIsAuthModalOpen, 
    selectedAuthPlatform, 
    setSelectedAuthPlatform,
    systemStatus, 
    triggerPlatformLogin, 
    logoutPlatform,
    checkStatus 
  } = useDeck();

  const [selectedEngine, setSelectedEngine] = useState<BrowserEngine | 'all'>('all');
  const [authMethod, setAuthMethod] = useState<'browser' | 'cookie'>('browser');
  const [inputAuthToken, setInputAuthToken] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isGlobalImporting, setIsGlobalImporting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const currentPlatformStatus = selectedAuthPlatform === 'twitter' 
    ? systemStatus?.twitter 
    : selectedAuthPlatform === 'instagram'
    ? systemStatus?.instagram
    : selectedAuthPlatform === 'tiktok'
    ? systemStatus?.tiktok
    : selectedAuthPlatform === 'threads'
    ? systemStatus?.threads
    : selectedAuthPlatform === 'reddit'
    ? systemStatus?.reddit
    : systemStatus?.youtube;

  const isConnected = currentPlatformStatus?.isAuthenticated;

  // Calcul du nombre de réseaux connectés
  const connectedCount = (systemStatus?.twitter?.isAuthenticated ? 1 : 0) +
    (systemStatus?.instagram?.isAuthenticated ? 1 : 0) +
    (systemStatus?.tiktok?.isAuthenticated ? 1 : 0) +
    (systemStatus?.threads?.isAuthenticated ? 1 : 0) +
    (systemStatus?.reddit?.isAuthenticated ? 1 : 0) +
    (systemStatus?.youtube?.isAuthenticated ? 1 : 0);

  const handleStart = async () => {
    try {
      setIsStarting(true);
      const engineToUse = selectedEngine === 'all' ? 'chromium' : selectedEngine;
      setMsg(`Ouverture du navigateur de connexion pour ${selectedAuthPlatform.toUpperCase()} (${engineToUse})...`);
      const res = await triggerPlatformLogin(selectedAuthPlatform, engineToUse);
      setMsg(res.message);
    } catch (err: any) {
      setMsg(err.message || 'Erreur');
    } finally {
      setIsStarting(false);
    }
  };

  const handleInjectCookie = async () => {
    if (!inputAuthToken.trim()) return;
    try {
      setIsStarting(true);
      setMsg(`Injection du cookie pour ${selectedAuthPlatform.toUpperCase()}...`);
      const res = await api.injectCookies(selectedAuthPlatform, inputAuthToken.trim());
      setMsg(res.message);
      await checkStatus();
      if (res.success) setInputAuthToken('');
    } catch (err: any) {
      setMsg(err.message || 'Erreur injection');
    } finally {
      setIsStarting(false);
    }
  };

  const handleAutoImport = async () => {
    try {
      setIsStarting(true);
      const engineLabel = selectedEngine === 'all' 
        ? 'tous vos navigateurs (Chrome, Edge, Firefox, Brave, Opera)' 
        : selectedEngine;
      setMsg(`Scan et importation automatique de la session ${selectedAuthPlatform.toUpperCase()} depuis ${engineLabel}...`);
      const res = await api.autoImportCookies(selectedAuthPlatform, selectedEngine);
      setMsg(res.message);
      await checkStatus();
    } catch (err: any) {
      setMsg(err.message || 'Erreur auto-importation');
    } finally {
      setIsStarting(false);
    }
  };

  const handleAutoImportAll = async () => {
    try {
      setIsGlobalImporting(true);
      setMsg('Scan multi-navigateurs et connexion automatique de tous vos réseaux (X, Instagram, TikTok)...');
      const res = await api.autoImportAll(selectedEngine);
      setMsg(res.message);
      await checkStatus();
    } catch (err: any) {
      setMsg(err.message || 'Erreur lors de la connexion globale');
    } finally {
      setIsGlobalImporting(false);
    }
  };

  const cookieInfoMap: Record<Platform, { cookieName: string; domain: string; example: string }> = {
    twitter: { cookieName: 'auth_token', domain: 'x.com', example: '4a2b89c0...' },
    instagram: { cookieName: 'sessionid', domain: 'instagram.com', example: '5829104%3A...' },
    tiktok: { cookieName: 'sessionid', domain: 'tiktok.com', example: 'a9f2b8...' },
    youtube: { cookieName: 'SID', domain: 'google.com', example: '...' },
    bluesky: { cookieName: 'Public (Aucun)', domain: 'bsky.app', example: 'Accès public ouvert sans cookies' },
    threads: { cookieName: 'sessionid', domain: 'threads.net', example: 'Partagé avec Instagram / Meta' },
    reddit: { cookieName: 'reddit_session', domain: 'reddit.com', example: 'eyJhbGci...' },
  };

  const info = cookieInfoMap[selectedAuthPlatform] || cookieInfoMap.twitter;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="theme-bg-column theme-border border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* En-tête */}
        <div className="px-6 py-4 theme-border border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#1d9bf0]" />
            <h2 className="text-lg font-bold theme-text-primary">Connexion aux Réseaux Sociaux</h2>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps avec scroll si nécessaire */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          
          {/* BANNIÈRE TOTALE : TOUT CONNECTER EN 1-CLIC */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-600/20 via-indigo-600/25 to-purple-600/20 border border-blue-500/40 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#1d9bf0]/20 text-[#1d9bf0]">
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Connexion Globale 1-Clic
                    <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full font-semibold border border-blue-400/30">
                      {connectedCount}/4 connectés
                    </span>
                  </h3>
                </div>
              </div>

              {connectedCount === 4 ? (
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Opérationnel
                </span>
              ) : null}
            </div>

            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Détecte et importe simultanément vos sessions <strong>X (Twitter)</strong>, <strong>Instagram</strong>, <strong>TikTok</strong> et <strong>YouTube</strong> depuis tous vos navigateurs locaux (Chrome, Edge, Brave, Opera, Firefox).
            </p>

            <button
              type="button"
              onClick={handleAutoImportAll}
              disabled={isGlobalImporting || isStarting}
              className="w-full py-2.5 bg-gradient-to-r from-[#1d9bf0] via-indigo-600 to-blue-600 hover:from-[#1a8cd8] hover:via-indigo-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 group cursor-pointer"
            >
              <Sparkles className={`w-4 h-4 text-amber-300 ${isGlobalImporting ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
              <span>{isGlobalImporting ? 'Connexion en cours de tous les réseaux...' : '✨ Tout Connecter en 1-Clic (Scan Universel)'}</span>
            </button>
          </div>

          {/* SÉLECTEUR DE MOTEUR DE NAVIGATEUR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#8b98a5] uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#1d9bf0]" />
                Moteur / Navigateur cible :
              </label>
              <span className="text-[10px] text-slate-400">
                {selectedEngine === 'all' ? 'Scan tous navigateurs' : selectedEngine.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'all' as const, label: 'Tous', desc: 'Chrome/Edge/Firefox' },
                { id: 'chromium' as const, label: 'Chromium', desc: 'Chrome / Edge / Brave' },
                { id: 'firefox' as const, label: 'Firefox', desc: 'Gecko Engine' },
                { id: 'webkit' as const, label: 'WebKit', desc: 'Safari Engine' },
              ].map((eng) => (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => {
                    setSelectedEngine(eng.id);
                    setMsg(null);
                  }}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    selectedEngine === eng.id
                      ? 'border-[#1d9bf0] bg-[#1d9bf0]/15 text-white font-bold ring-1 ring-[#1d9bf0]'
                      : 'border-[#38444d]/50 bg-[#1e293b]/40 text-[#8b98a5] hover:text-white hover:border-[#38444d]'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{eng.label}</div>
                  <div className="text-[9px] text-[#8b98a5] truncate">{eng.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Onglets de plateforme individuelle */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#8b98a5] uppercase tracking-wider">
              Ou configurer par réseau :
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 bg-[#1e293b] rounded-xl p-1 border border-[#38444d]/50 gap-1">
              {(['twitter', 'threads', 'reddit', 'instagram', 'tiktok', 'youtube'] as Platform[]).map((p) => {
                const isSelected = selectedAuthPlatform === p;
                const isPConnected = p === 'twitter' 
                  ? systemStatus?.twitter.isAuthenticated 
                  : p === 'threads'
                  ? systemStatus?.threads?.isAuthenticated
                  : p === 'reddit'
                  ? systemStatus?.reddit?.isAuthenticated
                  : p === 'instagram' 
                  ? systemStatus?.instagram.isAuthenticated 
                  : p === 'tiktok'
                  ? systemStatus?.tiktok.isAuthenticated
                  : systemStatus?.youtube?.isAuthenticated;

                const label = p === 'twitter' 
                  ? '𝕏' 
                  : p === 'threads' 
                  ? 'Threads' 
                  : p === 'reddit' 
                  ? 'Reddit' 
                  : p === 'instagram' 
                  ? 'Instagram' 
                  : p === 'tiktok' 
                  ? 'TikTok' 
                  : 'YouTube';

                return (
                  <button
                    key={p}
                    onClick={() => {
                      setSelectedAuthPlatform(p);
                      setMsg(null);
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all truncate ${
                      isSelected
                        ? 'bg-[#1d9bf0] text-white shadow-md'
                        : 'text-[#8b98a5] hover:text-white'
                    }`}
                  >
                    <span className="truncate">{label}</span>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isPConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* État de la session sélectionnée */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3.5 ${
            isConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            {isConnected ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            <div className="flex-1">
              <h3 className="font-bold text-xs">
                {isConnected ? `Session ${selectedAuthPlatform.toUpperCase()} active` : `Aucune session ${selectedAuthPlatform.toUpperCase()} connectée`}
              </h3>
              <p className="text-[11px] text-[#8b98a5] mt-0.5">
                {isConnected
                  ? `Vos flux ${selectedAuthPlatform.toUpperCase()} sont synchronisés en direct.`
                  : `Récupérez votre session en 1-clic ou ouvrez la fenêtre de connexion.`}
              </p>
            </div>
          </div>

          {/* Bouton d'auto-import 1-clic pour le réseau sélectionné */}
          {!isConnected && (
            <div className="p-3.5 rounded-xl bg-[#1e293b]/70 border border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Importation Automatique ({selectedAuthPlatform.toUpperCase()})
                </div>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                  {selectedEngine === 'all' ? 'Scan Universel' : selectedEngine.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Extrait automatiquement les cookies de session {selectedAuthPlatform.toUpperCase()} depuis vos navigateurs {selectedEngine === 'all' ? '(Chrome, Edge, Brave, Opera, Firefox)' : `(${selectedEngine})`}.
              </p>
              <button
                type="button"
                onClick={handleAutoImport}
                disabled={isStarting || isGlobalImporting}
                className="w-full py-2.5 bg-gradient-to-r from-[#1d9bf0] to-blue-600 hover:from-[#1a8cd8] hover:to-blue-700 text-white font-bold rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Récupérer ma session {selectedAuthPlatform.toUpperCase()} ({selectedEngine === 'all' ? 'Auto-Détection' : selectedEngine})</span>
              </button>
            </div>
          )}

          {/* Méthodes alternatives : Fenêtre interactive ou Cookie Manuel */}
          {!isConnected && (
            <div className="space-y-3">
              <div className="flex bg-[#1e293b]/60 p-1 rounded-xl border border-[#38444d]/40">
                <button
                  type="button"
                  onClick={() => setAuthMethod('browser')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    authMethod === 'browser' ? 'bg-[#1d9bf0] text-white' : 'text-[#8b98a5] hover:text-white'
                  }`}
                >
                  1. Fenêtre Navigateur Playwright
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('cookie')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    authMethod === 'cookie' ? 'bg-[#1d9bf0] text-white' : 'text-[#8b98a5] hover:text-white'
                  }`}
                >
                  2. Coller cookie {info.cookieName}
                </button>
              </div>

              {authMethod === 'cookie' && (
                <div className="space-y-2 bg-[#1e293b]/40 p-3.5 rounded-xl border border-[#38444d]/50">
                  <div className="text-xs font-bold text-[#f7f9f9]">
                    Jeton de cookie {selectedAuthPlatform.toUpperCase()} ({info.cookieName}) :
                  </div>
                  <p className="text-[11px] text-[#8b98a5]">
                    Sur votre navigateur où vous êtes connecté : F12 &gt; Application &gt; Cookies &gt; <code className="text-[#1d9bf0]">{info.domain}</code> &gt; copiez la valeur de <code className="text-[#1d9bf0]">{info.cookieName}</code>.
                  </p>
                  <input
                    type="password"
                    value={inputAuthToken}
                    onChange={(e) => setInputAuthToken(e.target.value)}
                    placeholder={`Collez votre ${info.cookieName} ici (ex: ${info.example})`}
                    className="w-full px-3 py-2 bg-[#0f172a] border border-[#38444d] rounded-lg text-xs text-[#f7f9f9] focus:outline-none focus:border-[#1d9bf0]"
                  />
                  <button
                    type="button"
                    onClick={handleInjectCookie}
                    disabled={!inputAuthToken.trim() || isStarting}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-all disabled:opacity-50"
                  >
                    Injecter le cookie et valider la session
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Message de notification */}
          {msg && (
            <div className="p-3 bg-[#1e293b] border border-[#38444d] rounded-xl text-xs text-[#1d9bf0] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1d9bf0] animate-ping" />
              <span className="break-words">{msg}</span>
            </div>
          )}

          {/* Actions principales */}
          <div className="space-y-2.5 pt-1">
            {!isConnected ? (
              <button
                onClick={handleStart}
                disabled={isStarting || isGlobalImporting}
                className="w-full py-3 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 text-sm"
              >
                <Chrome className={`w-5 h-5 ${isStarting ? 'animate-spin' : ''}`} />
                <span>{isStarting ? 'Ouverture...' : `Ouvrir la fenêtre de connexion ${selectedAuthPlatform.toUpperCase()} (${selectedEngine === 'all' ? 'Chromium' : selectedEngine})`}</span>
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => logoutPlatform(selectedAuthPlatform)}
                  className="flex-1 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Se déconnecter de {selectedAuthPlatform.toUpperCase()}
                </button>

                <button
                  onClick={handleStart}
                  className="py-2.5 px-4 bg-[#1e293b] hover:bg-[#273340] border border-[#38444d] text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-xs transition-all"
                >
                  <ExternalLink className="w-4 h-4 text-[#1d9bf0]" />
                  Rouvrir le navigateur
                </button>
              </div>
            )}

            <button
              onClick={() => checkStatus()}
              className="w-full py-1 text-xs font-semibold text-[#8b98a5] hover:text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualiser le statut
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
