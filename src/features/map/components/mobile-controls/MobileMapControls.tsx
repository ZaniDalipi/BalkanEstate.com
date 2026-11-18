import React from 'react';
import { Legend, ClimateRiskLegend } from '../GoogleMapLegend';
import type { GoogleMapControlsProps } from '../GoogleMapControls';
import MobileLayerMenu from './MobileLayerMenu';
import MobileMapActions from './MobileMapActions';

/** Everything the map shows on a phone: layer menu, actions and legends. */
const MobileMapControls: React.FC<GoogleMapControlsProps> = (props) => {
  const { isLegendOpen, selectedClimateRisk } = props;
  return (
    <>
      <MobileLayerMenu {...props} />
      <MobileMapActions {...props} />

    {/* Mobile Legend */}
    {isLegendOpen && (
      <div className="absolute bottom-44 left-3 z-[1002] animate-fade-in">
        <Legend />
      </div>
    )}

    {/* Climate Risk Legend for mobile: sits below the floating search bar */}
    {selectedClimateRisk !== 'none' && (
      <div className="absolute left-2 z-[1000] animate-fade-in" style={{ top: 'calc(var(--floating-search-top-pad, 8px) + 60px)' }}>
        <ClimateRiskLegend riskType={selectedClimateRisk} />
      </div>
    )}
    </>
  );
};

export default MobileMapControls;
