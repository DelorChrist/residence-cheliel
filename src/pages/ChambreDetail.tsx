import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import {
  ArrowLeft, Users, CheckCircle2, ChevronLeft, ChevronRight, Video,
  Image as ImageIcon, Play, Maximize2, ZoomIn, ZoomOut, X, RotateCcw
} from 'lucide-react';
import { useRooms } from '../hooks/useRooms';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { ReservationModal } from '../components/ReservationModal';
import { ScrollToTop } from '../components/ScrollToTop';

const getYouTubeEmbedUrl = (url?: string) => {
  if (!url) return null;
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube-nocookie.com/embed/${match[2]}` : null;
  } catch {
    return null;
  }
};

export const ChambreDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { rooms, loading } = useRooms();
  const room = rooms.find(r => r.id === id);

  const [activeIndex, setActiveIndex] = useState(0);
  const [mediaMode, setMediaMode] = useState<'photos' | 'video'>('photos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Visionneuse HD : Zoom profond et déplacement (Pan & Zoom)
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartRef = useRef<{ x: number; y: number; dist?: number }>({ x: 0, y: 0 });

  // Vidéos calculées de manière sûre (support multi-vidéos et rétro-compatibilité)
  const videos = useMemo(() => {
    if (!room) return [];
    if (Array.isArray(room.videoUrls) && room.videoUrls.length > 0) {
      return room.videoUrls.filter(Boolean);
    }
    return room.videoUrl ? [room.videoUrl].filter(Boolean) : [];
  }, [room]);

  // Images calculées de manière sûre pour tous les rendus
  const allImages = room
    ? [
        ...(room.imagePrincipale ? [room.imagePrincipale] : []),
        ...room.images.filter(img => img !== room.imagePrincipale),
      ]
    : [];

  const prev = () => setActiveIndex(i => (i === 0 ? allImages.length - 1 : i - 1));
  const next = () => setActiveIndex(i => (i === allImages.length - 1 ? 0 : i + 1));

  const resetZoomAndPan = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    resetZoomAndPan();
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    resetZoomAndPan();
  };

  const prevLightbox = useCallback(() => {
    resetZoomAndPan();
    setLightboxIndex(i => (i === 0 ? allImages.length - 1 : i - 1));
  }, [allImages.length, resetZoomAndPan]);

  const nextLightbox = useCallback(() => {
    resetZoomAndPan();
    setLightboxIndex(i => (i === allImages.length - 1 ? 0 : i + 1));
  }, [allImages.length, resetZoomAndPan]);

  const setZoom = (nextZoom: number) => {
    const clamped = Math.max(1, Math.min(5, Number(nextZoom.toFixed(2))));
    setZoomLevel(clamped);
    if (clamped === 1) {
      setPanOffset({ x: 0, y: 0 });
    }
  };

  // Zoom avec la molette de souris (fluide et centré)
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const step = zoomLevel >= 2 ? 0.4 : 0.25;
    const delta = e.deltaY < 0 ? step : -step;
    setZoom(zoomLevel + delta);
  };

  // Double clic pour zoomer instantanément à 3x sur la zone cliquée ou réinitialiser
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoomLevel > 1) {
      resetZoomAndPan();
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left - rect.width / 2;
      const clickY = e.clientY - rect.top - rect.height / 2;
      setZoomLevel(3);
      setPanOffset({ x: -clickX * 2, y: -clickY * 2 });
    }
  };

  // Déplacement glisser-déposer à la souris (Pan)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...panOffset };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const maxBoundX = (window.innerWidth * (zoomLevel - 0.7)) / 2 + 200;
    const maxBoundY = (window.innerHeight * (zoomLevel - 0.7)) / 2 + 200;
    const newX = Math.max(-maxBoundX, Math.min(maxBoundX, panStartRef.current.x + dx));
    const newY = Math.max(-maxBoundY, Math.min(maxBoundY, panStartRef.current.y + dy));
    setPanOffset({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Déplacement et pincement tactile sur mobile/tablette
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoomLevel > 1) {
      setIsDragging(true);
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStartRef.current = { ...panOffset };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = { ...touchStartRef.current, dist };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && zoomLevel > 1) {
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      const maxBoundX = (window.innerWidth * (zoomLevel - 0.7)) / 2 + 200;
      const maxBoundY = (window.innerHeight * (zoomLevel - 0.7)) / 2 + 200;
      const newX = Math.max(-maxBoundX, Math.min(maxBoundX, panStartRef.current.x + dx));
      const newY = Math.max(-maxBoundY, Math.min(maxBoundY, panStartRef.current.y + dy));
      setPanOffset({ x: newX, y: newY });
    } else if (e.touches.length === 2 && touchStartRef.current.dist) {
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = newDist / touchStartRef.current.dist;
      setZoom(zoomLevel * scaleFactor);
      touchStartRef.current.dist = newDist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Clavier pour la visionneuse HD (toujours déclaré avant tout return)
  useEffect(() => {
    if (!lightboxOpen) return;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevLightbox();
      if (e.key === 'ArrowRight') nextLightbox();
      if (e.key === '+' || e.key === '=') setZoom(zoomLevel + 0.5);
      if (e.key === '-') setZoom(zoomLevel - 0.5);
      if (e.key === '0') resetZoomAndPan();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxOpen, prevLightbox, nextLightbox, zoomLevel, resetZoomAndPan]);

  if (loading) return (
    <div className="min-h-screen bg-[#faf9f8] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!room) return <Navigate to="/chambres" replace />;

  const currentVideo = videos[activeVideoIndex] || videos[0] || '';
  const ytEmbed = getYouTubeEmbedUrl(currentVideo);

  return (
    <div className="min-h-screen bg-[#faf9f8] font-sans text-[#333]">
      <Header onReserve={() => setIsModalOpen(true)} />

      <div className="container mx-auto px-6 pt-28 pb-16 max-w-6xl">
        {/* Breadcrumb */}
        <Link to="/chambres" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-600 transition-colors mb-8 text-sm font-medium">
          <ArrowLeft size={16} /> Retour aux appartements
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Galerie */}
          <div className="flex flex-col gap-4">
            {/* Onglets Photos / Vidéos si des vidéos sont disponibles */}
            {videos.length > 0 && (
              <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl max-w-sm">
                <button
                  type="button"
                  onClick={() => setMediaMode('photos')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                    mediaMode === 'photos'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <ImageIcon size={14} /> Photos ({allImages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMediaMode('video')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                    mediaMode === 'video'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-primary-700 hover:text-primary-900'
                  }`}
                >
                  <Play size={13} className={mediaMode === 'video' ? 'text-white fill-white' : 'text-primary-600'} />
                  {videos.length > 1 ? `Vidéos (${videos.length})` : 'Vidéo de visite'}
                </button>
              </div>
            )}

            {/* Sélecteur de vidéos s'il y en a plusieurs et qu'on est en mode vidéo */}
            {mediaMode === 'video' && videos.length > 1 && (
              <div className="flex gap-2 items-center overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Vidéos disponibles :</span>
                {videos.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveVideoIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                      activeVideoIndex === idx
                        ? 'bg-yellow-400 text-yellow-950 shadow-sm ring-2 ring-yellow-400/40'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Play size={11} className={activeVideoIndex === idx ? 'fill-yellow-950' : 'fill-gray-400'} />
                    Vidéo {idx + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Cadre principal : Affichage classique sans cadre noir */}
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
              {mediaMode === 'video' && currentVideo ? (
                ytEmbed ? (
                  <iframe
                    key={currentVideo}
                    src={`${ytEmbed}?autoplay=1`}
                    title={`Visite vidéo ${room.name} ${activeVideoIndex + 1}`}
                    className="w-full h-full bg-black"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    key={currentVideo}
                    src={currentVideo}
                    controls
                    playsInline
                    preload="metadata"
                    poster={allImages[activeIndex] || room.imagePrincipale}
                    className="w-full h-full object-contain bg-black"
                  >
                    Votre navigateur ne supporte pas la lecture de vidéos.
                  </video>
                )
              ) : (
                <>
                  <img
                    src={allImages[activeIndex]}
                    alt={room.name}
                    className="w-full h-full object-cover transition-all duration-500 cursor-pointer"
                    onClick={() => openLightbox(activeIndex)}
                    loading="eager"
                    decoding="async"
                  />

                  {/* Bouton Voir l'image */}
                  <button
                    type="button"
                    onClick={() => openLightbox(activeIndex)}
                    className="absolute bottom-5 right-5 z-10 bg-black/70 hover:bg-black/90 text-white backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-all hover:scale-105"
                    title="Voir l'image en taille réelle"
                  >
                    <Maximize2 size={13} className="text-yellow-400" />
                    <span>Voir l'image</span>
                  </button>

                  {/* Prix badge */}
                  <div className="absolute top-5 left-5 z-10 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full font-bold text-primary-900 shadow-lg">
                    {room.priceNight.toLocaleString()} FCFA <span className="font-normal text-sm text-gray-500">/ nuitée</span>
                  </div>
                  {/* Disponibilité */}
                  <div className="absolute top-5 right-5 z-10 bg-primary-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                    {room.count} disponibles
                  </div>
                  {/* Navigation flèches */}
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); prev(); }}
                        aria-label="Image précédente"
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/80 hover:bg-white text-gray-700 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); next(); }}
                        aria-label="Image suivante"
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/80 hover:bg-white text-gray-700 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Thumbnails */}
            <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveIndex(i);
                    setMediaMode('photos');
                  }}
                  className={`w-24 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${mediaMode === 'photos' && activeIndex === i ? 'border-primary-600 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={img} alt={`${room.name} ${i + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                </button>
              ))}

              {/* Boutons thumbnails spéciaux pour les vidéos */}
              {videos.map((_, idx) => (
                <button
                  key={`vid-thumb-${idx}`}
                  type="button"
                  onClick={() => {
                    setActiveVideoIndex(idx);
                    setMediaMode('video');
                  }}
                  className={`w-24 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 relative bg-primary-950 flex flex-col items-center justify-center text-white ${
                    mediaMode === 'video' && activeVideoIndex === idx
                      ? 'border-yellow-400 scale-105 shadow-md ring-2 ring-yellow-400/30'
                      : 'border-primary-800 opacity-80 hover:opacity-100'
                  }`}
                  aria-label={`Voir la vidéo ${idx + 1}`}
                >
                  <span className="w-8 h-8 rounded-full bg-yellow-400 text-primary-950 flex items-center justify-center shadow-md mb-1">
                    <Play size={14} className="fill-primary-950 ml-0.5" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-300">
                    {videos.length > 1 ? `Vidéo ${idx + 1}` : 'Vidéo'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Infos */}
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-primary-100 text-primary-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Appartement</span>
              <span className="flex items-center gap-1.5 text-gray-500 text-sm">
                <Users size={15} className="text-primary-500" /> {room.capacity}
              </span>
            </div>

            <h1 className="text-4xl font-heading font-bold text-gray-900 mb-4">{room.name}</h1>

            <p className="text-gray-600 text-lg leading-relaxed mb-8">{room.longDescription}</p>

            {/* Équipements */}
            <div className="bg-primary-50 rounded-2xl p-6 mb-8">
              <h3 className="font-heading font-bold text-primary-900 mb-4 text-lg">Équipements inclus</h3>
              <ul className="grid grid-cols-2 gap-y-3 gap-x-4">
                {room.amenities.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-700 text-sm">
                    <CheckCircle2 size={16} className="text-primary-500 shrink-0" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            {/* Prix + CTA */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex items-end gap-2 mb-1">
                <span className="text-4xl font-heading font-bold text-primary-600">{room.priceNight.toLocaleString()}</span>
                <span className="text-gray-500 mb-1">FCFA / 24h</span>
              </div>
              <p className="text-gray-400 text-sm mb-5">{room.count} appartements de ce type disponibles</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-medium text-lg transition-colors"
              >
                Réserver cet appartement
              </button>
              <Link
                to="/chambres"
                className="block text-center mt-3 text-sm text-gray-500 hover:text-primary-600 transition-colors"
              >
                Voir tous les appartements
              </Link>
            </div>
          </div>
        </div>

        {/* Section immersive : Présentation Vidéo */}
        {room.videoUrl && (
          <div className="mt-16 bg-white border border-gray-100 rounded-3xl p-6 md:p-10 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                  <Video size={14} className="text-primary-600" /> Visite Guidée Vidéo
                </div>
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900">
                  Découvrez {room.name} en vidéo
                </h2>
                <p className="text-gray-500 text-sm md:text-base mt-1">
                  Explorez les volumes, les finitions et l'ambiance chaleureuse de cet appartement avant votre séjour.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors shadow-sm shrink-0"
              >
                Réserver cet appartement
              </button>
            </div>

            <div className="relative aspect-video max-w-4xl mx-auto rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl bg-black border border-gray-900">
              {ytEmbed ? (
                <iframe
                  src={ytEmbed}
                  title={`Visite vidéo ${room.name}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={room.videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  poster={allImages[0] || room.imagePrincipale}
                  className="w-full h-full object-contain"
                >
                  Votre navigateur ne supporte pas la lecture vidéo.
                </video>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
      <WhatsAppButton />
      <ScrollToTop />

      {isModalOpen && (
        <ReservationModal onClose={() => setIsModalOpen(false)} initialRoomId={room.id} />
      )}

      {/* Visionneuse HD Plein Écran / Taille Réelle */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col justify-between"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Visionneuse photo taille réelle"
        >
          {/* Barre supérieure */}
          <div
            className="p-4 sm:p-6 flex items-center justify-between z-20 text-white border-b border-white/10 bg-black/40"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base sm:text-lg font-heading font-bold text-white flex items-center gap-2">
                {room.name}
                <span className="text-[11px] font-semibold text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 rounded-full">
                  Taille réelle
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Photo {lightboxIndex + 1} sur {allImages.length}
              </p>
            </div>

            {/* Contrôles de zoom et fermeture */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Presets rapides de zoom */}
              <div className="hidden sm:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 mr-1">
                {[1, 2, 3.5, 5].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setZoom(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      Math.abs(zoomLevel - preset) < 0.1
                        ? 'bg-yellow-400 text-black font-bold shadow-md'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                    title={`Zoomer à ${preset * 100}%`}
                  >
                    {preset === 1 ? '1x' : `${preset}x`}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setZoom(zoomLevel - 0.5)}
                disabled={zoomLevel <= 1}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
                title="Zoom arrière (-)"
                aria-label="Zoom arrière"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-xs font-semibold px-2.5 py-1 bg-white/5 rounded-lg text-gray-200 min-w-14 text-center border border-white/10">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(zoomLevel + 0.5)}
                disabled={zoomLevel >= 5}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
                title="Zoom avant (+)"
                aria-label="Zoom avant"
              >
                <ZoomIn size={18} />
              </button>
              {(zoomLevel !== 1 || panOffset.x !== 0 || panOffset.y !== 0) && (
                <button
                  type="button"
                  onClick={resetZoomAndPan}
                  className="p-2 rounded-xl bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30 transition-colors flex items-center gap-1 text-xs font-semibold px-2.5 border border-yellow-400/30"
                  title="Réinitialiser zoom et position (Touche 0)"
                  aria-label="Réinitialiser zoom"
                >
                  <RotateCcw size={16} />
                  <span className="hidden md:inline">Reset</span>
                </button>
              )}
              <button
                type="button"
                onClick={closeLightbox}
                className="p-2 ml-1 sm:ml-2 rounded-xl bg-white/15 hover:bg-red-600 text-white transition-colors"
                title="Fermer (Échap)"
                aria-label="Fermer le plein écran"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Zone d'affichage image centrale avec Pan & Zoom interactif */}
          <div
            className={`relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden select-none touch-none ${
              zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
            }`}
            onClick={e => {
              if (e.target === e.currentTarget && !isDragging) {
                closeLightbox();
              }
            }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Conteneur transformé pour translation (pan) et agrandissement (zoom) */}
            <div
              className="will-change-transform flex items-center justify-center max-w-full max-h-full"
              style={{
                transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0px) scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.2, 0, 0, 1)',
              }}
              onDoubleClick={handleDoubleClick}
              onClick={e => {
                e.stopPropagation();
                if (zoomLevel === 1) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left - rect.width / 2;
                  const clickY = e.clientY - rect.top - rect.height / 2;
                  setZoomLevel(2.5);
                  setPanOffset({ x: -clickX * 1.5, y: -clickY * 1.5 });
                }
              }}
            >
              <img
                src={allImages[lightboxIndex]}
                alt={`${room.name} ${lightboxIndex + 1}`}
                draggable={false}
                className="max-h-[82vh] max-w-[94vw] w-auto h-auto object-contain drop-shadow-2xl select-none pointer-events-auto"
                style={{
                  imageRendering: '-webkit-optimize-contrast',
                }}
                decoding="async"
              />
            </div>

            {/* Bulle d'indication & astuces d'utilisation */}
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-black/80 backdrop-blur-md border border-white/15 text-white/90 px-4 py-1.5 rounded-full text-xs font-medium shadow-2xl flex items-center gap-2 transition-opacity duration-300"
              style={{ opacity: zoomLevel > 1 ? 0.95 : 0.75 }}
            >
              <span className="text-yellow-400 font-bold">
                {zoomLevel > 1 ? `Zoom ${Math.round(zoomLevel * 100)}%` : 'Détails HD'}
              </span>
              <span className="text-white/40">•</span>
              <span>
                {zoomLevel > 1
                  ? 'Glissez pour explorer les détails • Double-clic pour réinitialiser'
                  : 'Molette ou double-clic pour zoomer dans les détails'}
              </span>
            </div>

            {/* Flèches de navigation Lightbox */}
            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); prevLightbox(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 transition-all hover:scale-110 shadow-xl"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); nextLightbox(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 transition-all hover:scale-110 shadow-xl"
                  aria-label="Photo suivante"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}
          </div>

          {/* Bandeau inférieur de miniatures */}
          <div
            className="p-4 bg-black/60 border-t border-white/10 flex items-center justify-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onClick={e => e.stopPropagation()}
          >
            {allImages.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setLightboxIndex(i);
                  resetZoomAndPan();
                }}
                className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                  lightboxIndex === i
                    ? 'border-yellow-400 scale-105 ring-2 ring-yellow-400/40'
                    : 'border-white/20 opacity-50 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
