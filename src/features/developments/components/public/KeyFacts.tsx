import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, CalendarClock, HardHat, MapPin, Layers } from 'lucide-react';
import type { Development } from '../../types';

interface KeyFactsProps {
  development: Development;
  buildings: number;
}

const Fact: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({
  icon,
  label,
  value,
}) => (
  <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      {icon}
    </span>
    <div className="min-w-0">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-semibold text-foreground">{value}</div>
    </div>
  </div>
);

/**
 * A compact "key facts" grid — construction status, expected completion,
 * category, building count and location — giving the public residence page the
 * substance of a premium development listing rather than a bare description.
 */
export const KeyFacts: React.FC<KeyFactsProps> = ({ development, buildings }) => {
  const { t, i18n } = useTranslation('developments');

  const completion = development.expectedCompletionDate
    ? new Date(development.expectedCompletionDate).toLocaleDateString(i18n.language || 'en', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  const location = [development.municipality, development.city, development.country].filter(Boolean).join(', ');

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Fact
        icon={<HardHat className="h-4 w-4" aria-hidden="true" />}
        label={t('wizard.constructionStatus')}
        value={t(`construction.${development.constructionStatus}`)}
      />
      {completion && (
        <Fact
          icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
          label={t('detail.completion')}
          value={completion}
        />
      )}
      <Fact
        icon={<Layers className="h-4 w-4" aria-hidden="true" />}
        label={t('wizard.category')}
        value={t(`category.${development.category}`)}
      />
      <Fact
        icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
        label={t('detail.buildings')}
        value={buildings}
      />
      {location && (
        <Fact icon={<MapPin className="h-4 w-4" aria-hidden="true" />} label={t('detail.location')} value={location} />
      )}
    </div>
  );
};
