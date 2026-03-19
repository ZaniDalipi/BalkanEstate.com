import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, X } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

const DISMISS_KEY = 'balkanestate_push_prompt_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface PushNotificationPromptProps {
  /** Delay in ms before showing the prompt (default: 30s) */
  delay?: number;
}

/**
 * Non-intrusive banner prompt that asks the user to enable push notifications.
 * Shows only when:
 * - User is authenticated
 * - Push is supported but not subscribed
 * - Permission is not already denied
 * - User hasn't dismissed the prompt recently
 */
const PushNotificationPrompt: React.FC<PushNotificationPromptProps> = ({ delay = 30000 }) => {
  const { t } = useTranslation(['messages']);
  const { state } = useAppContext();
  const { isAuthenticated } = state;
  const { isSupported, permission, isSubscribed, isLoading, subscribe } = usePushNotifications();

  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  // Check if prompt was recently dismissed
  const isDismissed = useCallback((): boolean => {
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (!dismissed) return false;
      const ts = parseInt(dismissed, 10);
      return Date.now() - ts < DISMISS_DURATION_MS;
    } catch {
      return false;
    }
  }, []);

  // Show prompt after delay if conditions are met
  useEffect(() => {
    if (!isAuthenticated || !isSupported || isSubscribed || isLoading) return;
    if (permission === 'denied' || permission === 'unsupported') return;
    if (isDismissed()) return;

    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isSupported, isSubscribed, isLoading, permission, delay, isDismissed]);

  const handleEnable = async () => {
    setSubscribing(true);
    const success = await subscribe();
    setSubscribing(false);
    if (success) {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // localStorage might be full
    }
  };

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/10 border border-white/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-primary/10 rounded-xl">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('messages:pushPrompt.title', 'Enable Notifications')}
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              {t('messages:pushPrompt.description', 'Get instant updates about messages, viewings, and property alerts.')}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={subscribing}
                className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {subscribing
                  ? t('messages:pushPrompt.enabling', 'Enabling...')
                  : t('messages:pushPrompt.enable', 'Enable')}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-gray-500 text-xs font-medium hover:text-gray-700 transition-colors"
              >
                {t('messages:pushPrompt.later', 'Later')}
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={t('messages:pushPrompt.dismiss', 'Dismiss')}
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationPrompt;
