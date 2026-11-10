import { useTranslation } from 'react-i18next';
import type { NoiseBand, SourceKind, TrafficLevel } from '../../api/surroundingsApi';
import { NOISE_BANDS, SOURCE_LABELS, TRAFFIC_LEVELS, formatDistance } from './surroundingsLabels';

/** Translated names for noise bands, traffic levels and source kinds, plus distances. */
export function useSurroundingsLabels() {
  const { t, i18n } = useTranslation(['property']);
  return {
    noiseBand: (band: NoiseBand) => t(`property:areaInsights.noise.band.${band}`, NOISE_BANDS[band].label),
    trafficLevel: (level: TrafficLevel) => t(`property:areaInsights.traffic.level.${level}`, TRAFFIC_LEVELS[level].label),
    sourceKind: (kind: SourceKind) => t(`property:areaInsights.sourceKind.${kind}`, SOURCE_LABELS[kind]),
    distance: (metres: number) => formatDistance(metres, i18n.language),
  };
}
