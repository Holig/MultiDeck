import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Moon, 
  Sun, 
  Trash2, 
  RotateCcw, 
  Check, 
  HardDrive, 
  Sparkles, 
  Loader2,
  Download,
  Upload,
  Copy,
  Share2,
  FileJson,
  AlertCircle,
  Palette
} from 'lucide-react';
import { useDeck } from '../context/DeckContext';
import { api } from '../services/api';

export const SettingsModal: React.FC = () => {
  const { 
    isSettingsModalOpen, 
    setIsSettingsModalOpen, 
    theme, 
    setTheme, 
    columns,
    resetColumns,
    importColumns
  } = useDeck();

  const [cacheCleared, setCacheCleared] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ totalMb: string; details: Record<string, string> } | null>(null);
  const [freedMessage, setFreedMessage] = useState<string | null>(null);

  // Sauvegarde & Partage de l'agencement
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [layoutFeedback, setLayoutFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [showRawModal, setShowRawModal] = useState(false);
  const [rawInput, setRawInput] = useState('');

  useEffect(() => {
    if (isSettingsModalOpen) {
      api.getStorageInfo().then(setStorageInfo).catch(console.error);
    }
  }, [isSettingsModalOpen]);

  if (!isSettingsModalOpen) return null;

  const handleClearCache = async () => {
    try {
      setIsClearing(true);
      const res = await api.clearCache();
      setCacheCleared(true);
      if (res.freedMb && parseFloat(res.freedMb) > 0) {
        setFreedMessage(`${res.freedMb} Mo libérés avec succès !`);
      } else {
        setFreedMessage('Cache mémoire et temporaire vidé.');
      }
      const updated = await api.getStorageInfo();
      setStorageInfo(updated);
      setTimeout(() => {
        setCacheCleared(false);
        setFreedMessage(null);
      }, 5000);
    } catch (e: any) {
      setFreedMessage(e.message || 'Erreur lors de la purge');
    } finally {
      setIsClearing(false);
    }
  };

  // Exportation au format JSON téléchargeable
  const handleExportJson = () => {
    try {
      const exportData = {
        app: 'MultiDeck',
        version: '2.0',
        exportedAt: new Date().toISOString(),
        columnsCount: columns.length,
        columns: columns,
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `multideck-agencement-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLayoutFeedback({
        type: 'success',
        message: `${columns.length} colonne(s) exportée(s) avec succès dans le fichier !`,
      });
      setTimeout(() => setLayoutFeedback(null), 4000);
    } catch (err: any) {
      setLayoutFeedback({
        type: 'error',
        message: err.message || "Erreur lors de l'exportation",
      });
    }
  };

  // Copie de la configuration dans le presse-papier
  const handleCopyJson = async () => {
    try {
      const exportData = {
        app: 'MultiDeck',
        version: '2.0',
        exportedAt: new Date().toISOString(),
        columnsCount: columns.length,
        columns: columns,
      };
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setCopiedFeedback(true);
      setLayoutFeedback({
        type: 'success',
        message: 'Agencement copié dans le presse-papier ! Vous pouvez le coller pour le partager.',
      });
      setTimeout(() => {
        setCopiedFeedback(false);
        setLayoutFeedback(null);
      }, 4000);
    } catch (err: any) {
      setLayoutFeedback({
        type: 'error',
        message: "Impossible d'accéder au presse-papier.",
      });
    }
  };

  // Décode et importe les données JSON
  const applyImportData = (parsed: any) => {
    let targetCols = parsed;
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.columns)) {
      targetCols = parsed.columns;
    }

    if (!Array.isArray(targetCols) || targetCols.length === 0) {
      throw new Error("Format invalide : aucune colonne n'a été trouvée dans les données.");
    }

    importColumns(targetCols);
    setLayoutFeedback({
      type: 'success',
      message: `${targetCols.length} colonne(s) importée(s) et appliquées avec succès !`,
    });
    setTimeout(() => setLayoutFeedback(null), 5000);
  };

  // Importation depuis un fichier local
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        applyImportData(parsed);
      } catch (err: any) {
        setLayoutFeedback({
          type: 'error',
          message: err.message || 'Le fichier JSON sélectionné est invalide ou corrompu.',
        });
      } finally {
        // Réinitialise l'input pour pouvoir réimporter le même fichier si besoin
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setLayoutFeedback({
        type: 'error',
        message: 'Erreur lors de la lecture du fichier.',
      });
    };
    reader.readAsText(file);
  };

  // Importation depuis le texte collé manuellement
  const handleApplyPastedJson = () => {
    if (!rawInput.trim()) return;
    try {
      const parsed = JSON.parse(rawInput.trim());
      applyImportData(parsed);
      setShowRawModal(false);
      setRawInput('');
    } catch (err: any) {
      setLayoutFeedback({
        type: 'error',
        message: err.message || 'Le texte collé ne constitue pas un JSON valide.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="theme-bg-column theme-border border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="px-6 py-4 theme-border border-b flex items-center justify-between sticky top-0 theme-bg-column z-10">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#1d9bf0]" />
            <h2 className="text-lg font-bold theme-text-primary">Paramètres MultiDeck</h2>
          </div>
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-6">
          {/* Réglage du thème avec 3 modes */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold theme-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-[#1d9bf0]" />
                Apparence & Thème
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1d9bf0]/10 text-[#1d9bf0] capitalize">
                {theme === 'light' ? 'Mode Clair' : theme === 'dim' ? 'Bleu Nuit' : 'Noir Absolu'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  theme === 'light'
                    ? 'border-[#1d9bf0] bg-[#1d9bf0]/15 text-[#1d9bf0] font-bold ring-2 ring-[#1d9bf0]/40 shadow-sm'
                    : 'theme-border theme-bg-surface theme-text-secondary hover:theme-text-primary'
                }`}
              >
                <Sun className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-semibold">Clair</span>
                <span className="text-[10px] opacity-70">Blanc pur</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dim')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  theme === 'dim'
                    ? 'border-[#1d9bf0] bg-[#1d9bf0]/15 text-[#1d9bf0] font-bold ring-2 ring-[#1d9bf0]/40 shadow-sm'
                    : 'theme-border theme-bg-surface theme-text-secondary hover:theme-text-primary'
                }`}
              >
                <Moon className="w-5 h-5 text-[#1d9bf0]" />
                <span className="text-xs font-semibold">Bleu Nuit</span>
                <span className="text-[10px] opacity-70">#0f172a</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('black')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  theme === 'black'
                    ? 'border-[#1d9bf0] bg-[#1d9bf0]/15 text-[#1d9bf0] font-bold ring-2 ring-[#1d9bf0]/40 shadow-sm'
                    : 'theme-border theme-bg-surface theme-text-secondary hover:theme-text-primary'
                }`}
              >
                <span className="text-base leading-none">🖤</span>
                <span className="text-xs font-semibold">Noir Absolu</span>
                <span className="text-[10px] opacity-70">OLED (#000)</span>
              </button>
            </div>
          </div>

          <div className="w-full h-[1px] theme-border border-b opacity-50" />

          {/* Sauvegarde, Exportation et Partage de l'agencement */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold theme-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-[#1d9bf0]" />
                Sauvegarde & Partage de l'agencement
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1d9bf0]/10 text-[#1d9bf0] border border-[#1d9bf0]/20">
                {columns.length} colonne{columns.length > 1 ? 's' : ''} active{columns.length > 1 ? 's' : ''}
              </span>
            </div>

            <p className="text-[11px] theme-text-secondary leading-relaxed">
              Exportez votre agencement actuel pour le transférer sur un autre ordinateur, le sauvegarder ou le partager avec des amis ou collègues.
            </p>

            {/* Input fichier invisible */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="p-2.5 rounded-xl border theme-border theme-bg-surface hover:opacity-90 theme-text-primary text-xs font-semibold flex items-center justify-center gap-2 transition-all group hover:border-[#1d9bf0]"
              >
                <Download className="w-4 h-4 text-[#1d9bf0] group-hover:scale-110 transition-transform" />
                <span>Exporter (.json)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyJson}
                className="p-2.5 rounded-xl border theme-border theme-bg-surface hover:opacity-90 theme-text-primary text-xs font-semibold flex items-center justify-center gap-2 transition-all group hover:border-[#1d9bf0]"
              >
                {copiedFeedback ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-[#1d9bf0] group-hover:scale-110 transition-transform" />
                )}
                <span>{copiedFeedback ? 'Copié !' : 'Copier'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl border theme-border theme-bg-surface hover:opacity-90 theme-text-primary text-xs font-semibold flex items-center justify-center gap-2 transition-all group hover:border-emerald-500"
              >
                <Upload className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Importer un fichier</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRawModal(!showRawModal)}
                className="p-2.5 rounded-xl border theme-border theme-bg-surface hover:opacity-90 theme-text-primary text-xs font-semibold flex items-center justify-center gap-2 transition-all group hover:border-amber-400"
              >
                <FileJson className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>{showRawModal ? 'Fermer la saisie' : 'Coller du code JSON'}</span>
              </button>
            </div>

            {/* Zone escamotable pour coller du code brut */}
            {showRawModal && (
              <div className="p-3 theme-bg-surface theme-border border rounded-xl space-y-2 animate-in fade-in">
                <label className="text-[11px] font-semibold theme-text-secondary block">
                  Collez le texte JSON exporté depuis un autre MultiDeck :
                </label>
                <textarea
                  rows={4}
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder='{"app": "MultiDeck", "columns": [...] }'
                  className="w-full p-2.5 theme-bg-card theme-border border rounded-lg text-xs font-mono theme-text-primary placeholder:opacity-50 focus:outline-none focus:border-[#1d9bf0]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRawModal(false);
                      setRawInput('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs theme-text-secondary hover:theme-text-primary hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={!rawInput.trim()}
                    onClick={handleApplyPastedJson}
                    className="px-4 py-1.5 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-xs font-bold rounded-lg disabled:opacity-40 transition-all shadow"
                  >
                    Appliquer cet agencement
                  </button>
                </div>
              </div>
            )}

            {/* Retour utilisateur succès / erreur */}
            {layoutFeedback && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
                  layoutFeedback.type === 'success'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                }`}
              >
                {layoutFeedback.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{layoutFeedback.message}</span>
              </div>
            )}
          </div>

          <div className="w-full h-[1px] theme-border border-b opacity-50" />

          {/* Purge du cache et libération de l'espace disque */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#8b98a5] uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-[#1d9bf0]" />
                Stockage & Caches Navigateurs
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1e293b] text-[#1d9bf0] border border-[#38444d]">
                {storageInfo ? `${storageInfo.totalMb} Mo occupés` : 'Calcul...'}
              </span>
            </div>

            <div className="p-3.5 bg-[#1e293b]/50 border border-[#38444d]/60 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#f7f9f9]">Vider les caches & libérer l'espace</p>
                  <p className="text-[11px] text-[#8b98a5]">
                    Purge les médias temporaires, vidéos et caches Playwright
                  </p>
                </div>
                <button
                  onClick={handleClearCache}
                  disabled={isClearing}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
                    cacheCleared
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30'
                  }`}
                >
                  {isClearing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Nettoyage...
                    </>
                  ) : cacheCleared ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Nettoyé !
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Vider le cache
                    </>
                  )}
                </button>
              </div>

              {/* Détails par réseau si disponible */}
              {storageInfo?.details && Object.keys(storageInfo.details).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 border-t border-[#38444d]/40">
                  {Object.entries(storageInfo.details).map(([k, v]) => (
                    <div key={k} className="bg-[#0f172a]/70 px-2 py-1 rounded-lg text-[10px] flex items-center justify-between border border-[#38444d]/30">
                      <span className="text-[#8b98a5] capitalize">{k} :</span>
                      <span className="font-semibold text-[#f7f9f9]">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {freedMessage && (
                <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 animate-in fade-in">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  {freedMessage}
                </p>
              )}

              <p className="text-[10px] text-[#8b98a5] italic leading-tight">
                ℹ️ Vos sessions de connexion, comptes enregistrés et colonnes sont 100% préservés. Seuls les fichiers caches temporaires sont effacés.
              </p>
            </div>
          </div>

          <div className="w-full h-[1px] bg-[#38444d]/50" />

          {/* Rétablir les colonnes par défaut */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#8b98a5] uppercase tracking-wider">
              Disposition
            </label>
            <button
              onClick={() => {
                if (confirm('Voulez-vous réinitialiser toutes les colonnes au deck multi-réseaux par défaut ?')) {
                  resetColumns();
                  setIsSettingsModalOpen(false);
                }
              }}
              className="w-full p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Rétablir la disposition multi-réseaux par défaut
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
