import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBuyResidence } from '../../../hooks/useResidenceBilling';
import type { ResidencePurchaseKind } from '../../../types';
import { billingRefusal } from '../../../utils/billingError';
import { codeProblem, MAX_EXTRA_BUILDINGS, quantityProblem } from '../../../validation/billingValidation';
import { useBillingText } from './useBillingText';

/**
 * The buy dialog's form: unlock code and building count, validated before
 * sending; a refused code is shown on the field, anything else above it.
 */
export function useCheckout(developmentId: string, kind: ResidencePurchaseKind, onDone: () => void) {
  const { t } = useTranslation('developments');
  const { refusalText } = useBillingText();
  const { buy, isLoading } = useBuyResidence(developmentId);
  const [code, setCode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const codeMessage = (raw: string) => {
    const p = codeProblem(raw);
    if (p === 'empty') return t('billing.code.required', 'Enter your code. Online payment is coming soon.');
    if (p === 'format') return t('billing.code.format', 'Codes use letters, numbers, - and _ (3–64 characters).');
    return null;
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setFormError(null);
    const ce = codeMessage(code);
    setCodeError(ce);
    if (kind === 'extra_building' && quantityProblem(quantity)) {
      setFormError(t('billing.quantity.range', { max: MAX_EXTRA_BUILDINGS, defaultValue: 'Choose from 1 to {{max}} buildings.' }));
      return;
    }
    if (ce) return;
    try {
      await buy({ kind, quantity: kind === 'pass' ? 1 : quantity, couponCode: code.trim() });
      onDone();
    } catch (err) {
      const refusal = billingRefusal(err);
      if (refusal?.code === 'COUPON_INVALID') setCodeError(refusalText(refusal));
      else setFormError(refusal ? refusalText(refusal) : (err as { message?: string })?.message || t('errors.generic', 'Something went wrong.'));
    }
  };

  return {
    code,
    setCode: (v: string) => {
      setCode(v);
      if (codeError) setCodeError(codeMessage(v));
    },
    quantity,
    setQuantity,
    codeError,
    formError,
    isLoading,
    submit,
  };
}
