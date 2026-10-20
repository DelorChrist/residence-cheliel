import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api, CadreConfig, CadreItem, DEFAULT_CADRE_CONFIG } from '../lib/api';
import {
  Sparkles, Maximize2, X, ChevronLeft, ChevronRight,
  Waves, Sun, Wine, Moon, Eye, Video as VideoIcon, Image as ImageIcon,
  Volume2, VolumeX
} from 'lucide-react';

export const CadreSection: React.FC = () => {
  const [config, setConfig] = useState<CadreConfig>(DEFAULT_CADRE_CONFIG);
  const [activeFilter, setActiveFilter] = useState<'all' | 'image' | 'video'>('all');
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.cadre.get().then(res => {
      if (isMounted && res.data && res.data.items && res.data.items.length > 0) {
        setConfig(res.data);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const items = config.items && config.items.length > 0 ? config.items : DEFAULT_CADRE_CONFIG.items;

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return items;
    return items.filter(item => item.type === activeFilter);
  }, [items, activeFilter]);

  const imagesCount = useMemo(() => items.filter(i => i.type === 'image').length, [items]);
  const videosCount = useMemo(() => items.filter(i => i.type === 'video').length, [items]);

  // Navigation dans la visionneuse Lightbox
  const openModal = (item: CadreItem) => {
    const idx = items.findIndex(i => i.id === item.id);
    if (idx !== -1) setSelectedItemIndex(idx);
  };

  const closeModal = () => setSelectedItemIndex(null);

  const prevItem = () => {
    if (selectedItemIndex === null) return;
    setSelectedItemIndex((selectedItemIndex - 1 + items.length) % items.length);
  };

  const nextItem = () => {
    if (selectedItemIndex === null) return;
    setSelectedItemIndex((selectedItemIndex + 1) % items.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedItemIndex === null) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') prevItem();
      if (e.key === 'ArrowRight') nextItem();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemIndex, items.length]);

  const selectedItem = selectedItemIndex !== null ? items[selectedItemIndex] : null;

  const bannerImg = config.bannerUrl && config.bannerUrl !== '/images/piscine_luxe.jpg'
    ? (config.bannerUrl.endsWith('.png') && config.bannerUrl.includes('longue_banniere') ? '/images/piscine/longue_banniere.jpg' : config.bannerUrl)
    : '/images/piscine/longue_banniere.jpg';

  return (
    <section id="notre-cadre" className="py-12 sm:py-16 bg-[#faf9f8]">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* ─── Bannière Titre : élégamment contenue et pas trop large ─── */}
        <div className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-sm flex items-center justify-center min-h-[160px] sm:min-h-[190px] md:min-h-[220px] px-6 py-8 sm:px-10 mb-10">
          <img
            src={bannerImg}
            alt="Bannière Piscine Résidence Chéliel"
            className="absolute inset-0 w-full h-full object-cover object-center"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/55" />

          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <p className="text-primary-300 font-medium tracking-widest uppercase text-xs sm:text-sm mb-2">
              {config.badge || "NOTRE CADRE"}
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-white tracking-tight mb-2">
              {config.title || "Notre cadre"}
            </h2>
            <p className="text-white/85 text-xs sm:text-sm md:text-base leading-relaxed">
              {config.subtitle || "Un havre de paix au cœur de Yamoussoukro"}
            </p>
          </div>
        </div>
          {/* Points forts emblématiques */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-xs hover:border-primary-200 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                <Waves size={22} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 leading-tight">Eau Cristalline</h4>
                <p className="text-xs text-gray-500">Piscine semi-olympique</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-xs hover:border-primary-200 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                <Sun size={22} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 leading-tight">Bains de Soleil</h4>
                <p className="text-xs text-gray-500">Transats & parasols</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-xs hover:border-primary-200 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                <Wine size={22} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 leading-tight">Bar au Bassin</h4>
                <p className="text-xs text-gray-500">Cocktails & détente</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-xs hover:border-primary-200 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                <Moon size={22} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 leading-tight">Cadre Paisible</h4>
                <p className="text-xs text-gray-500">Ambiance chaleureuse</p>
              </div>
            </div>
          </div>

          {/* Filtres photos & vidéos */}
          {videosCount > 0 && imagesCount > 0 && (
            <div className="flex justify-center items-center gap-2 mb-10">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  activeFilter === 'all'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Tous ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('image')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  activeFilter === 'image'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ImageIcon size={14} />
                Photos ({imagesCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('video')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  activeFilter === 'video'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <VideoIcon size={14} />
                Vidéos ({videosCount})
              </button>
            </div>
          )}

          {/* Grille Bento Adaptative aux images et vidéos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 auto-rows-[290px] sm:auto-rows-[320px]">
            {filteredItems.map((item, index) => {
              const isFeatured = item.featured || index === 0;
              const colSpan = isFeatured
                ? 'lg:col-span-7 md:col-span-2'
                : index % 3 === 1
                ? 'lg:col-span-5 md:col-span-1'
                : 'lg:col-span-4 md:col-span-1';

              const isVideo = item.type === 'video';

              return (
                <div
                  key={item.id}
                  onClick={() => openModal(item)}
                  className={`group relative rounded-3xl overflow-hidden cursor-pointer border border-gray-200 hover:border-primary-400 transition-all duration-500 shadow-sm hover:shadow-xl bg-stone-900 flex flex-col justify-end ${colSpan}`}
                >
                  {/* Média : Vidéo en lecture automatique ou Photo */}
                  {isVideo ? (
                    <AutoPlayVideoCard
                      url={item.url}
                      poster={item.thumbnailUrl}
                      title={item.title}
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                  )}

                  {/* Dégradé sombre doux pour le contraste des textes */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/5 group-hover:from-black/90 transition-all duration-300 pointer-events-none" />

                  {/* Badges du haut */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
                    <div className="flex items-center gap-2 pointer-events-auto">
                      {item.tag && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-md text-gray-900 shadow-xs">
                          {item.tag}
                        </span>
                      )}
                      {isVideo && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-stone-950 flex items-center gap-1.5 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-950 animate-ping" />
                          <VideoIcon size={12} />
                          Vidéo
                        </span>
                      )}
                    </div>

                    <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 size={14} />
                    </div>
                  </div>

                  {/* Informations de la carte en bas */}
                  <div className="relative z-10 p-5 sm:p-6 transition-transform duration-300 group-hover:-translate-y-0.5 pointer-events-none">
                    <h3 className="text-lg sm:text-xl font-heading font-bold text-white mb-1 leading-snug">
                      {item.title}
                    </h3>
                    {item.subtitle && (
                      <p className="text-white/80 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                        {item.subtitle}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-primary-300 text-xs font-semibold mt-2.5 opacity-90 group-hover:opacity-100">
                      <Eye size={13} />
                      <span>{isVideo ? 'Plein écran & son HD' : 'Agrandir la photo'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      {/* ─── Lightbox Plein Écran ─── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 sm:p-8 animate-in fade-in duration-200">
          <button
            type="button"
            onClick={closeModal}
            aria-label="Fermer"
            className="absolute top-5 right-5 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20"
          >
            <X size={22} />
          </button>

          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevItem}
                aria-label="Précédent"
                className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-50 p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20"
              >
                <ChevronLeft size={26} />
              </button>
              <button
                type="button"
                onClick={nextItem}
                aria-label="Suivant"
                className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-50 p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20"
              >
                <ChevronRight size={26} />
              </button>
            </>
          )}

          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
            <div className="w-full flex-1 flex items-center justify-center overflow-hidden rounded-2xl bg-black/50 border border-white/10 shadow-2xl">
              {selectedItem.type === 'video' ? (
                <video
                  key={selectedItem.url}
                  src={selectedItem.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-w-full max-h-[75vh] w-auto h-auto rounded-xl object-contain"
                />
              ) : (
                <img
                  key={selectedItem.url}
                  src={selectedItem.url}
                  alt={selectedItem.title}
                  className="max-w-full max-h-[75vh] w-auto h-auto rounded-xl object-contain"
                />
              )}
            </div>

            <div className="w-full mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-2 text-white">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {selectedItem.tag && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs bg-primary-600 text-white font-medium">
                      {selectedItem.tag}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {selectedItemIndex! + 1} / {items.length}
                  </span>
                </div>
                <h4 className="text-lg font-heading font-bold text-white">
                  {selectedItem.title}
                </h4>
                {selectedItem.subtitle && (
                  <p className="text-sm text-gray-300 max-w-2xl">{selectedItem.subtitle}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// ─── Composant Vidéo à lecture automatique à l'arrivée dans la section ──────
const AutoPlayVideoCard: React.FC<{
  url: string;
  poster?: string;
  title: string;
}> = ({ url, poster, title }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;

    // Détection d'apparition à l'écran pour jouer automatiquement
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {});
            }
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(video);

    // Tentative de lancement direct
    video.play().catch(() => {});

    return () => {
      observer.disconnect();
    };
  }, [isMuted]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-black overflow-hidden">
      <video
        ref={videoRef}
        src={url}
        poster={poster}
        muted={isMuted}
        playsInline
        autoPlay
        loop
        preload="auto"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
        title={title}
      />

      {/* Bouton pour activer / désactiver le son au survol ou au clic */}
      <button
        type="button"
        onClick={toggleMute}
        title={isMuted ? "Activer le son" : "Couper le son"}
        className="absolute top-4 right-14 z-20 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110 cursor-pointer shadow-md"
      >
        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} className="text-emerald-400" />}
      </button>
    </div>
  );
};
