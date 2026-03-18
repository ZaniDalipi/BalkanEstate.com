import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, AlertTriangle } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

/**
 * Toggle component for push notification settings.
 * Shows the current push subscription state and allows enabling/disabling.
 */
const PushNotificationToggle: React.FC = () => {
  const { t } = useTranslation(['account']);
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe, error } =
    usePushNotifications();

  if (!isSupported) return null;

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        {isSubscribed ? (
          <Bell className="w-5 h-5 text-primary" />
        ) : (
          <BellOff className="w-5 h-5 text-gray-400" />
        )}
        <div>
          <p className="text-sm font-medium text-gray-900">
            {t('account:notifications.push', 'Push Notifications')}
          </p>
          <p className="text-xs text-gray-500">
            {permission === 'denied'
              ? t('account:notifications.pushDenied', 'Blocked in browser settings')
              : isSubscribed
                ? t('account:notifications.pushEnabled', 'Receiving push notifications')
                : t('account:notifications.pushDisabled', 'Enable to receive instant alerts')}
          </p>
          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleToggle}
        disabled={isLoading || permission === 'denied'}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed ${
          isSubscribed ? 'bg-primary' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={isSubscribed}
        aria-label={t('account:notifications.push', 'Push Notifications')}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
            isSubscribed ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

export default PushNotificationToggle;
