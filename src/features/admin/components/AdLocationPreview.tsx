import React from 'react';
import type { AdPage, AdPlacement } from '@/src/features/promo/types';

interface Props {
  page: AdPage;
  placement: AdPlacement;
}

/** Route + friendly label for each targetable page. */
export const PAGE_ROUTE: Record<AdPage, { path: string; label: string }> = {
  all: { path: 'Every page', label: 'All Pages' },
  home: { path: '/', label: 'Home' },
  search: { path: '/search', label: 'Search Results' },
  rentals: { path: '/rent', label: 'Rentals' },
  villas: { path: '/villas', label: 'Villas' },
  'property-details': { path: '/property/…', label: 'Property Details' },
  agents: { path: '/agents', label: 'Agents' },
  agencies: { path: '/agencies', label: 'Agencies' },
  'business-directory': { path: '/business-directory', label: 'Business Directory' },
  blog: { path: '/blog', label: 'Blog' },
  guides: { path: '/guides', label: 'Guides' },
};

/** Human explanation of each placement. */
export const PLACEMENT_INFO: Record<AdPlacement, { label: string; description: string; shape: string }> = {
  'sticky-bottom': {
    label: 'Sticky Bottom Bar',
    description: 'A slim bar pinned to the bottom of the screen that stays visible as the visitor scrolls.',
    shape: 'Wide banner · 970 × 90',
  },
  'sticky-top': {
    label: 'Sticky Top Bar',
    description: 'A slim bar pinned to the very top of the screen, always in view.',
    shape: 'Wide banner · 970 × 90',
  },
  header: {
    label: 'Header',
    description: 'A banner in the header area, near the top of the page content.',
    shape: 'Wide banner · 970 × 90',
  },
  'in-content': {
    label: 'In Content',
    description: 'A large banner placed inside the page content — between sections, or inside the results feed.',
    shape: 'Billboard · 970 × 250',
  },
  sidebar: {
    label: 'Sidebar / Side Rail',
    description: 'A tall banner in the side column or page margins. On the home page the left rail is order 0 and the right rail is order 1.',
    shape: 'Half-page · 300 × 600',
  },
  footer: {
    label: 'Footer',
    description: 'A banner near the bottom of the page content, just above the footer.',
    shape: 'Billboard · 970 × 250',
  },
};

/**
 * Build a live-site URL that opens the page where this banner shows, with ad
 * preview mode on (slots highlighted) and the placement focused for scroll.
 * property-details / all have no single URL, so we land on a sensible page and
 * preview mode stays on as the user navigates.
 */
export const buildAdPreviewUrl = (page: AdPage, placement: AdPlacement, lang: string): string => {
  let route = PAGE_ROUTE[page].path;
  if (page === 'all') route = '/';
  if (page === 'property-details') route = '/search'; // open a listing from here
  if (!route.startsWith('/')) route = '/';
  const prefix = `/${lang || 'en'}`;
  const full = route === '/' ? prefix : `${prefix}${route}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${full}?adPreview=1&adFocus=${placement}`;
};

const HIGHLIGHT = 'rgba(79,70,229,0.92)';

/** Where the highlighted ad block sits on the mini page wireframe. */
const highlightStyle = (placement: AdPlacement, side?: 'left' | 'right'): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    background: HIGHLIGHT,
    border: '1px dashed #ffffff',
    borderRadius: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: '0.03em',
    boxShadow: '0 0 0 2px rgba(79,70,229,0.25)',
  };
  switch (placement) {
    case 'sticky-top':
      return { ...base, top: 2, left: 6, right: 6, height: 12 };
    case 'header':
      return { ...base, top: 22, left: 6, right: 6, height: 14 };
    case 'in-content':
      return { ...base, top: 62, left: 10, right: 10, height: 26 };
    case 'footer':
      return { ...base, bottom: 6, left: 6, right: 6, height: 16 };
    case 'sticky-bottom':
      return { ...base, bottom: 1, left: 6, right: 6, height: 12 };
    case 'sidebar':
      return side === 'left'
        ? { ...base, top: 30, bottom: 12, left: 6, width: 22 }
        : { ...base, top: 30, bottom: 12, right: 6, width: 22 };
    default:
      return base;
  }
};

/**
 * Renders a mini "browser" wireframe of the chosen page with the ad position
 * highlighted, so the admin can see exactly where the banner will appear.
 */
const AdLocationPreview: React.FC<Props> = ({ page, placement }) => {
  const route = PAGE_ROUTE[page];
  const info = PLACEMENT_INFO[placement];
  // Home shows two side rails; every other page shows a single (right) rail.
  const showLeftRail = placement === 'sidebar' && page === 'home';

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Wireframe */}
        <div
          style={{
            width: 260,
            maxWidth: '100%',
            flexShrink: 0,
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          {/* Browser chrome with the route */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 22, padding: '0 8px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171' }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24' }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
            <span
              style={{
                marginLeft: 6,
                flex: 1,
                fontSize: 8,
                color: '#64748b',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 999,
                padding: '1px 8px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              balkanestateai.com{route.path.startsWith('/') ? route.path : ''}
            </span>
          </div>

          {/* Page body */}
          <div style={{ position: 'relative', height: 172, background: '#f8fafc', padding: 6 }}>
            {/* Nav strip */}
            <div style={{ height: 14, borderRadius: 3, background: '#cbd5e1', marginBottom: 6 }} />
            {/* Content skeleton */}
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ height: 20, borderRadius: 3, background: '#e2e8f0' }} />
                <div style={{ height: 34, borderRadius: 3, background: '#e2e8f0' }} />
                <div style={{ height: 34, borderRadius: 3, background: '#e2e8f0' }} />
                <div style={{ height: 20, borderRadius: 3, background: '#e2e8f0' }} />
                <div style={{ height: 20, borderRadius: 3, background: '#e2e8f0' }} />
              </div>
            </div>

            {/* Highlighted ad position */}
            {showLeftRail && <div style={highlightStyle('sidebar', 'left')}>AD</div>}
            <div style={highlightStyle(placement, placement === 'sidebar' ? 'right' : undefined)}>
              {placement === 'sidebar' ? 'AD' : 'YOUR AD'}
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="flex-1 min-w-0 space-y-2 text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">{route.label}</span>
            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs font-medium">{info.label}</span>
          </div>
          <p className="text-gray-700">{info.description}</p>
          <p className="text-gray-500">
            <span className="font-medium text-gray-600">Shows on:</span>{' '}
            {page === 'all' ? 'every page across the site' : <code className="px-1 py-0.5 rounded bg-gray-100 text-gray-700">{route.path}</code>}
          </p>
          <p className="text-gray-500">
            <span className="font-medium text-gray-600">Recommended image:</span> {info.shape}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdLocationPreview;
