import { useState, useEffect, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';

export const ScrollToTop = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const isNearBottom = scrollTop > 300 && (scrollTop + windowHeight) >= (documentHeight - 450);
      setShow(isNearBottom);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

  return (
    <button
      onClick={scrollToTop}
      aria-label="Remonter en haut"
      className={`fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg flex items-center justify-center transition-all duration-300 ${
        show ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
      }`}
    >
      <ArrowUp size={20} />
    </button>
  );
};
