import { 
  MapPin, Phone, Wifi, Wind, Star, Shield, Clock, Heart,
  BedDouble, Video as VideoIcon, Image as ImageIcon, Play,
  X, ChevronLeft, ChevronRight, Eye, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { ReservationModal } from '../components/ReservationModal';
import { ScrollToTop } from '../components/ScrollToTop';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRooms } from '../hooks/useRooms';

export const AProposPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { rooms, totalApartments } = useRooms();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Synchroniser la première chambre par défaut
  useEffect(() => {
    if (rooms.length > 0 && (!selectedRoomId || !rooms.some(r => r.id === selectedRoomId))) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  const activeRoom = useMemo(() => {
    if (!rooms.length) return null;
    return rooms.find(r => r.id === selectedRoomId) || rooms[0];
  }, [rooms, selectedRoomId]);

  // Tous les médias de la chambre sélectionnée (Vidéos puis Photos)
  const activeRoomMedia = useMemo(() => {
    if (!activeRoom) return [];
    const mediaList: { type: 'video' | 'image'; url: string; title: string }[] = [];

    // Vidéos de la chambre
    const rawVideos = [
      ...(activeRoom.videoUrls || []),
      ...(activeRoom.videoUrl ? [activeRoom.videoUrl] : []),
    ].filter(Boolean);
    const uniqueVideos = Array.from(new Set(rawVideos));
    uniqueVideos.forEach((vUrl, idx) => {
      mediaList.push({
        type: 'video',
        url: vUrl,
        title: `${activeRoom.name} - Vidéo ${idx + 1}`
      });
    });

    // Photos de la chambre
    const rawImages = [
      activeRoom.imagePrincipale,
      ...(activeRoom.images || [])
    ].filter(Boolean);
    const uniqueImages = Array.from(new Set(rawImages));
    uniqueImages.forEach((imgUrl, idx) => {
      mediaList.push({
        type: 'image',
        url: imgUrl,
        title: `${activeRoom.name} - Photo ${idx + 1}`
      });
    });

    return mediaList;
  }, [activeRoom]);

  // Gestion Lightbox (clavier et navigation)
  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const prevLightbox = useCallback(() => {
    if (lightboxIndex === null || activeRoomMedia.length === 0) return;
    setLightboxIndex((prev) => (prev! - 1 + activeRoomMedia.length) % activeRoomMedia.length);
  }, [lightboxIndex, activeRoomMedia.length]);

  const nextLightbox = useCallback(() => {
    if (lightboxIndex === null || activeRoomMedia.length === 0) return;
    setLightboxIndex((prev) => (prev! + 1) % activeRoomMedia.length);
  }, [lightboxIndex, activeRoomMedia.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevLightbox();
      if (e.key === 'ArrowRight') nextLightbox();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, closeLightbox, prevLightbox, nextLightbox]);

  return (
    <div className="min-h-screen bg-[#faf9f8] font-sans text-[#333]">
      <Header onReserve={() => setIsModalOpen(true)} />

      {/* Hero Banner */}
      <div className="relative h-80 md:h-96 flex items-center justify-center overflow-hidden">
        <img src="/images/hero.jpg" alt="À propos" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative z-10 text-center">
          <p className="text-primary-300 font-medium tracking-widest uppercase text-sm mb-3">Notre histoire</p>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white">À Propos de Nous</h1>
          <p className="text-white/80 mt-3 text-lg">Un havre de paix au cœur de Yamoussoukro</p>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-white/70 text-xs font-medium tracking-widest uppercase">Découvrir</span>
          <div className="w-8 h-8 rounded-full border-2 border-white/50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </div>
        </div>
      </div>

      {/* Histoire + Images */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="w-full lg:w-1/2 grid grid-cols-2 gap-4">
              <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-xl">
                <img src="/images/piscine.jpg" alt="Piscine" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-xl mt-10">
                <img src="/images/bar.jpeg" alt="Bar" className="w-full h-full object-cover" loading="lazy" />
              </div>
            </div>
            <div className="w-full lg:w-1/2">
              <p className="text-primary-600 font-medium tracking-widest uppercase text-sm mb-3">Qui sommes-nous</p>
              <h2 className="text-4xl font-heading font-bold text-gray-900 mb-6">Les Résidences Cheliel</h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-5">
                Nichée à Morofé, à 100m du foyer des jeunes de Yamoussoukro, la Résidence Cheliel est bien plus qu'un simple hébergement. C'est une expérience de vie alliant le luxe discret à la chaleur de l'hospitalité ivoirienne.
              </p>
              <p className="text-gray-600 text-lg leading-relaxed mb-5">
                Avec ses {totalApartments} appartements entièrement meublés et équipés, la résidence offre un cadre idéal pour les séjours professionnels, familiaux ou romantiques dans la capitale politique de la Côte d'Ivoire.
              </p>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Notre mission est simple : vous offrir le confort d'un chez-soi avec les services d'un hôtel haut de gamme, dans un environnement sécurisé et paisible.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats avec arrière-plan piscine et contraste marron */}
      <section className="relative py-10 md:py-12 overflow-hidden text-white shadow-inner">
        {/* Image de fond de la piscine */}
        <img
          src="/images/piscine/longue_banniere.jpg"
          alt="Piscine Résidence Chéliel"
          className="absolute inset-0 w-full h-full object-cover object-center"
          loading="lazy"
        />

        {/* Voile de contraste marron chaud de la résidence */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#3e2716]/92 via-[#553b24]/85 to-[#3e2716]/92" />

        <div className="container relative z-10 mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
            {[
              { value: `${totalApartments}`, label: totalApartments > 1 ? 'Appartements' : 'Appartement' },
              { value: '1', label: 'Piscine' },
              { value: '1', label: 'Bar' },
              { value: '24h/24', label: 'Service disponible' },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-heading font-semibold text-primary-200 mb-1 tracking-tight drop-shadow-sm">
                  {stat.value}
                </div>
                <div className="text-primary-100/80 text-[11px] sm:text-xs font-medium tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Valeurs */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-primary-600 font-medium tracking-widest uppercase text-sm mb-3">Ce qui nous définit</p>
            <h2 className="text-4xl font-heading font-bold text-gray-900">Nos Valeurs</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Heart, title: 'Hospitalité', desc: "Un accueil chaleureux à l'ivoirienne pour chaque client." },
              { icon: Shield, title: 'Sécurité', desc: 'Un environnement sécurisé et surveillé 24h/24.' },
              { icon: Star, title: 'Confort', desc: 'Des appartements entièrement équipés et décorés avec soin.' },
              { icon: Clock, title: 'Disponibilité', desc: 'Une équipe réactive disponible à toute heure.' },
            ].map((val, i) => (
              <div key={i} className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#faf9f8] border border-primary-100 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mb-4">
                  <val.icon size={26} />
                </div>
                <h3 className="font-heading font-bold text-lg text-primary-900 mb-2">{val.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Galerie classée par chambre */}
      <section className="py-20 bg-[#faf9f8]">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-primary-600 font-medium tracking-widest uppercase text-sm mb-3">Nos espaces</p>
            <h2 className="text-4xl font-heading font-bold text-gray-900">Galerie Photos & Vidéos</h2>
            <p className="text-gray-600 mt-3 text-base">
              Sélectionnez une chambre pour découvrir toutes ses photos et vidéos.
            </p>
          </div>

          {rooms.length > 0 ? (
            <>
              {/* Onglets des chambres */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                {rooms.map((room) => {
                  const isSelected = activeRoom?.id === room.id;
                  const vCount = (room.videoUrls?.length || 0) + (room.videoUrl && !room.videoUrls?.includes(room.videoUrl) ? 1 : 0);
                  const iCount = Array.from(new Set([room.imagePrincipale, ...(room.images || [])].filter(Boolean))).length;
                  const mediaCount = vCount + iCount;

                  return (
                    <button
                      key={room.id}
                      onClick={() => {
                        setSelectedRoomId(room.id);
                        setLightboxIndex(null);
                      }}
                      className={`px-5 py-3 rounded-2xl font-medium text-sm md:text-base transition-all duration-300 flex items-center gap-2.5 shadow-sm ${
                        isSelected
                          ? 'bg-primary-900 text-white shadow-lg shadow-primary-900/20 scale-105 ring-2 ring-primary-500'
                          : 'bg-white text-gray-700 hover:bg-primary-50 hover:text-primary-900 border border-gray-200'
                      }`}
                    >
                      <BedDouble size={18} className={isSelected ? 'text-primary-300' : 'text-gray-400'} />
                      <span>{room.name}</span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          isSelected ? 'bg-primary-800 text-primary-200' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {mediaCount} {mediaCount > 1 ? 'médias' : 'média'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Bandeau d'infos de la chambre sélectionnée */}
              {activeRoom && (
                <div className="bg-white rounded-2xl p-5 mb-8 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                      <BedDouble size={20} />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-lg text-gray-900">{activeRoom.name}</h3>
                      <p className="text-gray-500 text-xs">
                        {activeRoomMedia.filter(m => m.type === 'video').length} vidéo(s) • {activeRoomMedia.filter(m => m.type === 'image').length} photo(s)
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/chambres/${activeRoom.id}`}
                    className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold text-sm group"
                  >
                    <span>Voir les détails de l'appartement</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              )}

              {/* Grille des médias de la chambre sélectionnée */}
              {activeRoomMedia.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {activeRoomMedia.map((media, i) => (
                    <div
                      key={i}
                      onClick={() => setLightboxIndex(i)}
                      className="group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer bg-black/10 border border-gray-200"
                    >
                      {media.type === 'video' ? (
                        <div className="w-full h-full relative bg-gray-900 flex items-center justify-center overflow-hidden">
                          <video
                            src={media.url}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                            muted
                            playsInline
                            preload="metadata"
                          />
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                          <div className="absolute top-3 left-3 bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                            <VideoIcon size={12} /> Vidéo
                          </div>
                          <div className="w-12 h-12 rounded-full bg-white/90 text-primary-900 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all">
                            <Play size={20} className="ml-0.5 fill-primary-900" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full relative overflow-hidden bg-gray-100">
                          <img
                            src={media.url}
                            alt={media.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                            <div className="w-11 h-11 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300">
                              <Eye size={20} />
                            </div>
                          </div>
                          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                            <ImageIcon size={12} /> Photo
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity truncate">
                        {media.title}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 max-w-lg mx-auto">
                  <ImageIcon size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600 font-medium">Aucun média enregistré pour cet appartement.</p>
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {['/images/piscine.jpg', '/images/bar.jpeg'].map((src, i) => (
                <div key={i} className="aspect-square rounded-2xl overflow-hidden shadow-md">
                  <img src={src} alt={`Résidence Cheliel ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Lightbox Plein Écran (Photos & Vidéos) ─── */}
      {lightboxIndex !== null && activeRoomMedia[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 md:p-8 animate-fadeIn"
          onClick={closeLightbox}
        >
          {/* Barre du haut */}
          <div className="flex items-center justify-between text-white z-10 w-full max-w-6xl mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-primary-200">
                {activeRoom?.name}
              </span>
              <span className="text-white/70 text-xs md:text-sm">
                {lightboxIndex + 1} / {activeRoomMedia.length}
              </span>
            </div>
            <button
              onClick={closeLightbox}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Fermer"
            >
              <X size={22} />
            </button>
          </div>

          {/* Contenu central */}
          <div
            className="flex-1 flex items-center justify-center relative my-4 w-full max-w-5xl mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {activeRoomMedia[lightboxIndex].type === 'video' ? (
              <video
                key={activeRoomMedia[lightboxIndex].url}
                src={activeRoomMedia[lightboxIndex].url}
                controls
                autoPlay
                playsInline
                className="max-h-[75vh] max-w-full rounded-2xl shadow-2xl bg-black"
              />
            ) : (
              <img
                key={activeRoomMedia[lightboxIndex].url}
                src={activeRoomMedia[lightboxIndex].url}
                alt={activeRoomMedia[lightboxIndex].title}
                className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl"
              />
            )}

            {/* Flèche gauche */}
            {activeRoomMedia.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevLightbox();
                }}
                className="absolute left-2 md:-left-12 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all border border-white/20"
                aria-label="Précédent"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Flèche droite */}
            {activeRoomMedia.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextLightbox();
                }}
                className="absolute right-2 md:-right-12 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all border border-white/20"
                aria-label="Suivant"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {/* Barre du bas avec titre */}
          <div className="text-center text-white/80 text-xs md:text-sm z-10" onClick={(e) => e.stopPropagation()}>
            <p className="font-medium text-white">{activeRoomMedia[lightboxIndex].title}</p>
          </div>
        </div>
      )}

      {/* Services */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-primary-600 font-medium tracking-widest uppercase text-sm mb-3">Ce qu'on offre</p>
            <h2 className="text-4xl font-heading font-bold text-gray-900">Nos Services</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Wifi, title: 'Wi-Fi Haut Débit', desc: 'Connexion fibre optique incluse' },
              { icon: Wind, title: 'Climatisation', desc: 'Dans tous les appartements' },
              { icon: Star, title: 'Ménage', desc: 'Service de nettoyage régulier' },
              { icon: MapPin, title: 'Parking', desc: 'Parking sécurisé sur place' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#faf9f8] border border-primary-100 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mb-4">
                  <s.icon size={26} />
                </div>
                <h3 className="font-heading font-bold text-base text-primary-900 mb-1">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact + Localisation */}
      <section className="py-16 bg-[#faf9f8]">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-primary-600 font-medium tracking-widest uppercase text-sm mb-3">Nous trouver</p>
            <h2 className="text-4xl font-heading font-bold text-gray-900">Contact & Localisation</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                  <MapPin size={22} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 mb-1">Adresse</p>
                  <p className="text-gray-600">Morofé, à 100m du foyer des jeunes<br />Yamoussoukro, Côte d'Ivoire</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                  <Phone size={22} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 mb-1">Téléphone</p>
                  <a href="tel:+2250706601220" className="text-primary-600 hover:text-primary-700 font-medium">+225 07 06 60 12 20</a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                  <Star size={22} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 mb-1">Réservation en ligne</p>
                  <a href="https://www.booking.com/Share-Ei1HTs" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 font-medium">Disponible sur Booking.com</a>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-medium transition-colors shadow-md mt-2"
              >
                Faire une réservation
              </button>
            </div>

            {/* Map embed */}
            <div className="rounded-3xl overflow-hidden shadow-xl h-80 md:h-full min-h-[320px]">
              <iframe
                title="Localisation Résidence Cheliel"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.0!2d-5.2767!3d6.8276!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNsKwNDknMzkuNCJOIDXCsDE2JzM2LjEiVw!5e0!3m2!1sfr!2sci!4v1234567890"
                width="100%"
                height="100%"
                className="border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 bg-primary-900 text-center">
        <div className="container mx-auto px-6 max-w-2xl">
          <h2 className="text-4xl font-heading font-bold text-white mb-4">Prêt à vivre l'expérience Cheliel ?</h2>
          <p className="text-primary-200/80 text-lg mb-8">Réservez dès maintenant votre appartement à Yamoussoukro.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-full font-medium text-lg transition-all hover:scale-105 transform"
            >
              Réserver maintenant
            </button>
            <Link
              to="/chambres"
              className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-8 py-4 rounded-full font-medium text-lg transition-all"
            >
              Voir nos appartements
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
      <ScrollToTop />

      {isModalOpen && (
        <ReservationModal onClose={() => setIsModalOpen(false)} initialRoomId={null} />
      )}
    </div>
  );
};
