import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBuyResidence } from '../../../hooks/useResidenceBilling';
import type { ResidencePurchaseKind } from '../../../types';
import { billingRefusal } from '../../../utils/billingError';
import { appliedCode, type AppliedCode } from '../../../utils/codeDiscount';
import { codeProblem, MAX_EXTRA_BUILDINGS, quantityProblem } from '../../../validation/billingValidation';
import { useBillingText } from './useBillingText';
import { useApiErrorText } from '../../../hooks/useApiErrorText';

/**
 * The buy dialog's form: unlock code and building count, validated before
 * sending; a refused code is shown on the field, anything else above it. A
 * code that only lowers the price is accepted (`applied`): the dialog then
 * shows the new total to pay by arrangement.
 */
export function useCheckout(developmentId: string, kind: ResidencePurchaseKind, onDone: () => void) {
  const { t } = useTranslation('developments');
  const apiText = useApiErrorText();
  const { refusalText } = useBillingText();
  const { buy, isLoading } = useBuyResidence(developmentId);
  const [code, setCode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [applied, setApplied] = useState<AppliedCode | null>(null);

  const codeMessage = (raw: string) => {
    const p = codeProblem(raw);
    if (p === 'empty') return t('billing.code.required', 'Enter the unlock code we sent you after agreeing the payment.');
    if (p === 'format') return t('billing.code.format', 'Codes use letters, numbers, - and _ (3–64 characters).');
    return null;
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setFormError(null);
    setApplied(null);
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
      const discounted = appliedCode(refusal);
      if (discounted) setApplied(discounted);
      else if (refusal?.code === 'COUPON_INVALID') setCodeError(refusalText(refusal));
      else setFormError(refusal ? refusalText(refusal) : apiText.text(err));
    }
  };

  return {
    code,
    setCode: (v: string) => {
      setCode(v);
      // A changed code is not the one applied any more.
      if (applied && v.trim().toUpperCase() !== applied.code) setApplied(null);
      if (codeError) setCodeError(codeMessage(v));
    },
    quantity,
    setQuantity: (n: number) => {
      setQuantity(n);
      setApplied(null);
    },
    applied,
    codeError,
    formError,
    isLoading,
    submit,
  };
}
