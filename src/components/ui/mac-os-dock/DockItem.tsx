import React from 'react';
import { formatBadgeCount } from '@/shared/utils/badgeCount';
import DockIcon from './DockIcon';
import type { DockApp } from './types';

interface DockItemProps {
  app: DockApp;
  size: number;
  left: number;
  isOpen: boolean;
  toggleable: boolean;
  itemRef: (el: HTMLButtonElement | null) => void;
  onClick: (el: HTMLButtonElement) => void;
}

/**
 * One dock button. Its left/size come from the resting layout here and are
 * then animated by `useDockMagnification` writing to the element directly.
 */
const DockItem: React.FC<DockItemProps> = ({ app, size, left, isOpen, toggleable, itemRef, onClick }) => {
  const dot = Math.max(4, size * 0.08);
  const badge = formatBadgeCount(app.badge);
  return (
    <button
      ref={itemRef}
      type="button"
      aria-label={app.name}
      aria-pressed={toggleable ? isOpen : undefined}
      onClick={(e) => onClick(e.currentTarget)}
      className={`group absolute bottom-0 flex cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none ${
        isOpen && toggleable ? 'bg-white/80 shadow-sm shadow-black/10' : 'hover:bg-white/40'
      }`}
      style={{ left: `${left}px`, width: `${size}px`, height: `${size}px` }}
    >
      <DockIcon name={app.name} icon={app.icon} />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-neutral-900/85 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
      >
        {app.name}
      </span>
      {badge !== null && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white/80">
          {badge}
        </span>
      )}
      {isOpen && (
        <span
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-neutral-800/70"
          style={{ bottom: `${-Math.max(5, size * 0.12)}px`, width: dot, height: dot }}
        />
      )}
    </button>
  );
};

export default DockItem;
