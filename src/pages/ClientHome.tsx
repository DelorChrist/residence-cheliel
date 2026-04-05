import { useState, useEffect } from 'react';
import { Menu, X, MapPin, Phone, Star, Wifi, Wind, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { rooms, Room } from '../data/rooms';
import { useReservations, PaymentMethod } from '../hooks/useReservations';

const today = new Date().toISOString().split('T')[0];

export const ClientHome = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openReservationModal = (roomId?: string) => {
    setSelectedRoomId(roomId ?? null);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen font-sans bg-[#faf9f8] text-[#333]">
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-4' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white font-heading font-bold text-xl">RC</div>
            <div className={`font-heading font-bold text-2xl tracking-tight ${isScrolled ? 'text-primary-900' : 'text-white'}`}>Résidence Cheliel</div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#accueil" className={`font-medium hover:text-primary-500 transition-colors ${isScrolled ? 'text-gray-600' : 'text-white/90'}`}>Accueil</a>
            <a href="#chambres" className={`font-medium hover:text-primary-500 transition-colors ${isScrolled ? 'text-gray-600' : 'text-white/90'}`}>Nos Chambres</a>
            <a href="#services" className={`font-medium hover:text-primary-500 transition-colors ${isScrolled ? 'text-gray-600' : 'text-white/90'}`}>Services</a>
            <button
              onClick={() => openReservationModal()}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-full font-medium transition-colors shadow-lg shadow-primary-900/20"
            >
              Réserver
            </button>
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden text-primary-900 bg-white/80 p-2 rounded-lg" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg border-t border-gray-100 py-4 flex flex-col px-6 gap-4">
            <a href="#accueil" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 font-medium py-2">Accueil</a>
            <a href="#chambres" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 font-medium py-2">Nos Chambres</a>
            <a href="#services" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 font-medium py-2">Services</a>
            <button
              onClick={() => { openReservationModal(); setMobileMenuOpen(false); }}
              className="bg-primary-600 text-white px-6 py-3 rounded-xl font-medium w-full mt-2"
            >
              Réserver
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="accueil" className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/images/hero.jpg" alt="Résidence Cheliel" className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        </div>

        <div className="container relative z-10 mx-auto px-6 text-center mt-20">
          <p className="text-primary-200 font-medium tracking-[0.2em] uppercase text-sm mb-4">L'art de vivre à l'ivoirienne</p>
          <h1 className="text-5xl md:text-7xl font-heading font-bold text-white mb-6 leading-tight">
            Votre oasis de luxe <br /> au cœur d'Abidjan
          </h1>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto font-light">
            Découvrez nos résidences meublées haut de gamme, alliant confort moderne et élégance pour des séjours inoubliables.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => openReservationModal()}
              className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-full font-medium text-lg transition-all transform hover:scale-105"
            >
              Réserver votre séjour
            </button>
            <a href="#chambres" className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-full font-medium text-lg transition-all">
              Découvrir nos suites
            </a>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section id="services" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Wifi, title: "Wi-Fi Haut Débit", desc: "Connexion fibre optique" },
              { icon: MapPin, title: "Emplacement Idéal", desc: "Quartier sécurisé et central" },
              { icon: Wind, title: "Climatisation", desc: "Dans toutes les pièces" },
              { icon: Star, title: "Service Premium", desc: "Ménage et conciergerie" }
            ].map((feature, i) => (
              <div key={i} className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#faf9f8] hover:shadow-lg transition-shadow border border-primary-100">
                <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mb-4">
                  <feature.icon size={28} />
                </div>
                <h3 className="font-heading font-bold text-lg mb-2 text-primary-900">{feature.title}</h3>
                <p className="text-gray-500 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rooms Section */}
      <section id="chambres" className="py-24 bg-[#faf9f8]">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-primary-600 font-medium tracking-widest uppercase text-sm mb-3">Hébergement</p>
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 mb-6">Nos Suites & Chambres</h2>
            <p className="text-gray-600 text-lg">Chaque espace est pensé pour votre bien-être, avec des équipements modernes et une décoration raffinée inspirée de l'élégance africaine.</p>
          </div>

          <div className="space-y-20">
            {rooms.map((room, index) => (
              <RoomSection key={room.id} room={room} reversed={index % 2 !== 0} onReserve={() => openReservationModal(room.id)} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary-900 text-primary-100 py-16">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white font-heading font-bold text-xl">RC</div>
              <div className="font-heading font-bold text-2xl text-white">Résidence Cheliel</div>
            </div>
            <p className="text-primary-200/80 max-w-sm mb-6">Votre adresse de prestige pour un séjour d'exception à Abidjan. Le luxe sobre et l'hospitalité ivoirienne vous attendent.</p>
          </div>

          <div>
            <h4 className="text-white font-heading font-bold mb-6 text-lg">Contact</h4>
            <ul className="space-y-4 text-primary-200/80">
              <li className="flex items-start gap-3">
                <MapPin size={20} className="shrink-0 text-primary-500 mt-1" />
                <span>Cocody Riviera Palmeraie,<br />Abidjan, Côte d'Ivoire</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={20} className="shrink-0 text-primary-500" />
                <span>+225 07 00 00 00 00</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-heading font-bold mb-6 text-lg">Accès Rapide</h4>
            <ul className="space-y-3 text-primary-200/80">
              <li><a href="#accueil" className="hover:text-white transition-colors">Accueil</a></li>
              <li><a href="#chambres" className="hover:text-white transition-colors">Hébergement</a></li>
              <li><Link to="/admin" className="hover:text-white transition-colors">Espace Admin</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-6 mt-16 pt-8 border-t border-primary-800 text-center text-primary-200/60 text-sm">
          &copy; {new Date().getFullYear()} Résidence Cheliel. Tous droits réservés.
        </div>
      </footer>

      {/* Reservation Modal */}
      {isModalOpen && (
        <ReservationModal
          onClose={() => setIsModalOpen(false)}
          initialRoomId={selectedRoomId}
        />
      )}
    </div>
  );
};

// Room Section Component
const RoomSection = ({ room, reversed, onReserve }: { room: Room, reversed: boolean, onReserve: () => void }) => {
  const [activeImage, setActiveImage] = useState(room.images[0]);

  return (
    <div className={`flex flex-col ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 items-center`}>
      {/* Gallery */}
      <div className="w-full lg:w-1/2 flex flex-col gap-4">
        <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
          <img src={activeImage} alt={room.name} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" loading="lazy" />
          <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full font-bold text-primary-900 shadow-lg">
            {room.price.toLocaleString()} FCFA <span className="font-normal text-sm text-gray-600">/ nuit</span>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {room.images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveImage(img)}
              className={`relative w-24 h-24 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${activeImage === img ? 'border-primary-600 shadow-md scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
            >
              <img src={img} alt={`${room.name} vue ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center">
        <h3 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-4">{room.name}</h3>
        <p className="text-gray-600 text-lg leading-relaxed mb-8">{room.description}</p>

        <div className="mb-8">
          <h4 className="text-sm font-bold text-primary-900 uppercase tracking-wider mb-4">Équipements Inclus</h4>
          <ul className="grid grid-cols-2 gap-y-3 gap-x-6">
            {room.amenities.map((amenity, i) => (
              <li key={i} className="flex items-center gap-2 text-gray-700">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0"></div>
                {amenity}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={onReserve}
          className="bg-gray-900 hover:bg-primary-600 text-white px-8 py-4 rounded-xl font-medium transition-colors self-start shadow-xl shadow-gray-900/10 flex items-center gap-2"
        >
          Réserver cette chambre
        </button>
      </div>
    </div>
  );
};

// Reservation Modal
const ReservationModal = ({ onClose, initialRoomId }: { onClose: () => void, initialRoomId: string | null }) => {
  const { addReservation } = useReservations();
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    clientName: '',
    phone: '',
    email: '',
    roomId: initialRoomId || rooms[0].id,
    checkIn: '',
    checkOut: '',
    remarks: '',
    paymentMethod: 'Orange Money' as PaymentMethod
  });

  const isValid = formData.clientName && formData.phone && formData.checkIn && formData.checkOut;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      addReservation({
        clientName: formData.clientName,
        phone: formData.phone,
        email: formData.email,
        roomId: formData.roomId,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        remarks: formData.remarks,
        paymentMethod: formData.paymentMethod
      });
      setStep(2);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={step === 1 ? onClose : undefined}></div>

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 z-10 bg-white/80 rounded-full p-1">
          <X size={24} />
        </button>

        {step === 1 ? (
          <div className="p-8 md:p-10">
            <h2 className="text-3xl font-heading font-bold text-gray-900 mb-2">Demande de Réservation</h2>
            <p className="text-gray-600 mb-8">Remplissez ce formulaire pour sécuriser votre séjour.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Nom Complet *</label>
                  <input required type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="Jean Dupont" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Téléphone *</label>
                  <input required type="tel" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+225 00 00 00 00 00" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email (Optionnel)</label>
                  <input type="email" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@exemple.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Type de Chambre *</label>
                  <select required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all bg-white" value={formData.roomId} onChange={e => setFormData({...formData, roomId: e.target.value})}>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name} - {r.price.toLocaleString()} F/nuit</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Date d'arrivée *</label>
                  <input
                    required type="date"
                    min={today}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                    value={formData.checkIn}
                    onChange={e => setFormData({...formData, checkIn: e.target.value, checkOut: ''})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Date de départ *</label>
                  <input
                    required type="date"
                    min={formData.checkIn || today}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                    value={formData.checkOut}
                    onChange={e => setFormData({...formData, checkOut: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Mode de paiement souhaité *</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center transition-all ${formData.paymentMethod === 'Orange Money' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-200'}`}>
                    <input type="radio" name="payment" value="Orange Money" checked={formData.paymentMethod === 'Orange Money'} onChange={() => setFormData({...formData, paymentMethod: 'Orange Money'})} className="sr-only" />
                    <span className="font-bold text-orange-600">Orange Money</span>
                  </label>
                  <label className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center transition-all ${formData.paymentMethod === 'Wave' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                    <input type="radio" name="payment" value="Wave" checked={formData.paymentMethod === 'Wave'} onChange={() => setFormData({...formData, paymentMethod: 'Wave'})} className="sr-only" />
                    <span className="font-bold text-blue-600">Wave</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Demandes spéciales / Remarques</label>
                <textarea className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all resize-none" rows={3} value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} placeholder="Arrivée tardive, lit bébé..."></textarea>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-4">
                <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={!isValid} className="px-8 py-3 rounded-xl font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-900/20">
                  Confirmer la demande
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-3xl font-heading font-bold text-gray-900 mb-4">Demande Envoyée !</h2>
            <p className="text-gray-600 mb-8 max-w-md">
              Merci <strong>{formData.clientName}</strong>. Votre demande de réservation a été enregistrée avec succès. Notre équipe vous contactera très rapidement au <strong>{formData.phone}</strong> pour procéder au paiement via <strong>{formData.paymentMethod}</strong> et confirmer votre séjour.
            </p>
            <button onClick={onClose} className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-medium transition-colors">
              Fermer et retourner à l'accueil
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
