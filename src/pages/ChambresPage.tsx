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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-white rounded-2xl md:rounded-3xl overflow-hidden border border-gray-100 hover:border-primary-200 hover:-translate-y-0.5 transition-all duration-300 group animate-fade-in flex flex-col sm:flex-row shadow-sm"
              >
                {/* Colonne Gauche : Image */}
                <div className="w-full sm:w-[44%] md:w-[45%] flex flex-col bg-gray-50 shrink-0">
                  <Link to={`/chambres/${room.id}`} className="relative h-48 sm:h-full min-h-[180px] sm:min-h-[220px] overflow-hidden block">
                    <img
                      src={room.imagePrincipale || room.images[0] || ''}
                      alt={room.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full font-bold text-primary-900 border border-gray-200/50 text-xs shadow-xs">
                      {room.priceNight.toLocaleString()} FCFA <span className="font-normal text-gray-500">/ nuit</span>
                    </div>
                    <div className="absolute top-3 right-3 bg-primary-600 text-white px-2.5 py-1 rounded-full text-[11px] font-medium shadow-xs">
                      {room.capacity}
                    </div>
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <span className="bg-white text-primary-700 font-medium px-3.5 py-1.5 rounded-full text-xs shadow-sm">Voir les détails</span>
                    </div>
                  </Link>

                  {/* Miniatures si multiples */}
                  {room.images && room.images.length > 1 && (
                    <div className="flex gap-1.5 p-2 bg-gray-50 border-t border-gray-100 overflow-x-auto scrollbar-hide">
                      {room.images.slice(0, 4).map((img, i) => (
                        <div key={i} className="w-9 h-9 rounded-md overflow-hidden shrink-0 border border-transparent opacity-75">
                          <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Colonne Droite : Content */}
                <div className="p-5 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <Link to={`/chambres/${room.id}`} className="text-lg sm:text-xl font-heading font-bold text-gray-900 hover:text-primary-600 transition-colors leading-snug">
                        {room.name}
                      </Link>
                    </div>

                    <p className="text-gray-500 text-xs sm:text-sm leading-relaxed mb-3 line-clamp-2">{room.description}</p>

                    <div className="mb-3">
                      <h4 className="text-[10px] font-bold text-primary-900 uppercase tracking-wider mb-2">
                        Équipements Inclus
                      </h4>
                      <ul className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs text-gray-600">
                        {room.amenities.slice(0, 4).map((a, i) => (
                          <li key={i} className="flex items-center gap-1.5 truncate">
                            <CheckCircle2 size={12} className="text-primary-500 shrink-0" />
                            <span className="truncate">{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-auto">
                    <Link
                      to={`/chambres/${room.id}`}
                      className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:border-primary-500 hover:text-primary-600 font-medium text-xs sm:text-sm transition-all whitespace-nowrap"
                    >
                      <span>Voir les détails</span>
                      <ArrowRight size={14} />
                    </Link>
                    <button
                      onClick={() => openModal(room.id)}
                      className="flex-1 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white px-3 py-2 rounded-xl font-medium text-xs sm:text-sm transition-all text-center shadow-xs"
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
