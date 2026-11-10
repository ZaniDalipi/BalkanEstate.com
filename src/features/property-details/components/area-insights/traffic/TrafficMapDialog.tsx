import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';

export interface TrafficMapDialogProps {
  onClose: () => void;
  /** The map, filling the screen. */
  map: React.ReactNode;
  /** Day and hour controls, under the map. */
  controls: React.ReactNode;
}

/**
 * The typical-traffic map on the whole screen: phones get room to pan and
 * pinch. Esc or the close button returns to the page, focus back on the
 * button that opened it. Above the floating header and sidebar (z 5000, the
 * dialog layer).
 */
const TrafficMapDialog: React.FC<TrafficMapDialogProps> = ({ onClose, map, controls }) => {
  const { t } = useTranslation(['property']);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEscapeLayer(dialogRef, onClose);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[5000] flex flex-col overscroll-contain bg-white"
    >
      <div
        className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-2"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 0.5rem)' }}
      >
        <h2 id={titleId} className="text-base sm:text-lg font-bold text-neutral-900">
          {t('property:areaInsights.traffic.mapTitle', 'Typical traffic around this home')}
        </h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t('property:areaInsights.traffic.closeMap', 'Close map')}
          className="inline-flex h-11 w-11 landscape:h-[32px] landscape:w-[32px] items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X aria-hidden="true" className="h-6 w-6" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">{map}</div>
      <div
        className="border-t border-neutral-200 px-4 pt-3 landscape:pt-2"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      >
        {controls}
      </div>
    </div>,
    document.body
  );
};

export default TrafficMapDialog;
