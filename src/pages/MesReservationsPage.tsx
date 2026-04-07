import { useState } from 'react';
import { Phone, Search, CalendarDays, CheckCircle2, Clock, XCircle, Moon, Sun } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { ScrollToTop } from '../components/ScrollToTop';
import { useReservations, Reservation } from '../hooks/useReservations';
import { useRooms } from '../hooks/useRooms';
import { getNights } from '../hooks/useReservations';

export const MesReservationsPage = () => {
  const [phone, setPhone] = useState('');
  const [searched, setSearched] = useState(false);
  const { reservations } = useReservations();

  const normalize = (p: string) => p.replace(/\s/g, '');
  const results = searched
    ? reservations.filter(r => normalize(r.phone) === normalize(phone))
    : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
  };

  return (
    <div className="min-h-screen bg-[#faf9f8] font-sans text-[#333]">
      <Header onReserve={() => {}} />

      {/* Hero Banner */}
      <div className="relative h-80 md:h-96 flex items-center justify-center overflow-hidden">
        <img src="/images/hero.jpg" alt="Mes Réservations" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative z-10 text-center px-4">
          <p className="text-primary-300 font-medium tracking-widest uppercase text-sm mb-3">Espace client</p>
          <h1 className="text-3xl md:text-5xl font-heading font-bold text-white drop-shadow-lg">Mes Réservations</h1>
          <p className="text-white/80 mt-3 text-base md:text-lg">Retrouvez vos réservations en entrant votre numéro de téléphone</p>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-white/70 text-xs font-medium tracking-widest uppercase">Rechercher</span>
          <div className="w-8 h-8 rounded-full border-2 border-white/50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      <section className="py-16">
        <div className="container mx-auto px-6 max-w-2xl">

          {/* Formulaire de recherche */}
          <form onSubmit={handleSearch} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-10">
            <h2 className="text-xl font-heading font-bold text-gray-900 mb-2">Rechercher mes réservations</h2>
            <p className="text-gray-500 text-sm mb-6">Entrez le numéro de téléphone utilisé lors de votre réservation.</p>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setSearched(false); }}
                  placeholder="+225 07 79 27 79 24"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!phone.trim()}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                <Search size={18} /> Rechercher
              </button>
            </div>
          </form>

          {/* Résultats */}
          {searched && (
            results.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={28} className="text-gray-400" />
                </div>
                <h3 className="font-heading font-bold text-gray-800 text-lg mb-2">Aucune réservation trouvée</h3>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">Vérifiez que le numéro saisi correspond à celui utilisé lors de votre réservation.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 mb-4">{results.length} réservation{results.length > 1 ? 's' : ''} trouvée{results.length > 1 ? 's' : ''}</p>
                {results.map(res => <ReservationCard key={res.id} reservation={res} />)}
              </div>
            )
          )}
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
      <ScrollToTop />
    </div>
  );
};

const ReservationCard = ({ reservation: res }: { reservation: Reservation }) => {
  const { rooms } = useRooms();
  const room = rooms.find(r => r.id === res.roomId);
  const nights = getNights(res.checkIn, res.checkOut);
  const price = room ? (res.stayType === 'journée' ? room.priceDay : room.priceNight) : 0;
  const total = price * nights;

  const statusConfig = {
    'Confirmé': { color: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={14} /> },
    'En attente': { color: 'bg-yellow-100 text-yellow-700', icon: <Clock size={14} /> },
    'Annulé': { color: 'bg-red-100 text-red-700', icon: <XCircle size={14} /> },
  };
  const status = statusConfig[res.status];

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header carte */}
      <div className="bg-primary-900 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-primary-300 text-xs font-medium uppercase tracking-wider">Réservation</p>
          <p className="text-white font-bold font-mono text-sm mt-0.5">{res.id}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${status.color}`}>
          {status.icon} {res.status}
        </span>
      </div>

      {/* Corps */}
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-heading font-bold text-gray-900 text-lg">{room?.name || 'Appartement'}</p>
            <p className="text-gray-500 text-sm">{room?.capacity}</p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${res.stayType === 'nuitée' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
            {res.stayType === 'nuitée' ? <Moon size={13} /> : <Sun size={13} />}
            <span className="capitalize">{res.stayType || 'Nuitée'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Arrivée</p>
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-primary-500" />
              <p className="font-semibold text-gray-800 text-sm">{new Date(res.checkIn).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">{res.stayType === 'nuitée' ? '22h00' : '12h00'}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Départ</p>
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-primary-500" />
              <p className="font-semibold text-gray-800 text-sm">{new Date(res.checkOut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">12h00</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {nights} {res.stayType === 'nuitée' ? 'nuit' : 'jour'}{nights > 1 ? 's' : ''} · {res.paymentMethod}
          </div>
          <div className="font-bold text-primary-600 text-lg">{total.toLocaleString()} FCFA</div>
        </div>

        {res.status === 'En attente' && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 text-sm text-yellow-700">
            ⏳ Votre réservation est en cours de traitement. Notre équipe vous contactera au <strong>{res.phone}</strong> pour confirmer le paiement.
          </div>
        )}
        {res.status === 'Confirmé' && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-sm text-green-700">
            ✅ Réservation confirmée ! Nous vous attendons à la Résidence Cheliel.
          </div>
        )}
      </div>
    </div>
  );
};
