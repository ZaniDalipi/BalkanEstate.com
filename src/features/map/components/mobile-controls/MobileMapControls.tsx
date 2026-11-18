import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Legend, ClimateRiskLegend } from '../GoogleMapLegend';
import type { GoogleMapControlsProps } from '../GoogleMapControls';
import MapButtonStack from './MapButtonStack';
import MapOptionsFab from './MapOptionsFab';
import MobileDrawnAreaBar from './MobileDrawnAreaBar';
import MapLayersSheet from './layers-sheet/MapLayersSheet';
import { countActiveLayers } from './hasActiveLayers';
import { useMapOptionsDiscovery } from './useMapOptionsDiscovery';

/**
 * Bottom-left spots, one row above the search pages' List/Map switch (which
 * sits at ~7–8rem plus its own height): the Map Options button, and the legend
 * above that.
 */
const FAB_BOTTOM = 'calc(12.75rem + env(safe-area-inset-bottom, 0px))';
const LEGEND_BOTTOM = 'calc(17rem + env(safe-area-inset-bottom, 0px))';
const BELOW_SEARCH_BAR = 'calc(var(--floating-search-top-pad, 8px) + 60px)';

/** Everything the map shows on a phone: the glass button stack, the Map Options button and sheet, and the legends. */
const MobileMapControls: React.FC<GoogleMapControlsProps> = (props) => {
  const { isLegendOpen, selectedClimateRisk, isLayerMenuOpen, setIsLayerMenuOpen, drawnBounds, isDrawing, onDrawComplete } = props;
  const clearDrawnArea = () => onDrawComplete(null);
  const discovery = useMapOptionsDiscovery();
  const openSheet = () => {
    discovery.markOpened();
    setIsLayerMenuOpen(true);
  };

  return (
    <>
      <div className="absolute right-2 z-[999] flex flex-col items-end gap-2" style={{ top: BELOW_SEARCH_BAR }}>
        <MapButtonStack
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

      <div className="absolute left-3 z-[1002]" style={{ bottom: FAB_BOTTOM }}>
        <AnimatePresence>
          {!isDrawing && !isLayerMenuOpen && (
            <MapOptionsFab
              key="map-options-fab"
              onOpen={openSheet}
              isSheetOpen={isLayerMenuOpen}
              activeLayerCount={countActiveLayers(props)}
              isNew={discovery.isNew}
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
        <div className="absolute left-3 z-[1002] animate-fade-in" style={{ bottom: LEGEND_BOTTOM }}>
          <Legend />
        </div>
      )}

      {/* Climate Risk Legend for mobile: top left, below the floating search bar */}
      {selectedClimateRisk !== 'none' && (
        <div className="absolute left-2 z-[1000] animate-fade-in" style={{ top: BELOW_SEARCH_BAR }}>
          <ClimateRiskLegend riskType={selectedClimateRisk} />
        </div>
      )}
    </>
  );
};

export default MobileMapControls;
