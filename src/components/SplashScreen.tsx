import { useEffect, useState } from 'react';

export const SplashScreen = ({ onDone }: { onDone: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);
  const dotClass = 'w-2 h-2 rounded-full bg-primary-400 animate-bounce';

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1800);
    const done = setTimeout(() => {
      sessionStorage.setItem('splashShown', '1');
      onDone();
    }, 2400);
    return () => { clearTimeout(timer); clearTimeout(done); };
  }, [onDone]);

  return (
    <div className={`fixed inset-0 z-[200] bg-primary-900 flex flex-col items-center justify-center transition-opacity duration-600 ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl p-1.5 border border-white/10">
          <img src="/images/logo.png" alt="Logo Résidence Cheliel" className="w-full h-full object-contain" />
        </div>
        <div className="text-center">
          <p className="text-white font-heading font-bold text-3xl tracking-tight">Résidence Cheliel</p>
          <p className="text-primary-300 text-sm mt-2 tracking-widest uppercase">Yamoussoukro · Morofé</p>
        </div>
      </div>
      <div className="absolute bottom-12 flex gap-2">
        <span className={`${dotClass} [animation-delay:0ms]`} />
        <span className={`${dotClass} [animation-delay:150ms]`} />
        <span className={`${dotClass} [animation-delay:300ms]`} />
      </div>
    </div>
  );
};
