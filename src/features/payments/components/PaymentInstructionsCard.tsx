import React from 'react';
import { useTranslation } from 'react-i18next';
import CopyField from './CopyField';
import { formatOrderAmount } from '../utils/orderFormat';
import type { PaymentInstructionsInfo, PlanOrder } from '../types/paymentOrders';

interface PaymentInstructionsCardProps {
  order: PlanOrder;
  instructions: PaymentInstructionsInfo;
  /** 'sent' right after requesting, 'existing' when the request was already open; none in the requests list. */
  heading?: 'sent' | 'existing';
}

/** The amount, the reference to quote and how to pay for a requested plan. */
const PaymentInstructionsCard: React.FC<PaymentInstructionsCardProps> = ({ order, instructions, heading }) => {
  const { t, i18n } = useTranslation('payment');
  const bank = instructions.bankTransfer;
  const amount = formatOrderAmount(order.amountCents, order.currency, i18n.language);

  return (
    <div className="space-y-3">
      {heading && (
        <div role="status" className="rounded-lg bg-green-50 border border-green-200 p-3">
          <p className="text-sm font-semibold text-green-800">
            {heading === 'sent'
              ? t('planRequest.sentTitle', 'Request sent')
              : t('planRequest.existingTitle', 'You already requested this plan')}
          </p>
          <p className="text-xs text-green-700">{t('planRequest.emailed', 'We also emailed you these details.')}</p>
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-3 divide-y divide-neutral-100">
        <div className="flex justify-between py-1 text-sm">
          <span className="text-neutral-500">{t('planRequest.plan', 'Plan')}</span>
          <span className="font-semibold text-neutral-900">{order.productName}</span>
        </div>
        <div className="flex justify-between py-1 text-sm">
          <span className="text-neutral-500">{t('planRequest.amount', 'Amount')}</span>
          <span className="font-semibold text-neutral-900">{amount}</span>
        </div>
        <CopyField label={t('planRequest.reference', 'Reference')} value={order.reference} mono />
      </div>

      {bank ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-sm font-semibold text-neutral-800 mb-1">{t('planRequest.bankTitle', 'Pay by bank transfer')}</p>
          <CopyField label={t('planRequest.accountHolder', 'Account holder')} value={bank.accountHolder} />
          <CopyField label={t('planRequest.iban', 'IBAN')} value={bank.iban} mono />
          {bank.bic && <CopyField label={t('planRequest.bic', 'BIC/SWIFT')} value={bank.bic} mono />}
          {bank.bankName && <CopyField label={t('planRequest.bank', 'Bank')} value={bank.bankName} />}
          <p className="text-xs text-neutral-600 mt-2">
            {t('planRequest.putReference', 'Put the reference {{reference}} in the payment description so we can match your payment.', {
              reference: order.reference,
            })}
          </p>
        </div>
      ) : (
        <p className="text-xs sm:text-sm text-neutral-700">
          {t('planRequest.teamWillContact', 'Our team will contact you within one business day with how to pay.')}
        </p>
      )}

      <p className="text-xs text-neutral-600">{t('planRequest.startsOnConfirm', 'Your plan starts as soon as we confirm the payment.')}</p>
      <p className="text-xs text-neutral-500">
        {t('planRequest.questions', 'Questions? Write to {{email}} and mention {{reference}}.', {
          email: instructions.contactEmail,
          reference: order.reference,
        })}
      </p>
    </div>
  );
};

export default PaymentInstructionsCard;
