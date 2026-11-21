import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RecordPaymentForm from './RecordPaymentForm';
import FreeGrantForm from './FreeGrantForm';
import { describeOrderError } from './paymentOrderAdminText';
import { useDeactivatePlan } from '../../hooks/usePaymentOrdersAdmin';
import { formatOrderDate } from '@/src/features/payments/utils/orderFormat';

interface UserSubscriptionPanelProps {
  user: {
    _id: string;
    isSubscribed?: boolean;
    subscriptionPlan?: string;
    subscriptionProductName?: string;
    subscriptionExpiresAt?: string | Date;
  };
}

type Mode = 'none' | 'payment' | 'grant' | 'deactivate';

/**
 * A user's plan in the user manager. Plans are given only by recording a
 * payment or a free grant with a reason, so every period has a payment record;
 * they are no longer typed in or edited in place.
 */
const UserSubscriptionPanel: React.FC<UserSubscriptionPanelProps> = ({ user }) => {
  const { t, i18n } = useTranslation('admin');
  const deactivate = useDeactivatePlan();
  const [mode, setMode] = useState<Mode>('none');
  const [active, setActive] = useState(Boolean(user.isSubscribed));
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const done = (expiresAt?: string) => {
    setActive(true);
    setMode('none');
    setMessage({ type: 'ok', text: t('paymentOrders.planActiveUntil', 'Plan active until {{date}}.', { date: formatOrderDate(expiresAt, i18n.language) }) });
  };
  const turnOff = () =>
    deactivate.mutate(user._id, {
      onSuccess: () => { setActive(false); setMode('none'); setMessage({ type: 'ok', text: t('paymentOrders.deactivated', 'Plan turned off.') }); },
      onError: (err) => setMessage({ type: 'error', text: describeOrderError(err, t).text }),
    });
  const toggle = (next: Mode) => { setMessage(null); setMode(mode === next ? 'none' : next); };
  const button = (next: Mode, label: string) => (
    <button type="button" aria-expanded={mode === next} onClick={() => toggle(next)}
      className={`min-h-[44px] flex-1 rounded-lg px-3 text-sm font-medium ${mode === next ? 'bg-gray-800 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
      {label}
    </button>
  );

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">{t('paymentOrders.planSection', 'Plan')}</h4>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {active ? t('paymentOrders.active', 'Active') : t('paymentOrders.inactive', 'Inactive')}
        </span>
      </div>
      {active && user.subscriptionPlan && (
        <p className="text-sm text-gray-600">
          {user.subscriptionProductName || user.subscriptionPlan}
          {user.subscriptionExpiresAt && <> · {t('paymentOrders.until', 'until {{date}}', { date: formatOrderDate(String(user.subscriptionExpiresAt), i18n.language) })}</>}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {button('payment', t('paymentOrders.recordPayment', 'Record payment'))}
        {button('grant', t('paymentOrders.freeGrant', 'Free grant'))}
        {active && button('deactivate', t('paymentOrders.deactivate', 'Deactivate'))}
      </div>

      {mode === 'payment' && <RecordPaymentForm userId={user._id} onDone={done} />}
      {mode === 'grant' && <FreeGrantForm userId={user._id} onDone={done} />}
      {mode === 'deactivate' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p>{t('paymentOrders.deactivateConfirm', 'Turn this plan off now? The user goes back to the free plan.')}</p>
          <button type="button" onClick={turnOff} disabled={deactivate.isPending}
            className="mt-2 min-h-[44px] rounded-lg bg-red-600 px-4 font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            {t('paymentOrders.deactivateNow', 'Turn the plan off')}
          </button>
        </div>
      )}
      {message && (
        <p role={message.type === 'error' ? 'alert' : 'status'} className={`text-sm ${message.type === 'error' ? 'text-red-700' : 'text-green-700'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
};

export default UserSubscriptionPanel;
