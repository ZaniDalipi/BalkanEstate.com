import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Legend, ClimateRiskLegend } from '../GoogleMapLegend';
import type { GoogleMapControlsProps } from '../GoogleMapControls';
import MapButtonStack from './MapButtonStack';
import MobileDrawnAreaBar from './MobileDrawnAreaBar';
import MapLayersSheet from './layers-sheet/MapLayersSheet';
import { hasActiveLayers } from './hasActiveLayers';

/** Everything the map shows on a phone: the glass button stacks, the Map sheet and the legends. */
const MobileMapControls: React.FC<GoogleMapControlsProps> = (props) => {
  const { isLegendOpen, selectedClimateRisk, isLayerMenuOpen, setIsLayerMenuOpen, drawnBounds, isDrawing, onDrawComplete } = props;
  const clearDrawnArea = () => onDrawComplete(null);

  return (
    <>
      {/* Top right, below the floating search bar. */}
      <div className="absolute right-2 z-[999] flex flex-col items-end gap-2" style={{ top: 'calc(var(--floating-search-top-pad, 8px) + 60px)' }}>
        <MapButtonStack
          isSheetOpen={isLayerMenuOpen}
          onOpenSheet={() => setIsLayerMenuOpen(true)}
          hasActiveLayers={hasActiveLayers(props)}
          handleRecenter={props.handleRecenter}
          handleResetView={props.handleResetView}
          isDrawing={isDrawing}
          onDrawStart={props.onDrawStart}
        />
        <AnimatePresence>
          {drawnBounds && !isDrawing && (
            <MobileDrawnAreaBar
              key="drawn-area"
              isAuthenticated={props.isAuthenticated}
              isSaving={props.isSaving}
              onSaveSearch={props.onSaveSearch}
              onClear={clearDrawnArea}
            />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isLayerMenuOpen && (
          <MapLayersSheet
            key="map-layers-sheet"
            {...props}
            hasDrawnArea={drawnBounds !== null}
            clearDrawnArea={clearDrawnArea}
            onClose={() => setIsLayerMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {isLegendOpen && (
        <div className="absolute bottom-44 left-3 z-[1002] animate-fade-in">
          <Legend />
        </div>
      )}

      {/* Climate Risk Legend for mobile: top left, below the floating search bar */}
      {selectedClimateRisk !== 'none' && (
        <div className="absolute left-2 z-[1000] animate-fade-in" style={{ top: 'calc(var(--floating-search-top-pad, 8px) + 60px)' }}>
          <ClimateRiskLegend riskType={selectedClimateRisk} />
        </div>
      )}
    </>
  );
};

export default MobileMapControls;
