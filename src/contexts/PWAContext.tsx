import React, { createContext, useContext } from 'react';
import { usePWA } from '../hooks/usePWA';
import { PWAInstallBanner } from '../components/PWAInstallBanner';
import { PWAIOSModal } from '../components/PWAIOSModal';
import { PWAOfflineNotice } from '../components/PWAOfflineNotice';

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isOnline: boolean;
  openInstallDialog: () => void;
  dismissPrompt: () => void;
}

const PWAContext = createContext<PWAContextType | null>(null);

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pwa = usePWA();

  return (
    <PWAContext.Provider
      value={{
        isInstallable: pwa.isInstallable,
        isInstalled: pwa.isInstalled,
        isIOS: pwa.isIOS,
        isOnline: pwa.isOnline,
        openInstallDialog: pwa.openInstallDialog,
        dismissPrompt: pwa.dismissPrompt,
      }}
    >
      {children}

      {/* Global PWA UI Layers */}
      <PWAOfflineNotice isOnline={pwa.isOnline} />
      
      {!pwa.isInstalled && (
        <>
          <PWAInstallBanner
            show={pwa.showInstallPrompt}
            onInstall={pwa.openInstallDialog}
            onDismiss={pwa.dismissPrompt}
            isIOS={pwa.isIOS}
          />
          <PWAIOSModal
            isOpen={pwa.showIOSModal}
            onClose={() => pwa.setShowIOSModal(false)}
          />
        </>
      )}
    </PWAContext.Provider>
  );
};

export const usePWAContext = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWAContext must be used within a PWAProvider');
  }
  return context;
};
