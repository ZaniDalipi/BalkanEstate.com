import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';
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
  icon: SoftIconName;
  label: string;
  value: string;
}

/** The builder's track record: founded (and how long ago), completed projects, licence, office. */
export const BuilderFacts: React.FC<BuilderFactsProps> = ({ builder, withOffice = true, className }) => {
  const { t } = useTranslation('developments');
  const years = yearsActive(builder.foundedYear);
  const all: (Fact | null)[] = [
    builder.foundedYear
      ? { icon: 'calendar', label: t('builderPublic.founded', 'Founded'), value: years ? t('builderPublic.foundedValue', { year: builder.foundedYear, years, defaultValue: '{{year}} · {{years}} years' }) : String(builder.foundedYear) }
      : null,
    typeof builder.completedProjects === 'number' ? { icon: 'trophy', label: t('builderPublic.projects', 'Completed projects'), value: String(builder.completedProjects) } : null,
    builder.licenseNumber ? { icon: 'docCheck', label: t('builderPublic.license', 'Licence'), value: builder.licenseNumber } : null,
    withOffice && builder.address ? { icon: 'pin', label: t('builderPublic.office', 'Office'), value: builder.address } : null,
  ];
  const facts = all.filter((f): f is Fact => !!f);
  if (facts.length === 0) return null;

  return (
    <dl className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {facts.map(({ icon, label, value }) => (
        <div key={label} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
          <SoftIcon name={icon} className="h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="break-words text-sm font-semibold text-slate-900">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
};
