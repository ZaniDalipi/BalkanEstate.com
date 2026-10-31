import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PublicUnit } from '../../../../types';
import { AVAILABILITY_META, AVAILABILITY_ORDER } from '../../../../utils/availability';
import { deriveFilterBounds, type FilterBounds, type UnitFlag } from '../../../../utils/unitFilters';
import { useAvailabilityLabel } from '../../../shared/Badges';
import type { ChipOption } from './ChipGroup';

const FLAG_DEFAULTS: Record<UnitFlag, string> = {
  terrace: 'Terrace',
  balcony: 'Balcony',
  duplex: 'Duplex',
  penthouse: 'Penthouse',
  furnished: 'Furnished',
};

/** Flags that duplicate a raw feature are offered once, as a flag. */
const FLAG_FEATURES = new Set(['big_terrace', 'duplex', 'penthouse', 'furnished']);

export interface FilterOptions {
  bounds: FilterBounds;
  beds: ChipOption<number>[];
  baths: ChipOption<number>[];
  types: ChipOption<string>[];
  features: ChipOption<string>[];
  flags: ChipOption<UnitFlag>[];
  orientations: ChipOption<string>[];
  entrances: ChipOption<string>[];
  availability: ChipOption<(typeof AVAILABILITY_ORDER)[number]>[];
  /** Slider step for the price range (a round number ~1% of the spread). */
  priceStep: number;
}

const niceStep = (spread: number): number => {
  if (spread <= 0) return 1;
  const raw = spread / 100;
  const pow = 10 ** Math.floor(Math.log10(raw));
  return Math.max(1, Math.round(raw / pow) * pow);
};

const countOptions = (values: number[]): ChipOption<number>[] =>
  values.map((v, i) => ({ value: v, label: `${v}${i === values.length - 1 && values.length > 1 ? '+' : ''}` }));

/** Selectable filter options derived from the loaded units, with translated labels. */
export function useFilterOptions(units: PublicUnit[]): FilterOptions {
  const { t } = useTranslation('developments');
  const availabilityLabel = useAvailabilityLabel();
  return useMemo(() => {
    const bounds = deriveFilterBounds(units);
    const present = new Set(bounds.availability);
    return {
      bounds,
      beds: countOptions(bounds.bedOptions),
      baths: countOptions(bounds.bathOptions),
      types: bounds.types.map((v) => ({ value: v, label: t(`explorer.unitType.${v}`, v.replace(/_/g, ' ')) })),
      features: bounds.features
        .filter((f) => !FLAG_FEATURES.has(f))
        .map((f) => ({ value: f, label: t(`feature.${f}`, f.replace(/_/g, ' ')) })),
      flags: bounds.flags.map((f) => ({ value: f, label: t(`explorer.flag.${f}`, FLAG_DEFAULTS[f]) })),
      orientations: bounds.orientations.map((o) => ({ value: o, label: t(`explorer.orientation.${o.toLowerCase()}`, o) })),
      entrances: bounds.entrances.map((e) => ({ value: e.id, label: e.name })),
      availability: AVAILABILITY_ORDER.filter((s) => present.has(s)).map((s) => ({
        value: s,
        label: availabilityLabel(s),
        swatchClass: AVAILABILITY_META[s].dotClass,
      })),
      priceStep: niceStep((bounds.priceMax ?? 0) - (bounds.priceMin ?? 0)),
    };
  }, [units, t, availabilityLabel]);
}
