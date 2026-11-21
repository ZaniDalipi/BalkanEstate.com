import React from 'react';
import { useTranslation } from 'react-i18next';
import { CONTACT_CONFIG } from '@/src/shared/config/contact';
import PaymentInstructionsCard from './PaymentInstructionsCard';
import { useRequestPlan } from '../hooks/usePlanRequests';
import { planRequestErrorText } from '../utils/planRequestError';

interface RequestPlanPanelProps {
  /** The product to request; without one only the email option is offered. */
  productId?: string;
  planName: string;
  /** A discount code already applied in the checkout that lowers (but doesn't zero) the price. */
  discountCode?: string;
}

/**
 * While there is no online payment: request the plan, then see the amount,
 * the reference to quote and how to pay. The team confirms the payment and
 * the plan starts.
 */
const RequestPlanPanel: React.FC<RequestPlanPanelProps> = ({ productId, planName, discountCode }) => {
  const { t } = useTranslation('payment');
  const request = useRequestPlan();
  const salesEmail = CONTACT_CONFIG.email.sales;

  if (request.data) {
    return (
      <PaymentInstructionsCard
        order={request.data.order}
        instructions={request.data.instructions}
        heading={request.data.existing ? 'existing' : 'sent'}
      />
    );
  }

  const refusal = request.error ? planRequestErrorText(request.error) : null;

  return (
    <div className="rounded-lg sm:rounded-xl border border-neutral-200 bg-white p-3 sm:p-4">
      <p className="text-sm sm:text-base font-semibold text-neutral-800">
        {t('planRequest.title', 'Pay by arrangement with our team')}
      </p>
      <p className="text-xs sm:text-sm text-neutral-600 mt-1 mb-3">
        {t(
          'planRequest.description',
          'Request {{plan}} and we will send you the amount, a payment reference and how to pay. Your plan starts as soon as we confirm the payment.',
          { plan: planName }
        )}
      </p>

      {productId && (
        <button
          type="button"
          onClick={() => request.mutate({ productId, discountCode })}
          disabled={request.isPending}
          className="w-full min-h-[44px] px-4 py-2.5 bg-gradient-to-r from-primary to-indigo-600 text-white font-semibold rounded-lg hover:from-primary-dark hover:to-indigo-700 transition-all shadow-md disabled:opacity-60 text-sm"
        >
          {request.isPending ? t('planRequest.sending', 'Sending your request…') : t('planRequest.button', 'Request this plan')}
        </button>
      )}

      {refusal && (
        <p role="alert" className="mt-2 text-xs sm:text-sm text-red-600">
          {t(refusal.key, { defaultValue: refusal.defaultValue })}
        </p>
      )}

      <p className="text-[11px] sm:text-xs text-neutral-500 mt-3">
        {t('planRequest.orEmail', 'Prefer email? Write to')}{' '}
        <a
          href={`mailto:${salesEmail}?subject=${encodeURIComponent(`Plan request - ${planName}`)}`}
          className="font-medium text-primary underline"
        >
          {salesEmail}
        </a>
      </p>
    </div>
  );
};

export default RequestPlanPanel;
