import React, { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';
import { validateRsvp, type RsvpErrors, type RsvpField } from '../utils/validateRsvp';
import type { RsvpInput } from '../types';
import Field from './FormField';

interface RsvpDialogProps {
  open: boolean;
  /** "Sat 21 Nov · 11:00–13:00" — what they're signing up for. */
  whenLabel: string;
  defaults: RsvpInput;
  submitting: boolean;
  serverError: string | null;
  /** Security check (Turnstile) shown above the buttons. */
  captcha?: React.ReactNode;
  onSubmit: (input: RsvpInput) => void;
  onClose: () => void;
}

/** Name, email and an optional phone to say you're coming to an open house. */
const RsvpDialog: React.FC<RsvpDialogProps> = ({ open, whenLabel, defaults, submitting, serverError, captcha, onSubmit, onClose }) => {
  const { t } = useTranslation('property');
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<RsvpInput>(defaults);
  const [errors, setErrors] = useState<RsvpErrors>({});
  useEscapeLayer(panelRef, onClose, open && !submitting);

  const set = (field: RsvpField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };
  const errorText = (field: RsvpField) => {
    const e = errors[field];
    return e ? t(e.key, { defaultValue: e.defaultValue }) : undefined;
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateRsvp(values);
    if (result.ok === false) {
      setErrors(result.errors);
      return;
    }
    onSubmit(result.value);
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          onClick={submitting ? undefined : onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="dialog-fit w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            initial={reduceMotion ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { y: 24, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={titleId} className="text-lg font-bold text-neutral-900">
              {t('openHouse.rsvpTitle', { defaultValue: 'Come to the open house' })}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">{whenLabel}</p>
            <form noValidate onSubmit={submit} className="mt-4 space-y-3">
              <Field label={t('openHouse.name', { defaultValue: 'Your name' })} value={values.name} onChange={set('name')} error={errorText('name')} autoComplete="name" autoFocus />
              <Field label={t('openHouse.email', { defaultValue: 'Email' })} type="email" value={values.email} onChange={set('email')} error={errorText('email')} autoComplete="email" />
              <Field label={t('openHouse.phoneOptional', { defaultValue: 'Phone (optional)' })} type="tel" value={values.phone ?? ''} onChange={set('phone')} error={errorText('phone')} autoComplete="tel" />
              {captcha}
              {serverError && <p role="alert" className="text-sm text-red-600">{serverError}</p>}
              <p className="text-xs text-neutral-500">
                {t('openHouse.rsvpPrivacy', { defaultValue: 'Only the host sees your details. We email you a confirmation and a reminder.' })}
              </p>
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} disabled={submitting} className="min-h-[44px] rounded-xl px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-100">
                  {t('openHouse.notNow', { defaultValue: 'Not now' })}
                </button>
                <button type="submit" disabled={submitting} className="min-h-[44px] rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                  {submitting ? t('openHouse.sending', { defaultValue: 'Sending…' }) : t('openHouse.confirmRsvp', { defaultValue: "Count me in" })}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default RsvpDialog;
