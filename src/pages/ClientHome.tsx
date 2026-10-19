import { useState, useEffect, useCallback } from 'react';
import { Star, Wifi, Wind, MapPin, ArrowUp, ArrowRight, Video } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Room } from '../data/rooms';
import { useRooms } from '../hooks/useRooms';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { SplashScreen } from '../components/SplashScreen';
import { ReservationModal } from '../components/ReservationModal';

export const ClientHome = () => {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('splashShown'));
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { rooms, totalApartments } = useRooms();

  const location = useLocation();
  const navigate = useNavigate();

  const handleScroll = useCallback(() => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    // S'affiche uniquement quand on arrive en bas de l'écran (vers le bas de la page / footer)
    const isNearBottom = scrollTop > 300 && (scrollTop + windowHeight) >= (documentHeight - 450);
    setShowScrollTop(isNearBottom);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (location.hash === '#chambres') {
      setTimeout(() => {
        document.getElementById('chambres')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [location.hash]);

  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

  const openReservationModal = (roomId?: string) => {
    setSelectedRoomId(roomId ?? null);
    setIsModalOpen(true);
  };

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

      <div className="min-h-screen font-sans bg-[#faf9f8] text-[#333]">
        <Header onReserve={() => navigate('/chambres')} />

        {/* Hero Section */}
        <section id="accueil" className="relative h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img src="/images/hero.jpg" alt="Résidence Cheliel" className="w-full h-full object-cover" loading="eager" />
            <div className="absolute inset-0 bg-black/50"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          </div>
          <div className="container relative z-10 mx-auto px-6 text-center mt-20">
            <p className="text-primary-300 font-medium tracking-[0.25em] uppercase text-xs md:text-sm mb-4">L'art de vivre à Yamoussoukro</p>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-heading font-bold text-white mb-6 leading-tight drop-shadow-lg">
              Votre havre de paix <br /> au cœur de Yamoussoukro  
            </h1>
            <p className="text-base md:text-xl text-white/90 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
              Venez vivre un sejour inoubliable aux résidences Cheliel à Yamoussoukro, Morofé à 100m du foyer des jeunes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/chambres"
                className="animate-pulse bg-primary-600 hover:bg-primary-500 hover:animate-none text-white px-8 py-4 rounded-full font-medium text-lg transition-all transform hover:scale-105"
              >
                Réservez votre séjour
              </Link>
              <a href="#chambres" className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-full font-medium text-lg transition-all">
                Découvrez nos suites
              </a>
            </div>
          </div>
        </section>

        {/* Services Preview */}
        <section id="services" className="py-14 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <p className="text-primary-600 font-medium tracking-widest uppercase text-sm mb-3">Ce qu'on offre</p>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900">Nos Services</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: Wifi, title: "Wi-Fi Haut Débit", desc: "Connexion fibre optique" },
                { icon: MapPin, title: "Emplacement Idéal", desc: "Quartier sécurisé et central" },
                { icon: Wind, title: "Climatisation", desc: "Dans toutes les pièces" },
                { icon: Star, title: "Service Premium", desc: "Ménage et conciergerie" }
              ].map((feature, i) => (
                <div key={i} className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#faf9f8] hover:-translate-y-1 transition-all duration-300 border border-primary-100">
                  <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mb-4">
                    <feature.icon size={26} />
                  </div>
                  <h3 className="font-heading font-bold text-base mb-1 text-primary-900">{feature.title}</h3>
                  <p className="text-gray-500 text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-14 bg-[#faf9f8]">
          <div className="container mx-auto px-6">
            <div className="flex flex-col lg:flex-row gap-10 items-center">
              <div className="w-full lg:w-1/2 grid grid-cols-2 gap-4">
                <div className="aspect-[3/4] rounded-3xl overflow-hidden">
                  <img src="/images/piscine.jpg" alt="Piscine Résidence Cheliel" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" loading="lazy" />
                </div>
                <div className="aspect-[3/4] rounded-3xl overflow-hidden mt-10">
                  <img src="/images/bar.jpeg" alt="Bar Résidence Cheliel" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" loading="lazy" />
                </div>
              </div>
              <div className="w-full lg:w-1/2">
                <p className="text-primary-600 font-medium tracking-widest uppercase text-sm mb-3">Notre Histoire</p>
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-6">Un cadre d'exception à Yamoussoukro</h2>
                <p className="text-gray-600 text-lg leading-loose mb-5">
                  Nichée à Morofé, à 100m du foyer des jeunes, les Résidences Cheliel sont bien plus qu'un simple hébergement. C'est une expérience de vie alliant le luxe discret à la chaleur de l'hospitalité ivoirienne.
                </p>
                <p className="text-gray-600 text-lg leading-loose mb-4">
                  Profitez de notre piscine, de notre bar lounge et de nos espaces communs soigneusement aménagés pour faire de votre séjour un moment inoubliable.
                </p>
                <div className="grid grid-cols-3 gap-6 pt-4 border-t border-gray-200">
                  {[
                    { value: `${totalApartments}`, label: 'Appartements' },
                    { value: '100%', label: 'Clients satisfaits' },
                    { value: '24/7', label: 'Service disponible' },
                  ].map((stat, i) => (
                    <div key={i} className="text-center">
                      <div className="text-3xl font-heading font-bold text-primary-600 mb-1">{stat.value}</div>
                      <div className="text-sm text-gray-500">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Rooms Section */}
        <section id="chambres" className="py-14 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <p className="text-primary-600 font-medium tracking-widest uppercase text-sm mb-3">Hébergement</p>
              <h2 className="text-3xl md:text-5xl font-heading font-bold text-gray-900 mb-4">Nos Appartements</h2>
              <p className="text-gray-500 text-lg leading-relaxed">Chaque espace est pensé pour votre bien-être, avec des équipements modernes et une décoration raffinée.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} onReserve={() => openReservationModal(room.id)} />
              ))}
            </div>

            <div className="text-center mt-14">
              <Link
                to="/chambres"
                className="inline-flex items-center gap-3 bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-full font-medium text-lg transition-all hover:scale-105 transform"
              >
                Voir tous les appartements <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </section>

        <Footer />

        {isModalOpen && (
          <ReservationModal onClose={() => setIsModalOpen(false)} initialRoomId={selectedRoomId} />
        )}

        <button
          onClick={scrollToTop}
          aria-label="Remonter en haut"
          className={`fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-all duration-300 ${
            showScrollTop ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
          }`}
        >
          <ArrowUp size={20} />
        </button>

        <WhatsAppButton />
      </div>
    </>
  );
};

const RoomCard = ({ room, onReserve }: { room: Room, onReserve: () => void }) => {
  const [activeImage, setActiveImage] = useState(room.imagePrincipale || room.images[0] || '');

  return (
    <div className="bg-white rounded-2xl md:rounded-3xl overflow-hidden border border-gray-100 hover:border-primary-200 hover:-translate-y-0.5 transition-all duration-300 group flex flex-col sm:flex-row shadow-sm sm:h-[285px]">
      {/* Colonne Gauche : Image + Miniatures */}
      <div className="w-full sm:w-[44%] md:w-[45%] flex flex-col bg-gray-50 shrink-0 h-56 sm:h-full relative overflow-hidden">
        <Link to={`/chambres/${room.id}`} className="relative flex-1 min-h-0 overflow-hidden block">
          <img
            src={activeImage}
            alt={room.name}
            className="w-full h-full object-cover object-[center_35%] transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full font-bold text-primary-900 border border-gray-200/50 text-xs shadow-xs">
            {room.priceNight.toLocaleString()} FCFA <span className="font-normal text-gray-500">/ nuit</span>
          </div>
          <div className="absolute top-3 right-3 bg-primary-600 text-white px-2.5 py-1 rounded-full text-[11px] font-medium shadow-xs">
            {room.capacity}
          </div>
          {room.videoUrl && (
            <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-white/10 z-10">
              <Video size={11} className="text-yellow-400" />
              <span>Visite vidéo</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span className="bg-white text-primary-700 font-medium px-3.5 py-1.5 rounded-full text-xs shadow-sm">Voir les détails</span>
          </div>
        </Link>

        {/* Miniatures d'images */}
        {room.images && room.images.length > 1 && (
          <div className="flex gap-1.5 p-2 bg-gray-50 border-t border-gray-100 overflow-x-auto scrollbar-hide shrink-0">
            {room.images.slice(0, 5).map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveImage(img)}
                aria-label={`Vue ${i + 1}`}
                className={`w-9 h-9 rounded-md overflow-hidden shrink-0 border transition-all ${
                  activeImage === img ? 'border-primary-600 ring-1 ring-primary-500' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover object-center" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Colonne Droite : Détails */}
      <div className="p-5 sm:p-5 flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
        <div>
          <h3 className="text-lg sm:text-xl font-heading font-bold text-gray-900 mb-1.5 leading-snug truncate">
            <Link to={`/chambres/${room.id}`} className="hover:text-primary-600 transition-colors">
              {room.name}
            </Link>
          </h3>

          <p className="text-gray-500 text-xs sm:text-sm leading-relaxed mb-3 line-clamp-2">
            {room.description || "Un espace raffiné et chaleureux, entièrement équipé pour votre plus grand confort."}
          </p>

          <div className="mb-3">
            <h4 className="text-[10px] font-bold text-primary-900 uppercase tracking-wider mb-2">
              Équipements Inclus
            </h4>
            <ul className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs text-gray-600">
              {(room.amenities && room.amenities.length > 0
                ? room.amenities.slice(0, 4)
                : ['Climatisation', 'Wi-Fi haut débit', 'Smart TV', 'Salle d’eau privée']
              ).map((amenity, i) => (
                <li key={i} className="flex items-center gap-1.5 truncate">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0"></div>
                  <span className="truncate">{amenity}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-auto shrink-0">
          <Link
            to={`/chambres/${room.id}`}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:border-primary-500 hover:text-primary-600 font-medium text-xs sm:text-sm transition-all whitespace-nowrap"
          >
            <span>Voir les détails</span>
            <ArrowRight size={14} />
          </Link>
          <button
            onClick={onReserve}
            className="flex-1 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white px-3 py-2 rounded-xl font-medium text-xs sm:text-sm transition-all text-center shadow-xs"
          >
            Réserver
          </button>
        </div>
      </div>
    </div>
  );
};
