import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validateFullPhone } from '@/src/shared/components/ui/PhoneInput';
import { describeInquiryError } from '../utils/inquiryErrors';

/**
 * Phone check and error routing shared by the inquiry modals: a phone problem
 * is shown under the phone field, anything else in the form's error banner.
 */
export const useInquiryFieldErrors = (setFormError: (message: string | null) => void) => {
  const { t } = useTranslation(['common', 'auth']);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const tr = useCallback((key: string, fallback: string) => String(t(key, fallback)), [t]);

  /** True when the (optional) phone is empty or looks valid; otherwise shows why. */
  const checkPhone = useCallback(
    (phone: string): boolean => {
      const problem = validateFullPhone(phone, false, tr);
      setPhoneError(problem);
      return problem === null;
    },
    [tr]
  );

  const showSendError = useCallback(
    (err: unknown, fallback: string) => {
      const view = describeInquiryError(err, tr, fallback);
      if (view.field === 'buyerPhone') setPhoneError(view.message);
      else setFormError(view.message);
    },
    [tr, setFormError]
  );

  return { phoneError, clearPhoneError: () => setPhoneError(null), checkPhone, showSendError };
};
