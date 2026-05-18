import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, X, AlertCircle } from 'lucide-react';
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
 *
 * Error handling:
 * - Displays errors when subscription fails
 * - Properly handles permission denial
 * - Validates service worker support
 */
const PushNotificationPrompt: React.FC<PushNotificationPromptProps> = ({ delay = 30000 }) => {
  const { t } = useTranslation(['messages']);
  const { state } = useAppContext();
  const { isAuthenticated } = state;
  const { isSupported, permission, isSubscribed, isLoading, error: subscriptionError, subscribe } = usePushNotifications();

  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Check if prompt was recently dismissed - using useMemo to ensure stable reference
  const isDismissed = useMemo(() => {
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (!dismissed) return false;
      const ts = parseInt(dismissed, 10);
      if (isNaN(ts)) {
        localStorage.removeItem(DISMISS_KEY); // Clean up invalid data
        return false;
      }
      return Date.now() - ts < DISMISS_DURATION_MS;
    } catch {
      return false;
    }
  }, []);

  // Show prompt after delay if conditions are met
  useEffect(() => {
    if (!isAuthenticated || !isSupported || isSubscribed || isLoading) {
      return;
    }
    if (permission === 'denied' || permission === 'unsupported') {
      setVisible(false);
      return;
    }
    if (isDismissed) {
      return;
    }

    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isSupported, isSubscribed, isLoading, permission, delay, isDismissed]);

  // Clear local error when subscription error changes
  useEffect(() => {
    if (subscriptionError && visible) {
      setLocalError(subscriptionError);
    }
  }, [subscriptionError, visible]);

  const handleEnable = useCallback(async () => {
    setSubscribing(true);
    setLocalError(null);

    try {
      const success = await subscribe();

      if (success) {
        // Successfully subscribed, close the prompt
        setVisible(false);
        setLocalError(null);
      } else {
        // Subscription failed - show appropriate error
        const errorMessage = subscriptionError
          || t('messages:pushPrompt.error', 'Failed to enable notifications. Please try again.');
        setLocalError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : t('messages:pushPrompt.error', 'Failed to enable notifications. Please try again.');
      setLocalError(errorMessage);
    } finally {
      setSubscribing(false);
    }
  }, [subscribe, subscriptionError, t]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setLocalError(null);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch (err) {
      // localStorage might be full, silently fail
      console.debug('Failed to save notification prompt dismissal:', err);
    }
  }, []);

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
              {localError
                ? t('messages:pushPrompt.error_title', 'Notification Error')
                : t('messages:pushPrompt.title', 'Enable Notifications')
              }
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              {localError
                ? localError
                : t('messages:pushPrompt.description', 'Get instant updates about messages, viewings, and property alerts.')
              }
            </p>
            {localError && (
              <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                {localError.toLowerCase().includes('maximum') || localError.toLowerCase().includes('device')
                  ? t('messages:pushPrompt.error_hint_devices', 'Please try again or remove an older device from settings.')
                  : localError.toLowerCase().includes('permission') || localError.toLowerCase().includes('blocked') || localError.toLowerCase().includes('denied')
                    ? t('messages:pushPrompt.error_hint_browser', 'Please check your browser settings and try again.')
                    : t('messages:pushPrompt.error_hint_generic', 'Please try again.')}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              {(!localError || localError.toLowerCase().includes('maximum') || localError.toLowerCase().includes('device')) && (
                <button
                  onClick={handleEnable}
                  disabled={subscribing || isLoading}
                  className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                  aria-busy={subscribing}
                >
                  {subscribing
                    ? t('messages:pushPrompt.enabling', 'Enabling...')
                    : t('messages:pushPrompt.enable', 'Enable')
                  }
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-gray-500 text-xs font-medium hover:text-gray-700 transition-colors"
                type="button"
              >
                {localError
                  ? t('messages:pushPrompt.close', 'Close')
                  : t('messages:pushPrompt.later', 'Later')
                }
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={t('messages:pushPrompt.dismiss', 'Dismiss')}
            type="button"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationPrompt;
