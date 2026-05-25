import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, Mail, MessageSquare, TrendingDown, Home, BarChart2, Megaphone, CheckCircle, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { apiRequest } from '@/src/shared/api';

interface EmailPreferences {
  weeklyStats: boolean;
  propertyAlerts: boolean;
  priceDrops: boolean;
  messages: boolean;
  marketing: boolean;
  transactional: boolean;
}

interface EmailPrefRow {
  key: keyof Omit<EmailPreferences, 'transactional'>;
  icon: React.ReactNode;
  label: string;
  description: string;
  alwaysOn?: false;
}

// ─── Reusable toggle row ───────────────────────────────────────────────────────

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  loading?: boolean;
  badge?: 'always-on' | 'blocked';
  onChange?: (checked: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ icon, label, description, checked, disabled, loading, badge, onChange }) => (
  <div className="flex items-center justify-between gap-4 py-3.5 px-4 rounded-2xl hover:bg-white/20 transition-colors group">
    <div className="flex items-center gap-3 min-w-0">
      <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${checked ? 'bg-primary/10 text-primary' : 'bg-neutral-100/60 text-neutral-400'}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-neutral-800">{label}</p>
          {badge === 'always-on' && (
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Always on</span>
          )}
          {badge === 'blocked' && (
            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">Blocked</span>
          )}
        </div>
        <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>

    {loading ? (
      <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
    ) : (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40 disabled:cursor-not-allowed ${
          checked ? 'bg-primary' : 'bg-neutral-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    )}
  </div>
);

// ─── Push notification card ────────────────────────────────────────────────────

const isDev = import.meta.env.DEV;
const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;

const PushSection: React.FC = () => {
  const { t } = useTranslation(['account']);
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe, error } = usePushNotifications();
  const [testSent, setTestSent] = useState(false);

  const handleToggle = async () => {
    if (isSubscribed) await unsubscribe();
    else await subscribe();
  };

  const sendTestNotification = async () => {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      new Notification('BalkanEstate — Test Notification', {
        body: 'Browser notifications are working correctly in development.',
        icon: '/icons/icon-192x192.png',
        tag: 'dev-test',
      });
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }
  };

  const statusBanner = () => {
    if (!isSupported && permission === 'unsupported') {
      if (isDev && !isSecureContext) {
        return (
          <div className="mt-3 space-y-2">
            <div className="flex items-start gap-2 rounded-xl bg-amber-50/60 border border-amber-200/50 px-3 py-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Development mode:</strong> Web Push requires HTTPS or{' '}
                <code className="font-mono bg-amber-100/60 px-1 rounded">localhost</code>. Access the app via{' '}
                <code className="font-mono bg-amber-100/60 px-1 rounded">http://localhost:PORT</code> instead of an IP address to enable full push subscription testing.
              </span>
            </div>
            <button
              type="button"
              onClick={sendTestNotification}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
              {testSent ? 'Notification sent!' : 'Send test browser notification'}
            </button>
          </div>
        );
      }
      return (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50/60 border border-amber-200/50 px-3 py-2.5 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{t('account:notifications.pushUnsupported', 'Push notifications require HTTPS and a modern browser. They are not available in this environment.')}</span>
        </div>
      );
    }
    if (permission === 'denied') {
      return (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50/60 border border-red-200/50 px-3 py-2.5 text-xs text-red-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{t('account:notifications.pushBlockedHelp', 'Notifications are blocked. Open your browser site settings and allow notifications for this site, then reload.')}</span>
        </div>
      );
    }
    if (isSubscribed) {
      return (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-50/60 border border-green-200/50 px-3 py-2.5 text-xs text-green-800">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{t('account:notifications.pushActive', 'Push notifications are active on this device. You will receive instant alerts even when the app is closed.')}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Bell className="w-4 h-4 text-primary" />
        <h4 className="font-semibold text-neutral-800 text-sm">{t('account:notifications.pushTitle', 'Push Notifications')}</h4>
      </div>
      <p className="text-xs text-neutral-500 mb-4 ml-6">
        {t('account:notifications.pushSubtitle', 'Receive instant alerts on this device — even when the app is in the background.')}
      </p>

      <ToggleRow
        icon={isSubscribed ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        label={t('account:notifications.push', 'Push Notifications')}
        description={
          permission === 'denied'
            ? t('account:notifications.pushDenied', 'Blocked in browser settings')
            : isSubscribed
              ? t('account:notifications.pushEnabled', 'Receiving push notifications on this device')
              : t('account:notifications.pushDisabled', 'Enable to get instant alerts on this device')
        }
        checked={isSubscribed}
        disabled={!isSupported || permission === 'denied'}
        loading={isLoading}
        badge={permission === 'denied' ? 'blocked' : undefined}
        onChange={handleToggle}
      />

      {error && (
        <p className="mt-2 ml-4 text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {error}
        </p>
      )}

      {statusBanner()}
    </div>
  );
};

// ─── Email preferences card ────────────────────────────────────────────────────

const EMAIL_ROWS: EmailPrefRow[] = [
  {
    key: 'messages',
    icon: <MessageSquare className="w-4 h-4" />,
    label: 'New Messages',
    description: 'Email alert when someone sends you a message',
  },
  {
    key: 'propertyAlerts',
    icon: <Home className="w-4 h-4" />,
    label: 'Property Alerts',
    description: 'New listings matching your saved searches',
  },
  {
    key: 'priceDrops',
    icon: <TrendingDown className="w-4 h-4" />,
    label: 'Price Drops',
    description: 'When a saved or watched property drops in price',
  },
  {
    key: 'weeklyStats',
    icon: <BarChart2 className="w-4 h-4" />,
    label: 'Weekly Stats',
    description: 'Performance summary for your listings every week',
  },
  {
    key: 'marketing',
    icon: <Megaphone className="w-4 h-4" />,
    label: 'Marketing & Promotions',
    description: 'Special offers, platform news and promotions',
  },
];

const OPTIONAL_KEYS: Array<keyof Omit<EmailPreferences, 'transactional'>> = [
  'messages', 'propertyAlerts', 'priceDrops', 'weeklyStats', 'marketing',
];

const EmailSection: React.FC = () => {
  const { t } = useTranslation(['account']);
  const [prefs, setPrefs] = useState<EmailPreferences | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ emailPreferences: EmailPreferences }>('/auth/email-preferences', { requiresAuth: true })
      .then(data => { if (!cancelled) setPrefs(data.emailPreferences); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, []);

  const savePrefs = useCallback(async (updated: EmailPreferences, savedKey: string) => {
    try {
      await apiRequest('/auth/email-preferences', {
        method: 'PUT',
        body: updated,
        requiresAuth: true,
      });
      setSaved(savedKey);
      setTimeout(() => setSaved(prev => prev === savedKey ? null : prev), 2000);
    } catch {
      setPrefs(prefs => prefs); // revert handled by caller
    }
  }, []);

  const handleToggle = useCallback(async (key: keyof EmailPreferences, value: boolean) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSavingKey(key);
    try {
      await savePrefs(updated, key);
    } catch {
      setPrefs(prefs);
    } finally {
      setSavingKey(null);
    }
  }, [prefs, savePrefs]);

  const handleToggleAll = useCallback(async (enable: boolean) => {
    if (!prefs) return;
    const updated = { ...prefs };
    OPTIONAL_KEYS.forEach(k => { updated[k] = enable; });
    setPrefs(updated);
    setSavingAll(true);
    try {
      await savePrefs(updated, 'all');
    } catch {
      setPrefs(prefs);
    } finally {
      setSavingAll(false);
    }
  }, [prefs, savePrefs]);

  const allOff = prefs ? OPTIONAL_KEYS.every(k => !prefs[k]) : false;
  const allOn = prefs ? OPTIONAL_KEYS.every(k => prefs[k]) : false;

  return (
    <div className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-neutral-800 text-sm">{t('account:notifications.emailTitle', 'Email Notifications')}</h4>
        </div>
        {prefs && (
          <button
            type="button"
            onClick={() => handleToggleAll(allOff)}
            disabled={savingAll}
            className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-colors disabled:opacity-50 ${
              allOff
                ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                : 'border-red-200 bg-red-50/60 text-red-600 hover:bg-red-100/60'
            }`}
          >
            {savingAll ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : allOff ? (
              <Bell className="w-3 h-3" />
            ) : (
              <BellOff className="w-3 h-3" />
            )}
            {allOff
              ? t('account:notifications.enableAll', 'Enable all')
              : t('account:notifications.unsubscribeAll', 'Turn off all')}
          </button>
        )}
      </div>
      <p className="text-xs text-neutral-500 mb-4 ml-6">
        {t('account:notifications.emailSubtitle', 'Control which emails we send to your inbox.')}
      </p>

      {allOff && prefs && (
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50/60 border border-amber-200/50 px-3 py-2.5 text-xs text-amber-800">
          <BellOff className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{t('account:notifications.allOffNotice', 'You\'ve turned off all optional emails. You\'ll still receive transaction and security emails.')}</span>
        </div>
      )}

      {loadError ? (
        <p className="text-sm text-neutral-500 px-4">{t('account:notifications.emailLoadError', 'Could not load preferences.')}</p>
      ) : !prefs ? (
        <div className="space-y-3 px-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-neutral-200/60 rounded-xl" />
                <div className="space-y-1.5">
                  <div className="h-3 w-32 bg-neutral-200/60 rounded" />
                  <div className="h-2.5 w-48 bg-neutral-100/60 rounded" />
                </div>
              </div>
              <div className="w-11 h-6 bg-neutral-200/60 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-white/30">
          {EMAIL_ROWS.map(row => (
            <ToggleRow
              key={row.key}
              icon={row.icon}
              label={t(`account:notifications.email_${row.key}`, row.label)}
              description={t(`account:notifications.email_${row.key}_desc`, row.description)}
              checked={prefs[row.key]}
              loading={savingKey === row.key}
              onChange={val => handleToggle(row.key, val)}
            />
          ))}

          {/* Transactional — always on */}
          <ToggleRow
            icon={<ShieldCheck className="w-4 h-4" />}
            label={t('account:notifications.email_transactional', 'Transaction & Security Emails')}
            description={t('account:notifications.email_transactional_desc', 'Payment receipts, email verification, and security alerts')}
            checked={true}
            disabled={true}
            badge="always-on"
          />
        </div>
      )}

      {saved && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-50/60 border border-green-200/50 px-3 py-2 text-xs text-green-800">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {saved === 'all'
            ? (allOff
                ? t('account:notifications.allDisabled', 'All emails turned off')
                : t('account:notifications.allEnabled', 'All emails turned on'))
            : t('account:notifications.saved', 'Preferences saved')}
        </div>
      )}
    </div>
  );
};

// ─── Unsubscribe confirmation banner (shown after clicking email unsubscribe link) ─

const UnsubscribeBanner: React.FC = () => {
  const [type, setType] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const val = params.get('unsubscribed');
    if (val) {
      setType(val);
      // Clean the query param from the URL without a page reload
      const clean = window.location.pathname;
      window.history.replaceState(null, '', clean);
    }
  }, []);

  if (!type) return null;

  const label = type === 'all' ? 'all promotional emails' : `${type} emails`;

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-green-50/80 border border-green-200/60 px-4 py-3.5 text-sm text-green-800">
      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
      <div>
        <p className="font-semibold">You've been unsubscribed</p>
        <p className="text-xs text-green-700 mt-0.5">
          You'll no longer receive <strong>{label}</strong>. Use the toggles below to adjust anytime.
        </p>
      </div>
    </div>
  );
};

// ─── Main export ───────────────────────────────────────────────────────────────

const NotificationSettingsSection: React.FC = () => {
  const { t } = useTranslation(['account']);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-neutral-800">{t('account:notifications.title', 'Notification Settings')}</h2>
        <p className="text-sm text-neutral-500 mt-0.5">{t('account:notifications.subtitle', 'Choose how and when we reach out to you.')}</p>
      </div>

      <UnsubscribeBanner />
      <PushSection />
      <EmailSection />
    </div>
  );
};

export default NotificationSettingsSection;
