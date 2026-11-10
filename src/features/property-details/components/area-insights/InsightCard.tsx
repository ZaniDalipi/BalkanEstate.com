import React, { useId } from 'react';
import type { LucideIcon } from 'lucide-react';
import InfoPopover from './InfoPopover';

export type InsightTone = 'emerald' | 'sky' | 'amber';

const TONES: Record<InsightTone, { frame: string; icon: string }> = {
  emerald: { frame: 'border-emerald-100 from-emerald-50/70', icon: 'text-emerald-500' },
  sky: { frame: 'border-sky-100 from-sky-50/70', icon: 'text-sky-500' },
  amber: { frame: 'border-amber-100 from-amber-50/70', icon: 'text-amber-500' },
};

export interface InsightCardProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  tone: InsightTone;
  /** Content of the ⓘ popover. */
  info?: React.ReactNode;
  children: React.ReactNode;
}

/** The frame shared by the area cards: icon, title, ⓘ, tinted background. */
const InsightCard: React.FC<InsightCardProps> = ({ icon: Icon, title, subtitle, tone, info, children }) => {
  const headingId = useId();
  const colours = TONES[tone];
  return (
    <section
      aria-labelledby={headingId}
      className={`rounded-2xl border bg-gradient-to-br via-white to-white p-4 sm:p-6 landscape:p-3 shadow-sm ${colours.frame}`}
    >
      <div className="mb-4 landscape:mb-2 flex items-start gap-3">
        <Icon aria-hidden="true" className={`mt-0.5 h-6 w-6 flex-shrink-0 ${colours.icon}`} />
        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="text-lg sm:text-xl landscape:text-base font-bold text-neutral-800">{title}</h3>
          {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
        </div>
        {info && <div className="-mr-2 -mt-2"><InfoPopover topic={title}>{info}</InfoPopover></div>}
      </div>
      {children}
    </section>
  );
};

export default InsightCard;
