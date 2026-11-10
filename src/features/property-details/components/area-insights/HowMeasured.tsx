import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

export interface HowMeasuredProps {
  children: React.ReactNode;
}

/** A "How is this measured?" disclosure under a data card. Native <details>: keyboard and screen-reader ready. */
const HowMeasured: React.FC<HowMeasuredProps> = ({ children }) => {
  const { t } = useTranslation(['property']);
  return (
    <details className="group mt-3 text-xs text-neutral-500">
      <summary className="flex min-h-[44px] landscape:min-h-[32px] w-fit cursor-pointer select-none list-none items-center gap-1 rounded-md font-medium text-neutral-600 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
        {t('property:areaInsights.howMeasured', 'How is this measured?')}
        <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="mt-1 space-y-1 leading-relaxed">{children}</div>
    </details>
  );
};

export default HowMeasured;
