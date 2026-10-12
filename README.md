# MultiDeck 🚀
**Tableau de Bord Social Web Multi-Colonnes (X, YouTube, TikTok, Instagram)**

MultiDeck est une application web locale qui agrège en temps réel des flux issus de **X (Twitter)**, **YouTube**, **TikTok** et **Instagram** dans une interface unifiée de type TweetDeck, **sans souscrire d'abonnements API payants**.

---

## ✨ Fonctionnalités Clés

- **🌐 Agrégation Multi-Réseaux Unifiée :**
  - **YouTube** : Intégration de l'API officielle YouTube Data v3 (GCP gratuit) avec lecteur vidéo iframe interactif, miniatures, durées et Shorts.
  - **X (Twitter)** : Timelines, recherches hashtag/mots-clés et mentions via Playwright (profil persistant `./user_data/twitter`).
  - **TikTok** : Vidéos récentes de créateurs et hashtags avec lecteur vertical (ratio 9:16) et tags audio.
  - **Instagram** : Posts et Reels via Playwright (profil persistant `./user_data/instagram`) et extraction GraphQL/DOM.
- **⚡ Colonnes Modulaires & Personnalisables :**
  - Ajout de colonnes par réseau et type de contenu (Recherche, Compte/Chaîne, Shorts/Reels, Fil principal).
  - Réglage de largeur par colonne (Étroite, Normale, Large).
  - Filtre textuel instantané dans chaque colonne.
  - Compte à rebours de rafraîchissement automatique indépendant.
- **🛡️ Rate-Limiting & Cache Mémoire :**
  - Système de cache TTL (3 à 5 minutes) et files d'attente séparées par réseau.
  - Mode démo/secours avec données réalistes si un réseau n'est pas encore authentifié.
- **🎨 Interface Moderne & Soignée :**
  - Thème sombre `#0f172a` (Bleu Nuit) ou `#000000` (Noir Absolu).
  - Barre latérale fixe avec filtres par réseau et statuts de connexion en direct.
  - Lecteur plein écran interactif (YouTube embed, vidéos et photos).

---

## 🛠️ Stack Technique

- **Frontend :** React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Backend :** Node.js, Express, TypeScript, Playwright (Chromium, Firefox, WebKit)

---

## 🚀 Démarrage Rapide

```bash
# 1. Démarrer le projet en local (Backend port 3001 + Frontend port 5173)
npm run dev
```

Ouvrez ensuite votre navigateur sur **`http://localhost:5173`**.

---

## 🔑 Connexions & Configuration

1. **YouTube :** 
   - Cliquez sur la roue crantée des **Paramètres** dans la barre latérale.
   - Collez votre clé gratuite **YouTube Data v3** issue de Google Cloud Console. Sans clé, le mode de démonstration s'active automatiquement.
2. **X / Instagram / TikTok :**
   - Cliquez sur l'indicateur du réseau dans la barre latérale.
   - Choisissez votre moteur de navigateur (Chromium, Firefox ou WebKit) et cliquez sur **"Se connecter"**.
   - Connectez-vous une seule fois : les cookies de session sont sauvegardés localement dans `./server/user_data/`.
