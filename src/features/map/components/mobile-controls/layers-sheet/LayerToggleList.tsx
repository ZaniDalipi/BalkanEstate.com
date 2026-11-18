import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SoftIconName } from '@/src/shared/illustrations';
import { formatBadgeCount } from '@/shared/utils/badgeCount';
import LayerSwitchRow from './LayerSwitchRow';

export interface LayerToggleState {
  show3DBuildings: boolean;
  setShow3DBuildings: (v: boolean) => void;
  showLandmarks: boolean;
  setShowLandmarks: (v: boolean) => void;
  showCadastre: boolean;
  setShowCadastre: (v: boolean) => void;
  showMeasurement: boolean;
  setShowMeasurement: (v: boolean) => void;
  showTerrain: boolean;
  setShowTerrain: (v: boolean) => void;
  isLegendOpen: boolean;
  setIsLegendOpen: (v: boolean) => void;
  showOnlyPromoted: boolean;
  setShowOnlyPromoted: (v: boolean) => void;
  promotedCount: number;
}

interface LayerToggleListProps extends LayerToggleState {
  /** Tools you use on the map itself (Measure, Terrain) close the sheet when switched on. */
  onToolStarted: () => void;
}

interface Row {
  key: string;
  icon: SoftIconName;
  label: string;
  checked: boolean;
  set: (v: boolean) => void;
  closesSheet?: boolean;
  badge?: string | null;
}

/** The map's on/off layers, as one inset-grouped card of switch rows. */
const LayerToggleList: React.FC<LayerToggleListProps> = (p) => {
  const { t } = useTranslation(['search', 'common']);
  const rows: Row[] = [
    { key: 'premium', icon: 'crown', label: t('common:aria.premiumOnly', 'Premium Only'), checked: p.showOnlyPromoted, set: p.setShowOnlyPromoted, badge: p.showOnlyPromoted ? null : formatBadgeCount(p.promotedCount) },
    { key: '3d', icon: 'cube', label: t('common:aria.buildings3D', '3D Buildings'), checked: p.show3DBuildings, set: p.setShow3DBuildings },
    { key: 'poi', icon: 'landmark', label: t('common:aria.poi', 'POI'), checked: p.showLandmarks, set: p.setShowLandmarks },
    { key: 'cadastre', icon: 'mapGrid', label: t('common:aria.cadastre', 'Cadastre'), checked: p.showCadastre, set: p.setShowCadastre },
    { key: 'measure', icon: 'ruler', label: t('common:aria.measure', 'Measure'), checked: p.showMeasurement, set: p.setShowMeasurement, closesSheet: true },
    { key: 'terrain', icon: 'mountain', label: t('search:terrain.toggle', 'Terrain'), checked: p.showTerrain, set: p.setShowTerrain, closesSheet: true },
    { key: 'legend', icon: 'legend', label: t('common:aria.legend', 'Legend'), checked: p.isLegendOpen, set: p.setIsLegendOpen },
  ];

  return (
    <div className="divide-y divide-neutral-900/[0.06] overflow-hidden rounded-2xl bg-white/70">
      {rows.map((row) => (
        <LayerSwitchRow
          key={row.key}
          icon={row.icon}
          label={row.label}
          checked={row.checked}
          badge={row.badge}
          onChange={(next) => {
            row.set(next);
            if (next && row.closesSheet) p.onToolStarted();
          }}
        />
      ))}
    </div>
  );
};

export default LayerToggleList;
