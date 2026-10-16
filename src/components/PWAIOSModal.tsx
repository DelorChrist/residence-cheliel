import { X, Share, PlusSquare, ArrowUpRight } from 'lucide-react';

interface PWAIOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAIOSModal = ({ isOpen, onClose }: PWAIOSModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-primary-100 flex flex-col gap-5 text-gray-800 animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.png"
              alt="Résidence Cheliel"
              className="w-12 h-12 rounded-2xl object-cover shadow-md border border-primary-200"
            />
            <div>
              <h3 className="font-heading font-bold text-lg text-primary-950">Installer sur iPhone / iPad</h3>
              <p className="text-xs text-primary-600">Application Résidence Cheliel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Instructions */}
        <div className="space-y-4 text-sm text-gray-600">
          <div className="flex items-start gap-3 p-3.5 bg-primary-50/60 rounded-2xl border border-primary-100">
            <div className="p-2 bg-primary-600 text-white rounded-xl shrink-0 mt-0.5">
              <Share size={18} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">1. Appuyez sur le bouton « Partager »</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Dans la barre inférieure de votre navigateur Safari (icône carrée avec une flèche vers le haut).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-primary-50/60 rounded-2xl border border-primary-100">
            <div className="p-2 bg-primary-600 text-white rounded-xl shrink-0 mt-0.5">
              <PlusSquare size={18} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">2. Choisissez « Sur l'écran d'accueil »</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Faites défiler la liste vers le bas jusqu'à trouver l'option d'ajout à l'écran d'accueil.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-primary-50/60 rounded-2xl border border-primary-100">
            <div className="p-2 bg-primary-600 text-white rounded-xl shrink-0 mt-0.5">
              <ArrowUpRight size={18} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">3. Confirmez en appuyant sur « Ajouter »</p>
              <p className="text-xs text-gray-500 mt-0.5">
                L'icône apparaîtra directement sur votre écran d'accueil comme une application native.
              </p>
            </div>
          </div>
        </div>

        {/* Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-2xl transition-colors shadow-sm"
        >
          J'ai compris
        </button>
      </div>
    </div>
  );
};
