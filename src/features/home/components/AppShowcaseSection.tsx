import React from 'react';
import { useTranslation } from 'react-i18next';
import { ContainerScroll } from '@/src/components/ui/ContainerScroll';

interface AppShowcaseSectionProps {
  onNavigate: (view: string, path: string) => void;
}

const FEATURES = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
    titleKey: 'aiSearch',
    descKey: 'aiSearchDesc',
    color: 'from-blue-500 to-cyan-400',
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
      </svg>
    ),
    titleKey: 'interactiveMap',
    descKey: 'interactiveMapDesc',
    color: 'from-emerald-500 to-teal-400',
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.422-2.87-3.275-2.87-1.854 0-3.275 1.249-3.275 2.87v6.204c0 1.621 1.421 2.87 3.275 2.87 1.844 0 3.275-1.253 3.275-2.87V8.511Z" />
      </svg>
    ),
    titleKey: 'messaging',
    descKey: 'messagingDesc',
    color: 'from-violet-500 to-purple-400',
    bg: 'bg-violet-50',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    titleKey: 'analytics',
    descKey: 'analyticsDesc',
    color: 'from-amber-500 to-orange-400',
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
    ),
    titleKey: 'valuation',
    descKey: 'valuationDesc',
    color: 'from-rose-500 to-pink-400',
    bg: 'bg-rose-50',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.148 15.08 2 17.558m15.849-6.13c-1.588.894-3.296 1.613-5.094 2.128" />
      </svg>
    ),
    titleKey: 'multilingual',
    descKey: 'multilingualDesc',
    color: 'from-indigo-500 to-blue-400',
    bg: 'bg-indigo-50',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
  },
];

const MOCK_PROPERTIES = [
  { city: 'Tirana, Albania', price: '€125,000', beds: 3, area: 120, gradient: 'from-blue-400 to-indigo-500', tag: 'New' },
  { city: 'Belgrade, Serbia', price: '€195,000', beds: 4, area: 165, gradient: 'from-emerald-400 to-teal-500', tag: 'Featured' },
  { city: 'Skopje, N. Macedonia', price: '€89,000', beds: 2, area: 85, gradient: 'from-violet-400 to-purple-500', tag: null },
];

const PHONE_PROPERTIES = [
  { city: 'Zagreb', country: 'Croatia', price: '€210,000', beds: 3, area: 95, gradient: 'from-sky-400 to-blue-500' },
  { city: 'Sarajevo', country: 'Bosnia', price: '€78,000', beds: 2, area: 72, gradient: 'from-amber-400 to-orange-500' },
  { city: 'Thessaloniki', country: 'Greece', price: '€165,000', beds: 2, area: 88, gradient: 'from-rose-400 to-pink-500' },
  { city: 'Podgorica', country: 'Montenegro', price: '€112,000', beds: 3, area: 105, gradient: 'from-teal-400 to-emerald-500' },
];

/** Content shown inside the tablet mockup */
const TabletContent: React.FC<{ t: (key: string) => string }> = ({ t }) => (
  <div className="h-full w-full bg-white overflow-y-auto">
    {/* App header bar */}
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-neutral-100 px-3 md:px-5 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
          <span className="text-white text-[10px] font-bold">BE</span>
        </div>
        <span className="text-xs md:text-sm font-semibold text-slate-800">BalkanEstate</span>
      </div>
      <div className="flex items-center gap-2">
        {/* Search pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 rounded-lg border border-neutral-200">
          <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <span className="text-[10px] text-slate-400">Search properties...</span>
        </div>
        {/* Notification bell */}
        <div className="relative w-7 h-7 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
        </div>
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">JD</span>
        </div>
      </div>
    </div>

    <div className="p-3 md:p-5">
      {/* Feature grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3">
        {FEATURES.map((feature, i) => (
          <div
            key={i}
            className={`${feature.bg} rounded-xl p-2.5 md:p-3.5 border border-neutral-100/50 hover:shadow-md transition-all duration-300 cursor-pointer group`}
          >
            <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg ${feature.iconBg} ${feature.iconColor} flex items-center justify-center mb-2 group-hover:scale-105 transition-transform`}>
              {feature.icon}
            </div>
            <h3 className="text-[10px] md:text-xs font-semibold text-slate-800">
              {t(`home:showcase.features.${feature.titleKey}`)}
            </h3>
            <p className="text-[9px] md:text-[10px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
              {t(`home:showcase.features.${feature.descKey}`)}
            </p>
          </div>
        ))}
      </div>

      {/* Trending properties */}
      <div className="mt-4 md:mt-5">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs md:text-sm font-semibold text-slate-800">{t('home:showcase.trendingTitle')}</h3>
          <span className="text-[10px] md:text-xs text-blue-600 font-medium cursor-pointer hover:text-blue-700">{t('home:showcase.viewAll')} &rarr;</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-3">
          {MOCK_PROPERTIES.map((item, i) => (
            <div key={i} className="rounded-xl overflow-hidden border border-neutral-100 bg-white hover:shadow-lg transition-shadow cursor-pointer group">
              <div className={`h-20 md:h-24 bg-gradient-to-br ${item.gradient} relative overflow-hidden`}>
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }} />
                {item.tag && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-white/90 backdrop-blur-sm rounded text-[8px] md:text-[9px] font-bold text-slate-700 uppercase tracking-wider">
                    {item.tag}
                  </span>
                )}
                <div className="absolute bottom-1.5 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-md text-[10px] md:text-xs text-white font-bold">
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
);

/** Content shown inside the phone mockup */
const PhoneContent: React.FC<{ t: (key: string) => string }> = ({ t }) => (
  <div className="h-full w-full bg-white overflow-hidden flex flex-col">
    {/* Phone status bar */}
    <div className="flex items-center justify-between px-4 pt-7 pb-1.5">
      <span className="text-[8px] md:text-[9px] font-semibold text-slate-800">9:41</span>
      <div className="flex items-center gap-1">
        <svg className="w-2.5 h-2.5 text-slate-800" viewBox="0 0 24 24" fill="currentColor"><path d="M12 18c3.31 0 6-2.69 6-6s-2.69-6-6-6-6 2.69-6 6 2.69 6 6 6zm0-10c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4z" /></svg>
        <svg className="w-2.5 h-2.5 text-slate-800" viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 00-6 0zm-4-4l2 2a7.074 7.074 0 0110 0l2-2C15.14 9.14 8.87 9.14 5 13z" /></svg>
        <div className="w-4 h-2 border border-slate-800 rounded-sm relative">
          <div className="absolute inset-0.5 bg-emerald-500 rounded-[1px]" style={{ width: '70%' }} />
        </div>
      </div>
    </div>

    {/* App mini header */}
    <div className="px-3 py-2 flex items-center justify-between border-b border-neutral-100">
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
          <span className="text-white text-[7px] font-bold">BE</span>
        </div>
        <span className="text-[9px] md:text-[10px] font-bold text-slate-800">BalkanEstate</span>
      </div>
      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    </div>

    {/* Property list */}
    <div className="flex-1 overflow-hidden px-2.5 py-2">
      <p className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 px-0.5">
        {t('home:showcase.trendingTitle')}
      </p>
      <div className="space-y-2">
        {PHONE_PROPERTIES.map((item, i) => (
          <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer">
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-br ${item.gradient} flex-shrink-0 relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'radial-gradient(circle at 50% 50%, white 1px, transparent 1px)',
                backgroundSize: '10px 10px'
              }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] md:text-[10px] font-semibold text-slate-800 truncate">{item.city}</div>
              <div className="text-[8px] md:text-[9px] text-slate-400">{item.country}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] md:text-[10px] font-bold text-blue-600">{item.price}</span>
                <span className="text-[7px] md:text-[8px] text-slate-300">|</span>
                <span className="text-[7px] md:text-[8px] text-slate-400">{item.beds}bd {item.area}m²</span>
              </div>
            </div>
            <svg className="w-3 h-3 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        ))}
      </div>
    </div>

    {/* Phone bottom nav */}
    <div className="border-t border-neutral-100 px-2 py-1.5 flex items-center justify-around">
      {[
        { label: 'Home', active: false, icon: <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /> },
        { label: 'Search', active: true, icon: <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /> },
        { label: 'Saved', active: false, icon: <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /> },
        { label: 'Chat', active: false, icon: <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /> },
      ].map((nav) => (
        <div key={nav.label} className="flex flex-col items-center gap-0.5 cursor-pointer">
          <svg className={`w-3.5 h-3.5 ${nav.active ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth={nav.active ? 2 : 1.5} stroke="currentColor">
            {nav.icon}
          </svg>
          <span className={`text-[7px] md:text-[8px] ${nav.active ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>{nav.label}</span>
        </div>
      ))}
    </div>
  </div>
);

const AppShowcaseSection: React.FC<AppShowcaseSectionProps> = ({ onNavigate }) => {
  const { t } = useTranslation(['home']);

  return (
    <section className="bg-gradient-to-b from-neutral-50 via-white to-neutral-50 overflow-hidden">
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
        phoneContent={<PhoneContent t={t} />}
      >
        {/* Simulated app UI inside the tablet */}
        <TabletContent t={t} />
      </ContainerScroll>
    </section>
  );
};

export default AppShowcaseSection;
