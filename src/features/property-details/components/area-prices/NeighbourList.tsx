/**
 * NeighbourList — the homes nearby, in two tabs: what recently sold or was
 * let (at the price it went for), and what is on the market now.
 */

import React, { useMemo, useState } from 'react';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import type { AreaNeighbour } from '../../api/areaPricesApi';
import { AREA_COLORS, colorFor, fmtDistance, fmtMonthYear } from './format';
import type { AreaFormat } from './useAreaFormat';

export interface NeighbourListProps {
  neighbours: AreaNeighbour[];
  format: AreaFormat;
  highlightedId: string | null;
  onHighlight: (id: string | null) => void;
}

const LIST_SIZE = 6;

type Tab = 'closed' | 'active';

const NeighbourList: React.FC<NeighbourListProps> = ({ neighbours, format, highlightedId, onHighlight }) => {
  const [tab, setTab] = useState<Tab>('closed');
  const { labels } = format;

  const lists = useMemo(() => ({
    // Anything that sold or was let — a rental back on the market included,
    // at the rent it last went for.
    closed: neighbours
      .filter((n) => n.closedAt)
      .sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? '')),
    active: neighbours.filter((n) => n.status === 'active'),
  }), [neighbours]);

  const shown = lists[tab];
  const tabs: Array<[Tab, string, number, string]> = [
    ['closed', labels.recentlyClosed, lists.closed.length, AREA_COLORS.closed],
    ['active', labels.active, lists.active.length, AREA_COLORS.active],
  ];

  return (
    <div className="min-w-0">
      <div role="tablist" className="flex gap-1 p-1 bg-neutral-100 rounded-xl mb-2">
        {tabs.map(([key, label, count, color]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg transition-colors ${
              tab === key ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {label}
            <span className="text-neutral-400">{count}</span>
          </button>
        ))}
      </div>
      {shown.length > 0 ? (
        <ul className="space-y-0.5">
          {shown.slice(0, LIST_SIZE).map((n) => (
            <NeighbourRow key={n.id} n={n} asClosed={tab === 'closed'} format={format} highlighted={highlightedId === n.id} onHighlight={onHighlight} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500 py-6 text-center">{tab === 'closed' ? labels.noneClosed : labels.noneActive}</p>
      )}
    </div>
  );
};

interface NeighbourRowProps {
  n: AreaNeighbour;
  /** Show the sale or let, not the current listing. */
  asClosed: boolean;
  format: AreaFormat;
  highlighted: boolean;
  onHighlight: (id: string | null) => void;
}

export const NeighbourRow: React.FC<NeighbourRowProps> = ({ n, asClosed, format, highlighted, onHighlight }) => {
  const image = n.imageUrl ? optimizeCloudinaryUrl(n.imageUrl, { width: 160, height: 120, crop: 'fill' }) : undefined;
  const price = asClosed ? n.closedPrice ?? n.price : n.price;
  const perSqm = asClosed ? n.closedValue : n.pricePerSqm;
  const status = asClosed
    ? `${format.labels.closed}${n.closedAt ? ` ${fmtMonthYear(n.closedAt)}` : ''}`
    : format.labels.active;

  return (
    <li>
      <button
        type="button"
        onClick={() => navigate(paths.property(n.id))}
        onMouseEnter={() => onHighlight(n.id)}
        onMouseLeave={() => onHighlight(null)}
        className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors ${highlighted ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}
      >
        <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
          {image && <img src={image} alt="" loading="lazy" className="w-full h-full object-cover" />}
          <span className="absolute bottom-0 inset-x-0 h-1" style={{ background: asClosed ? AREA_COLORS.closed : colorFor(n.status) }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-900 truncate">{n.title || n.address}</p>
          <p className="text-xs text-neutral-500">
            {status} · {fmtDistance(n.distanceM)}
            {n.sqft ? ` · ${n.sqft} m²` : ''}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-neutral-900">{format.price(price)}</p>
          {format.showsPerSqm && perSqm != null && <p className="text-xs text-neutral-500">{format.value(perSqm)}</p>}
        </div>
      </button>
    </li>
  );
};

export default NeighbourList;
