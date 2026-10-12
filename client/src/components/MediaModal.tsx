import React from 'react';
import { X, ExternalLink, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { useDeck } from '../context/DeckContext';

export const MediaModal: React.FC = () => {
  const { activeMediaPreview, setActiveMediaPreview } = useDeck();
  const [currentIdx, setCurrentIdx] = React.useState(activeMediaPreview?.mediaIndex || 0);

  // Synchroniser l'index initial si activeMediaPreview change
  React.useEffect(() => {
    if (activeMediaPreview?.mediaIndex !== undefined) {
      setCurrentIdx(activeMediaPreview.mediaIndex);
    } else {
      setCurrentIdx(0);
    }
  }, [activeMediaPreview]);

  // Support des raccourcis clavier (Échap, Flèche Gauche, Flèche Droite)
  React.useEffect(() => {
    if (!activeMediaPreview) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMediaPreview(null);
      } else if (e.key === 'ArrowLeft') {
        const list = activeMediaPreview.post.media || [];
        if (list.length > 1) {
          setCurrentIdx((prev) => (prev > 0 ? prev - 1 : list.length - 1));
        }
      } else if (e.key === 'ArrowRight') {
        const list = activeMediaPreview.post.media || [];
        if (list.length > 1) {
          setCurrentIdx((prev) => (prev < list.length - 1 ? prev + 1 : 0));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMediaPreview, setActiveMediaPreview]);

  if (!activeMediaPreview) return null;

  const { post } = activeMediaPreview;
  const mediaList = post.media || [];
  const currentMedia = mediaList[currentIdx] || mediaList[0] || null;
  const hasMultiple = mediaList.length > 1;
  const isYouTube = post.platform === 'youtube' && currentMedia?.embedId;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0));
  };

  return (
    <div
      onClick={() => setActiveMediaPreview(null)}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
    >
      {/* Bouton Fermer */}
      <button
        onClick={() => setActiveMediaPreview(null)}
        className="absolute top-4 right-4 p-2.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors z-20"
        title="Fermer (Échap)"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Conteneur Média / Lecteur */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-4xl w-full bg-[#0f172a] border border-[#38444d] rounded-2xl overflow-hidden shadow-2xl cursor-default flex flex-col max-h-[92vh] relative"
      >
        {/* Zone de lecture vidéo / image */}
        <div className="relative bg-black flex items-center justify-center min-h-[350px] max-h-[70vh] w-full overflow-hidden select-none">
          {isYouTube ? (
            <iframe
              src={`https://www.youtube.com/embed/${currentMedia.embedId}?autoplay=1&rel=0`}
              title={post.title || 'YouTube video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full aspect-video border-0"
            />
          ) : currentMedia?.type === 'video' ? (
            <video
              key={currentMedia.url}
              src={currentMedia.url}
              controls
              autoPlay
              className="max-w-full max-h-[70vh] object-contain"
            />
          ) : currentMedia ? (
            <img
              key={currentMedia.url}
              src={currentMedia.url}
              alt={currentMedia.altText || post.title || 'Image'}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              className="max-w-full max-h-[70vh] object-contain transition-all duration-150"
            />
          ) : (
            <div className="p-12 text-center text-[#8b98a5]">Aucun aperçu média disponible</div>
          )}

          {/* Badge indicateur de Carrousel (ex: 2 / 5) */}
          {hasMultiple && (
            <div className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 shadow-xl ring-1 ring-white/10 z-10">
              <Layers className="w-3.5 h-3.5 text-[#1d9bf0]" />
              <span>{currentIdx + 1} / {mediaList.length}</span>
            </div>
          )}

          {/* Boutons flèches navigation Carrousel */}
          {hasMultiple && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/75 hover:bg-[#1d9bf0] text-white flex items-center justify-center transition-all backdrop-blur-md z-10 hover:scale-110 shadow-2xl ring-1 ring-white/20"
                title="Précédent (←)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/75 hover:bg-[#1d9bf0] text-white flex items-center justify-center transition-all backdrop-blur-md z-10 hover:scale-110 shadow-2xl ring-1 ring-white/20"
                title="Suivant (→)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Indicateurs / Puces en bas du visualiseur */}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-10">
                {mediaList.map((_, idx) => (
                  <span
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIdx(idx);
                    }}
                    className={`h-2 rounded-full transition-all cursor-pointer shadow-md ${
                      idx === currentIdx ? 'w-6 bg-[#1d9bf0]' : 'w-2 bg-white/50 hover:bg-white'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Détails du post en bas du lecteur */}
        <div className="p-4 bg-[#0f172a] flex items-center justify-between border-t border-[#38444d]/50">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={post.author.avatarUrl}
              alt={post.author.name}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              className="w-10 h-10 rounded-full object-cover ring-1 ring-white/20 flex-shrink-0"
            />
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-[#f7f9f9] truncate">
                {post.title || post.text || post.author.name}
              </h4>
              <p className="text-xs text-[#8b98a5] truncate">
                {post.author.name} (@{post.author.username}) · {post.platform.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <a
              href={post.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ouvrir sur {post.platform}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

