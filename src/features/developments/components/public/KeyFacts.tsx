import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, CalendarClock, HardHat, MapPin, Layers } from 'lucide-react';
import type { Development } from '../../types';
import { residenceTimeline } from '../../utils/timeline';

interface KeyFactsProps {
  development: Development;
  buildings: number;
}

const Fact: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({
  icon,
  label,
  value,
}) => (
  <div className="flex items-start gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-teal-400/15 text-primary ring-1 ring-primary/10">
      {icon}
    </span>
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
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

  const timeline = residenceTimeline(development, i18n.language);

  const location = [development.municipality, development.city, development.country].filter(Boolean).join(', ');

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Fact
        icon={<HardHat className="h-4 w-4" aria-hidden="true" />}
        label={t('wizard.constructionStatus')}
        value={t(`construction.${development.constructionStatus}`)}
      />
      {timeline && (
        <Fact
          icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
          label={timeline.kind === 'built' ? t('detail.yearBuilt', 'Year built') : t('detail.completion')}
          value={timeline.kind === 'built' ? timeline.year : timeline.date}
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
