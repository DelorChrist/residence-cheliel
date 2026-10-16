import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

interface PWAOfflineNoticeProps {
  isOnline: boolean;
}

export const PWAOfflineNotice = ({ isOnline }: PWAOfflineNoticeProps) => {
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnected(false);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!isOnline) {
    return (
      <div 
        role="status"
        aria-live="polite"
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-900/90 text-amber-50 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-amber-700/50 flex items-center gap-2 text-xs md:text-sm font-medium animate-fadeIn"
      >
        <WifiOff size={16} className="text-amber-300 animate-pulse" />
        <span>Mode hors-ligne : consultation des contenus en cache</span>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div 
        role="status"
        aria-live="polite"
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-800/90 text-emerald-50 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-emerald-600/50 flex items-center gap-2 text-xs md:text-sm font-medium animate-fadeIn"
      >
        <Wifi size={16} className="text-emerald-300" />
        <span>Connexion Internet rétablie</span>
      </div>
    );
  }

  return null;
};
