import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ContainerScroll } from '@/src/components/ui/ContainerScroll';
import { useHowItWorksContent, HowItWorksContent } from '../hooks/useHowItWorksContent';
import { getProperties } from '@/src/features/properties/api/propertyApi';

interface AppShowcaseSectionProps {
  onNavigate: (view: string, path: string) => void;
}

/* ─── Route config for each static feature ─── */
const STATIC_FEATURES = [
  {
    title: 'AI-Powered Search',
    desc: 'Describe your dream property in natural language and let AI find perfect matches across 11 countries.',
    gradient: 'from-blue-500 to-cyan-400',
    iconBg: 'bg-blue-500/10',
    route: { view: 'search', path: '/search' },
    icon: (
      <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="5" stroke="currentColor" strokeWidth={2} />
        <path d="M14.5 14.5L19 19" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        <path d="M8 11h6M11 8v6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
      </svg>
    ),
  },
  {
    title: '3D Interactive Map',
    desc: 'Explore listings on a 3D map with real-time sunlight, draw-to-search, and points of interest.',
    gradient: 'from-emerald-500 to-teal-400',
    iconBg: 'bg-emerald-500/10',
    route: { view: 'search', path: '/search?view=map' },
    icon: (
      <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none">
        <path d="M3 7l6-3 6 3 6-3v14l-6 3-6-3-6 3V7z" fill="currentColor" opacity={0.12} />
        <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth={1.8} />
        <path d="M12 12.5v2" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Real-Time Messaging',
    desc: 'Chat directly with verified agents and sellers. Schedule viewings and negotiate in-app.',
    gradient: 'from-violet-500 to-purple-400',
    iconBg: 'bg-violet-500/10',
    route: { view: 'messages', path: '/messages' },
    icon: (
      <svg className="w-5 h-5 text-violet-500" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="6" width="16" height="9" rx="3" stroke="currentColor" strokeWidth={1.8} />
        <path d="M8 17l-2 3v-3" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />
        <circle cx="9" cy="10.5" r="1" fill="currentColor" />
        <circle cx="12" cy="10.5" r="1" fill="currentColor" />
        <circle cx="15" cy="10.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Property Valuation',
    desc: 'AI-powered price estimates, market trends, neighbourhood scores, and investment ROI projections.',
    gradient: 'from-amber-500 to-orange-400',
    iconBg: 'bg-amber-500/10',
    route: { view: 'search', path: '/search' },
    icon: (
      <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none">
        <rect x="6" y="12" width="3" height="6" rx="1" fill="currentColor" opacity={0.5} />
        <rect x="10.5" y="8" width="3" height="10" rx="1" fill="currentColor" opacity={0.7} />
        <rect x="15" y="5" width="3" height="13" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Financial Calculators',
    desc: 'Mortgage calculator, rent vs buy comparison, and investment ROI tools to make informed decisions.',
    gradient: 'from-rose-500 to-pink-400',
    iconBg: 'bg-rose-500/10',
    route: { view: 'how-it-works', path: '/how-it-works' },
    icon: (
      <svg className="w-5 h-5 text-rose-500" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth={1.8} />
        <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">&#8364;</text>
      </svg>
    ),
  },
  {
    title: 'Listing Promotions',
    desc: 'Boost visibility with Highlight, Featured, or Premium tiers. Up to 5x more views.',
    gradient: 'from-indigo-500 to-blue-400',
    iconBg: 'bg-indigo-500/10',
    route: { view: 'create-listing', path: '/create-listing' },
    icon: (
      <svg className="w-5 h-5 text-indigo-500" viewBox="0 0 24 24" fill="none">
        <path d="M12 3l2.5 5.5L20 9.5l-4 4 1 5.5L12 16.5 7 19l1-5.5-4-4 5.5-1L12 3z" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" fill="currentColor" opacity={0.15} />
      </svg>
    ),
  },
  {
    title: '10 Languages',
    desc: 'Browse the entire platform in your native language. Full support for all Balkan languages.',
    gradient: 'from-sky-500 to-blue-400',
    iconBg: 'bg-sky-500/10',
    route: { view: 'settings', path: '/settings' },
    icon: (
      <svg className="w-5 h-5 text-sky-500" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth={1.8} />
        <ellipse cx="12" cy="12" rx="3.5" ry="7.5" stroke="currentColor" strokeWidth={1.3} />
        <path d="M4.5 12h15" stroke="currentColor" strokeWidth={1.3} />
      </svg>
    ),
  },
  {
    title: 'Agency & Agent Profiles',
    desc: 'Join as independent agent or create an agency. Manage teams, coupons, and analytics.',
    gradient: 'from-teal-500 to-cyan-400',
    iconBg: 'bg-teal-500/10',
    route: { view: 'agents', path: '/agents' },
    icon: (
      <svg className="w-5 h-5 text-teal-500" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth={1.8} />
        <circle cx="16" cy="8" r="2.5" stroke="currentColor" strokeWidth={1.5} opacity={0.6} />
        <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
        <path d="M14 19c0-2.5 1.5-4.5 3.5-4.5S21 16.5 21 19" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
      </svg>
    ),
  },
];

/* ─── City coordinates for map positioning ─── */
const CITY_COORDS: Record<string, { x: number; y: number }> = {
  tirana: { x: 42, y: 52 }, belgrade: { x: 48, y: 22 }, zagreb: { x: 30, y: 15 },
  sarajevo: { x: 38, y: 32 }, skopje: { x: 52, y: 48 }, podgorica: { x: 36, y: 40 },
  prishtina: { x: 48, y: 42 }, athens: { x: 55, y: 72 }, ljubljana: { x: 22, y: 12 },
  bucharest: { x: 68, y: 20 }, sofia: { x: 62, y: 38 }, thessaloniki: { x: 55, y: 60 },
  dubrovnik: { x: 33, y: 35 }, split: { x: 28, y: 28 }, durres: { x: 40, y: 50 },
};

const PIN_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#6366F1', '#14B8A6', '#F97316', '#A855F7'];

interface MapPin {
  city: string;
  country: string;
  x: number;
  y: number;
  price: string;
  beds: number;
  color: string;
}

/* ─── Phone Map Content ─── */
const PhoneMapContent: React.FC<{ pins: MapPin[] }> = ({ pins: MAP_PINS }) => {
  const [activePin, setActivePin] = useState<number | null>(null);
  const [filter, setFilter] = useState<'buy' | 'rent'>('buy');

  return (
    <div className="h-full w-full flex flex-col bg-[#f8f9fa] relative overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 pt-2 pb-1 text-[8px] text-slate-500">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`w-1 rounded-full ${i <= 3 ? 'bg-slate-700' : 'bg-slate-300'}`} style={{ height: 4 + i }} />
            ))}
          </div>
          <svg className="w-3 h-3 text-slate-700" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth={2} fill="none" /><rect x="20" y="10" width="2" height="4" rx="0.5" fill="currentColor" /><rect x="4" y="8" width="8" height="8" rx="1" fill="currentColor" opacity={0.4} /></svg>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-3 py-1.5">
        <div className="flex items-center bg-white rounded-lg px-2.5 py-1.5 shadow-sm border border-neutral-200/60">
          <svg className="w-3 h-3 text-slate-400 mr-1.5" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="5" stroke="currentColor" strokeWidth={2} />
            <path d="M14.5 14.5L19 19" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          </svg>
          <span className="text-[8px] text-slate-400">Search Balkans...</span>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 px-3 pb-1.5">
        {(['buy', 'rent'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-0.5 rounded-full text-[7px] font-semibold transition-colors ${
              filter === f ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-neutral-200'
            }`}
          >
            {f === 'buy' ? 'Buy' : 'Rent'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-0.5 text-[7px] text-slate-600 font-medium">
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M3 7l6-3 6 3 6-3v14l-6 3-6-3-6 3V7z" />
          </svg>
          {MAP_PINS.length} properties
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 relative bg-gradient-to-br from-neutral-50 via-neutral-100/30 to-neutral-50/20 mx-2 rounded-xl overflow-hidden border border-neutral-200/40">
        {/* Simplified terrain/water */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sea" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          {/* Adriatic Sea */}
          <path d="M15 25 Q20 40 18 55 Q22 65 28 75 L10 80 L5 30Z" fill="url(#sea)" />
          {/* Aegean Sea */}
          <path d="M50 70 Q55 80 60 85 Q65 90 55 95 L45 90 L48 75Z" fill="url(#sea)" />
          {/* Country borders hint */}
          <path d="M20 10 Q35 8 50 12 Q65 15 75 12" stroke="#d1d5db" strokeWidth="0.3" fill="none" strokeDasharray="2 2" />
          <path d="M25 25 Q40 30 55 28 Q65 32 72 30" stroke="#d1d5db" strokeWidth="0.3" fill="none" strokeDasharray="2 2" />
          <path d="M30 45 Q45 42 55 48" stroke="#d1d5db" strokeWidth="0.3" fill="none" strokeDasharray="2 2" />
        </svg>

        {/* Property pins */}
        {MAP_PINS.map((pin, i) => (
          <div
            key={pin.city}
            className="absolute cursor-pointer z-10"
            style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -100%)' }}
            onClick={() => setActivePin(activePin === i ? null : i)}
          >
            {/* Pulse ring — CSS animation instead of framer-motion for perf */}
            <div
              className="absolute -inset-1.5 rounded-full animate-ping opacity-20"
              style={{ backgroundColor: pin.color, animationDuration: '2s' }}
            />
            {/* Pin */}
            <div
              className="w-3.5 h-3.5 rounded-full border-[1.5px] border-white shadow-md relative"
              style={{ backgroundColor: pin.color }}
            >
              <div className="absolute inset-0.5 rounded-full bg-white/30" />
            </div>

            {/* Tooltip */}
            <AnimatePresence>
              {activePin === i && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.9 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-white rounded-lg shadow-lg border border-neutral-100 p-1.5 whitespace-nowrap z-20"
                >
                  <p className="text-[7px] font-bold text-slate-800">{pin.city}, {pin.country}</p>
                  <p className="text-[7px] font-semibold" style={{ color: pin.color }}>{pin.price}</p>
                  <p className="text-[6px] text-slate-400">{pin.beds} beds</p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Bottom tab bar */}
      <div className="flex items-center justify-around px-2 py-2 bg-white border-t border-neutral-100">
        {[
          { label: 'Home', icon: 'M3 12l9-8 9 8M5 11v8a1 1 0 001 1h3v-4h6v4h3a1 1 0 001-1v-8' },
          { label: 'Search', icon: 'M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z' },
          { label: 'Map', icon: 'M3 7l6-3 6 3 6-3v14l-6 3-6-3-6 3V7z', active: true },
          { label: 'Saved', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
          { label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
        ].map((tab) => (
          <div key={tab.label} className="flex flex-col items-center gap-0.5">
            <svg className={`w-3.5 h-3.5 ${tab.active ? 'text-slate-800' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d={tab.icon} />
            </svg>
            <span className={`text-[6px] ${tab.active ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>{tab.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Subsection tabs ─── */
const TABS = [
  { id: 'all', labelKey: 'all' },
  { id: 'getting-started', labelKey: 'gettingStarted' },
  { id: 'premium-features', labelKey: 'premiumFeatures' },
  { id: 'buyers', labelKey: 'forBuyers' },
  { id: 'sellers', labelKey: 'forSellers' },
  { id: 'agents', labelKey: 'forAgents' },
  { id: 'agencies', labelKey: 'forAgencies' },
] as const;

/* ─── Video card component ─── */
const VideoCard: React.FC<{ item: HowItWorksContent; onClick: () => void }> = ({ item, onClick }) => (
  <motion.div
    whileHover={{ y: -3 }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    onClick={onClick}
    className="rounded-xl overflow-hidden border border-neutral-100 bg-white hover:shadow-lg transition-shadow group cursor-pointer"
  >
    <div className="aspect-video relative bg-neutral-100">
      <video src={item.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <svg className="w-4 h-4 text-slate-800 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </div>
      </div>
      {item.difficulty && (
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
          item.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' :
          item.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
          'bg-rose-100 text-rose-700'
        }`}>{item.difficulty}</span>
      )}
    </div>
    <div className="p-3">
      <h4 className="text-xs md:text-sm font-semibold text-slate-800 line-clamp-1">{item.title}</h4>
      {item.description && <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>}
      {item.estimatedTime && (
        <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] md:text-[10px] text-slate-400">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" /></svg>
          {item.estimatedTime}
        </span>
      )}
    </div>
  </motion.div>
);

/* ─── Guide card component ─── */
const GuideCard: React.FC<{ item: HowItWorksContent; onClick: () => void }> = ({ item, onClick }) => (
  <motion.div
    whileHover={{ y: -3 }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    onClick={onClick}
    className="rounded-xl border border-neutral-100 bg-white hover:shadow-lg transition-shadow p-3 md:p-4 cursor-pointer"
  >
    <div className="flex items-start gap-3">
      <motion.div
        whileHover={{ scale: 1.1, rotate: 5 }}
        className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0"
      >
        <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
      <div className="min-w-0">
        <h4 className="text-xs md:text-sm font-semibold text-slate-800 line-clamp-1">{item.title}</h4>
        {item.description && <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>}
        {item.steps && item.steps.length > 0 && (
          <span className="text-[9px] md:text-[10px] text-slate-600 font-medium mt-1 inline-block">{item.steps.length} steps</span>
        )}
      </div>
    </div>
  </motion.div>
);

/* ─── FAQ card component ─── */
const FAQCard: React.FC<{ item: HowItWorksContent; onClick: () => void }> = ({ item, onClick }) => (
  <motion.div
    whileHover={{ y: -3 }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    onClick={onClick}
    className="rounded-xl border border-neutral-100 bg-white hover:shadow-lg transition-shadow p-3 md:p-4 cursor-pointer"
  >
    <div className="flex items-start gap-3">
      <motion.div
        whileHover={{ scale: 1.1, rotate: 5 }}
        className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0"
      >
        <svg className="w-4 h-4 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
      <div className="min-w-0">
        <h4 className="text-xs md:text-sm font-semibold text-slate-800 line-clamp-1">{item.title}</h4>
        {item.faqs && item.faqs.length > 0 && (
          <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">{item.faqs.length} questions answered</p>
        )}
      </div>
    </div>
  </motion.div>
);

/* ─── Content card router ─── */
const ContentCard: React.FC<{ item: HowItWorksContent; onClick: () => void }> = ({ item, onClick }) => {
  switch (item.contentType) {
    case 'video': return <VideoCard item={item} onClick={onClick} />;
    case 'guide': return <GuideCard item={item} onClick={onClick} />;
    case 'faq': return <FAQCard item={item} onClick={onClick} />;
    case 'feature': return <GuideCard item={item} onClick={onClick} />;
    default: return <VideoCard item={item} onClick={onClick} />;
  }
};

const AppShowcaseSection: React.FC<AppShowcaseSectionProps> = ({ onNavigate }) => {
  const { t } = useTranslation(['home', 'howItWorks']);
  const { content, isLoading } = useHowItWorksContent();
  const [activeTab, setActiveTab] = useState<string>('all');

  // Reuse same query key as HomePage's featured properties to avoid duplicate requests
  const { data: mapProperties = [] } = useQuery({
    queryKey: ['featuredProperties'],
    queryFn: async () => {
      const props = await getProperties({ sortBy: 'newest' } as any, { limit: 11 });
      return props.filter(p => p.status === 'active').slice(0, 11);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });

  const mapPins: MapPin[] = useMemo(() => {
    const withCity = mapProperties.filter(p => p.city);
    if (withCity.length === 0) return [];
    return withCity.map((p, i) => {
      const cityKey = p.city.toLowerCase();
      const coords = CITY_COORDS[cityKey] || { x: 30 + Math.random() * 40, y: 20 + Math.random() * 50 };
      return {
        city: p.city,
        country: p.country?.slice(0, 2).toUpperCase() || '',
        x: coords.x,
        y: coords.y,
        price: `€${p.price.toLocaleString()}`,
        beds: p.beds || 0,
        color: PIN_COLORS[i % PIN_COLORS.length],
      };
    });
  }, [mapProperties]);

  const hasCMSContent = content.length > 0;

  const filteredContent = activeTab === 'all'
    ? content
    : content.filter((item) => item.subsection === activeTab);

  const handleFeatureClick = useCallback((route: { view: string; path: string }) => {
    onNavigate(route.view, route.path);
  }, [onNavigate]);

  const handleCMSClick = useCallback(() => {
    onNavigate('how-it-works', '/how-it-works');
  }, [onNavigate]);

  return (
    <section className="bg-white overflow-hidden">
      <ContainerScroll
        titleComponent={
          <div className="mb-16">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 mb-4"
            >
              {t('home:showcase.badge')}
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-2xl sm:text-4xl lg:text-5xl font-bold text-slate-900 leading-tight"
            >
              {t('home:showcase.title')}{' '}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                {t('home:showcase.titleHighlight')}
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mt-3 text-sm sm:text-base text-slate-500 max-w-2xl mx-auto"
            >
              {t('home:showcase.subtitle')}
            </motion.p>
          </div>
        }
        phoneContent={<PhoneMapContent pins={mapPins} />}
      >
        {/* Simulated app UI inside the tablet */}
        <div className="h-full w-full bg-white overflow-y-auto">
          {/* App header bar */}
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-neutral-100 px-4 md:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                <span className="text-white text-xs font-bold">BE</span>
              </div>
              <span className="text-sm font-semibold text-slate-800">BalkanEstate</span>
            </div>
            <motion.button
              whileHover={{ x: 3 }}
              onClick={() => onNavigate('how-it-works', '/how-it-works')}
              className="text-[10px] md:text-xs text-slate-600 font-medium hover:text-slate-800 transition-colors"
            >
              {t('home:showcase.viewFullGuide', 'View Full Guide')} &rarr;
            </motion.button>
          </div>

          <div className="p-4 md:p-6">
            {/* Tab filters for CMS content */}
            {hasCMSContent && (
              <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                {TABS.map((tab) => {
                  const tabContent = tab.id === 'all' ? content : content.filter((c) => c.subsection === tab.id);
                  if (tab.id !== 'all' && tabContent.length === 0) return null;
                  return (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-medium whitespace-nowrap transition-colors ${
                        activeTab === tab.id
                          ? 'bg-slate-800 text-white'
                          : 'bg-neutral-100 text-slate-600 hover:bg-neutral-200'
                      }`}
                    >
                      {tab.id === 'all' ? 'All' : t(`howItWorks:tabs.${tab.labelKey}`, tab.labelKey)}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* CMS Content grid */}
            {hasCMSContent && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
                >
                  {filteredContent.map((item) => (
                    <ContentCard key={item._id} item={item} onClick={handleCMSClick} />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Loading skeleton */}
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-neutral-100 overflow-hidden animate-pulse">
                    <div className="aspect-video bg-neutral-100" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-neutral-100 rounded w-3/4" />
                      <div className="h-2 bg-neutral-100 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Static features grid (always shown as a base) */}
            <div className={hasCMSContent ? 'mt-5 pt-5 border-t border-neutral-100' : ''}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs md:text-sm font-semibold text-slate-800">
                  {hasCMSContent ? t('home:showcase.platformFeatures', 'Platform Features') : t('home:showcase.badge')}
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                {STATIC_FEATURES.map((feature, i) => (
                  <div
                    key={i}
                    onClick={() => handleFeatureClick(feature.route)}
                    className="rounded-xl p-3 border border-neutral-100/50 bg-white cursor-pointer group hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg ${feature.iconBg} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}
                    >
                      {feature.icon}
                    </div>
                    <h4 className="text-[10px] md:text-xs font-semibold text-slate-800 leading-tight">
                      {feature.title}
                    </h4>
                    <p className="text-[9px] md:text-[10px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                      {feature.desc}
                    </p>
                    <span className="text-[8px] md:text-[9px] text-slate-500 font-medium mt-1.5 inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      Explore <span className="text-[10px]">&rarr;</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* How it works steps */}
            <div className="mt-5 pt-5 border-t border-neutral-100">
              <h3 className="text-xs md:text-sm font-semibold text-slate-800 mb-3">{t('home:howItWorks.title')}</h3>
              <div className="flex items-start gap-3 md:gap-4">
                {[
                  { step: '1', title: t('home:howItWorks.step1Title'), desc: t('home:howItWorks.step1Desc'), color: 'bg-slate-800' },
                  { step: '2', title: t('home:howItWorks.step2Title'), desc: t('home:howItWorks.step2Desc'), color: 'bg-emerald-600' },
                  { step: '3', title: t('home:howItWorks.step3Title'), desc: t('home:howItWorks.step3Desc'), color: 'bg-violet-600' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex-1 text-center"
                  >
                    <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full ${item.color} text-white text-xs md:text-sm font-bold flex items-center justify-center mx-auto`}>
                      {item.step}
                    </div>
                    <h4 className="text-[10px] md:text-xs font-semibold text-slate-800 mt-2">{item.title}</h4>
                    <p className="text-[9px] md:text-[10px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* CTA inside tablet */}
            <div className="mt-5 pt-4 border-t border-neutral-100">
              <div className="flex items-center justify-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onNavigate('how-it-works', '/how-it-works')}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-white text-[10px] md:text-xs font-semibold hover:bg-slate-900 transition-colors"
                >
                  {t('home:showcase.exploreGuide', 'Explore Full Guide')}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onNavigate('search', '/search')}
                  className="px-4 py-2 rounded-lg border border-neutral-200 text-slate-700 text-[10px] md:text-xs font-semibold hover:bg-neutral-50 transition-colors"
                >
                  {t('home:showcase.browseProperties', 'Browse Properties')}
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </ContainerScroll>
    </section>
  );
};

export default AppShowcaseSection;
