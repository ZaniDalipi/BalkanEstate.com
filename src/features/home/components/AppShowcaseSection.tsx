import React from 'react';
import { useTranslation } from 'react-i18next';
import { ContainerScroll } from '@/src/components/ui/ContainerScroll';

interface AppShowcaseSectionProps {
  onNavigate: (view: string, path: string) => void;
}

/** Modern filled icons with rounded, friendly shapes */
const SearchIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" fill="currentColor" opacity={0.15} />
    <circle cx="11" cy="11" r="5" stroke="currentColor" strokeWidth={2} fill="none" />
    <path d="M14.5 14.5L19 19" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    <circle cx="11" cy="9.5" r="1.5" fill="currentColor" opacity={0.4} />
  </svg>
);

const MapIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
    <path d="M3 7l6-3 6 3 6-3v14l-6 3-6-3-6 3V7z" fill="currentColor" opacity={0.12} />
    <path d="M9 4v14M15 7v14" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    <circle cx="12" cy="10" r="2" fill="currentColor" opacity={0.5} />
    <path d="M12 12l-1.5 2.5h3L12 12z" fill="currentColor" opacity={0.35} />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="13" rx="4" fill="currentColor" opacity={0.12} />
    <rect x="4" y="6" width="16" height="9" rx="3" stroke="currentColor" strokeWidth={1.8} fill="none" />
    <path d="M8 17l-2 3v-3" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />
    <circle cx="9" cy="10.5" r="1" fill="currentColor" />
    <circle cx="12" cy="10.5" r="1" fill="currentColor" />
    <circle cx="15" cy="10.5" r="1" fill="currentColor" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" opacity={0.1} />
    <rect x="6" y="12" width="3" height="6" rx="1" fill="currentColor" opacity={0.5} />
    <rect x="10.5" y="8" width="3" height="10" rx="1" fill="currentColor" opacity={0.7} />
    <rect x="15" y="5" width="3" height="13" rx="1" fill="currentColor" />
    <path d="M6 11l4.5-3 4.5 1 3-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.3} />
  </svg>
);

const CurrencyIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" fill="currentColor" opacity={0.1} />
    <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth={1.8} fill="none" />
    <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">&#8364;</text>
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" fill="currentColor" opacity={0.1} />
    <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth={1.8} fill="none" />
    <ellipse cx="12" cy="12" rx="3.5" ry="7.5" stroke="currentColor" strokeWidth={1.3} fill="none" />
    <path d="M4.5 12h15" stroke="currentColor" strokeWidth={1.3} />
    <path d="M5.5 8h13M5.5 16h13" stroke="currentColor" strokeWidth={1} opacity={0.5} />
  </svg>
);

const FEATURES = [
  {
    icon: <SearchIcon />,
    titleKey: 'aiSearch',
    descKey: 'aiSearchDesc',
    color: 'from-blue-500 to-cyan-400',
    bg: 'bg-blue-50/80',
    iconColor: 'text-blue-600',
  },
  {
    icon: <MapIcon />,
    titleKey: 'interactiveMap',
    descKey: 'interactiveMapDesc',
    color: 'from-emerald-500 to-teal-400',
    bg: 'bg-emerald-50/80',
    iconColor: 'text-emerald-600',
  },
  {
    icon: <ChatIcon />,
    titleKey: 'messaging',
    descKey: 'messagingDesc',
    color: 'from-violet-500 to-purple-400',
    bg: 'bg-violet-50/80',
    iconColor: 'text-violet-600',
  },
  {
    icon: <ChartIcon />,
    titleKey: 'analytics',
    descKey: 'analyticsDesc',
    color: 'from-amber-500 to-orange-400',
    bg: 'bg-amber-50/80',
    iconColor: 'text-amber-600',
  },
  {
    icon: <CurrencyIcon />,
    titleKey: 'valuation',
    descKey: 'valuationDesc',
    color: 'from-rose-500 to-pink-400',
    bg: 'bg-rose-50/80',
    iconColor: 'text-rose-600',
  },
  {
    icon: <GlobeIcon />,
    titleKey: 'multilingual',
    descKey: 'multilingualDesc',
    color: 'from-indigo-500 to-blue-400',
    bg: 'bg-indigo-50/80',
    iconColor: 'text-indigo-600',
  },
];

const MOCK_PROPERTIES = [
  { city: 'Tirana, Albania', price: '€125,000', beds: 3, area: 120, gradient: 'from-blue-400 to-indigo-500', tag: 'New' },
  { city: 'Belgrade, Serbia', price: '€195,000', beds: 4, area: 165, gradient: 'from-emerald-400 to-teal-500', tag: 'Featured' },
  { city: 'Skopje, N. Macedonia', price: '€89,000', beds: 2, area: 85, gradient: 'from-violet-400 to-purple-500', tag: null },
];

const AppShowcaseSection: React.FC<AppShowcaseSectionProps> = ({ onNavigate }) => {
  const { t } = useTranslation(['home']);

  return (
    <section className="bg-gradient-to-b from-neutral-50 to-white overflow-hidden">
      <ContainerScroll
        titleComponent={
          <div className="mb-8">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 mb-4">
              {t('home:showcase.badge')}
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
              {t('home:showcase.title')}{' '}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                {t('home:showcase.titleHighlight')}
              </span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-500 max-w-2xl mx-auto">
              {t('home:showcase.subtitle')}
            </p>
          </div>
        }
      >
        {/* Simulated app UI inside the tablet */}
        <div className="h-full w-full bg-white overflow-y-auto">
          {/* App header bar */}
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-neutral-100 px-4 md:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                <span className="text-white text-xs font-bold">BE</span>
              </div>
              <span className="text-sm font-semibold text-slate-800">BalkanEstate</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-20 h-7 rounded-lg bg-neutral-100 animate-pulse" />
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Feature grid inside tablet */}
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {FEATURES.map((feature, i) => (
                <div
                  key={i}
                  className={`${feature.bg} rounded-xl p-3 md:p-4 border border-neutral-100/50 hover:shadow-md transition-shadow`}
                >
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${feature.color} ${feature.iconColor} text-white flex items-center justify-center mb-2 md:mb-3`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xs md:text-sm font-semibold text-slate-800">
                    {t(`home:showcase.features.${feature.titleKey}`)}
                  </h3>
                  <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1 leading-relaxed line-clamp-2">
                    {t(`home:showcase.features.${feature.descKey}`)}
                  </p>
                </div>
              ))}
            </div>

            {/* Trending properties */}
            <div className="mt-4 md:mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs md:text-sm font-semibold text-slate-800">{t('home:showcase.trendingTitle')}</h3>
                <span className="text-[10px] md:text-xs text-blue-600 font-medium cursor-pointer hover:text-blue-700">{t('home:showcase.viewAll')} &rarr;</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                {MOCK_PROPERTIES.map((item, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-neutral-100 bg-white hover:shadow-lg transition-shadow cursor-pointer">
                    <div className={`h-16 md:h-24 bg-gradient-to-br ${item.gradient} relative overflow-hidden`}>
                      <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                      }} />
                      {item.tag && (
                        <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-white/90 backdrop-blur-sm rounded text-[8px] md:text-[9px] font-bold text-slate-700 uppercase tracking-wider">
                          {item.tag}
                        </span>
                      )}
                      <div className="absolute bottom-1.5 left-2 px-2 py-0.5 bg-black/40 backdrop-blur-sm rounded-md text-[10px] md:text-xs text-white font-bold">
                        {item.price}
                      </div>
                    </div>
                    <div className="p-2 md:p-2.5">
                      <div className="text-[10px] md:text-xs font-semibold text-slate-700">{item.city}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] md:text-[10px] text-slate-400">{item.beds} bed</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />
                        <span className="text-[9px] md:text-[10px] text-slate-400">{item.area} m²</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ContainerScroll>
    </section>
  );
};

export default AppShowcaseSection;
