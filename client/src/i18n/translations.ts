export type SupportedLanguage = 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt' | 'ja';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'Anglais', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Espagnol', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Allemand', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italien', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portugais', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ja', name: 'Japonais', nativeName: '日本語', flag: '🇯🇵' },
];

export const translations: Record<SupportedLanguage, Record<string, string>> = {
  fr: {
    // Sidebar
    'sidebar.allFeeds': 'Tous les flux',
    'sidebar.addColumn': 'Ajouter une colonne',
    'sidebar.accounts': 'Comptes',
    'sidebar.guide': 'Guide du projet, Sécurité & Nouveaux Réseaux',
    'sidebar.theme': 'Changer de thème',
    'sidebar.settings': 'Paramètres de l’application',

    // Paramètres
    'settings.title': 'Paramètres',
    'settings.subtitle': 'Personnalisation, Langue, Cache & Sauvegarde',
    'settings.languageSection': 'Langue de l’interface',
    'settings.languageDesc': 'Sélectionnez la langue d’affichage de MultiDeck. La modification est instantanée et sauvegardée.',
    'settings.autoTranslateSection': 'Traduction automatique des posts',
    'settings.autoTranslateDesc': 'Afficher un bouton de traduction automatique instantanée sur les publications étrangères vers votre langue.',
    'settings.autoTranslateEnabled': 'Traduction automatique activée',
    'settings.autoTranslateDisabled': 'Traduction manuelle sur demande',
    'settings.themeSection': 'Thème visuel & Apparence',
    'settings.themeLight': 'Mode Clair',
    'settings.themeDim': 'Bleu Nuit (Dim)',
    'settings.themeBlack': 'Noir Absolu (OLED)',
    'settings.storageSection': 'Espace de Stockage & Cache',
    'settings.storageDesc': 'MultiDeck utilise un cache local haute performance pour accélérer les affichages et préserver vos quotas réseau.',
    'settings.clearCacheBtn': 'Purger le cache multi-plateformes',
    'settings.clearing': 'Purge en cours...',
    'settings.cacheCleared': 'Cache purgé avec succès !',
    'settings.backupSection': 'Sauvegarde & Partage de l’agencement',
    'settings.backupDesc': 'Exportez ou importez la disposition complète de vos colonnes sous forme de fichier JSON.',
    'settings.exportJson': 'Exporter en fichier JSON',
    'settings.importJson': 'Importer un fichier JSON',
    'settings.copyJson': 'Copier la configuration',
    'settings.pasteJson': 'Coller du code JSON',
    'settings.resetSection': 'Zone de réinitialisation',
    'settings.resetBtn': 'Réinitialiser toutes les colonnes',
    'settings.resetConfirm': 'Êtes-vous sûr de vouloir réinitialiser vos colonnes ? La disposition par défaut sera restaurée.',

    // Colonnes
    'column.refresh': 'Actualiser les publications',
    'column.scrollTop': 'Revenir en haut',
    'column.pause': 'Mettre le flux en pause',
    'column.resume': 'Reprendre le rafraîchissement',
    'column.moveLeft': 'Déplacer à gauche',
    'column.moveRight': 'Déplacer à droite',
    'column.delete': 'Supprimer cette colonne',
    'column.empty': 'Aucune publication disponible',
    'column.loading': 'Chargement des flux en direct...',
    'column.error': 'Erreur lors du chargement',
    'column.retry': 'Réessayer',
    'column.loadMore': 'Afficher plus de posts',
    'column.loadingMore': 'Chargement de la suite...',
    'column.noMorePosts': 'Fin du fil atteinte',

    // Publications
    'post.like': 'J’aime',
    'post.unlike': 'Je n’aime plus',
    'post.upvote': 'Haut-voter (Upvote)',
    'post.repost': 'Republier / Retweeter',
    'post.unrepost': 'Annuler le repost',
    'post.reply': 'Répondre',
    'post.thread': 'Afficher la discussion',
    'post.copyLink': 'Copier le lien direct',
    'post.linkCopied': 'Lien copié !',
    'post.translate': 'Traduire en français',
    'post.translating': 'Traduction en cours...',
    'post.showOriginal': 'Afficher l’original',
    'post.openOn': 'Ouvrir sur le réseau',
    'post.justNow': 'maintenant',

    // Visualiseur de discussion
    'thread.title': 'Discussion',
    'thread.subtitle': 'Fil de discussion complet et réponses',
    'thread.refresh': 'Rafraîchir la discussion',
    'thread.selectedPost': 'Post Sélectionné',
    'thread.writeReply': 'Écrire une réponse à',
    'thread.send': 'Répondre',
    'thread.sending': 'Envoi...',
    'thread.replyPublished': 'Réponse publiée !',
    'thread.ctrlEnter': 'Ctrl+Entrée pour envoyer',
    'thread.replies': 'Réponses',
    'thread.noReplies': 'Aucune réponse pour le moment sous cette publication.',
    'thread.loadingReplies': 'Chargement des réponses...',
    'thread.yourReply': 'Votre réponse',
    'thread.justNow': 'À l’instant',
    'thread.context': 'Contexte de la discussion',

    // Commun
    'common.close': 'Fermer',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.confirm': 'Confirmer',
    'common.back': 'Précédent',
    'common.next': 'Suivant',
    'common.understood': 'Compris !',
  },

  en: {
    // Sidebar
    'sidebar.allFeeds': 'All Feeds',
    'sidebar.addColumn': 'Add a Column',
    'sidebar.accounts': 'Accounts',
    'sidebar.guide': 'Project Guide, Security & New Networks',
    'sidebar.theme': 'Switch Theme',
    'sidebar.settings': 'Application Settings',

    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Customization, Language, Cache & Backup',
    'settings.languageSection': 'Interface Language',
    'settings.languageDesc': 'Select your preferred interface language. Changes apply immediately and are persisted.',
    'settings.autoTranslateSection': 'Auto-translate Posts',
    'settings.autoTranslateDesc': 'Display an instant translation button on foreign posts to translate them into your language.',
    'settings.autoTranslateEnabled': 'Auto-translation enabled',
    'settings.autoTranslateDisabled': 'Manual translation on demand',
    'settings.themeSection': 'Visual Theme & Appearance',
    'settings.themeLight': 'Light Mode',
    'settings.themeDim': 'Dim Blue',
    'settings.themeBlack': 'Pure Black (OLED)',
    'settings.storageSection': 'Storage Space & Cache',
    'settings.storageDesc': 'MultiDeck uses high-performance local caching to accelerate displays and preserve your quotas.',
    'settings.clearCacheBtn': 'Purge Multi-Platform Cache',
    'settings.clearing': 'Purging...',
    'settings.cacheCleared': 'Cache successfully purged!',
    'settings.backupSection': 'Backup & Layout Sharing',
    'settings.backupDesc': 'Export or import your complete column configuration as a JSON file.',
    'settings.exportJson': 'Export to JSON file',
    'settings.importJson': 'Import JSON file',
    'settings.copyJson': 'Copy Configuration',
    'settings.pasteJson': 'Paste JSON Code',
    'settings.resetSection': 'Reset Area',
    'settings.resetBtn': 'Reset All Columns',
    'settings.resetConfirm': 'Are you sure you want to reset your columns? The default layout will be restored.',

    // Columns
    'column.refresh': 'Refresh posts',
    'column.scrollTop': 'Back to top',
    'column.pause': 'Pause feed',
    'column.resume': 'Resume feed',
    'column.moveLeft': 'Move left',
    'column.moveRight': 'Move right',
    'column.delete': 'Delete this column',
    'column.empty': 'No posts available',
    'column.loading': 'Loading live feeds...',
    'column.error': 'Error loading feed',
    'column.retry': 'Retry',
    'column.loadMore': 'Load more posts',
    'column.loadingMore': 'Loading more...',
    'column.noMorePosts': 'End of feed reached',

    // Posts
    'post.like': 'Like',
    'post.unlike': 'Unlike',
    'post.upvote': 'Upvote',
    'post.repost': 'Repost / Retweet',
    'post.unrepost': 'Undo repost',
    'post.reply': 'Reply',
    'post.thread': 'View thread',
    'post.copyLink': 'Copy direct link',
    'post.linkCopied': 'Link copied!',
    'post.translate': 'Translate to English',
    'post.translating': 'Translating...',
    'post.showOriginal': 'Show original',
    'post.openOn': 'Open on platform',
    'post.justNow': 'now',

    // Thread Modal
    'thread.title': 'Discussion',
    'thread.subtitle': 'Full thread conversation and replies',
    'thread.refresh': 'Refresh thread',
    'thread.selectedPost': 'Selected Post',
    'thread.writeReply': 'Write a reply to',
    'thread.send': 'Reply',
    'thread.sending': 'Sending...',
    'thread.replyPublished': 'Reply published!',
    'thread.ctrlEnter': 'Ctrl+Enter to send',
    'thread.replies': 'Replies',
    'thread.noReplies': 'No replies yet under this post.',
    'thread.loadingReplies': 'Loading replies...',
    'thread.yourReply': 'Your reply',
    'thread.justNow': 'Just now',
    'thread.context': 'Thread Context',

    // Common
    'common.close': 'Close',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.understood': 'Got it!',
  },

  es: {
    // Sidebar
    'sidebar.allFeeds': 'Todos los feeds',
    'sidebar.addColumn': 'Añadir columna',
    'sidebar.accounts': 'Cuentas',
    'sidebar.guide': 'Guía del proyecto, Seguridad y Redes',
    'sidebar.theme': 'Cambiar tema',
    'sidebar.settings': 'Ajustes de la aplicación',

    // Settings
    'settings.title': 'Ajustes',
    'settings.subtitle': 'Personalización, Idioma, Caché y Copia de seguridad',
    'settings.languageSection': 'Idioma de la interfaz',
    'settings.languageDesc': 'Seleccione el idioma de la interfaz. Los cambios se aplican al instante y se guardan.',
    'settings.autoTranslateSection': 'Traducción automática de publicaciones',
    'settings.autoTranslateDesc': 'Muestra un botón de traducción rápida en publicaciones en idiomas extranjeros.',
    'settings.autoTranslateEnabled': 'Traducción automática activada',
    'settings.autoTranslateDisabled': 'Traducción manual bajo demanda',
    'settings.themeSection': 'Tema visual y Aspecto',
    'settings.themeLight': 'Modo Claro',
    'settings.themeDim': 'Azul Noche',
    'settings.themeBlack': 'Negro Puro (OLED)',
    'settings.storageSection': 'Almacenamiento y Caché',
    'settings.storageDesc': 'MultiDeck utiliza caché local de alto rendimiento para acelerar la carga.',
    'settings.clearCacheBtn': 'Purgar caché multiplataforma',
    'settings.clearing': 'Purgando...',
    'settings.cacheCleared': '¡Caché purgada con éxito!',
    'settings.backupSection': 'Copia de seguridad y Compartir',
    'settings.backupDesc': 'Exporte o importe su disposición completa de columnas como archivo JSON.',
    'settings.exportJson': 'Exportar a archivo JSON',
    'settings.importJson': 'Importar archivo JSON',
    'settings.copyJson': 'Copiar configuración',
    'settings.pasteJson': 'Pegar código JSON',
    'settings.resetSection': 'Área de reinicio',
    'settings.resetBtn': 'Restablecer todas las columnas',
    'settings.resetConfirm': '¿Seguro que desea restablecer las columnas por defecto?',

    // Columns
    'column.refresh': 'Actualizar publicaciones',
    'column.scrollTop': 'Volver arriba',
    'column.pause': 'Pausar feed',
    'column.resume': 'Reanudar feed',
    'column.moveLeft': 'Mover a la izquierda',
    'column.moveRight': 'Mover a la derecha',
    'column.delete': 'Eliminar esta columna',
    'column.empty': 'No hay publicaciones disponibles',
    'column.loading': 'Cargando feeds en directo...',
    'column.error': 'Error al cargar',
    'column.retry': 'Reintentar',
    'column.loadMore': 'Cargar más publicaciones',
    'column.loadingMore': 'Cargando más...',
    'column.noMorePosts': 'Fin del feed alcanzado',

    // Posts
    'post.like': 'Me gusta',
    'post.unlike': 'Ya no me gusta',
    'post.upvote': 'Votar a favor (Upvote)',
    'post.repost': 'Republicar / Retweet',
    'post.unrepost': 'Deshacer republicación',
    'post.reply': 'Responder',
    'post.thread': 'Ver conversación',
    'post.copyLink': 'Copiar enlace',
    'post.linkCopied': '¡Enlace copiado!',
    'post.translate': 'Traducir al español',
    'post.translating': 'Traduciendo...',
    'post.showOriginal': 'Ver original',
    'post.openOn': 'Abrir en la red',
    'post.justNow': 'ahora',

    // Thread Modal
    'thread.title': 'Conversación',
    'thread.subtitle': 'Hilo completo y respuestas',
    'thread.refresh': 'Actualizar conversación',
    'thread.selectedPost': 'Publicación seleccionada',
    'thread.writeReply': 'Escribir una respuesta a',
    'thread.send': 'Responder',
    'thread.sending': 'Enviando...',
    'thread.replyPublished': '¡Respuesta publicada!',
    'thread.ctrlEnter': 'Ctrl+Enter para enviar',
    'thread.replies': 'Respuestas',
    'thread.noReplies': 'Aún no hay respuestas en esta publicación.',
    'thread.loadingReplies': 'Cargando respuestas...',
    'thread.yourReply': 'Tu respuesta',
    'thread.justNow': 'Ahora mismo',
    'thread.context': 'Contexto de la conversación',

    // Common
    'common.close': 'Cerrar',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.back': 'Atrás',
    'common.next': 'Siguiente',
    'common.understood': '¡Entendido!',
  },

  de: {
    // Sidebar
    'sidebar.allFeeds': 'Alle Feeds',
    'sidebar.addColumn': 'Spalte hinzufügen',
    'sidebar.accounts': 'Konten',
    'sidebar.guide': 'Leitfaden, Sicherheit & Netzwerke',
    'sidebar.theme': 'Design wechseln',
    'sidebar.settings': 'App-Einstellungen',

    // Settings
    'settings.title': 'Einstellungen',
    'settings.subtitle': 'Anpassung, Sprache, Cache & Sicherung',
    'settings.languageSection': 'Benutzeroberflächensprache',
    'settings.languageDesc': 'Wählen Sie Ihre bevorzugte Sprache. Änderungen werden sofort angewendet und gespeichert.',
    'settings.autoTranslateSection': 'Automatische Beitragsübersetzung',
    'settings.autoTranslateDesc': 'Ermöglicht die sofortige Übersetzung fremdsprachiger Beiträge.',
    'settings.autoTranslateEnabled': 'Automatische Übersetzung aktiviert',
    'settings.autoTranslateDisabled': 'Manuelle Übersetzung auf Anfrage',
    'settings.themeSection': 'Farbschema & Aussehen',
    'settings.themeLight': 'Heller Modus',
    'settings.themeDim': 'Nachtblau',
    'settings.themeBlack': 'Reines Schwarz (OLED)',
    'settings.storageSection': 'Speicherplatz & Cache',
    'settings.storageDesc': 'MultiDeck verwendet lokalen Hochleistungs-Cache zur Beschleunigung.',
    'settings.clearCacheBtn': 'Multi-Plattform-Cache leeren',
    'settings.clearing': 'Wird geleert...',
    'settings.cacheCleared': 'Cache erfolgreich geleert!',
    'settings.backupSection': 'Sicherung & Spalten-Export',
    'settings.backupDesc': 'Exportieren oder importieren Sie Ihr Spaltenlayout als JSON-Datei.',
    'settings.exportJson': 'Als JSON exportieren',
    'settings.importJson': 'JSON-Datei importieren',
    'settings.copyJson': 'Konfiguration kopieren',
    'settings.pasteJson': 'JSON-Code einfügen',
    'settings.resetSection': 'Zurücksetzen',
    'settings.resetBtn': 'Alle Spalten zurücksetzen',
    'settings.resetConfirm': 'Möchten Sie wirklich alle Spalten auf den Standard zurücksetzen?',

    // Columns
    'column.refresh': 'Beiträge aktualisieren',
    'column.scrollTop': 'Nach oben',
    'column.pause': 'Feed pausieren',
    'column.resume': 'Feed fortsetzen',
    'column.moveLeft': 'Nach links verschieben',
    'column.moveRight': 'Nach rechts verschieben',
    'column.delete': 'Diese Spalte löschen',
    'column.empty': 'Keine Beiträge verfügbar',
    'column.loading': 'Live-Feeds werden geladen...',
    'column.error': 'Fehler beim Laden',
    'column.retry': 'Wiederholen',
    'column.loadMore': 'Mehr Beiträge laden',
    'column.loadingMore': 'Laden...',
    'column.noMorePosts': 'Ende des Feeds erreicht',

    // Posts
    'post.like': 'Gefällt mir',
    'post.unlike': 'Gefällt mir nicht mehr',
    'post.upvote': 'Upvoten',
    'post.repost': 'Reposten / Retweeten',
    'post.unrepost': 'Repost rückgängig machen',
    'post.reply': 'Antworten',
    'post.thread': 'Thread anzeigen',
    'post.copyLink': 'Direktlink kopieren',
    'post.linkCopied': 'Link kopiert!',
    'post.translate': 'Auf Deutsch übersetzen',
    'post.translating': 'Übersetze...',
    'post.showOriginal': 'Original anzeigen',
    'post.openOn': 'Im Netzwerk öffnen',
    'post.justNow': 'jetzt',

    // Thread Modal
    'thread.title': 'Diskussion',
    'thread.subtitle': 'Vollständiger Diskussionsverlauf und Antworten',
    'thread.refresh': 'Thread aktualisieren',
    'thread.selectedPost': 'Ausgewählter Beitrag',
    'thread.writeReply': 'Antwort verfassen an',
    'thread.send': 'Antworten',
    'thread.sending': 'Wird gesendet...',
    'thread.replyPublished': 'Antwort veröffentlicht!',
    'thread.ctrlEnter': 'Strg+Eingabe zum Senden',
    'thread.replies': 'Antworten',
    'thread.noReplies': 'Bisher keine Antworten unter diesem Beitrag.',
    'thread.loadingReplies': 'Antworten werden geladen...',
    'thread.yourReply': 'Ihre Antwort',
    'thread.justNow': 'Gerade eben',
    'thread.context': 'Diskussionskontext',

    // Common
    'common.close': 'Schließen',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.confirm': 'Bestätigen',
    'common.back': 'Zurück',
    'common.next': 'Weiter',
    'common.understood': 'Verstanden!',
  },

  it: {
    // Sidebar
    'sidebar.allFeeds': 'Tutti i feed',
    'sidebar.addColumn': 'Aggiungi colonna',
    'sidebar.accounts': 'Account',
    'sidebar.guide': 'Guida, Sicurezza & Reti',
    'sidebar.theme': 'Cambia tema',
    'sidebar.settings': 'Impostazioni',

    // Settings
    'settings.title': 'Impostazioni',
    'settings.subtitle': 'Personalizzazione, Lingua, Cache e Backup',
    'settings.languageSection': 'Lingua dell’interfaccia',
    'settings.languageDesc': 'Scegli la lingua dell’interfaccia. Le modifiche sono immediate e salvate.',
    'settings.autoTranslateSection': 'Traduzione automatica dei post',
    'settings.autoTranslateDesc': 'Mostra un pulsante di traduzione rapida sui post in lingua straniera.',
    'settings.autoTranslateEnabled': 'Traduzione automatica attiva',
    'settings.autoTranslateDisabled': 'Traduzione manuale su richiesta',
    'settings.themeSection': 'Tema visivo e aspetto',
    'settings.themeLight': 'Modalità Chiara',
    'settings.themeDim': 'Blu Notte',
    'settings.themeBlack': 'Nero Assoluto (OLED)',
    'settings.storageSection': 'Archiviazione e Cache',
    'settings.storageDesc': 'MultiDeck utilizza cache locale ad alte prestazioni.',
    'settings.clearCacheBtn': 'Svuota cache multipiattaforma',
    'settings.clearing': 'Svuotamento...',
    'settings.cacheCleared': 'Cache svuotata con successo!',
    'settings.backupSection': 'Backup e Condivisione',
    'settings.backupDesc': 'Esporta o importa la configurazione delle colonne in formato JSON.',
    'settings.exportJson': 'Esporta in file JSON',
    'settings.importJson': 'Importa file JSON',
    'settings.copyJson': 'Copia configurazione',
    'settings.pasteJson': 'Incolla codice JSON',
    'settings.resetSection': 'Area di ripristino',
    'settings.resetBtn': 'Ripristina tutte le colonne',
    'settings.resetConfirm': 'Sei sicuro di voler ripristinare le colonne predefinite?',

    // Columns
    'column.refresh': 'Aggiorna post',
    'column.scrollTop': 'Torna su',
    'column.pause': 'Metti in pausa il feed',
    'column.resume': 'Riprendi il feed',
    'column.moveLeft': 'Sposta a sinistra',
    'column.moveRight': 'Sposta a destra',
    'column.delete': 'Elimina questa colonna',
    'column.empty': 'Nessun post disponibile',
    'column.loading': 'Caricamento feed in corso...',
    'column.error': 'Errore di caricamento',
    'column.retry': 'Riprova',
    'column.loadMore': 'Mostra altri post',
    'column.loadingMore': 'Caricamento...',
    'column.noMorePosts': 'Fine del feed raggiunta',

    // Posts
    'post.like': 'Mi piace',
    'post.unlike': 'Non mi piace più',
    'post.upvote': 'Vota (Upvote)',
    'post.repost': 'Ripubblica / Retweet',
    'post.unrepost': 'Annulla ripubblicazione',
    'post.reply': 'Rispondi',
    'post.thread': 'Visualizza discussione',
    'post.copyLink': 'Copia link diretto',
    'post.linkCopied': 'Link copiato!',
    'post.translate': 'Traduci in italiano',
    'post.translating': 'Traduzione...',
    'post.showOriginal': 'Mostra originale',
    'post.openOn': 'Apri sulla piattaforma',
    'post.justNow': 'adesso',

    // Thread Modal
    'thread.title': 'Discussione',
    'thread.subtitle': 'Conversazione completa e risposte',
    'thread.refresh': 'Aggiorna discussione',
    'thread.selectedPost': 'Post Selezionato',
    'thread.writeReply': 'Scrivi una risposta a',
    'thread.send': 'Rispondi',
    'thread.sending': 'Invio...',
    'thread.replyPublished': 'Risposta pubblicata!',
    'thread.ctrlEnter': 'Ctrl+Invio per inviare',
    'thread.replies': 'Risposte',
    'thread.noReplies': 'Nessuna risposta finora sotto questo post.',
    'thread.loadingReplies': 'Caricamento risposte...',
    'thread.yourReply': 'La tua risposta',
    'thread.justNow': 'Proprio ora',
    'thread.context': 'Contesto della discussione',

    // Common
    'common.close': 'Chiudi',
    'common.save': 'Salva',
    'common.cancel': 'Annulla',
    'common.confirm': 'Conferma',
    'common.back': 'Indietro',
    'common.next': 'Avanti',
    'common.understood': 'Ho capito!',
  },

  pt: {
    // Sidebar
    'sidebar.allFeeds': 'Todos os feeds',
    'sidebar.addColumn': 'Adicionar coluna',
    'sidebar.accounts': 'Contas',
    'sidebar.guide': 'Guia, Segurança & Redes',
    'sidebar.theme': 'Alternar tema',
    'sidebar.settings': 'Configurações',

    // Settings
    'settings.title': 'Configurações',
    'settings.subtitle': 'Personalização, Idioma, Cache e Backup',
    'settings.languageSection': 'Idioma da interface',
    'settings.languageDesc': 'Escolha o idioma da interface. As alterações têm efeito imediato e são salvas.',
    'settings.autoTranslateSection': 'Tradução automática de publicações',
    'settings.autoTranslateDesc': 'Exibe um botão de tradução instantânea em publicações estrangeiras.',
    'settings.autoTranslateEnabled': 'Tradução automática ativada',
    'settings.autoTranslateDisabled': 'Tradução manual sob demanda',
    'settings.themeSection': 'Tema visual e aparência',
    'settings.themeLight': 'Modo Claro',
    'settings.themeDim': 'Azul Noturno',
    'settings.themeBlack': 'Preto Puro (OLED)',
    'settings.storageSection': 'Armazenamento e Cache',
    'settings.storageDesc': 'MultiDeck usa cache local de alto desempenho.',
    'settings.clearCacheBtn': 'Limpar cache multiplataforma',
    'settings.clearing': 'Limpando...',
    'settings.cacheCleared': 'Cache limpo com sucesso!',
    'settings.backupSection': 'Backup e Compartilhamento',
    'settings.backupDesc': 'Exporte ou importe a organização das colunas em formato JSON.',
    'settings.exportJson': 'Exportar para arquivo JSON',
    'settings.importJson': 'Importar arquivo JSON',
    'settings.copyJson': 'Copiar configuração',
    'settings.pasteJson': 'Colar código JSON',
    'settings.resetSection': 'Área de redefinição',
    'settings.resetBtn': 'Redefinir todas as colunas',
    'settings.resetConfirm': 'Tem certeza de que deseja restaurar as colunas padrão?',

    // Columns
    'column.refresh': 'Atualizar publicações',
    'column.scrollTop': 'Voltar ao topo',
    'column.pause': 'Pausar feed',
    'column.resume': 'Retomar feed',
    'column.moveLeft': 'Mover para esquerda',
    'column.moveRight': 'Mover para direita',
    'column.delete': 'Excluir esta coluna',
    'column.empty': 'Nenhuma publicação disponível',
    'column.loading': 'Carregando feeds ao vivo...',
    'column.error': 'Erro ao carregar',
    'column.retry': 'Tentar novamente',
    'column.loadMore': 'Carregar mais posts',
    'column.loadingMore': 'Carregando mais...',
    'column.noMorePosts': 'Fim do feed alcançado',

    // Posts
    'post.like': 'Curtir',
    'post.unlike': 'Descurtir',
    'post.upvote': 'Votar (Upvote)',
    'post.repost': 'Republicar / Retweetar',
    'post.unrepost': 'Desfazer republicação',
    'post.reply': 'Responder',
    'post.thread': 'Ver discussão',
    'post.copyLink': 'Copiar link direto',
    'post.linkCopied': 'Link copiado!',
    'post.translate': 'Traduzir para português',
    'post.translating': 'Traduzindo...',
    'post.showOriginal': 'Mostrar original',
    'post.openOn': 'Abrir na plataforma',
    'post.justNow': 'agora',

    // Thread Modal
    'thread.title': 'Discussão',
    'thread.subtitle': 'Conversa completa e respostas',
    'thread.refresh': 'Atualizar discussão',
    'thread.selectedPost': 'Publicação Selecionada',
    'thread.writeReply': 'Escrever uma resposta para',
    'thread.send': 'Responder',
    'thread.sending': 'Enviando...',
    'thread.replyPublished': 'Resposta publicada!',
    'thread.ctrlEnter': 'Ctrl+Enter para enviar',
    'thread.replies': 'Respostas',
    'thread.noReplies': 'Ainda não há respostas nesta publicação.',
    'thread.loadingReplies': 'Carregando respostas...',
    'thread.yourReply': 'Sua resposta',
    'thread.justNow': 'Agora mesmo',
    'thread.context': 'Contexto da discussão',

    // Common
    'common.close': 'Fechar',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.back': 'Voltar',
    'common.next': 'Avançar',
    'common.understood': 'Entendido!',
  },

  ja: {
    // Sidebar
    'sidebar.allFeeds': 'すべてのフィード',
    'sidebar.addColumn': '列を追加',
    'sidebar.accounts': 'アカウント',
    'sidebar.guide': 'ガイド・セキュリティ・SNS',
    'sidebar.theme': 'テーマ変更',
    'sidebar.settings': '設定',

    // Settings
    'settings.title': '設定',
    'settings.subtitle': 'カスタマイズ、言語、キャッシュ、バックアップ',
    'settings.languageSection': 'インターフェース言語',
    'settings.languageDesc': '表示言語を選択してください。変更は即座に反映され保存されます。',
    'settings.autoTranslateSection': '投稿の自動翻訳',
    'settings.autoTranslateDesc': '外国語の投稿に素早く翻訳できるボタンを表示します。',
    'settings.autoTranslateEnabled': '自動翻訳有効',
    'settings.autoTranslateDisabled': '手動翻訳のみ',
    'settings.themeSection': 'テーマと外観',
    'settings.themeLight': 'ライトモード',
    'settings.themeDim': '夜間ブルー (Dim)',
    'settings.themeBlack': '漆黒 (OLED)',
    'settings.storageSection': 'ストレージとキャッシュ',
    'settings.storageDesc': 'MultiDeckは高速なローカルキャッシュを使用します。',
    'settings.clearCacheBtn': 'マルチプラットフォームキャッシュを消去',
    'settings.clearing': '消去中...',
    'settings.cacheCleared': 'キャッシュを正常に消去しました！',
    'settings.backupSection': 'バックアップと共有',
    'settings.backupDesc': '列の配置全体をJSONファイルとして保存・復元できます。',
    'settings.exportJson': 'JSONファイルに出力',
    'settings.importJson': 'JSONファイルを読み込み',
    'settings.copyJson': '設定をコピー',
    'settings.pasteJson': 'JSONコードを貼り付け',
    'settings.resetSection': 'リセットエリア',
    'settings.resetBtn': 'すべての列を初期化',
    'settings.resetConfirm': 'すべての列を初期状態に戻しますか？',

    // Columns
    'column.refresh': '投稿を更新',
    'column.scrollTop': 'トップに戻る',
    'column.pause': '一時停止',
    'column.resume': '再開',
    'column.moveLeft': '左へ移動',
    'column.moveRight': '右へ移動',
    'column.delete': 'この列を削除',
    'column.empty': '投稿はありません',
    'column.loading': 'フィードを読み込み中...',
    'column.error': '読み込みエラー',
    'column.retry': '再試行',
    'column.loadMore': 'さらに投稿を読み込む',
    'column.loadingMore': '読み込み中...',
    'column.noMorePosts': 'すべての投稿を読み込みました',

    // Posts
    'post.like': 'いいね',
    'post.unlike': 'いいねを取り消す',
    'post.upvote': '高評価 (Upvote)',
    'post.repost': 'リポスト / リツイート',
    'post.unrepost': 'リポストを取り消す',
    'post.reply': '返信',
    'post.thread': 'スレッドを表示',
    'post.copyLink': 'リンクをコピー',
    'post.linkCopied': 'リンクをコピーしました！',
    'post.translate': '日本語に翻訳',
    'post.translating': '翻訳中...',
    'post.showOriginal': '原文を表示',
    'post.openOn': 'SNSで開く',
    'post.justNow': 'たった今',

    // Thread Modal
    'thread.title': 'スレッド会話',
    'thread.subtitle': 'スレッド全体と返信一覧',
    'thread.refresh': 'スレッドを更新',
    'thread.selectedPost': '選択中の投稿',
    'thread.writeReply': '返信を作成：',
    'thread.send': '返信する',
    'thread.sending': '送信中...',
    'thread.replyPublished': '返信を投稿しました！',
    'thread.ctrlEnter': 'Ctrl+Enterで送信',
    'thread.replies': '返信',
    'thread.noReplies': 'この投稿にはまだ返信がありません。',
    'thread.loadingReplies': '返信を読み込み中...',
    'thread.yourReply': 'あなたの返信',
    'thread.justNow': 'たった今',
    'thread.context': 'スレッドの文脈',

    // Common
    'common.close': '閉じる',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.confirm': '確認',
    'common.back': '前へ',
    'common.next': '次へ',
    'common.understood': '了解！',
  },
};

/**
 * Fonction de traduction avec fallback automatique en français ou en anglais
 */
export const getTranslation = (lang: SupportedLanguage, key: string): string => {
  if (translations[lang] && translations[lang][key]) {
    return translations[lang][key];
  }
  if (translations.fr && translations.fr[key]) {
    return translations.fr[key];
  }
  if (translations.en && translations.en[key]) {
    return translations.en[key];
  }
  return key;
};

export interface TranslationResult {
  translatedText: string;
  sourceLang?: string;
  isSameLanguage: boolean;
}

/**
 * Service de traduction de texte vers la langue cible
 * Découpe les longs textes en blocs de 400 caractères pour ne jamais dépasser le quota MyMemory (max 500 caractères)
 */
export const translateText = async (text: string, targetLang: SupportedLanguage): Promise<TranslationResult> => {
  if (!text || !text.trim()) {
    return { translatedText: text, isSameLanguage: true };
  }

  const cleanText = text.trim();

  // Découpage en morceaux de moins de 400 caractères au niveau des espaces ou retours à la ligne
  const chunks: string[] = [];
  let remaining = cleanText;
  while (remaining.length > 0) {
    if (remaining.length <= 400) {
      chunks.push(remaining);
      break;
    }
    let splitIdx = remaining.lastIndexOf('\n', 400);
    if (splitIdx === -1 || splitIdx < 100) {
      splitIdx = remaining.lastIndexOf(' ', 400);
    }
    if (splitIdx === -1 || splitIdx < 100) {
      splitIdx = 400;
    }
    chunks.push(remaining.substring(0, splitIdx));
    remaining = remaining.substring(splitIdx).trimStart();
  }

  try {
    const translatedChunks: string[] = [];
    let detectedLang: string | undefined = undefined;

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const encoded = encodeURIComponent(chunk);
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encoded}&langpair=autodetect|${targetLang}`);
      if (!res.ok) throw new Error('Erreur réseau traduction');
      const data = await res.json();
      
      const trans = data?.responseData?.translatedText;
      // Rejeter si le texte renvoyé est une erreur de l'API
      if (!trans || trans.includes('QUERY LENGTH LIMIT EXCEEDED') || trans.includes('MYMEMORY WARNING')) {
        return { translatedText: text, isSameLanguage: true };
      }

      if (!detectedLang) {
        detectedLang = (data.responseDetails?.match(/detected language: ([a-z]{2})/i) || [])[1]
          || (data.matches?.[0]?.['created-by']?.toLowerCase())
          || undefined;
      }

      translatedChunks.push(trans);
    }

    const fullTranslated = translatedChunks.join(' ');
    // Vérifier si la traduction est identique au texte d'origine ou invalide
    const isSame = fullTranslated.trim().toLowerCase() === cleanText.toLowerCase();

    return {
      translatedText: fullTranslated,
      sourceLang: detectedLang,
      isSameLanguage: isSame,
    };
  } catch (err) {
    console.warn('[translateText] Fallback :', err);
    return { translatedText: text, isSameLanguage: true };
  }
};
