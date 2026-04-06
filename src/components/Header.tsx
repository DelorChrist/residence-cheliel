import { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface HeaderProps {
  onReserve: () => void;
}

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

export const Header = ({ onReserve }: HeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('accueil');
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

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
    if (location.pathname === '/a-propos') setActiveNav('a-propos');
    else if (location.pathname === '/chambres') setActiveNav('chambres');
    else if (location.pathname === '/') setActiveNav('accueil');
  }, [location.pathname]);

  // Détection automatique au scroll
  useEffect(() => {
    const getActiveSection = () => {
      const pathname = pathnameRef.current;
      const footer = document.getElementById('footer');
      if (footer) {
        const rect = footer.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) { setActiveNav('contact'); return; }
      }
      if (pathname === '/a-propos') { setActiveNav('a-propos'); return; }
      if (pathname === '/chambres') { setActiveNav('chambres'); return; }
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
  }, []);

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
    `font-medium transition-all duration-300 ${
      activeNav === key
        ? 'text-primary-500 border-b-2 border-primary-500 pb-0.5 scale-105'
        : isScrolled
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
    <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-4' : 'bg-transparent py-6'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2" onClick={() => setActiveNav('accueil')}>
          <img src="/images/logo.png" alt="Logo" className="w-10 h-10 rounded-xl object-cover shadow-md" />
          <div className={`font-heading font-bold text-2xl tracking-tight ${isScrolled ? 'text-primary-900' : 'text-white'}`}>Résidence Cheliel</div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#accueil" onClick={handleAccueil} className={desktopClass('accueil')}>Accueil</a>
          <a href="#chambres" onClick={handleChambres} className={desktopClass('chambres')}>Nos Chambres</a>
          <Link to="/a-propos" onClick={() => setActiveNav('a-propos')} className={desktopClass('a-propos')}>À Propos</Link>
          <a href="#footer" onClick={handleContact} className={desktopClass('contact')}>Nous Contacter</a>
          <button
            onClick={onReserve}
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
          <a href="#accueil" onClick={handleAccueil} className={mobileClass('accueil')}>Accueil</a>
          <a href="#chambres" onClick={handleChambres} className={mobileClass('chambres')}>Nos Chambres</a>
          <Link to="/a-propos" onClick={() => { setActiveNav('a-propos'); setMobileMenuOpen(false); }} className={mobileClass('a-propos')}>À Propos</Link>
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
