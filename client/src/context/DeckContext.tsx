import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  ColumnConfig, 
  SystemStatus, 
  ActiveMediaPreview, 
  ThemeMode, 
  Platform, 
  BrowserEngine,
  SocialPost 
} from '../types';
import { api } from '../services/api';
import { SupportedLanguage, getTranslation } from '../i18n/translations';

interface DeckContextType {
  columns: ColumnConfig[];
  filteredColumns: ColumnConfig[];
  activePlatformFilter: Platform | 'all';
  setActivePlatformFilter: (filter: Platform | 'all') => void;
  addColumn: (col: Omit<ColumnConfig, 'id'>) => void;
  removeColumn: (id: string) => void;
  updateColumn: (id: string, updates: Partial<ColumnConfig>) => void;
  moveColumn: (id: string, direction: 'left' | 'right') => void;
  resetColumns: () => void;
  importColumns: (newColumns: ColumnConfig[]) => void;
  
  // Statuts système
  systemStatus: SystemStatus | null;
  isCheckingStatus: boolean;
  checkStatus: () => Promise<void>;
  triggerPlatformLogin: (platform: Platform, engine?: BrowserEngine) => Promise<{ success: boolean; message: string }>;
  logoutPlatform: (platform: Platform) => Promise<void>;

  // Aperçu média / Lecteur vidéo interactif
  activeMediaPreview: ActiveMediaPreview | null;
  setActiveMediaPreview: (preview: ActiveMediaPreview | null) => void;

  // Fil de conversation / Thread Viewer
  activeThreadPost: SocialPost | null;
  setActiveThreadPost: (post: SocialPost | null) => void;

  // Modales
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  selectedAuthPlatform: Platform;
  setSelectedAuthPlatform: (platform: Platform) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  isInfoModalOpen: boolean;
  setIsInfoModalOpen: (open: boolean) => void;

  // Thème
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // Langue & Traduction
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  autoTranslatePosts: boolean;
  setAutoTranslatePosts: (enabled: boolean) => void;
  t: (key: string) => string;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'col-yt-tech',
    platform: 'youtube',
    contentType: 'search',
    title: 'YouTube : Tech & AI',
    query: 'Tech AI Smartphone',
    width: 'md',
    refreshInterval: 120,
  },
  {
    id: 'col-x-home',
    platform: 'twitter',
    contentType: 'home',
    title: 'X : Fil d’actualité',
    width: 'md',
    refreshInterval: 60,
  },
  {
    id: 'col-tiktok-trends',
    platform: 'tiktok',
    contentType: 'search',
    title: 'TikTok : #WebDev',
    query: 'webdev',
    width: 'md',
    refreshInterval: 90,
  },
  {
    id: 'col-ig-design',
    platform: 'instagram',
    contentType: 'user',
    title: 'Instagram : @archdigest',
    username: 'archdigest',
    width: 'md',
    refreshInterval: 180,
  },
];

const LOCAL_STORAGE_COLUMNS_KEY = 'multideck_v2_columns';
const LOCAL_STORAGE_THEME_KEY = 'multideck_theme';
const LOCAL_STORAGE_LANG_KEY = 'multideck_language';
const LOCAL_STORAGE_AUTO_TRANSLATE_KEY = 'multideck_auto_translate';

const DeckContext = createContext<DeckContextType | undefined>(undefined);

export const DeckProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Colonnes
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erreur lecture colonnes sauvegardées :', e);
    }
    return DEFAULT_COLUMNS;
  });

  // Filtre actif de réseau (Tous, X, YouTube, TikTok, Instagram)
  const [activePlatformFilter, setActivePlatformFilter] = useState<Platform | 'all'>('all');

  // Statut système de chaque plateforme
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Modales, lecteur interactif et thread viewer
  const [activeMediaPreview, setActiveMediaPreview] = useState<ActiveMediaPreview | null>(null);
  const [activeThreadPost, setActiveThreadPost] = useState<SocialPost | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedAuthPlatform, setSelectedAuthPlatform] = useState<Platform>('twitter');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // Langue de l'interface & Traduction
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_LANG_KEY) as SupportedLanguage;
      if (['fr', 'en', 'es', 'de', 'it', 'pt', 'ja'].includes(saved)) return saved;
      const nav = navigator.language.slice(0, 2).toLowerCase() as SupportedLanguage;
      if (['fr', 'en', 'es', 'de', 'it', 'pt', 'ja'].includes(nav)) return nav;
    } catch {}
    return 'fr';
  });

  const [autoTranslatePosts, setAutoTranslatePostsState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_AUTO_TRANSLATE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const setLanguage = (newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(LOCAL_STORAGE_LANG_KEY, newLang);
      document.documentElement.setAttribute('lang', newLang);
    } catch {}
  };

  const setAutoTranslatePosts = (enabled: boolean) => {
    setAutoTranslatePostsState(enabled);
    try {
      localStorage.setItem(LOCAL_STORAGE_AUTO_TRANSLATE_KEY, enabled.toString());
    } catch {}
  };

  const t = (key: string): string => {
    return getTranslation(language, key);
  };

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  // Thème
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_THEME_KEY) as ThemeMode;
    if (saved === 'light' || saved === 'dim' || saved === 'black') return saved;
    return 'dim';
  });

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  // Synchronisation des colonnes dans le stockage local
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_COLUMNS_KEY, JSON.stringify(columns));
  }, [columns]);

  // Vérification des statuts de connexion
  const checkStatus = async () => {
    try {
      setIsCheckingStatus(true);
      const res = await api.getStatus();
      setSystemStatus(res);
    } catch (err) {
      console.warn('Backend status unreachable, using offline fallback');
      setSystemStatus({
        twitter: { isAuthenticated: false, isBrowserOpen: false, cookiesDetected: false, lastChecked: new Date().toISOString() },
        instagram: { isAuthenticated: false, isBrowserOpen: false, cookiesDetected: false, lastChecked: new Date().toISOString() },
        tiktok: { isAuthenticated: false, isBrowserOpen: false, cookiesDetected: false, lastChecked: new Date().toISOString() },
        youtube: { isAuthenticated: false, isBrowserOpen: false, cookiesDetected: false, lastChecked: new Date().toISOString(), hasApiKey: false },
        bluesky: { isAuthenticated: true, isBrowserOpen: false, cookiesDetected: false, lastChecked: new Date().toISOString() },
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 25000);
    return () => clearInterval(interval);
  }, []);

  const triggerPlatformLogin = async (platform: Platform, engine: BrowserEngine = 'chromium') => {
    try {
      const res = await api.startLogin(platform, engine);
      await checkStatus();
      return res;
    } catch (err: any) {
      throw new Error(err.message || 'Erreur lors du démarrage du navigateur de connexion');
    }
  };

  const logoutPlatform = async (platform: Platform) => {
    try {
      await api.logout(platform);
      await checkStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const addColumn = (col: Omit<ColumnConfig, 'id'>) => {
    const newCol: ColumnConfig = {
      ...col,
      id: `col-${col.platform}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    };
    setColumns((prev) => [...prev, newCol]);
  };

  const removeColumn = (id: string) => {
    setColumns((prev) => prev.filter((col) => col.id !== id));
  };

  const updateColumn = (id: string, updates: Partial<ColumnConfig>) => {
    setColumns((prev) => prev.map((col) => (col.id === id ? { ...col, ...updates } : col)));
  };

  const moveColumn = (id: string, direction: 'left' | 'right') => {
    setColumns((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1) return prev;
      if (direction === 'left' && idx === 0) return prev;
      if (direction === 'right' && idx === prev.length - 1) return prev;

      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      return copy;
    });
  };

  const resetColumns = () => {
    setColumns(DEFAULT_COLUMNS);
  };

  const importColumns = (newColumns: ColumnConfig[]) => {
    if (!Array.isArray(newColumns) || newColumns.length === 0) {
      throw new Error("Le fichier ne contient aucune colonne valide.");
    }
    const validPlatforms = ['twitter', 'instagram', 'tiktok', 'youtube'];
    const validCols: ColumnConfig[] = newColumns.map((col, idx) => {
      if (!col.platform || !validPlatforms.includes(col.platform)) {
        throw new Error(`Colonne #${idx + 1} invalide : plateforme "${col.platform}" inconnue.`);
      }
      return {
        id: col.id || `col-${col.platform}-${Date.now()}-${idx}`,
        platform: col.platform,
        contentType: col.contentType || 'home',
        feedMode: col.feedMode,
        title: col.title || `${col.platform.toUpperCase()} Colonne`,
        query: col.query,
        username: col.username,
        width: col.width || 'md',
        refreshInterval: col.refreshInterval || 120,
        filterKeyword: col.filterKeyword,
        isPaused: col.isPaused,
      };
    });
    setColumns(validCols);
    localStorage.setItem(LOCAL_STORAGE_COLUMNS_KEY, JSON.stringify(validCols));
  };

  // Filtrage des colonnes selon la sélection de la barre latérale
  const filteredColumns = columns.filter((col) => {
    if (activePlatformFilter === 'all') return true;
    return col.platform === activePlatformFilter;
  });

  return (
    <DeckContext.Provider
      value={{
        columns,
        filteredColumns,
        activePlatformFilter,
        setActivePlatformFilter,
        addColumn,
        removeColumn,
        updateColumn,
        moveColumn,
        resetColumns,
        importColumns,
        systemStatus,
        isCheckingStatus,
        checkStatus,
        triggerPlatformLogin,
        logoutPlatform,
        activeMediaPreview,
        setActiveMediaPreview,
        activeThreadPost,
        setActiveThreadPost,
        isAddModalOpen,
        setIsAddModalOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        selectedAuthPlatform,
        setSelectedAuthPlatform,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        isInfoModalOpen,
        setIsInfoModalOpen,
        theme,
        setTheme,
        language,
        setLanguage,
        autoTranslatePosts,
        setAutoTranslatePosts,
        t,
      }}
    >
      {children}
    </DeckContext.Provider>
  );
};

export const useDeck = () => {
  const ctx = useContext(DeckContext);
  if (!ctx) throw new Error('useDeck doit être utilisé dans un DeckProvider');
  return ctx;
};
