import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRooms } from '../hooks/useRooms';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { ReservationModal } from '../components/ReservationModal';
import { ScrollToTop } from '../components/ScrollToTop';

export const ChambresPage = () => {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { rooms, loading } = useRooms();

  const openModal = (roomId: string) => {
    setSelectedRoomId(roomId);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#faf9f8] font-sans text-[#333]">
      <Header onReserve={() => setIsModalOpen(true)} />

      {/* Hero Banner */}
      <div className="relative h-80 md:h-96 flex items-center justify-center overflow-hidden">
        <img src="/images/hero.jpg" alt="Chambres" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative z-10 text-center px-4">
          <p className="text-primary-300 font-medium tracking-widest uppercase text-sm mb-3">Hébergement</p>
          <h1 className="text-3xl md:text-5xl font-heading font-bold text-white drop-shadow-lg">Nos Appartements</h1>
          <p className="text-white/80 mt-3 text-base md:text-lg">{rooms.length} appartement{rooms.length > 1 ? 's' : ''} disponible{rooms.length > 1 ? 's' : ''} à Yamoussoukro</p>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-white/70 text-xs font-medium tracking-widest uppercase">Découvrir</span>
          <div className="w-8 h-8 rounded-full border-2 border-white/50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      {/* Rooms Grid */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-20 text-gray-400">Aucun appartement disponible pour le moment.</div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group animate-fade-in"
              >
                {/* Image cliquable */}
                <Link to={`/chambres/${room.id}`} className="block relative aspect-[16/10] overflow-hidden">
                  <img
                    src={room.images[0]}
                    alt={room.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full font-bold text-primary-900 shadow-md text-sm">
                    {room.priceNight.toLocaleString()} FCFA <span className="font-normal text-gray-500">/ nuitée</span>
                  </div>
                  <div className="absolute top-4 right-4 bg-primary-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-md">
                    {room.count} disponibles
                  </div>
                </Link>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <Link to={`/chambres/${room.id}`} className="text-xl md:text-2xl font-heading font-bold text-gray-900 hover:text-primary-600 transition-colors">{room.name}</Link>
                    <div className="flex items-center gap-1.5 text-gray-500 text-sm shrink-0 ml-4 bg-primary-50 px-3 py-1 rounded-full">
                      <Users size={14} className="text-primary-500" />
                      {room.capacity}
                    </div>
                  </div>

                  <p className="text-gray-500 leading-relaxed mb-5 text-sm">{room.description}</p>

                  <ul className="grid grid-cols-2 gap-y-2 mb-6">
                    {room.amenities.slice(0, 6).map((a, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 size={13} className="text-primary-500 shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>

                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <Link
                      to={`/chambres/${room.id}`}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:border-primary-500 hover:text-primary-600 font-medium text-sm transition-all"
                    >
                      Voir les détails <ArrowRight size={15} />
                    </Link>
                    <button
                      onClick={() => openModal(room.id)}
                      className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-md shadow-primary-900/20 hover:scale-105 transform"
                    >
                      Réserver
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
      <ScrollToTop />

      {isModalOpen && (
        <ReservationModal onClose={() => setIsModalOpen(false)} initialRoomId={selectedRoomId} />
      )}
    </div>
  );
};
