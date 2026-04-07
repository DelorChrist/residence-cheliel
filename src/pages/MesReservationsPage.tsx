import { useState } from 'react';
import { Phone, Search, CalendarDays, CheckCircle2, Clock, XCircle, Moon, Sun } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { ScrollToTop } from '../components/ScrollToTop';
import { Reservation } from '../hooks/useReservations';
import { useRooms } from '../hooks/useRooms';
import { getNights, getReservationPricing } from '../hooks/useReservations';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';

type ReservationRow = {
  id: string;
  client_name: string;
  phone: string;
  email: string | null;
  room_id: string;
  stay_type: 'nuitée' | 'journée';
  check_in: string;
  check_out: string;
  remarks: string | null;
  payment_method: 'Orange Money' | 'Wave';
  status: 'Confirmé' | 'En attente' | 'Annulé';
  created_at: string;
};

const fromDB = (r: ReservationRow): Reservation => ({
  id: r.id,
  clientName: r.client_name,
  phone: r.phone,
  email: r.email ?? undefined,
  roomId: r.room_id,
  stayType: r.stay_type,
  checkIn: r.check_in,
  checkOut: r.check_out,
  remarks: r.remarks ?? undefined,
  paymentMethod: r.payment_method,
  status: r.status,
  createdAt: r.created_at,
});

const formatCurrency = (value: number) => `${value.toLocaleString()} FCFA`;

export const MesReservationsPage = () => {
  const [phone, setPhone] = useState('');
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Reservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { rooms } = useRooms();

  const normalize = (p: string) => p.replace(/\s/g, '');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setError(null);

    const { data, error } = await supabase.rpc('search_reservations_by_phone', {
      p_phone: normalize(phone),
    });

    if (error) {
      setResults([]);
      setError('Impossible de récupérer vos réservations pour le moment.');
    } else {
      setResults(((data ?? []) as ReservationRow[]).map(fromDB));
    }

    setSearching(false);
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
                disabled={!phone.trim() || searching}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                <Search size={18} /> {searching ? 'Recherche...' : 'Rechercher'}
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
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
                  {results.map(res => <ReservationCard key={res.id} reservation={res} rooms={rooms} />)}
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

const downloadReceiptPdf = (res: Reservation, roomName: string, roomCapacity: string, amount: number, nights: number) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const left = 16;
  let y = 18;

  doc.setFillColor(140, 104, 70);
  doc.rect(0, 0, 210, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RÉSIDENCE CHELIEL', left, 11);

  doc.setTextColor(34, 34, 34);
  doc.setFontSize(22);
  doc.text('Reçu de réservation', left, y + 14);
  y += 24;

  doc.setDrawColor(229, 221, 212);
  doc.setFillColor(250, 247, 244);
  doc.roundedRect(left, y, 178, 14, 3, 3, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Montant payé: ${formatCurrency(amount)}`, left + 4, y + 9);
  doc.text(`Statut: ${res.status}`, 128, y + 9);
  y += 22;

  const rows = [
    ['Numéro de reçu', res.id],
    ['Client', res.clientName],
    ['Téléphone', res.phone],
    ['Chambre', roomName],
    ['Capacité', roomCapacity || '-'],
    ['Arrivée', new Date(res.checkIn).toLocaleDateString('fr-FR')],
    ['Départ', new Date(res.checkOut).toLocaleDateString('fr-FR')],
    ['Type', res.stayType === 'nuitée' ? 'Nuitée' : 'Journée'],
    ['Paiement', res.paymentMethod],
    ['Durée', `${nights} ${res.stayType === 'nuitée' ? 'nuit' : 'jour'}${nights > 1 ? 's' : ''}`],
  ];

  doc.setFont('helvetica', 'normal');
  rows.forEach(([label, value], index) => {
    const rowY = y + Math.floor(index / 2) * 18;
    const rowX = index % 2 === 0 ? left : 107;
    doc.setFillColor(250, 247, 244);
    doc.setDrawColor(238, 227, 217);
    doc.roundedRect(rowX, rowY, 87, 15, 3, 3, 'FD');
    doc.setFontSize(8.5);
    doc.setTextColor(122, 106, 91);
    doc.text(label, rowX + 4, rowY + 5.5);
    doc.setFontSize(10.5);
    doc.setTextColor(34, 34, 34);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), rowX + 4, rowY + 11);
    doc.setFont('helvetica', 'normal');
  });

  const totalY = y + 90;
  doc.setDrawColor(230, 223, 216);
  doc.line(left, totalY, 194, totalY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Montant payé par le client: ${formatCurrency(amount)}`, left, totalY + 9);
  doc.text(`Date de génération: ${new Date().toLocaleString('fr-FR')}`, left, totalY + 18);

  doc.save(`recu-${res.id.toLowerCase()}.pdf`);
};

const ReservationCard = ({ reservation: res, rooms }: { reservation: Reservation; rooms: ReturnType<typeof useRooms>['rooms'] }) => {
  const room = rooms.find(r => r.id === res.roomId);
  const nights = getNights(res.checkIn, res.checkOut);
  const price = room ? (res.stayType === 'journée' ? room.priceDay : room.priceNight) : 0;
  const total = getReservationPricing(price, nights).total;

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
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Montant payé</div>
            <div className="font-bold text-primary-600 text-lg">{formatCurrency(total)}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="button"
            onClick={() => downloadReceiptPdf(res, room?.name || 'Appartement', room?.capacity || '', total, nights)}
            className="flex-1 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700 hover:bg-primary-100 transition-colors"
          >
            Télécharger le reçu PDF
          </button>
        </div>

        {res.status === 'En attente' && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 text-sm text-yellow-700">
            Votre réservation est en cours de traitement. Notre équipe vous contactera au <strong>{res.phone}</strong> pour confirmer le paiement.
          </div>
        )}
        {res.status === 'Confirmé' && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-sm text-green-700">
            Réservation confirmée ! Nous vous attendons à la Résidence Cheliel.
          </div>
        )}
      </div>
    </div>
  );
};
