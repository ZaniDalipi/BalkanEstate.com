import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ResidenceBilling } from '../../../types';
import type { BillingRefusal } from '../../../utils/billingError';
import { formatCharge } from '../../../utils/format';

/** Wording for the Residence Pass: state names, the countdown line and refusals. */
export function useBillingText() {
  const { t, i18n } = useTranslation('developments');
  const day = useCallback(
    (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(i18n.language, { dateStyle: 'medium' }) : ''),
    [i18n.language]
  );

  const stateLabel = useCallback(
    (b: ResidenceBilling) =>
      ({
        none: t('billing.state.none', 'Not published yet'),
        trial: t('billing.state.trial', 'Free trial'),
        active: t('billing.state.active', 'Residence Pass'),
        included: t('billing.state.included', 'Included in your plan'),
        expired: t('billing.state.expired', 'Trial ended'),
      })[b.state],
    [t]
  );

  /** The line under the state: what happens next and when. */
  const stateHint = useCallback(
    (b: ResidenceBilling) => {
      switch (b.state) {
        case 'none':
          // No trial left for this one (another is on trial, or all are used): don't promise it.
          return b.publish.allowed
            ? t('billing.hint.none', { days: b.terms.trialDays, defaultValue: 'Publishing starts a free {{days}}-day trial.' })
            : t('billing.hint.noTrial', 'Publishing this residence needs a Residence Pass.');
        case 'trial':
          return t('billing.hint.trial', {
            count: b.daysLeft ?? 0,
            date: day(b.trialEndsAt),
            defaultValue: 'Public for {{count}} more days (until {{date}}). Buy a pass to keep it online.',
          });
        case 'active':
          return t('billing.hint.active', { date: day(b.paidUntil), defaultValue: 'Public until {{date}}.' });
        case 'included':
          return t('billing.hint.included', { date: day(b.includedUntil), defaultValue: 'Covered by your plan until {{date}}.' });
        default:
          return t('billing.hint.expired', 'Buyers can’t see this residence. Buy a pass to put it back online.');
      }
    },
    [t, day]
  );

  const refusalText = useCallback(
    (r: BillingRefusal) => {
      switch (r.code) {
        case 'PASS_REQUIRED':
          return t('billing.refusal.passRequired', 'The free trial has ended. Buy a Residence Pass to publish.');
        case 'TRIAL_IN_PROGRESS':
          return t('billing.refusal.trialInProgress', 'Another of your residences is on its free trial. Buy a pass to publish this one now.');
        case 'TRIAL_LIMIT':
          return t('billing.refusal.trialLimit', 'You have used all your free trials. Buy a pass to publish.');
        case 'BUILDING_LIMIT':
          return t('billing.refusal.buildingLimit', { limit: r.limit ?? 5, defaultValue: 'This residence can have {{limit}} buildings. Unlock more to add another.' });
        case 'PAYMENT_NOT_CONFIGURED':
          return r.amount
            ? t('billing.refusal.paymentSoonAmount', { amount: formatCharge(r.amount), defaultValue: 'Online payment is coming soon. {{amount}} is still due, so enter a code that covers it.' })
            : t('billing.refusal.paymentSoon', 'Online payment is coming soon. Enter a code to unlock it now.');
        default:
          return r.message || t('billing.refusal.couponInvalid', 'This code is not valid for residences.');
      }
    },
    [t]
  );

  return { day, stateLabel, stateHint, refusalText };
}
