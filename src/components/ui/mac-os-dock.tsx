'use client';

import React, { useEffect, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import DockItem from './mac-os-dock/DockItem';
import { dockPadding, getPositions } from './mac-os-dock/dockMath';
import type { DockApp } from './mac-os-dock/types';
import { useDockMagnification } from './mac-os-dock/useDockMagnification';
import { useValidDockApps } from './mac-os-dock/useValidDockApps';

export type { DockApp };

export interface MacOSDockProps {
  apps: DockApp[];
  onAppClick: (appId: string) => void;
  /** Items that are running / switched on: highlighted, with a dot underneath. */
  openApps?: string[];
  /** Announce items as toggle buttons (`aria-pressed`) instead of plain buttons. */
  toggleable?: boolean;
  /** Resting icon size in px (32–128); default follows the viewport. */
  iconSize?: number;
  /** How much the icon under the pointer grows (1–3); default follows the viewport. */
  maxScale?: number;
  ariaLabel?: string;
  className?: string;
}

/** macOS-style magnifying dock on iOS liquid glass (`.thumb-glass`). */
const MacOSDock: React.FC<MacOSDockProps> = ({
  apps,
  onAppClick,
  openApps = [],
  toggleable = false,
  iconSize,
  maxScale,
  ariaLabel,
  className,
}) => {
  const reduced = useReducedMotion() ?? false;
  const items = useValidDockApps(apps);
  const { dockRef, itemRefs, size, onPointerMove, onPointerLeave } = useDockMagnification(
    items.length,
    { iconSize, maxScale },
    reduced,
  );
  const padding = dockPadding(size);
  const rest = useMemo(() => getPositions(items.map(() => 1), size), [items, size]);

  useEffect(() => {
    itemRefs.current.length = items.length;
  }, [items.length, itemRefs]);

  if (items.length === 0) return null;

  const bounce = (el: HTMLElement) => {
    if (reduced || typeof el.animate !== 'function') return;
    el.animate(
      [{ transform: 'translateY(0)' }, { transform: `translateY(${-Math.max(6, size * 0.18)}px)` }, { transform: 'translateY(0)' }],
      { duration: 360, easing: 'ease-out' },
    );
  };

  return (
    <div
      ref={dockRef}
      role="group"
      aria-label={ariaLabel}
      className={cn('thumb-glass relative max-w-full rounded-full', className)}
      style={{ width: `${(rest[rest.length - 1] ?? 0) + size / 2 + padding * 2}px`, padding: `${padding}px` }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div className="relative w-full" style={{ height: `${size}px` }}>
        {items.map((app, i) => (
          <DockItem
            key={app.id}
            app={app}
            size={size}
            left={rest[i] - size / 2}
            isOpen={openApps.includes(app.id)}
            toggleable={toggleable}
            itemRef={(el) => {
              itemRefs.current[i] = el;
            }}
            onClick={(el) => {
              bounce(el);
              onAppClick(app.id);
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default MacOSDock;
