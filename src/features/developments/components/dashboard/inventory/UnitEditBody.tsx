import React from 'react';
import type { DevelopmentBuilding, DevelopmentFloor } from '../../../types';
import type { UnitSectionProps } from './UnitFieldControls';
import { UnitIdentitySection, UnitSizeSection } from './UnitEditSections';
import { UnitDetailsSection, UnitPricingSection } from './UnitPricingSection';

interface UnitEditSectionsProps extends UnitSectionProps {
  developmentId: string;
  buildings: DevelopmentBuilding[];
  floors: DevelopmentFloor[];
}

/** All field groups of the unit editor, in reading order. */
export const UnitEditSections: React.FC<UnitEditSectionsProps> = ({ developmentId, buildings, floors, ...section }) => (
  <>
    <UnitIdentitySection {...section} developmentId={developmentId} buildings={buildings} floors={floors} />
    <UnitSizeSection {...section} />
    <UnitPricingSection {...section} />
    <UnitDetailsSection {...section} />
  </>
);
