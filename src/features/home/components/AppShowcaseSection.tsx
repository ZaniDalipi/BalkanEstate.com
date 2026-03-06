import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ContainerScroll } from '@/src/components/ui/ContainerScroll';
import { useHowItWorksContent, HowItWorksContent } from '../hooks/useHowItWorksContent';

interface AppShowcaseSectionProps {
  onNavigate: (view: string, path: string) => void;
}

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

/* ─── Static fallback features (shown when no CMS content) ─── */
const STATIC_FEATURES = [
  {
    title: 'AI-Powered Search',
    desc: 'Describe your dream property in natural language and let AI find perfect matches across 11 countries.',
    gradient: 'from-blue-500 to-cyan-400',
    iconBg: 'bg-blue-500/10',
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
    title: 'Property Valuation & Analytics',
    desc: 'AI-powered price estimates, market trends, neighbourhood scores, and investment ROI projections.',
    gradient: 'from-amber-500 to-orange-400',
    iconBg: 'bg-amber-500/10',
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
    icon: (
      <svg className="w-5 h-5 text-rose-500" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth={1.8} />
        <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">&#8364;</text>
      </svg>
    ),
  },
  {
    title: 'Listing Promotions',
    desc: 'Boost visibility with Highlight, Featured, or Premium tiers. Up to 5x more views and homepage placement.',
    gradient: 'from-indigo-500 to-blue-400',
    iconBg: 'bg-indigo-500/10',
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
    desc: 'Join as independent agent or create an agency. Manage teams, coupons, and analytics from one dashboard.',
    gradient: 'from-teal-500 to-cyan-400',
    iconBg: 'bg-teal-500/10',
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

/* ─── Video card component ─── */
const VideoCard: React.FC<{ item: HowItWorksContent }> = ({ item }) => (
  <div className="rounded-xl overflow-hidden border border-neutral-100 bg-white hover:shadow-lg transition-shadow group cursor-pointer">
    <div className="aspect-video relative bg-neutral-100">
      <video
        src={item.url}
        className="w-full h-full object-cover"
        muted
        playsInline
        preload="metadata"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <svg className="w-4 h-4 text-slate-800 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      {item.difficulty && (
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
          item.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' :
          item.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
          'bg-rose-100 text-rose-700'
        }`}>
          {item.difficulty}
        </span>
      )}
    </div>
    <div className="p-3">
      <h4 className="text-xs md:text-sm font-semibold text-slate-800 line-clamp-1">{item.title}</h4>
      {item.description && (
        <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
      )}
      {item.estimatedTime && (
        <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] md:text-[10px] text-slate-400">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" strokeLinecap="round" />
          </svg>
          {item.estimatedTime}
        </span>
      )}
    </div>
  </div>
);

/* ─── Guide card component ─── */
const GuideCard: React.FC<{ item: HowItWorksContent }> = ({ item }) => (
  <div className="rounded-xl border border-neutral-100 bg-white hover:shadow-lg transition-shadow p-3 md:p-4 cursor-pointer">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="min-w-0">
        <h4 className="text-xs md:text-sm font-semibold text-slate-800 line-clamp-1">{item.title}</h4>
        {item.description && (
          <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
        )}
        {item.steps && item.steps.length > 0 && (
          <span className="text-[9px] md:text-[10px] text-blue-600 font-medium mt-1 inline-block">
            {item.steps.length} steps
          </span>
        )}
      </div>
    </div>
  </div>
);

/* ─── FAQ card component ─── */
const FAQCard: React.FC<{ item: HowItWorksContent }> = ({ item }) => (
  <div className="rounded-xl border border-neutral-100 bg-white hover:shadow-lg transition-shadow p-3 md:p-4 cursor-pointer">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="min-w-0">
        <h4 className="text-xs md:text-sm font-semibold text-slate-800 line-clamp-1">{item.title}</h4>
        {item.faqs && item.faqs.length > 0 && (
          <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">
            {item.faqs.length} questions answered
          </p>
        )}
      </div>
    </div>
  </div>
);

/* ─── Content card router ─── */
const ContentCard: React.FC<{ item: HowItWorksContent }> = ({ item }) => {
  switch (item.contentType) {
    case 'video':
      return <VideoCard item={item} />;
    case 'guide':
      return <GuideCard item={item} />;
    case 'faq':
      return <FAQCard item={item} />;
    case 'feature':
      return <GuideCard item={item} />;
    default:
      return <VideoCard item={item} />;
  }
};

const AppShowcaseSection: React.FC<AppShowcaseSectionProps> = ({ onNavigate }) => {
  const { t } = useTranslation(['home', 'howItWorks']);
  const { content, isLoading } = useHowItWorksContent();
  const [activeTab, setActiveTab] = useState<string>('all');

  const hasCMSContent = content.length > 0;

  const filteredContent = activeTab === 'all'
    ? content
    : content.filter((item) => item.subsection === activeTab);

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
            <button
              onClick={() => onNavigate('how-it-works', '/how-it-works')}
              className="text-[10px] md:text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors"
            >
              View Full Guide &rarr;
            </button>
          </div>

          <div className="p-4 md:p-6">
            {/* Tab filters for CMS content */}
            {hasCMSContent && (
              <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                {TABS.map((tab) => {
                  const tabContent = tab.id === 'all' ? content : content.filter((c) => c.subsection === tab.id);
                  if (tab.id !== 'all' && tabContent.length === 0) return null;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-medium whitespace-nowrap transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-neutral-100 text-slate-600 hover:bg-neutral-200'
                      }`}
                    >
                      {tab.id === 'all' ? 'All' : t(`howItWorks:tabs.${tab.labelKey}`, tab.labelKey)}
                    </button>
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
                    <ContentCard key={item._id} item={item} />
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
                  {hasCMSContent ? 'Platform Features' : t('home:showcase.badge')}
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                {STATIC_FEATURES.map((feature, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3 border border-neutral-100/50 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className={`w-9 h-9 rounded-lg ${feature.iconBg} flex items-center justify-center mb-2`}>
                      {feature.icon}
                    </div>
                    <h4 className="text-[10px] md:text-xs font-semibold text-slate-800 leading-tight">
                      {feature.title}
                    </h4>
                    <p className="text-[9px] md:text-[10px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                      {feature.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* How it works steps */}
            <div className="mt-5 pt-5 border-t border-neutral-100">
              <h3 className="text-xs md:text-sm font-semibold text-slate-800 mb-3">How It Works</h3>
              <div className="flex items-start gap-3 md:gap-4">
                {[
                  { step: '1', title: t('home:howItWorks.step1Title'), desc: t('home:howItWorks.step1Desc'), color: 'bg-blue-600' },
                  { step: '2', title: t('home:howItWorks.step2Title'), desc: t('home:howItWorks.step2Desc'), color: 'bg-emerald-600' },
                  { step: '3', title: t('home:howItWorks.step3Title'), desc: t('home:howItWorks.step3Desc'), color: 'bg-violet-600' },
                ].map((item, i) => (
                  <div key={i} className="flex-1 text-center">
                    <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full ${item.color} text-white text-xs md:text-sm font-bold flex items-center justify-center mx-auto`}>
                      {item.step}
                    </div>
                    <h4 className="text-[10px] md:text-xs font-semibold text-slate-800 mt-2">{item.title}</h4>
                    <p className="text-[9px] md:text-[10px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA inside tablet */}
            <div className="mt-5 pt-4 border-t border-neutral-100">
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => onNavigate('how-it-works', '/how-it-works')}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-[10px] md:text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                  Explore Full Guide
                </button>
                <button
                  onClick={() => onNavigate('search', '/search')}
                  className="px-4 py-2 rounded-lg border border-neutral-200 text-slate-700 text-[10px] md:text-xs font-semibold hover:bg-neutral-50 transition-colors"
                >
                  Browse Properties
                </button>
              </div>
            </div>
          </div>
        </div>
      </ContainerScroll>
    </section>
  );
};

export default AppShowcaseSection;
