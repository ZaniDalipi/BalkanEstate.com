import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import type { FloorStop } from './floorStack';
import { FloorStopButton } from './FloorStopButton';

interface FloorPickerProps {
  stops: FloorStop[];
  /** The floor on show; none while the whole building is. */
  activeId?: string;
  /** Open a floor, or the whole building again (null). */
  onSelect: (floorId: string | null) => void;
  /** The floor under the pointer or focus (null: none), so the building can light it up. */
  onPreview: (floorId: string | null) => void;
  /** 'column' beside the full-screen picture; 'row' of chips under the picture on phones. */
  layout: 'column' | 'row';
}

/**
 * The building's elevator: every floor, top first, with how many homes are
 * free and whether it has a floor plan to open. Pointing at a floor lights its
 * homes up on the building; choosing it opens that floor (its picture, or its
 * homes floor by floor). "Whole building" comes back out. Beside the
 * full-screen picture it is a slim column of floor numbers, so it hides as
 * little of the picture as it can, and opens wide on hover or keyboard focus.
 */
export const FloorPicker: React.FC<FloorPickerProps> = ({ stops, activeId, onSelect, onPreview, layout }) => {
  const { t } = useTranslation('developments');
  if (stops.length === 0) return null;
  const column = layout === 'column';
  return (
    <nav
      aria-label={t('explorer.floors.title', 'Floors')}
      className={cn(
        'rounded-2xl bg-white/92 p-1.5 shadow-xl ring-1 ring-black/5 backdrop-blur-md',
        column
          ? 'group/floors flex max-h-full w-[3.75rem] flex-col gap-0.5 overflow-y-auto overflow-x-hidden overscroll-contain transition-[width] duration-200 ease-out motion-reduce:transition-none hover:w-48 focus-within:w-48 landscape:w-12 landscape:p-1 landscape:hover:w-44 landscape:focus-within:w-44'
          : 'flex max-w-full gap-1 overflow-x-auto overscroll-x-contain'
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerLeave={() => onPreview(null)}
    >
      <FloorStopButton stop={null} on={!activeId} layout={layout} onSelect={() => onSelect(null)} />
      {stops.map((s) => (
        <FloorStopButton key={s.id} stop={s} on={s.id === activeId} layout={layout} onSelect={() => onSelect(s.id)} onPreview={onPreview} />
      ))}
    </nav>
  );
};
