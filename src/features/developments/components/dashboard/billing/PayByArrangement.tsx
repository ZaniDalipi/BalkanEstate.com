import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Handshake, Mail } from 'lucide-react';
import { CONTACT_CONFIG } from '@/src/shared/config/contact';
import { paths } from '@/src/app/router/paths';

interface PayByArrangementProps {
  developmentId: string;
  /** What is being bought and its price, written into the email for them. */
  item: string;
  price: string;
}

/**
 * How to pay while there is no online payment provider: the price and payment
 * are agreed with us directly, then we send an unlock code. One tap writes the
 * email to sales with the item, price and a link to the residence filled in.
 * Without a mail app that link does nothing, so the address can also be
 * copied; if copying is blocked, the reader is told to select it by hand.
 */
export const PayByArrangement: React.FC<PayByArrangementProps> = ({ developmentId, item, price }) => {
  const { t } = useTranslation('developments');
  const email = CONTACT_CONFIG.email.sales;
  const link = typeof window === 'undefined' ? '' : `${window.location.origin}${paths.developmentManage(developmentId)}`;
  const subject = `${item} · BalkanEstate`;
  const body = t('billing.arrange.mailBody', { item, price, link, defaultValue: 'Hello,\n\nI would like to buy: {{item}} ({{price}}).\nResidence: {{link}}\n\nThank you.' });
  const href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const [copy, setCopy] = useState<'idle' | 'done' | 'failed'>('idle');
  const copyAddress = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(email);
      setCopy('done');
    } catch {
      setCopy('failed');
    }
  };

  return (
    <section aria-labelledby="pay-arrange-heading" className="space-y-3 rounded-xl border border-sky-100 bg-sky-50 p-4">
      <h3 id="pay-arrange-heading" className="flex items-center gap-2 text-sm font-semibold text-sky-950">
        <Handshake className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t('billing.arrange.title', 'How to pay')}
      </h3>
      <p className="text-sm leading-relaxed text-sky-900">
        {t('billing.arrange.body', 'We don’t take payments online. We agree the payment with you directly: write to us, we confirm the details together and send you an unlock code to enter below.')}
      </p>
      <a
        href={href}
        aria-label={t('billing.arrange.emailAria', { email, defaultValue: 'Write to {{email}} about this purchase' })}
        className="inline-flex min-h-[44px] max-w-full items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-primary shadow-sm ring-1 ring-sky-200 hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="select-all truncate">{email}</span>
      </a>
      <button
        type="button"
        onClick={() => void copyAddress()}
        className="ml-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-sky-900 hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {copy === 'done' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {copy === 'done' ? t('billing.arrange.copied', 'Copied') : t('billing.arrange.copy', 'Copy address')}
      </button>
      <span className="sr-only" aria-live="polite">{copy === 'done' ? t('billing.arrange.copied', 'Copied') : ''}</span>
      {copy === 'failed' && (
        <p role="alert" className="text-sm text-red-700">
          {t('billing.arrange.copyFailed', { email, defaultValue: 'Couldn’t copy. Select {{email}} above, or write to it from your email app.' })}
        </p>
      )}
    </section>
  );
};
