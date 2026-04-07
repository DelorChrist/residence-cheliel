import { useState, useEffect, useCallback } from 'react';
import { Star, Wifi, Wind, MapPin, ArrowUp, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { rooms, Room, RESIDENCE_INFO } from '../data/rooms';
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

  const location = useLocation();

  const handleScroll = useCallback(() => {
    setShowScrollTop(window.scrollY > 400);
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
        <Header onReserve={() => openReservationModal()} />

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
              Votre havre de paix <br /> au cœur de Yakro
            </h1>
            <p className="text-base md:text-xl text-white/90 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
              Venez vivre l'élégance des résidences Cheliel à Yamoussoukro, Morofé à 100m du foyer des jeunes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => openReservationModal()}
                className="animate-pulse bg-primary-600 hover:bg-primary-500 hover:animate-none text-white px-8 py-4 rounded-full font-medium text-lg transition-all transform hover:scale-105 shadow-xl shadow-primary-900/30"
              >
                Réservez votre séjour
              </button>
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
                <div key={i} className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#faf9f8] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-primary-100">
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
                <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-xl">
                  <img src="/images/piscine.jpg" alt="Piscine Résidence Cheliel" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" loading="lazy" />
                </div>
                <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-xl mt-10">
                  <img src="/images/bar.jpeg" alt="Bar Résidence Cheliel" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" loading="lazy" />
                </div>
              </div>
              <div className="w-full lg:w-1/2">
                <p className="text-primary-600 font-medium tracking-widest uppercase text-sm mb-3">Notre Histoire</p>
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-6">Un cadre d'exception à Yamoussoukro</h2>
                <p className="text-gray-600 text-lg leading-loose mb-5">
                  Nichée à Morofé, à 100m du foyer des jeunes, la Résidence Cheliel est bien plus qu'un simple hébergement. C'est une expérience de vie alliant le luxe discret à la chaleur de l'hospitalité ivoirienne.
                </p>
                <p className="text-gray-600 text-lg leading-loose mb-10">
                  Profitez de notre piscine, de notre bar lounge et de nos espaces communs soigneusement aménagés pour faire de votre séjour un moment inoubliable.
                </p>
                <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200">
                  {[
                    { value: `${RESIDENCE_INFO.totalApartments}`, label: 'Appartements' },
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
            <div className="space-y-16">
              {rooms.map((room, index) => (
                <RoomSection key={room.id} room={room} reversed={index % 2 !== 0} onReserve={() => openReservationModal(room.id)} />
              ))}
            </div>

            <div className="text-center mt-14">
              <Link
                to="/chambres"
                className="inline-flex items-center gap-3 bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-full font-medium text-lg transition-all shadow-lg shadow-primary-900/20 hover:scale-105 transform"
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
          className={`fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg flex items-center justify-center transition-all duration-300 ${
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

const RoomSection = ({ room, reversed, onReserve }: { room: Room, reversed: boolean, onReserve: () => void }) => {
  const [activeImage, setActiveImage] = useState(room.images[0]);

  return (
    <div className={`flex flex-col ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 items-center`}>
      <div className="w-full lg:w-1/2 flex flex-col gap-4">
        <Link to={`/chambres/${room.id}`} className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl block group">
          <img src={activeImage} alt={room.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
          <div className="absolute top-5 left-5 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full font-bold text-primary-900 shadow-lg text-sm">
            {room.priceNight.toLocaleString()} FCFA <span className="font-normal text-gray-500">/ nuitée</span>
          </div>
          <div className="absolute top-5 right-5 bg-primary-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
            {room.capacity}
          </div>
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span className="bg-white text-primary-700 font-medium px-5 py-2 rounded-full text-sm shadow-lg">Voir les détails</span>
          </div>
        </Link>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {room.images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveImage(img)}
              className={`w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${activeImage === img ? 'border-primary-600 shadow-md scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
              <img src={img} alt={`${room.name} vue ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center">
        <h3 className="text-2xl md:text-4xl font-heading font-bold text-gray-900 mb-4">
          <Link to={`/chambres/${room.id}`} className="hover:text-primary-600 transition-colors">{room.name}</Link>
        </h3>
        <p className="text-gray-600 text-lg leading-loose mb-8">{room.description}</p>
        <div className="mb-8">
          <h4 className="text-xs font-bold text-primary-900 uppercase tracking-widest mb-4">Équipements Inclus</h4>
          <ul className="grid grid-cols-2 gap-y-3 gap-x-6">
            {room.amenities.map((amenity, i) => (
              <li key={i} className="flex items-center gap-2 text-gray-600 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0"></div>
                {amenity}
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={onReserve}
          className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-xl font-medium transition-all self-start shadow-lg shadow-primary-900/20 hover:scale-105 transform flex items-center gap-2"
        >
          Réserver cet appartement
        </button>
      </div>
    </div>
  );
};
