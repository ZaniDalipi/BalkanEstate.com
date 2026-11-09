import React from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, CalendarDays, MapPin, Trophy, type LucideIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { DevelopmentBuilder } from '../../../types';
import { yearsActive } from '../../../utils/builderLinks';

interface BuilderFactsProps {
  builder: DevelopmentBuilder;
  /** The office address among the facts (the company page shows it in its own card instead). */
  withOffice?: boolean;
  className?: string;
}

interface Fact {
  icon: LucideIcon;
  label: string;
  value: string;
}

/** The builder's track record: founded (and how long ago), completed projects, licence, office. */
export const BuilderFacts: React.FC<BuilderFactsProps> = ({ builder, withOffice = true, className }) => {
  const { t } = useTranslation('developments');
  const years = yearsActive(builder.foundedYear);
  const facts = [
    builder.foundedYear
      ? { icon: CalendarDays, label: t('builderPublic.founded', 'Founded'), value: years ? t('builderPublic.foundedValue', { year: builder.foundedYear, years, defaultValue: '{{year}} · {{years}} years' }) : String(builder.foundedYear) }
      : null,
    typeof builder.completedProjects === 'number' ? { icon: Trophy, label: t('builderPublic.projects', 'Completed projects'), value: String(builder.completedProjects) } : null,
    builder.licenseNumber ? { icon: BadgeCheck, label: t('builderPublic.license', 'Licence'), value: builder.licenseNumber } : null,
    withOffice && builder.address ? { icon: MapPin, label: t('builderPublic.office', 'Office'), value: builder.address } : null,
  ].filter((f): f is Fact => !!f);
  if (facts.length === 0) return null;

  return (
    <dl className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {facts.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="break-words text-sm font-semibold text-slate-900">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
};
