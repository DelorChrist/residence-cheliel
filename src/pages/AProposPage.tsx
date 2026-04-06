import { MapPin, Phone, Wifi, Wind, Star, Shield, Clock, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { ReservationModal } from '../components/ReservationModal';
import { ScrollToTop } from '../components/ScrollToTop';
import { useState } from 'react';
import { RESIDENCE_INFO } from '../data/rooms';

export const AProposPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
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
                Avec ses {RESIDENCE_INFO.totalApartments} appartements entièrement meublés et équipés, la résidence offre un cadre idéal pour les séjours professionnels, familiaux ou romantiques dans la capitale politique de la Côte d'Ivoire.
              </p>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Notre mission est simple : vous offrir le confort d'un chez-soi avec les services d'un hôtel haut de gamme, dans un environnement sécurisé et paisible.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 bg-primary-900">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: `${RESIDENCE_INFO.totalApartments}`, label: 'Appartements' },
              { value: `${RESIDENCE_INFO.kingSize.count}`, label: 'Apparts King Size' },
              { value: `${RESIDENCE_INFO.double.count}`, label: 'Apparts Double' },
              { value: '24/7', label: 'Service disponible' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl font-heading font-bold text-primary-300 mb-2">{stat.value}</div>
                <div className="text-primary-200/70 text-sm">{stat.label}</div>
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

      {/* Galerie */}
      <section className="py-16 bg-[#faf9f8]">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-primary-600 font-medium tracking-widest uppercase text-sm mb-3">Nos espaces</p>
            <h2 className="text-4xl font-heading font-bold text-gray-900">Galerie Photos</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              '/images/chambre1.jpg', '/images/chambre2.jpg', '/images/chambre3.jpg',
              '/images/chambre4.jpeg', '/images/piscine.jpg', '/images/bar.jpeg',
            ].map((src, i) => (
              <div key={i} className="aspect-square rounded-2xl overflow-hidden shadow-md group">
                <img src={src} alt={`Résidence Cheliel ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

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
                  <a href="tel:+2250779277924" className="text-primary-600 hover:text-primary-700 font-medium">+225 07 79 27 79 24</a>
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
                style={{ border: 0, minHeight: '320px' }}
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
              className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-full font-medium text-lg transition-all hover:scale-105 transform shadow-lg"
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
