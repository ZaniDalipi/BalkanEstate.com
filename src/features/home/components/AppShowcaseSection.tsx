import React from 'react';
import { useTranslation } from 'react-i18next';
import { ContainerScroll } from '@/src/components/ui/ContainerScroll';

interface AppShowcaseSectionProps {
  onNavigate: (view: string, path: string) => void;
}

const FEATURES = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
    titleKey: 'aiSearch',
    descKey: 'aiSearchDesc',
    color: 'from-blue-500 to-cyan-400',
    bg: 'bg-blue-50',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
      </svg>
    ),
    titleKey: 'interactiveMap',
    descKey: 'interactiveMapDesc',
    color: 'from-emerald-500 to-teal-400',
    bg: 'bg-emerald-50',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.422-2.87-3.275-2.87-1.854 0-3.275 1.249-3.275 2.87v6.204c0 1.621 1.421 2.87 3.275 2.87 1.844 0 3.275-1.253 3.275-2.87V8.511Z" />
      </svg>
    ),
    titleKey: 'messaging',
    descKey: 'messagingDesc',
    color: 'from-violet-500 to-purple-400',
    bg: 'bg-violet-50',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    titleKey: 'analytics',
    descKey: 'analyticsDesc',
    color: 'from-amber-500 to-orange-400',
    bg: 'bg-amber-50',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
    ),
    titleKey: 'valuation',
    descKey: 'valuationDesc',
    color: 'from-rose-500 to-pink-400',
    bg: 'bg-rose-50',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.148 15.08 2 17.558m15.849-6.13c-1.588.894-3.296 1.613-5.094 2.128" />
      </svg>
    ),
    titleKey: 'multilingual',
    descKey: 'multilingualDesc',
    color: 'from-indigo-500 to-blue-400',
    bg: 'bg-indigo-50',
  },
];

const AppShowcaseSection: React.FC<AppShowcaseSectionProps> = ({ onNavigate }) => {
  const { t } = useTranslation(['home']);

  return (
    <section className="bg-gradient-to-b from-neutral-50 to-white">
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
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${feature.color} text-white flex items-center justify-center mb-2 md:mb-3`}>
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

            {/* Mock property cards inside tablet */}
            <div className="mt-4 md:mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs md:text-sm font-semibold text-slate-800">{t('home:showcase.trendingTitle')}</h3>
                <span className="text-[10px] md:text-xs text-blue-600 font-medium">{t('home:showcase.viewAll')}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                {[
                  { city: 'Tirana', price: '€125,000', color: 'from-blue-400 to-indigo-400' },
                  { city: 'Belgrade', price: '€195,000', color: 'from-emerald-400 to-teal-400' },
                  { city: 'Skopje', price: '€89,000', color: 'from-violet-400 to-purple-400' },
                ].map((item, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-neutral-100">
                    <div className={`h-16 md:h-20 bg-gradient-to-br ${item.color} relative`}>
                      <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded text-[9px] md:text-[10px] text-white font-semibold">
                        {item.price}
                      </div>
                    </div>
                    <div className="p-2">
                      <div className="text-[10px] md:text-xs font-medium text-slate-700">{item.city}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] md:text-[10px] text-slate-400">3 bed</span>
                        <span className="text-[9px] md:text-[10px] text-slate-300">|</span>
                        <span className="text-[9px] md:text-[10px] text-slate-400">120 m²</span>
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
