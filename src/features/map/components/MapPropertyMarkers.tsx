import React from 'react';
import { Property } from '@/types';
import { CadastreLayer } from './CadastreLayer';
import HeatMapLayer from './HeatMapLayer';
import Buildings3DLayer from './Buildings3DLayer';
import LandmarksLayer from './LandmarksLayer';
import PropertyAddressLabels from './PropertyAddressLabels';
import MeasurementTool from './MeasurementTool';
import ClimateRiskLayer from './ClimateRiskLayer';
import { ClimateRiskType } from './MapOptionsPanel';
import { Markers, HighlightedPropertyMarkers } from '@/src/components/map/MapPropertyMarker';
import { MapAgentAvatarInner } from '@/src/components/map/MapAgentAvatar';
import { TileLayerType } from './useMapComponent';

interface MapPropertyMarkersProps {
  propertiesInView: Property[];
  onPopupClick: (propertyId: string) => void;
  hoveredPropertyId?: string | null;
  showHeatMap: boolean;
  show3DBuildings: boolean;
  shadowDateTime: Date;
  showLandmarks: boolean;
  showCadastre: boolean;
  mapType: TileLayerType;
  selectedClimateRisk: ClimateRiskType;
  showMeasurement: boolean;
  onMeasurementClose: () => void;
}

const MapPropertyMarkers: React.FC<MapPropertyMarkersProps> = ({
  propertiesInView,
  onPopupClick,
  hoveredPropertyId,
  showHeatMap,
  show3DBuildings,
  shadowDateTime,
  showLandmarks,
  showCadastre,
  mapType,
  selectedClimateRisk,
  showMeasurement,
  onMeasurementClose,
}) => {
  return (
    <>
      {/* Climate Risk Overlay Layer (Zillow-style) */}
      <ClimateRiskLayer key={selectedClimateRisk} riskType={selectedClimateRisk} opacity={0.6} />
      {/* 3D Buildings with time-based shadows */}
      <Buildings3DLayer
        enabled={show3DBuildings}
        dateTime={shadowDateTime}
      />
      {/* Property address/house number labels - visible at high zoom when tiles aren't detailed */}
      <PropertyAddressLabels
        properties={propertiesInView}
        enabled={show3DBuildings}
        minZoom={19}
      />
      {/* Famous landmarks and POIs */}
      <LandmarksLayer
        enabled={showLandmarks}
        isNightMode={false}
      />
      <CadastreLayer enabled={showCadastre && (mapType === 'satellite' || mapType === 'hybrid')} opacity={0.7} />
      <HeatMapLayer properties={propertiesInView} enabled={showHeatMap} intensity="medium" />
      {/* Render markers - zoom-based limit applied in propertiesInView */}
      <Markers properties={propertiesInView} onPopupClick={onPopupClick} hoveredPropertyId={hoveredPropertyId} isNightMode={false} />
      <HighlightedPropertyMarkers onPopupClick={onPopupClick} />
      <MapAgentAvatarInner onPropertySelect={onPopupClick} />
      {/* Land Measurement Tool */}
      <MeasurementTool
        enabled={showMeasurement}
        onClose={onMeasurementClose}
      />
    </>
  );
};

export default MapPropertyMarkers;
