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
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
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
    <nav className={`fixed w-full z-50 transition-all duration-300 ${opaque ? 'bg-white shadow-md py-3' : 'bg-transparent py-5'}`}>
      <div className="w-full px-6 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setActiveNav('accueil')}>
          <img src="/images/logo.png" alt="Logo" className="w-11 h-11 rounded-xl object-cover shadow-md" />
          <div className={`font-heading font-bold text-2xl tracking-tight ${opaque ? 'text-primary-900' : 'text-white'}`}>Résidence Cheliel</div>
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
            className="ml-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-full font-medium transition-colors shadow-lg shadow-primary-900/20 shrink-0"
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
          <a href="#accueil" onClick={handleAccueil} className={mobileClass('accueil')}>Accueil</a>
          <a href="#chambres" onClick={handleChambres} className={mobileClass('chambres')}>Nos Chambres</a>
          <Link to="/a-propos" onClick={() => { setActiveNav('a-propos'); setMobileMenuOpen(false); }} className={mobileClass('a-propos')}>À Propos</Link>
          <Link to="/mes-reservations" onClick={() => { setActiveNav('mes-reservations'); setMobileMenuOpen(false); }} className={mobileClass('mes-reservations')}>Mes Réservations</Link>
          <a href="#footer" onClick={handleContact} className={mobileClass('contact')}>Nous Contacter</a>
          <button
            onClick={() => { onReserve(); setMobileMenuOpen(false); }}
            className="bg-primary-600 text-white px-6 py-3 rounded-xl font-medium w-full mt-2"
          >
            Réserver
          </button>
        </div>
      )}
    </nav>
  );
};
