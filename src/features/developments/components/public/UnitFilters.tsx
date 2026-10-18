import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { PublicUnit } from '../../types';
import {
  deriveFilterBounds,
  hasActiveCriteria,
  type UnitCriteria,
} from '../../utils/unitFilters';

interface UnitFiltersProps {
  units: PublicUnit[];
  criteria: UnitCriteria;
  onChange: (next: UnitCriteria) => void;
  /** How many units currently match (shown as a live count). */
  matchCount: number;
}

/** A labelled min–max number pair, the accessible form of a dual-range slider. */
const RangeInputs: React.FC<{
  label: string;
  suffix?: string;
  min: number;
  max: number;
  valueMin?: number;
  valueMax?: number;
  onMin: (v: number | undefined) => void;
  onMax: (v: number | undefined) => void;
}> = ({ label, suffix, min, max, valueMin, valueMax, onMin, onMax }) => {
  const parse = (raw: string): number | undefined => {
    if (raw.trim() === '') return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  return (
    <div className="min-w-[180px]">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {suffix ? ` (${suffix})` : ''}
      </span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          placeholder={String(min)}
          value={valueMin ?? ''}
          onChange={(e) => onMin(parse(e.target.value))}
          className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
          aria-label={`${label} min`}
        />
        <span className="text-muted-foreground">–</span>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          placeholder={String(max)}
          value={valueMax ?? ''}
          onChange={(e) => onMax(parse(e.target.value))}
          className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
          aria-label={`${label} max`}
        />
      </div>
    </div>
  );
};

/**
 * Buyer-facing filter bar for the interactive explorer — bedrooms, apartment
 * type, area (m²) and floor level, mirroring the East Gate B2 filter row. Pure
 * presentational: it derives its options from the loaded units and reports a
 * new criteria object up. Renders nothing meaningful when there is nothing to
 * filter on.
 */
export const UnitFilters: React.FC<UnitFiltersProps> = ({ units, criteria, onChange, matchCount }) => {
  const { t } = useTranslation('developments');
  const bounds = useMemo(() => deriveFilterBounds(units), [units]);
  const active = hasActiveCriteria(criteria);
  const bedsMax = bounds.bedOptions.length ? bounds.bedOptions[bounds.bedOptions.length - 1] : undefined;

  const toggleBed = (b: number) =>
    onChange({
      ...criteria,
      beds: criteria.beds.includes(b) ? criteria.beds.filter((x) => x !== b) : [...criteria.beds, b],
    });

  const toggleFeature = (f: string) =>
    onChange({
      ...criteria,
      features: criteria.features.includes(f) ? criteria.features.filter((x) => x !== f) : [...criteria.features, f],
    });

  const canFilter =
    bounds.bedOptions.length > 0 ||
    bounds.features.length > 0 ||
    bounds.areaMin != null ||
    bounds.levelMin != null;
  if (!canFilter) return null;

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
          {t('filters.heading')}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{t('filters.matchCount', { count: matchCount })}</span>
          {active && (
            <button
              type="button"
              onClick={() => onChange({ beds: [], types: [], features: [] })}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              {t('filters.clear')}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        {bounds.bedOptions.length > 0 && (
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('filters.bedrooms')}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {bounds.bedOptions.map((b) => {
                const on = criteria.beds.includes(b);
                const isMax = b === bedsMax && bounds.bedOptions.length > 1;
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleBed(b)}
                    aria-pressed={on}
                    className={cn(
                      'h-9 min-w-9 rounded-lg border px-2.5 text-sm font-medium transition-colors',
                      on
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-foreground hover:border-primary/50'
                    )}
                  >
                    {b}
                    {isMax ? '+' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {bounds.features.length > 0 && (
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('filters.apartmentType')}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {bounds.features.map((f) => {
                const on = criteria.features.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFeature(f)}
                    aria-pressed={on}
                    className={cn(
                      'h-9 rounded-lg border px-3 text-sm font-medium transition-colors',
                      on
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-foreground hover:border-primary/50'
                    )}
                  >
                    {t(`feature.${f}`, f.replace(/_/g, ' '))}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {bounds.areaMin != null && bounds.areaMax != null && bounds.areaMin !== bounds.areaMax && (
          <RangeInputs
            label={t('filters.area')}
            suffix="m²"
            min={bounds.areaMin}
            max={bounds.areaMax}
            valueMin={criteria.minArea}
            valueMax={criteria.maxArea}
            onMin={(v) => onChange({ ...criteria, minArea: v })}
            onMax={(v) => onChange({ ...criteria, maxArea: v })}
          />
        )}

        {bounds.levelMin != null && bounds.levelMax != null && bounds.levelMin !== bounds.levelMax && (
          <RangeInputs
            label={t('filters.floors')}
            min={bounds.levelMin}
            max={bounds.levelMax}
            valueMin={criteria.minLevel}
            valueMax={criteria.maxLevel}
            onMin={(v) => onChange({ ...criteria, minLevel: v })}
            onMax={(v) => onChange({ ...criteria, maxLevel: v })}
          />
        )}
      </div>
    </div>
  );
};
