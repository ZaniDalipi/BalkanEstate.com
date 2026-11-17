import React from 'react';
import { useTranslation } from 'react-i18next';
import { Phone } from 'lucide-react';
import { telHref } from '../../../../utils/builderLinks';

interface CallDeveloperButtonProps {
  /** The residence's number (already checked by the server); nothing renders without a callable one. */
  phone?: string;
}

/** "Call +389 …" — opens the phone's dialler (or the computer's calling app). */
export const CallDeveloperButton: React.FC<CallDeveloperButtonProps> = ({ phone }) => {
  const { t } = useTranslation('developments');
  const href = telHref(phone);
  if (!href || !phone) return null;
  return (
    <a
      href={href}
      className="inline-flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-white px-4 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={t('explorer.inquiry.callLabel', { phone, defaultValue: 'Call the developer at {{phone}}' })}
    >
      <Phone className="h-4 w-4" aria-hidden="true" />
      {t('explorer.inquiry.call', { phone, defaultValue: 'Call {{phone}}' })}
    </a>
  );
};
