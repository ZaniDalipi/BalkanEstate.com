'use client';

import React, { useEffect, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { validateDockApp } from '@/shared/utils/validation';
import DockIcon from './mac-os-dock/DockIcon';
import { dockPadding, getPositions } from './mac-os-dock/dockMath';
import { useDockMagnification } from './mac-os-dock/useDockMagnification';

export interface DockApp {
  id: string;
  name: string;
  /** An image URL, or any node (e.g. an illustration) that fills the icon box. */
  icon: string | React.ReactNode;
  /** Small count bubble on the icon's corner; hidden when 0 or missing. */
  badge?: number;
}

export interface MacOSDockProps {
  apps: DockApp[];
  onAppClick: (appId: string) => void;
  /** Items that are running / switched on: they get the dot underneath. */
  openApps?: string[];
  /** Announce items as toggle buttons (`aria-pressed`) instead of plain buttons. */
  toggleable?: boolean;
  /** Fixed icon size in px; default follows the viewport. */
  iconSize?: number;
  ariaLabel?: string;
  className?: string;
}

const MacOSDock: React.FC<MacOSDockProps> = ({
  apps,
  onAppClick,
  openApps = [],
  toggleable = false,
  iconSize,
  ariaLabel,
  className,
}) => {
  const reduced = useReducedMotion() ?? false;

  // Drop invalid or repeated items rather than failing the whole dock.
  const items = useMemo(() => {
    const seen = new Set<string>();
    return apps.filter((app) => {
      const result = validateDockApp(app);
      if (!result.isValid || seen.has(app.id)) {
        if (import.meta.env?.DEV) console.warn('[MacOSDock] item skipped:', result.error ?? `duplicate id "${app.id}"`);
        return false;
      }
      seen.add(app.id);
      return true;
    });
  }, [apps]);

  const { dockRef, itemRefs, size, onPointerMove, onPointerLeave } = useDockMagnification(
    items.length,
    iconSize,
    reduced,
  );
  const padding = dockPadding(size);
  const rest = useMemo(() => getPositions(items.map(() => 1), size), [items, size]);

  useEffect(() => {
    itemRefs.current.length = items.length;
  }, [items.length, itemRefs]);

  if (items.length === 0) return null;

  const bounce = (el: HTMLElement | null) => {
    if (reduced || !el || typeof el.animate !== 'function') return;
    el.animate(
      [{ transform: 'translateY(0)' }, { transform: `translateY(${-Math.max(8, size * 0.2)}px)` }, { transform: 'translateY(0)' }],
      { duration: 400, easing: 'ease-out' },
    );
  };

  return (
    <div
      ref={dockRef}
      role="group"
      aria-label={ariaLabel}
      className={cn('max-w-full border border-white/15 bg-neutral-800/75 backdrop-blur-md', className)}
      style={{
        width: `${(rest[rest.length - 1] ?? 0) + size / 2 + padding * 2}px`,
        borderRadius: `${Math.max(12, size * 0.4)}px`,
        padding: `${padding}px`,
        boxShadow: `0 ${Math.max(4, size * 0.1)}px ${Math.max(16, size * 0.4)}px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)`,
      }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div className="relative w-full" style={{ height: `${size}px` }}>
        {items.map((app, i) => {
          const isOpen = openApps.includes(app.id);
          return (
            <button
              key={app.id}
              type="button"
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              aria-label={app.name}
              aria-pressed={toggleable ? isOpen : undefined}
              onClick={(e) => {
                bounce(e.currentTarget);
                onAppClick(app.id);
              }}
              className="group absolute bottom-0 flex cursor-pointer flex-col items-center justify-end rounded-[22%] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              style={{ left: `${rest[i] - size / 2}px`, width: `${size}px`, height: `${size}px` }}
            >
              <DockIcon name={app.name} icon={app.icon} />
              <span
                role="presentation"
                className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900/90 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
              >
                {app.name}
              </span>
              {app.badge !== undefined && app.badge > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold leading-none text-white">
                  {app.badge}
                </span>
              )}
              {isOpen && (
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 -translate-x-1/2 rounded-full bg-white/80 shadow"
                  style={{ bottom: `${-Math.max(5, size * 0.09)}px`, width: Math.max(4, size * 0.06), height: Math.max(4, size * 0.06) }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MacOSDock;
