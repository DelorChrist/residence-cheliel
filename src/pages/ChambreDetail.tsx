import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRooms } from '../hooks/useRooms';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { ReservationModal } from '../components/ReservationModal';
import { ScrollToTop } from '../components/ScrollToTop';

export const ChambreDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { rooms, loading } = useRooms();
  const room = rooms.find(r => r.id === id);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (loading) return (
    <div className="min-h-screen bg-[#faf9f8] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!room) return <Navigate to="/chambres" replace />;

  const prev = () => setActiveIndex(i => (i === 0 ? room.images.length - 1 : i - 1));
  const next = () => setActiveIndex(i => (i === room.images.length - 1 ? 0 : i + 1));

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
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
              <img
                src={room.images[activeIndex]}
                alt={room.name}
                className="w-full h-full object-cover transition-all duration-500"
                loading="lazy"
              />
              {/* Prix badge */}
              <div className="absolute top-5 left-5 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full font-bold text-primary-900 shadow-lg">
                {room.priceNight.toLocaleString()} FCFA <span className="font-normal text-sm text-gray-500">/ nuitée</span>
              </div>
              {/* Disponibilité */}
              <div className="absolute top-5 right-5 bg-primary-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                {room.count} disponibles
              </div>
              {/* Navigation flèches */}
              {room.images.length > 1 && (
                <>
                  <button onClick={prev} aria-label="Image précédente" className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors">
                    <ChevronLeft size={20} className="text-gray-700" />
                  </button>
                  <button onClick={next} aria-label="Image suivante" className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors">
                    <ChevronRight size={20} className="text-gray-700" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            <div className="flex gap-3">
              {room.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`w-24 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${activeIndex === i ? 'border-primary-600 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={img} alt={`${room.name} ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
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
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-end gap-2 mb-1">
                <span className="text-4xl font-heading font-bold text-primary-600">{room.priceNight.toLocaleString()}</span>
                <span className="text-gray-500 mb-1">FCFA / 24h</span>
              </div>
              <p className="text-gray-400 text-sm mb-5">{room.count} appartements de ce type disponibles</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-medium text-lg transition-colors shadow-lg shadow-primary-900/20"
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
      </div>

      <Footer />
      <WhatsAppButton />
      <ScrollToTop />

      {isModalOpen && (
        <ReservationModal onClose={() => setIsModalOpen(false)} initialRoomId={room.id} />
      )}
    </div>
  );
};
