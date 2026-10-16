import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    setIsInstalled(isStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt event (Android / Chromium / Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);

      // Check if user dismissed prompt recently
      const dismissedAt = localStorage.getItem('pwa_prompt_dismissed_at');
      const now = Date.now();
      const threeDays = 3 * 24 * 60 * 60 * 1000;

      if (!isStandalone && (!dismissedAt || now - parseInt(dismissedAt, 10) > threeDays)) {
        // Small delay so user isn't overwhelmed immediately upon landing
        setTimeout(() => setShowInstallPrompt(true), 3000);
      }
    };

    // App installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
      setShowIOSModal(false);
      localStorage.removeItem('pwa_prompt_dismissed_at');
    };

    // Network status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // If iOS and not installed and prompt not dismissed recently, show iOS hint after delay
    if (isIOSDevice && !isStandalone) {
      const dismissedAt = localStorage.getItem('pwa_prompt_dismissed_at');
      const now = Date.now();
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if (!dismissedAt || now - parseInt(dismissedAt, 10) > threeDays) {
        setTimeout(() => setShowInstallPrompt(true), 4000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setShowInstallPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  }, [deferredPrompt, isIOS]);

  const dismissPrompt = useCallback(() => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed_at', Date.now().toString());
  }, []);

  const openInstallDialog = useCallback(() => {
    if (deferredPrompt) {
      triggerInstall();
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      setShowInstallPrompt(true);
    }
  }, [deferredPrompt, isIOS, triggerInstall]);

  return {
    isInstallable: isInstallable || (isIOS && !isInstalled),
    isInstalled,
    isIOS,
    isOnline,
    showInstallPrompt,
    showIOSModal,
    setShowIOSModal,
    triggerInstall,
    dismissPrompt,
    openInstallDialog,
  };
}
