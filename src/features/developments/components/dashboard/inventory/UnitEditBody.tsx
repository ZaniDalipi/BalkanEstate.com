import React from 'react';
import type { DashboardUnit, DevelopmentBuilding, DevelopmentFloor } from '../../../types';
import type { UnitSectionProps } from './UnitFieldControls';
import { UnitIdentitySection, UnitSizeSection } from './UnitEditSections';
import { UnitDetailsSection, UnitPricingSection } from './UnitPricingSection';
import { UnitCompanionsSection } from './UnitCompanionsSection';
import { LinkedStatusChoice } from './LinkedStatusChoice';
import { UnitTourField } from './UnitTourField';

interface UnitEditSectionsProps extends UnitSectionProps {
  developmentId: string;
  unit: DashboardUnit;
  buildings: DevelopmentBuilding[];
  floors: DevelopmentFloor[];
}

/** All field groups of the unit editor, in reading order. */
export const UnitEditSections: React.FC<UnitEditSectionsProps> = ({ developmentId, unit, buildings, floors, ...section }) => (
  <>
    <UnitIdentitySection {...section} developmentId={developmentId} buildings={buildings} floors={floors} />
    <LinkedStatusChoice {...section} developmentId={developmentId} unit={unit} />
    <UnitSizeSection {...section} />
    <UnitPricingSection {...section} />
    <UnitDetailsSection {...section} />
    <UnitTourField {...section} unit={unit} />
    <UnitCompanionsSection {...section} developmentId={developmentId} unit={unit} />
  </>
);
