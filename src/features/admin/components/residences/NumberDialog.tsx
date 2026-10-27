import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/src/shared/components/ui/Modal';
import { useApiErrorText } from '@/src/features/developments/hooks/useApiErrorText';

interface NumberDialogProps {
  title: string;
  label: string;
  help?: string;
  initial?: string;
  /** Returns the reason the value can't be used, or null. */
  validate: (raw: string) => string | null;
  /** Ask for an optional note (kept with the change). */
  withNote?: boolean;
  submitLabel: string;
  /** Optional secondary action (e.g. "Back to the default"). */
  secondary?: { label: string; onClick: () => Promise<void> };
  onSubmit: (value: number, note?: string) => Promise<void>;
  onClose: () => void;
}

/**
 * A small admin dialog asking for one number (and an optional note):
 * validated on submit and as you fix it; a server refusal of the number is
 * shown under it, any other above the buttons (translated by its code). Full-screen on phones (Modal), 44px targets.
 */
export const NumberDialog: React.FC<NumberDialogProps> = (p) => {
  const { t } = useTranslation(['admin']);
  const apiText = useApiErrorText();
  const id = useId();
  const [raw, setRaw] = useState(p.initial ?? '');
  const [note, setNote] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setFormError(null);
    try {
      await action();
      p.onClose();
    } catch (err) {
      // The dialog has one number: a refusal naming any field but the note belongs under it.
      const { text, field } = apiText.describe(err);
      if (field && field !== 'note') setFieldError(text);
      else setFormError(text);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = p.validate(raw);
    setFieldError(problem);
    if (!problem) void run(() => p.onSubmit(Number(raw.trim()), note.trim() || undefined));
  };

  return (
    <Modal isOpen onClose={p.onClose} title={p.title} size="md">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor={id} className="block text-sm font-medium text-gray-800">{p.label}</label>
          {p.help && <p className="mt-0.5 text-xs text-gray-500">{p.help}</p>}
          <input
            id={id}
            type="number"
            inputMode="numeric"
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              if (fieldError) setFieldError(p.validate(e.target.value));
            }}
            aria-invalid={!!fieldError}
            aria-describedby={fieldError ? `${id}-err` : undefined}
            className="mt-1 min-h-[44px] w-full rounded-lg border border-gray-300 px-3 text-lg font-semibold focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 aria-[invalid=true]:border-red-400"
          />
          {fieldError && <p id={`${id}-err`} role="alert" className="mt-1 text-sm text-red-700">{fieldError}</p>}
        </div>
        {p.withNote && (
          <div>
            <label htmlFor={`${id}-note`} className="block text-sm font-medium text-gray-800">{t('admin:residences.note', 'Note (optional)')}</label>
            <input
              id={`${id}-note`}
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-lg border border-gray-300 px-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        {formError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {p.secondary && (
            <button type="button" disabled={busy} onClick={() => void run(p.secondary!.onClick)} className="min-h-[44px] rounded-lg px-4 text-sm font-medium text-gray-700 hover:bg-gray-100 sm:mr-auto">
              {p.secondary.label}
            </button>
          )}
          <button type="button" onClick={p.onClose} className="min-h-[44px] rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {t('admin:residences.cancel', 'Cancel')}
          </button>
          <button type="submit" disabled={busy} className="min-h-[44px] rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {busy ? t('admin:residences.saving', 'Saving…') : p.submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
};
