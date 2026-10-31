import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Send } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { sendUnitInquiry } from '../../../../api/developmentsApi';
import type { UnitInquiryPayload } from '../../../../types';
import { validateInquiry, type InquiryErrors, type InquiryField } from './validateInquiry';

interface UnitInquiryFormProps {
  slug: string;
  unitId: string;
  defaultMessage: string;
}

const ERROR_DEFAULTS = {
  required: 'This field is required.',
  invalid: 'Please check this value.',
  tooShort: 'This is too short.',
  tooLong: 'This is too long.',
} as const;

const input =
  'block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 aria-[invalid=true]:border-red-500';

/** Inquiry to the developer about a unit that has no listing (validated client- and server-side). */
export const UnitInquiryForm: React.FC<UnitInquiryFormProps> = ({ slug, unitId, defaultMessage }) => {
  const { t } = useTranslation('developments');
  const { state } = useAppContext();
  const [values, setValues] = useState<UnitInquiryPayload>({
    name: state.currentUser?.name ?? '',
    email: state.currentUser?.email ?? '',
    phone: state.currentUser?.phone ?? '',
    message: defaultMessage,
  });
  const [errors, setErrors] = useState<InquiryErrors>({});
  const mutation = useMutation({ mutationFn: (p: UnitInquiryPayload) => sendUnitInquiry(slug, unitId, p) });

  if (mutation.isSuccess) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        {t('explorer.inquiry.success', 'Thank you — your inquiry was sent. The developer will get back to you soon.')}
      </div>
    );
  }

  const set = (k: InquiryField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateInquiry(values);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    mutation.mutate({ ...values, name: values.name.trim(), email: values.email.trim(), phone: values.phone?.trim() || undefined, message: values.message.trim() });
  };
  const field = (k: InquiryField, label: string, el: React.ReactElement<Record<string, unknown>>) => (
    <div>
      <label htmlFor={`ui-${k}`} className="mb-1 block text-xs font-semibold text-slate-700">{label}</label>
      {React.cloneElement(el, { id: `ui-${k}`, 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `ui-${k}-err` : undefined })}
      {errors[k] && (
        <p id={`ui-${k}-err`} className="mt-1 text-xs text-red-600">{t(`explorer.inquiry.errors.${errors[k]}`, ERROR_DEFAULTS[errors[k]!])}</p>
      )}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-label={t('explorer.inquiry.heading', 'Ask about this apartment')}>
      <h3 className="text-base font-bold text-slate-900">{t('explorer.inquiry.heading', 'Ask about this apartment')}</h3>
      {field('name', t('explorer.inquiry.name', 'Name'), <input className={input} value={values.name} onChange={set('name')} autoComplete="name" maxLength={100} />)}
      {field('email', t('explorer.inquiry.email', 'Email'), <input className={input} type="email" value={values.email} onChange={set('email')} autoComplete="email" maxLength={254} />)}
      {field('phone', t('explorer.inquiry.phone', 'Phone (optional)'), <input className={input} type="tel" value={values.phone} onChange={set('phone')} autoComplete="tel" maxLength={25} />)}
      {field('message', t('explorer.inquiry.message', 'Message'), <textarea className={`${input} min-h-[110px]`} value={values.message} onChange={set('message')} maxLength={2000} />)}
      {mutation.isError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {t('explorer.inquiry.error', 'Your inquiry could not be sent. Please try again.')}
        </p>
      )}
      <button type="submit" disabled={mutation.isPending} className="inline-flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60">
        <Send className="h-4 w-4" aria-hidden="true" />
        {mutation.isPending ? t('explorer.inquiry.sending', 'Sending…') : t('explorer.inquiry.submit', 'Send inquiry')}
      </button>
    </form>
  );
};
