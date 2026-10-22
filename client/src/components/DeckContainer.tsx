import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useDeck } from '../context/DeckContext';
import { Column } from './Column';
import { Plus, Layers, ChevronsLeft, ChevronsRight } from 'lucide-react';

export const DeckContainer: React.FC = () => {
  const {
    filteredColumns,
    setIsAddModalOpen,
    activePlatformFilter,
    refreshAllColumns,
    isAddModalOpen,
    isAuthModalOpen,
    isSettingsModalOpen,
    isInfoModalOpen,
    activeThreadPost,
    activeMediaPreview,
  } = useDeck();
  const containerRef = useRef<HTMLDivElement>(null);
  // Boutons « Première / Dernière colonne » : visibles quand le deck défile horizontalement,
  // respectivement une fois arrivé au bout ou au début
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [isAtStart, setIsAtStart] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 1;
    setIsAtEnd(hasOverflow && el.scrollLeft > 0 && el.scrollLeft + el.clientWidth >= el.scrollWidth - 40);
    setIsAtStart(hasOverflow && el.scrollLeft <= 40);
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [updateScrollState, filteredColumns.length]);

  const scrollToFirstColumn = () => {
    containerRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  };

  const scrollToLastColumn = () => {
    const el = containerRef.current;
    el?.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
  };

  // Navigation clavier : zone active (surbrillance), changée avec ← → ou d'un clic.
  // Index 0..n-1 = colonnes ; SIDEBAR_INDEX = barre latérale de gauche (à gauche de la première colonne)
  const SIDEBAR_INDEX = -1;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const isAnyModalOpen = isAddModalOpen || isAuthModalOpen || isSettingsModalOpen || isInfoModalOpen || !!activeThreadPost || !!activeMediaPreview;

  useEffect(() => {
    if (activeIndex !== null && activeIndex >= filteredColumns.length) {
      setActiveIndex(filteredColumns.length > 0 ? filteredColumns.length - 1 : null);
    }
  }, [filteredColumns.length, activeIndex]);

  // Surbrillance de la barre latérale (composant hors du deck : marqueur posé directement sur son élément)
  useEffect(() => {
    const sidebar = document.querySelector<HTMLElement>('[data-deck-sidebar]');
    if (!sidebar) return;
    sidebar.dataset.active = activeIndex === SIDEBAR_INDEX ? 'true' : 'false';
    const activate = () => setActiveIndex(SIDEBAR_INDEX);
    sidebar.addEventListener('mousedown', activate);
    return () => sidebar.removeEventListener('mousedown', activate);
  }, [activeIndex]);

  useEffect(() => {
    const getColumnEls = () => Array.from(containerRef.current?.querySelectorAll<HTMLElement>('[data-deck-column]') || []);
    const getSidebar = () => document.querySelector<HTMLElement>('[data-deck-sidebar]');
    const getRegion = (index: number) => (index === SIDEBAR_INDEX ? getSidebar() : getColumnEls()[index]) || null;

    const focusRegion = (index: number) => {
      const cols = getColumnEls();
      const target = Math.max(SIDEBAR_INDEX, Math.min(cols.length - 1, index));
      const region = getRegion(target);
      if (!region) return;
      // Le focus clavier quitte l'ancienne zone : Tab repartira du premier élément de la nouvelle
      if (document.activeElement instanceof HTMLElement && !region.contains(document.activeElement)) {
        document.activeElement.blur();
      }
      setActiveIndex(target);
      if (target !== SIDEBAR_INDEX) region.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    };

    // Éléments focusables visibles d'une zone, dans l'ordre du document
    const getFocusables = (region: HTMLElement) =>
      Array.from(
        region.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
      ).filter((el) => el.offsetParent !== null);

    const moveFocus = (region: HTMLElement, step: 1 | -1) => {
      const focusables = getFocusables(region);
      if (focusables.length === 0) return false;
      const pos = focusables.indexOf(document.activeElement as HTMLElement);
      const next = pos === -1
        ? (step < 0 ? focusables.length - 1 : 0)
        : (pos + step + focusables.length) % focusables.length;
      focusables[next].focus();
      focusables[next].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return true;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnyModalOpen || e.ctrlKey || e.metaKey || e.altKey) return;

      // Tab / Maj+Tab : parcourt les éléments de la zone active sans en sortir (y compris depuis un champ de saisie)
      if (e.key === 'Tab') {
        const index = activeIndex ?? (filteredColumns.length > 0 ? 0 : SIDEBAR_INDEX);
        const region = getRegion(index);
        if (!region) return;
        if (activeIndex === null) setActiveIndex(index);
        if (moveFocus(region, e.shiftKey ? -1 : 1)) e.preventDefault();
        return;
      }

      // Pas de raccourci pendant la saisie de texte
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;

      // Barre latérale : → revient à la première colonne, ↑ ↓ passent d'un bouton à l'autre
      if (activeIndex === SIDEBAR_INDEX) {
        const sidebar = getSidebar();
        switch (e.key) {
          case 'ArrowRight':
            if (filteredColumns.length > 0) focusRegion(0);
            break;
          case 'ArrowUp':
          case 'ArrowDown':
            if (sidebar) moveFocus(sidebar, e.key === 'ArrowDown' ? 1 : -1);
            break;
          case 'ArrowLeft':
            break;
          case 'r':
          case 'R':
            refreshAllColumns();
            break;
          default:
            return;
        }
        e.preventDefault();
        return;
      }

      if (filteredColumns.length === 0) {
        if (e.key === 'ArrowLeft') {
          focusRegion(SIDEBAR_INDEX);
          e.preventDefault();
        }
        return;
      }

      const current = activeIndex ?? 0;
      const activeScroll = getColumnEls()[current]?.querySelector<HTMLElement>('[data-column-scroll]');

      switch (e.key) {
        case 'r':
        case 'R':
          refreshAllColumns();
          break;
        case 'ArrowLeft':
          // Depuis la première colonne, ← passe sur la barre latérale
          focusRegion(activeIndex === null ? 0 : current - 1);
          break;
        case 'ArrowRight':
          focusRegion(activeIndex === null ? 0 : current + 1);
          break;
        case 'Home':
          focusRegion(0);
          scrollToFirstColumn();
          break;
        case 'End':
          focusRegion(filteredColumns.length - 1);
          scrollToLastColumn();
          break;
        case 'ArrowUp':
        case 'ArrowDown':
          if (activeIndex === null) setActiveIndex(0);
          activeScroll?.scrollBy({ top: e.key === 'ArrowDown' ? 200 : -200, behavior: 'smooth' });
          break;
        case 'PageUp':
        case 'PageDown':
          if (activeIndex === null) setActiveIndex(0);
          if (activeScroll) {
            activeScroll.scrollBy({ top: (e.key === 'PageDown' ? 1 : -1) * activeScroll.clientHeight * 0.9, behavior: 'smooth' });
          }
          break;
        case 't':
        case 'T':
          activeScroll?.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        default:
          return;
      }
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, filteredColumns.length, isAnyModalOpen, refreshAllColumns]);

  return (
    <div className="relative flex-1 h-screen flex min-w-0">
    <main
      ref={containerRef}
      onScroll={updateScrollState}
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
              isActive={activeIndex === index}
              onActivate={() => setActiveIndex(index)}
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

      {isAtEnd && (
        <button
          onClick={scrollToFirstColumn}
          className="absolute left-4 bottom-6 z-30 flex items-center gap-1.5 pl-2.5 pr-3.5 py-2 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-xs font-bold shadow-xl shadow-black/40 transition-all active:scale-95 animate-fadeIn"
          title="Revenir à la première colonne"
        >
          <ChevronsLeft className="w-4 h-4" />
          Première colonne
        </button>
      )}

      {isAtStart && (
        <button
          onClick={scrollToLastColumn}
          className="absolute right-4 bottom-6 z-30 flex items-center gap-1.5 pl-3.5 pr-2.5 py-2 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-xs font-bold shadow-xl shadow-black/40 transition-all active:scale-95 animate-fadeIn"
          title="Aller à la dernière colonne"
        >
          Dernière colonne
          <ChevronsRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
