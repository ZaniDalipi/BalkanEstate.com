import React from 'react';
import { useTranslation } from 'react-i18next';
import { methodLabel } from './paymentOrderAdminText';
import { MANUAL_METHODS, type PaymentField, type PaymentFieldErrors, type PaymentFieldValues } from './paymentFieldsValidation';

interface PaymentFieldsProps {
  idPrefix: string;
  values: PaymentFieldValues;
  onChange: (values: PaymentFieldValues) => void;
  errors: PaymentFieldErrors;
  /** Latest selectable payment date (yyyy-mm-dd). */
  today: string;
}

const INPUT = 'mt-1 min-h-[44px] w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 aria-[invalid=true]:border-red-400';

/** Amount received, how it was paid, when, and a note: shared by "Mark paid" and "Record payment". */
const PaymentFields: React.FC<PaymentFieldsProps> = ({ idPrefix, values, onChange, errors, today }) => {
  const { t } = useTranslation('admin');
  const set = (field: PaymentField, value: string) => onChange({ ...values, [field]: value });
  const id = (field: PaymentField) => `${idPrefix}-${field}`;
  const error = (field: PaymentField) => {
    const e = errors[field];
    return e ? (
      <p id={`${id(field)}-err`} role="alert" className="mt-1 text-sm text-red-700">{'text' in e ? e.text : t(e.key, { defaultValue: e.defaultValue })}</p>
    ) : null;
  };
  const aria = (field: PaymentField) => ({
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? `${id(field)}-err` : undefined,
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={id('amount')} className="block text-sm font-medium text-gray-800">
            {t('paymentOrders.amountReceived', 'Amount received (€)')}
          </label>
          <input id={id('amount')} inputMode="decimal" value={values.amount} onChange={(e) => set('amount', e.target.value)} className={INPUT} {...aria('amount')} />
          {error('amount')}
        </div>
        <div>
          <label htmlFor={id('method')} className="block text-sm font-medium text-gray-800">
            {t('paymentOrders.method', 'Paid by')}
          </label>
          <select id={id('method')} value={values.method} onChange={(e) => set('method', e.target.value)} className={INPUT} {...aria('method')}>
            {MANUAL_METHODS.map((m) => (
              <option key={m} value={m}>{methodLabel(m, t)}</option>
            ))}
          </select>
          {error('method')}
        </div>
      </div>
      <div>
        <label htmlFor={id('paidAt')} className="block text-sm font-medium text-gray-800">
          {t('paymentOrders.paidAt', 'Payment date')}
        </label>
        <input id={id('paidAt')} type="date" max={today} value={values.paidAt} onChange={(e) => set('paidAt', e.target.value)} className={INPUT} {...aria('paidAt')} />
        {error('paidAt')}
      </div>
      <div>
        <label htmlFor={id('note')} className="block text-sm font-medium text-gray-800">
          {t('paymentOrders.note', 'Note (optional)')}
        </label>
        <input id={id('note')} maxLength={500} value={values.note} onChange={(e) => set('note', e.target.value)} className={INPUT}
          placeholder={t('paymentOrders.notePlaceholder', 'e.g. bank statement line, receipt number')} />
      </div>
    </div>
  );
};

export default PaymentFields;
