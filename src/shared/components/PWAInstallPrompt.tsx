import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download, Smartphone, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function PWAInstallPrompt() {
  const { t } = useTranslation(['common']);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const isDismissed = localStorage.getItem('pwa-install-dismissed');
    if (isDismissed) {
      const dismissedTime = parseInt(isDismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    // Check if running as standalone PWA
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) {
      return; // Don't show install prompt if already installed
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    // Track session start time so the delay is based on actual time on site
    const SESSION_KEY = 'pwa-session-start';
    const DELAY_MS = 150000; // 2.5 minutes

    if (!sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, Date.now().toString());
    }
    const sessionStart = parseInt(sessionStorage.getItem(SESSION_KEY)!, 10);
    const elapsed = Date.now() - sessionStart;
    const remaining = Math.max(0, DELAY_MS - elapsed);

    // For iOS, show custom prompt after delay
    if (isIOSDevice) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, remaining);
      return () => clearTimeout(timer);
    }

    // For other browsers, listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt only after 2.5 minutes of usage
      const now = Date.now();
      const elapsedNow = now - sessionStart;
      const remainingNow = Math.max(0, DELAY_MS - elapsedNow);
      setTimeout(() => {
        setShowPrompt(true);
      }, remainingNow);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    } catch (error) {
      // Error removed
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }, []);

  // Don't render if standalone, dismissed, or no prompt available
  if (isStandalone || dismissed || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm animate-in slide-in-from-bottom-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark p-4 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {t('pwa.installTitle', 'Install BalkanEstate')}
                </h3>
                <p className="text-white/80 text-sm">
                  {t('pwa.installSubtitle', 'Get the app experience')}
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              aria-label={t('common.close', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <ul className="space-y-2 text-sm text-neutral-600 mb-4">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              {t('pwa.benefit1', 'Works offline - browse anytime')}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              {t('pwa.benefit2', 'Faster loading - instant access')}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              {t('pwa.benefit3', 'Home screen icon - quick launch')}
            </li>
          </ul>

          {isIOS ? (
            // iOS installation instructions
            <div className="bg-neutral-50 rounded-xl p-3 text-sm">
              <p className="text-neutral-700 mb-2 font-medium">
                {t('pwa.iosTitle', 'To install on iOS:')}
              </p>
              <ol className="space-y-1.5 text-neutral-600">
                <li className="flex items-center gap-2">
                  <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                  <span className="flex items-center gap-1">
                    {t('pwa.iosStep1', 'Tap the Share button')}
                    <Share className="w-4 h-4 text-primary" />
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                  {t('pwa.iosStep2', 'Scroll down and tap "Add to Home Screen"')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                  {t('pwa.iosStep3', 'Tap "Add" to confirm')}
                </li>
              </ol>
            </div>
          ) : (
            // Standard install button
            <button
              onClick={handleInstall}
              className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              {t('pwa.installButton', 'Install App')}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <button
            onClick={handleDismiss}
            className="w-full text-neutral-500 hover:text-neutral-700 text-sm py-2 transition-colors"
          >
            {t('pwa.notNow', 'Not now')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PWAInstallPrompt;
