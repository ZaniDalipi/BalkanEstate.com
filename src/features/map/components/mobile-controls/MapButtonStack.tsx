import React from 'react';
import { useTranslation } from 'react-i18next';
import { CrosshairsIcon, PencilIcon } from '@/constants';
import XmarkIcon from '@/src/components/ui/XmarkIcon';
import GlassIconButton from './GlassIconButton';

interface MapButtonStackProps {
  handleRecenter: () => void;
  handleResetView?: () => void;
  isDrawing: boolean;
  onDrawStart: () => void;
}

const Divider = () => <span aria-hidden="true" className="mx-2.5 h-px bg-neutral-900/10" />;

/**
 * Apple Maps-style glass button stacks, top right: Locate · Reset, then Draw
 * on its own. Every button has a short caption. Map settings live behind the
 * "Map Options" button at the bottom (MapOptionsFab).
 */
const MapButtonStack: React.FC<MapButtonStackProps> = ({
  handleRecenter, handleResetView, isDrawing, onDrawStart,
}) => {
  const { t } = useTranslation(['search', 'common']);
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="thumb-glass relative flex flex-col rounded-[24px] p-0.5">
        <GlassIconButton label={t('search:map.centerOnLocation', 'Center on my location')} caption={t('search:map.locate', 'Locate')} onClick={handleRecenter}>
          <CrosshairsIcon className="h-5 w-5" />
        </GlassIconButton>
        {handleResetView && (
          <>
            <Divider />
            <GlassIconButton label={t('common:aria.resetView', 'Reset view')} caption={t('search:map.reset', 'Reset')} onClick={handleResetView}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 4.5H4.5V9M15 4.5h4.5V9M9 19.5H4.5V15M15 19.5h4.5V15" />
              </svg>
            </GlassIconButton>
          </>
        )}
      </div>

      <div className="thumb-glass relative rounded-[24px] p-0.5">
        <GlassIconButton
          label={isDrawing ? t('search:map.cancel', 'Cancel') : t('search:map.drawAreaHint', 'Draw a search area on the map')}
          caption={isDrawing ? t('search:map.cancel', 'Cancel') : t('search:map.draw', 'Draw')}
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
