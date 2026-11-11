import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface FiltersOverlayProps {
  fullscreen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/** The filter panel laid over the stage (below the picture on phones). Clicks never reach the picture. */
export const FiltersOverlay: React.FC<FiltersOverlayProps> = ({ fullscreen, onClose, children }) => {
  const { t } = useTranslation('developments');
  return (
    <div
      className={cn(
        'z-20 overflow-y-auto',
        fullscreen
          ? 'absolute left-[calc(var(--stage-safe-left,0px)+0.5rem)] right-[calc(var(--stage-safe-right,0px)+0.5rem)] top-[calc(var(--stage-safe-top,0px)+0.75rem)] max-h-[calc(100%-1.5rem-var(--stage-safe-top,0px)-var(--stage-safe-bottom,0px))] sm:left-auto sm:right-[calc(var(--stage-safe-right,0px)+0.75rem)] sm:w-[420px]'
          : 'relative px-2 pb-2 sm:absolute sm:right-3 sm:top-3 sm:max-h-[calc(100%-1.5rem)] sm:w-[420px] sm:p-0'
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-1 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md hover:bg-white"
          aria-label={t('explorer.closeFilters', 'Close filters')}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {children}
    </div>
  );
};
