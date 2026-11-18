import React from 'react';
import MapLayerDock, { type MapLayerDockProps } from '../layer-dock/MapLayerDock';
import MapStyleBar, { type MapStyleBarProps } from './MapStyleBar';
import DrawnAreaActions, { type DrawnAreaActionsProps } from './DrawnAreaActions';

export type DesktopMapControlsProps = MapLayerDockProps &
  MapStyleBarProps &
  Omit<DrawnAreaActionsProps, 'onClear'>;

/** Bottom-right desktop stack: style bar, layer dock, drawn-area actions. */
const DesktopMapControls: React.FC<DesktopMapControlsProps> = (props) => {
  const { hasDrawnArea, isDrawing, clearDrawnArea, isAuthenticated, isSaving, onSaveSearch } = props;
  return (
    <div className="absolute bottom-24 right-4 z-[1000] hidden flex-col items-end gap-2.5 landscape:bottom-6 landscape:right-2 landscape:gap-1.5 md:flex">
      <MapStyleBar {...props} />
      <MapLayerDock {...props} />
      {hasDrawnArea && !isDrawing && (
        <DrawnAreaActions
          isAuthenticated={isAuthenticated}
          isSaving={isSaving}
          onSaveSearch={onSaveSearch}
          onClear={clearDrawnArea}
        />
      )}
    </div>
  );
};

export default DesktopMapControls;
