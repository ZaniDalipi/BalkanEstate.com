import type { ClimateRiskType } from '../components/googleMapConstants';

/** Every climate overlay, `none` first (it switches the overlay off). */
export const CLIMATE_RISKS: readonly ClimateRiskType[] = ['none', 'flood', 'fire', 'wind', 'air', 'heat'];

export const isClimateRisk = (value: unknown): value is ClimateRiskType =>
  typeof value === 'string' && (CLIMATE_RISKS as readonly string[]).includes(value);

/** i18n key (under `search:map.climateRisks`) for a risk's short label (fits a small tile). */
export const climateRiskLabelKey = (risk: ClimateRiskType): string => (risk === 'none' ? 'off' : risk);

/** English `defaultValue`s for those short labels. */
export const CLIMATE_RISK_FALLBACK: Record<ClimateRiskType, string> = {
  none: 'Off',
  flood: 'Flood',
  fire: 'Fire',
  wind: 'Wind',
  air: 'Air',
  heat: 'Heat',
};
