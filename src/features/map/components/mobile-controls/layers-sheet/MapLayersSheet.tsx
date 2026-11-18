import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ClimateRiskType, MapStyleType } from '../../googleMapConstants';
import BottomSheet from './BottomSheet';
import ClimateRiskPicker from './ClimateRiskPicker';
import LayerToggleList, { type LayerToggleState } from './LayerToggleList';
import MapStylePicker from './MapStylePicker';
import SheetSection from './SheetSection';

export interface MapLayersSheetProps extends LayerToggleState {
  mapStyle: MapStyleType;
  setMapStyle: (style: MapStyleType) => void;
  hasDrawnArea: boolean;
  clearDrawnArea: () => void;
  selectedClimateRisk: ClimateRiskType;
  setSelectedClimateRisk: (risk: ClimateRiskType) => void;
  onClose: () => void;
}

/** Phone map settings: style, climate overlay and layers, in one iOS sheet. */
const MapLayersSheet: React.FC<MapLayersSheetProps> = (props) => {
  const { t } = useTranslation(['search', 'common']);
  const { onClose } = props;
  return (
    <BottomSheet title={t('search:map.mapView', 'Map')} onClose={onClose}>
      <SheetSection title={t('common:aria.mapStyle', 'Map style')}>
        <MapStylePicker
          mapStyle={props.mapStyle}
          setMapStyle={props.setMapStyle}
          hasDrawnArea={props.hasDrawnArea}
          clearDrawnArea={props.clearDrawnArea}
        />
      </SheetSection>
      <SheetSection title={t('search:map.climateRisks.title', 'Climate Risks')}>
        <ClimateRiskPicker selected={props.selectedClimateRisk} onSelect={props.setSelectedClimateRisk} />
      </SheetSection>
      <SheetSection title={t('search:map.layers', 'Layers')}>
        <LayerToggleList {...props} onToolStarted={onClose} />
      </SheetSection>
    </BottomSheet>
  );
};

export default MapLayersSheet;
