import React from 'react';
import { useTranslation } from 'react-i18next';
import MacOSDock from '@/src/components/ui/mac-os-dock';
import { useShortLandscape } from '@/src/hooks/useMediaQuery';
import type { ClimateRiskType } from '../googleMapConstants';
import ClimateRiskMenu from './ClimateRiskMenu';
import { useLayerDockItems, type LayerId } from './useLayerDockItems';

export interface MapLayerDockProps {
  selectedClimateRisk: ClimateRiskType;
  setSelectedClimateRisk: (risk: ClimateRiskType) => void;
  isClimateMenuOpen: boolean;
  setIsClimateMenuOpen: (open: boolean) => void;
  showOnlyPromoted: boolean;
  setShowOnlyPromoted: (show: boolean) => void;
  promotedCount: number;
  show3DBuildings: boolean;
  setShow3DBuildings: (show: boolean) => void;
  showLandmarks: boolean;
  setShowLandmarks: (show: boolean) => void;
  showMeasurement: boolean;
  setShowMeasurement: (show: boolean) => void;
  showTerrain: boolean;
  setShowTerrain: (show: boolean) => void;
  showCadastre: boolean;
  setShowCadastre: (show: boolean) => void;
  isLegendOpen: boolean;
  setIsLegendOpen: (open: boolean) => void;
}

/** Compact sizes: 44px touch targets, 32px on a sideways phone (CLAUDE.md). */
const ICON_SIZE = 44;
const ICON_SIZE_SHORT = 32;
const MAX_SCALE = 1.45;

/** Desktop map layer toggles, shown as a magnifying macOS-style dock. */
const MapLayerDock: React.FC<MapLayerDockProps> = (p) => {
  const { t } = useTranslation('search');
  const isShortLandscape = useShortLandscape();
  const { apps, openApps } = useLayerDockItems({
    promotedCount: p.promotedCount,
    active: {
      climate: p.isClimateMenuOpen || p.selectedClimateRisk !== 'none',
      premium: p.showOnlyPromoted,
      '3d': p.show3DBuildings,
      poi: p.showLandmarks,
      measure: p.showMeasurement,
      terrain: p.showTerrain,
      cadastre: p.showCadastre,
      legend: p.isLegendOpen,
    },
  });

  const toggles: Record<LayerId, () => void> = {
    climate: () => p.setIsClimateMenuOpen(!p.isClimateMenuOpen),
    premium: () => p.setShowOnlyPromoted(!p.showOnlyPromoted),
    '3d': () => p.setShow3DBuildings(!p.show3DBuildings),
    poi: () => p.setShowLandmarks(!p.showLandmarks),
    measure: () => p.setShowMeasurement(!p.showMeasurement),
    terrain: () => p.setShowTerrain(!p.showTerrain),
    cadastre: () => p.setShowCadastre(!p.showCadastre),
    legend: () => p.setIsLegendOpen(!p.isLegendOpen),
  };

  return (
    <div className="relative">
      {p.isClimateMenuOpen && (
        <ClimateRiskMenu
          selected={p.selectedClimateRisk}
          onSelect={(risk) => {
            p.setSelectedClimateRisk(risk);
            p.setIsClimateMenuOpen(false);
          }}
        />
      )}
      <MacOSDock
        apps={apps}
        openApps={openApps}
        toggleable
        iconSize={isShortLandscape ? ICON_SIZE_SHORT : ICON_SIZE}
        maxScale={MAX_SCALE}
        ariaLabel={t('map.layers', 'Layers')}
        onAppClick={(id) => toggles[id as LayerId]?.()}
      />
    </div>
  );
};

export default MapLayerDock;
