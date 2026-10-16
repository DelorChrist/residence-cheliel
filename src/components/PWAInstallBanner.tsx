import { Download, X, Sparkles } from 'lucide-react';

interface PWAInstallBannerProps {
  show: boolean;
  onInstall: () => void;
  onDismiss: () => void;
  isIOS?: boolean;
}

export const PWAInstallBanner = ({ show, onInstall, onDismiss, isIOS }: PWAInstallBannerProps) => {
  if (!show) return null;

  return (
    <aside 
      aria-label="Installation de l'application"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-40 bg-white/95 backdrop-blur-md border border-primary-200/80 rounded-2xl p-4 shadow-[0_12px_36px_rgba(0,0,0,0.16)] transition-all duration-300 animate-slideUp"
    >
      <div className="flex items-start gap-3.5">
        <div className="relative shrink-0">
          <img
            src="/pwa-192x192.png"
            alt="Résidence Cheliel"
            className="w-13 h-13 rounded-2xl object-cover shadow-md border border-primary-100"
          />
          <div className="absolute -top-1 -right-1 bg-primary-600 text-white p-0.5 rounded-full shadow-xs">
            <Sparkles size={11} />
          </div>
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2">
            <h4 className="font-heading font-bold text-gray-900 text-base leading-tight">
              Application Cheliel
            </h4>
            <span className="bg-primary-100 text-primary-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              Officielle
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
            Installez l'application pour un accès rapide, vos réservations et une navigation fluide même hors-ligne.
          </p>

          <div className="flex items-center gap-2.5 mt-3">
            <button
              onClick={onInstall}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs"
            >
              <Download size={14} />
              {isIOS ? 'Comment installer' : 'Installer'}
            </button>
            <button
              onClick={onDismiss}
              className="text-xs text-gray-500 hover:text-gray-800 px-2 py-2 rounded-lg transition-colors"
            >
              Plus tard
            </button>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
          aria-label="Fermer la bannière"
        >
          <X size={16} />
        </button>
      </div>
    </aside>
  );
};
