import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface HeaderProps {
  onReserve: () => void;
}

const OPAQUE_ROUTES = ['/chambres/'];

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

const getNavFromPathname = (pathname: string) => {
  if (pathname === '/a-propos') return 'a-propos';
  if (pathname === '/chambres') return 'chambres';
  if (pathname === '/mes-reservations') return 'mes-reservations';
  if (pathname.startsWith('/chambres/')) return 'chambres';
  return 'accueil';
};

export const Header = ({ onReserve }: HeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('accueil');
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const forceOpaque = OPAQUE_ROUTES.some(r => location.pathname.startsWith(r));
  const opaque = forceOpaque || isScrolled;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 25);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Remettre isScrolled à false et scroller en haut à chaque changement de page
  useEffect(() => {
    window.scrollTo(0, 0);
    setIsScrolled(false);
  }, [location.pathname]);

  // Sync activeNav avec la route courante
  useEffect(() => {
    setActiveNav(getNavFromPathname(location.pathname));
  }, [location.pathname]);

  // Détection automatique au scroll
  useEffect(() => {
    const getActiveSection = () => {
      const pathname = location.pathname;

      // Priorité 1 : footer visible (toutes pages)
      const footer = document.getElementById('footer');
      if (footer) {
        const rect = footer.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) { setActiveNav('contact'); return; }
      }

      // Priorité 2 : pages fixes
      if (pathname !== '/') { setActiveNav(getNavFromPathname(pathname)); return; }

      // Priorité 3 : page d'accueil - section au centre
      const mid = window.innerHeight / 2;
      const chambres = document.getElementById('chambres');
      if (chambres) {
        const rect = chambres.getBoundingClientRect();
        if (rect.top <= mid && rect.bottom >= mid) { setActiveNav('chambres'); return; }
      }
      setActiveNav('accueil');
    };
    window.addEventListener('scroll', getActiveSection, { passive: true });
    getActiveSection();
    return () => window.removeEventListener('scroll', getActiveSection);
  }, [location.pathname]);

  const handleAccueil = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveNav('accueil');
    setMobileMenuOpen(false);
    if (isHome) { scrollTo('accueil'); } else { navigate('/'); }
  };

  const handleChambres = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveNav('chambres');
    setMobileMenuOpen(false);
    if (isHome) { scrollTo('chambres'); } else { navigate('/#chambres'); }
  };

  const handleContact = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveNav('contact');
    setMobileMenuOpen(false);
    scrollTo('footer');
  };

  const desktopClass = (key: string) =>
    `text-[15px] font-medium transition-all duration-300 ${
      activeNav === key
        ? 'text-primary-500 border-b-2 border-primary-500 pb-0.5 scale-105'
        : opaque
        ? 'text-gray-600 hover:text-primary-500'
        : 'text-white/90 hover:text-white'
    }`;

  const mobileClass = (key: string) =>
    `font-medium py-2 transition-all duration-300 ${
      activeNav === key
        ? 'text-primary-600 border-l-2 border-primary-500 pl-3'
        : 'text-gray-600'
    }`;

  return (
    <header
      className={`fixed z-50 transition-all duration-300 ease-in-out ${
        isScrolled
          ? 'top-2.5 inset-x-3.5 md:top-0 md:inset-x-0'
          : 'top-0 inset-x-0'
      }`}
    >
      <nav
        className={`w-full transition-all duration-300 ease-in-out ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-[0_8px_25px_-6px_rgba(0,0,0,0.12)] border border-black/5 rounded-2xl md:rounded-none md:border-none md:shadow-md md:bg-white py-2 px-3.5 md:py-3 md:px-6'
            : opaque
            ? 'bg-white shadow-md py-3.5 px-5 md:py-3 md:px-6 rounded-none'
            : 'bg-transparent py-4 px-5 md:py-5 md:px-6 rounded-none'
        }`}
      >
        <div className="w-full flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setActiveNav('accueil')}>
            <img
              src="/images/logo.png"
              alt="Logo"
              className={`object-cover border border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all duration-300 ${
                isScrolled
                  ? 'w-8 h-8 rounded-lg md:w-11 md:h-11 md:rounded-xl'
                  : 'w-10 h-10 md:w-11 md:h-11 rounded-xl'
              }`}
            />
            <div
              className={`font-heading font-bold tracking-tight transition-all duration-300 ${
                isScrolled
                  ? 'text-lg md:text-2xl text-primary-900'
                  : opaque
                  ? 'text-xl md:text-2xl text-primary-900'
                  : 'text-xl md:text-2xl text-white'
              }`}
            >
              Résidence Cheliel
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-5 ml-auto">
            <a href="#accueil" onClick={handleAccueil} className={desktopClass('accueil')}>Accueil</a>
            <a href="#chambres" onClick={handleChambres} className={desktopClass('chambres')}>Nos Chambres</a>
            <Link to="/a-propos" onClick={() => setActiveNav('a-propos')} className={desktopClass('a-propos')}>À Propos</Link>
            <Link to="/mes-reservations" onClick={() => setActiveNav('mes-reservations')} className={desktopClass('mes-reservations')}>Mes Réservations</Link>
            <a href="#footer" onClick={handleContact} className={desktopClass('contact')}>Nous Contacter</a>
            <button
              onClick={onReserve}
              className="ml-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-full font-medium transition-colors shadow-sm shrink-0"
            >
              Réserver
            </button>
          </div>

          {/* Mobile Toggle */}
          <button
            className={`md:hidden transition-all duration-300 flex items-center justify-center ${
              isScrolled
                ? 'p-1.5 rounded-lg text-primary-900 hover:bg-black/5'
                : opaque
                ? 'p-2 rounded-lg text-primary-900 bg-white/80'
                : 'p-2 rounded-lg text-white bg-black/20 backdrop-blur-sm'
            }`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu principal"
          >
            {mobileMenuOpen ? <X size={isScrolled ? 20 : 24} /> : <Menu size={isScrolled ? 20 : 24} />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div
            className={`md:hidden absolute w-full transition-all duration-300 flex flex-col ${
              isScrolled
                ? 'top-[calc(100%+8px)] left-0 bg-white/98 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100/90 py-4 px-5 gap-3'
                : 'top-full left-0 bg-white shadow-lg border-t border-gray-100 py-4 px-6 gap-4'
            }`}
          >
            <a href="#accueil" onClick={handleAccueil} className={mobileClass('accueil')}>Accueil</a>
            <a href="#chambres" onClick={handleChambres} className={mobileClass('chambres')}>Nos Chambres</a>
            <Link to="/a-propos" onClick={() => { setActiveNav('a-propos'); setMobileMenuOpen(false); }} className={mobileClass('a-propos')}>À Propos</Link>
            <Link to="/mes-reservations" onClick={() => { setActiveNav('mes-reservations'); setMobileMenuOpen(false); }} className={mobileClass('mes-reservations')}>Mes Réservations</Link>
            <a href="#footer" onClick={handleContact} className={mobileClass('contact')}>Nous Contacter</a>
            <button
              onClick={() => { onReserve(); setMobileMenuOpen(false); }}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-medium w-full mt-2 transition-colors shadow-sm"
            >
              Réserver
            </button>
          </div>
        )}
      </nav>
    </header>
  );
};
