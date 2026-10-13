import React, { useRef } from 'react';
import { useDeck } from '../context/DeckContext';
import { Column } from './Column';
import { Plus, Layers } from 'lucide-react';

export const DeckContainer: React.FC = () => {
  const { filteredColumns, setIsAddModalOpen, activePlatformFilter } = useDeck();
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <main
      ref={containerRef}
      className="flex-1 h-screen flex overflow-x-auto overflow-y-hidden bg-[#0f172a] select-none"
    >
      {filteredColumns.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#1e293b] flex items-center justify-center text-[#1d9bf0] mb-4 shadow-xl border border-[#38444d]/50">
            <Layers className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#f7f9f9]">
            {activePlatformFilter === 'all' ? 'Votre MultiDeck est vide' : `Aucune colonne pour ${activePlatformFilter.toUpperCase()}`}
          </h2>
          <p className="text-[#8b98a5] text-sm max-w-md mt-1 mb-6">
            Ajoutez des colonnes pour suivre X, Bluesky, Threads, Reddit, YouTube, TikTok et Instagram en temps réel dans une seule interface.
          </p>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold rounded-full text-sm flex items-center gap-2 shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Ajouter une colonne
          </button>
        </div>
      ) : (
        <div className="flex h-full">
          {filteredColumns.map((col, index) => (
            <Column
              key={col.id}
              column={col}
              isFirst={index === 0}
              isLast={index === filteredColumns.length - 1}
            />
          ))}

          {/* Bouton rapide d'ajout au bout du deck */}
          <div className="w-20 h-full flex flex-col items-center justify-center border-r border-[#38444d]/40 flex-shrink-0 bg-[#0f172a]/40 hover:bg-[#1e293b]/30 transition-colors">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-10 h-10 rounded-full bg-[#1e293b] hover:bg-[#1d9bf0] text-[#8b98a5] hover:text-white flex items-center justify-center transition-all border border-[#38444d]/50 shadow-md"
              title="Ajouter une colonne"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
