import React from 'react';
import { DeckProvider } from './context/DeckContext';
import { Sidebar } from './components/Sidebar';
import { DeckContainer } from './components/DeckContainer';
import { AddColumnModal } from './components/AddColumnModal';
import { AuthModal } from './components/AuthModal';
import { MediaModal } from './components/MediaModal';
import { SettingsModal } from './components/SettingsModal';
import { InfoModal } from './components/InfoModal';

const DeckApp: React.FC = () => {
  return (
    <div className="w-screen h-screen flex overflow-hidden theme-bg-app theme-text-primary transition-colors duration-150">
      {/* Barre latérale de navigation et filtres réseaux */}
      <Sidebar />

      {/* Conteneur principal multi-colonnes horizontal */}
      <DeckContainer />

      {/* Modales interactives */}
      <AddColumnModal />
      <AuthModal />
      <MediaModal />
      <SettingsModal />
      <InfoModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <DeckProvider>
      <DeckApp />
    </DeckProvider>
  );
};

export default App;
