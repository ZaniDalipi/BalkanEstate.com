import React from 'react';
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';
import { GLASS_CARD } from './glassStyles';

interface DetailSectionProps {
  id: string;
  icon: SoftIconName;
  title: string;
  /** A quiet line under the title. */
  subtitle?: string;
  /** Right side of the heading: a status, a link… */
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** A glass card with the app's soft-icon heading — every section of the profile uses it. */
export const DetailSection: React.FC<DetailSectionProps> = ({ id, icon, title, subtitle, aside, children, className = '' }) => (
  <section aria-labelledby={id} className={`${GLASS_CARD} p-5 sm:p-6 ${className}`}>
    <div className="mb-4 flex items-center gap-3">
      <SoftIcon name={icon} className="h-9 w-9 shrink-0" />
      <div className="min-w-0 flex-1">
        <h2 id={id} className="text-[17px] font-semibold tracking-tight text-neutral-900 sm:text-lg">
          {title}
        </h2>
        {subtitle && <p className="text-[13px] text-neutral-500">{subtitle}</p>}
      </div>
      {aside}
    </div>
    {children}
  </section>
);
