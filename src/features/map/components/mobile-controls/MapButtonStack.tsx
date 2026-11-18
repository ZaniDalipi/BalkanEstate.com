import React from 'react';
import { useTranslation } from 'react-i18next';
import { CrosshairsIcon, PencilIcon } from '@/constants';
import GlassIconButton from './GlassIconButton';
import XmarkIcon from '@/src/components/ui/XmarkIcon';

interface MapButtonStackProps {
  isSheetOpen: boolean;
  onOpenSheet: () => void;
  /** Any layer or overlay switched on: the Map button shows a dot. */
  hasActiveLayers: boolean;
  handleRecenter: () => void;
  handleResetView?: () => void;
  isDrawing: boolean;
  onDrawStart: () => void;
}

const Divider = () => <span aria-hidden="true" className="mx-2 h-px bg-neutral-900/10" />;

/** Apple Maps-style glass button stacks, top right: Map · Locate · Reset, then Draw on its own. */
const MapButtonStack: React.FC<MapButtonStackProps> = ({
  isSheetOpen, onOpenSheet, hasActiveLayers, handleRecenter, handleResetView, isDrawing, onDrawStart,
}) => {
  const { t } = useTranslation(['search', 'common']);
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="thumb-glass relative flex flex-col rounded-full p-0.5">
        <GlassIconButton
          label={t('search:map.layers', 'Layers')}
          tone={hasActiveLayers ? 'on' : 'plain'}
          aria-haspopup="dialog"
          aria-expanded={isSheetOpen}
          onClick={onOpenSheet}
        >
          <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3.5 21 8l-9 4.5L3 8z" />
            <path d="m3 12.2 9 4.5 9-4.5M3 16.2l9 4.5 9-4.5" strokeLinecap="round" />
          </svg>
          {hasActiveLayers && <span aria-hidden="true" className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />}
        </GlassIconButton>
        <Divider />
        <GlassIconButton label={t('search:map.centerOnLocation', 'Center on my location')} onClick={handleRecenter}>
          <CrosshairsIcon className="h-[21px] w-[21px]" />
        </GlassIconButton>
        {handleResetView && (
          <>
            <Divider />
            <GlassIconButton label={t('common:aria.resetView', 'Reset view')} onClick={handleResetView}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 4.5H4.5V9M15 4.5h4.5V9M9 19.5H4.5V15M15 19.5h4.5V15" />
              </svg>
            </GlassIconButton>
          </>
        )}
      </div>

      <div className="thumb-glass relative rounded-full p-0.5">
        <GlassIconButton
          label={isDrawing ? t('search:map.cancel', 'Cancel') : t('search:map.drawAreaHint', 'Draw a search area on the map')}
          tone={isDrawing ? 'danger' : 'dark'}
          aria-pressed={isDrawing}
          onClick={onDrawStart}
        >
          {isDrawing ? <XmarkIcon className="h-[18px] w-[18px]" strokeWidth={2.75} /> : <PencilIcon className="h-5 w-5" />}
        </GlassIconButton>
      </div>
    </div>
  );
};

export default MapButtonStack;
