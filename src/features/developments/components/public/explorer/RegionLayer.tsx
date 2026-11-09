import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DevelopmentBuilding, DevelopmentEntrance, Hotspot, PublicUnit } from '../../../types';
import { AvailabilityPatterns } from './AvailabilityPatterns';
import { FocusPulse } from './FocusPulse';
import { HotspotShape, type HotspotShapeProps } from './HotspotShape';
import type { RegionDisplayMode } from './regionPaint';
import { useUnitText } from './useUnitText';

type Bindings = Pick<HotspotShapeProps, 'onPointerEnter' | 'onPointerMove' | 'onPointerLeave' | 'onPointerDown' | 'onClick' | 'onActivateKey' | 'onFocus' | 'onBlur'>;

interface RegionLayerProps {
  width: number;
  height: number;
  hotspots: Hotspot[];
  unitsById: Map<string, PublicUnit>;
  buildingsById?: Map<string, DevelopmentBuilding>;
  entrancesById?: Map<string, DevelopmentEntrance>;
  matchedIds?: Set<string>;
  mode: RegionDisplayMode;
  activeId?: string;
  /** Homes lit up together (the floor the buyer points at in the floor picker). */
  litUnitIds?: Set<string>;
  linkedIds: Set<string>;
  focused?: Hotspot;
  bind: (h: Hotspot) => Bindings;
}

/** The SVG overlay of a picture: every region, painted by state, plus the budget helper's pulse. */
export const RegionLayer: React.FC<RegionLayerProps> = ({ width: W, height: H, hotspots, unitsById, buildingsById, entrancesById, matchedIds, mode, activeId, litUnitIds, linkedIds, focused, bind }) => {
  const { t } = useTranslation('developments');
  const txt = useUnitText();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="group" aria-label={t('explorer.regions', 'Apartments and buildings')}>
      <AvailabilityPatterns scale={W} />
      {hotspots.map((h) => {
        const unit = h.linkType === 'unit' ? unitsById.get(h.linkId) : undefined;
        // An entrance opens the homes it serves; one that no longer exists stays a plain label.
        const interactive = h.linkType === 'entrance' ? !!entrancesById?.has(h.linkId) : h.linkType !== 'unit' || !!unit;
        return (
          <HotspotShape
            key={h.id}
            hotspot={h}
            width={W}
            height={H}
            state={unit?.availability}
            matched={unit && matchedIds ? matchedIds.has(unit.id) : undefined}
            mode={mode}
            active={activeId === h.id || (!!unit && !!litUnitIds?.has(unit.id))}
            linked={linkedIds.has(h.id)}
            label={txt.hotspotLabel(h, unitsById, buildingsById, entrancesById)}
            interactive={interactive}
            {...bind(h)}
          />
        );
      })}
      {focused && <FocusPulse hotspot={focused} width={W} height={H} />}
    </svg>
  );
};
