import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePublicUnit } from '../../../../hooks/useDevelopment';
import type { DevelopmentFloor, PublicUnit } from '../../../../types';
import { UnitMedia } from './UnitMedia';
import { UnitHeader } from './UnitHeader';
import { UnitSpecs } from './UnitSpecs';
import { UnitActions } from './UnitActions';
import { DrawerCompanions } from './DrawerCompanions';
import { useUnitDrawer } from '../../../../hooks/useUnitDrawer';
import { TourButton } from './TourButton';
import { UnitFloorShot } from './UnitFloorShot';
import { hasUnitMedia } from './unitGallery';
import { useFloorShot } from './showcase/useFloorShot';

interface DrawerUnitContentProps {
  slug: string;
  unitId: string;
  preview?: PublicUnit;
  onChildModalChange: (open: boolean) => void;
  /** Desktop: the details are the floating card beside the apartment showcase, which already shows its plan or photos. */
  besideShowcase?: boolean;
  /** The residence's floors: which have a picture to show the apartment on. */
  floors?: Pick<DevelopmentFloor, 'id' | 'hasViews'>[];
}

/** The drawer body: media, heading + price, specs, features and the actions. */
export const DrawerUnitContent: React.FC<DrawerUnitContentProps> = ({ slug, unitId, preview, onChildModalChange, besideShowcase, floors }) => {
  const { t } = useTranslation('developments');
  const { unit: full, development, listings, companions, isLoading, error } = usePublicUnit(slug, unitId);
  const drawer = useUnitDrawer();
  const unit = full ?? preview;
  // Beside the showcase its floor picture is on the stage; here (phones, or no showcase) it is part of the details.
  const hasPicture = unit?.floorId ? floors?.find((f) => f.id === unit.floorId)?.hasViews : undefined;
  const floor = useFloorShot(slug, unit, { enabled: !besideShowcase, hasPicture });

  if (!unit) {
    return isLoading ? (
      <div className="space-y-3 p-5" aria-busy="true">
        <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-6 w-1/2 animate-pulse rounded bg-slate-100" />
      </div>
    ) : (
      <p role="alert" className="p-6 text-sm text-slate-600">
        {error ? t('explorer.drawer.loadError', 'This apartment could not be loaded.') : t('errors.notFound', 'Not found')}
      </p>
    );
  }

  const primary = listings.find((l) => l.id === unit.primaryListingId);
  // No photo or plan: the floor picture leads, in place of the empty placeholder.
  const floorLeads = floor.status !== 'none' && !hasUnitMedia(unit, primary);

  return (
    <div className="pb-6">
      {floorLeads ? (
        <UnitFloorShot unit={unit} floor={floor} variant="hero" />
      ) : (
        <UnitMedia unit={unit} primaryListing={primary} onModalChange={onChildModalChange} heroBeside={besideShowcase} />
      )}
      <div className={besideShowcase ? 'space-y-5 px-6 pt-6' : 'space-y-5 px-5 pt-5'}>
        <UnitHeader unit={unit} variant={besideShowcase ? 'card' : 'sheet'} />

        <TourButton unit={unit} />

        <UnitSpecs unit={unit} />

        {!floorLeads && <UnitFloorShot unit={unit} floor={floor} variant="section" />}

        <DrawerCompanions companions={companions} onOpen={drawer.open} />

        {unit.description && <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{unit.description}</p>}

        {full && (
          <UnitActions
            slug={slug}
            unit={full}
            development={development}
            onModalChange={onChildModalChange}
          />
        )}
      </div>
    </div>
  );
};
