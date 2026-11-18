import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Legend, ClimateRiskLegend } from '../GoogleMapLegend';
import type { GoogleMapControlsProps } from '../GoogleMapControls';
import MapButtonStack from './MapButtonStack';
import MobileDrawnAreaBar from './MobileDrawnAreaBar';
import MapLayersSheet from './layers-sheet/MapLayersSheet';
import { countActiveLayers } from './hasActiveLayers';
import LayersHint from './LayersHint';
import { useLayersHint } from './useLayersHint';

/** Everything the map shows on a phone: the glass button stacks (with a first-visit hint), the Map sheet and the legends. */
const MobileMapControls: React.FC<GoogleMapControlsProps> = (props) => {
  const { isLegendOpen, selectedClimateRisk, isLayerMenuOpen, setIsLayerMenuOpen, drawnBounds, isDrawing, onDrawComplete } = props;
  const clearDrawnArea = () => onDrawComplete(null);
  const hint = useLayersHint(isLayerMenuOpen || isDrawing);
  const openSheet = () => {
    hint.dismiss();
    setIsLayerMenuOpen(true);
  };

  return (
    <>
      {/* Top right, below the floating search bar. */}
      {/* While the hint shows, sit above the climate legend (z 1000) so it can't cover the tip. */}
      <div
        className={`absolute right-2 flex flex-col items-end gap-2 ${hint.visible ? 'z-[1001]' : 'z-[999]'}`}
        style={{ top: 'calc(var(--floating-search-top-pad, 8px) + 60px)' }}
      >
        <AnimatePresence>
          {hint.visible && <LayersHint key="layers-hint" onOpen={openSheet} onDismiss={hint.dismiss} />}
        </AnimatePresence>
        <MapButtonStack
          isSheetOpen={isLayerMenuOpen}
          onOpenSheet={openSheet}
          activeLayerCount={countActiveLayers(props)}
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
