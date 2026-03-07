import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealEstateNews, NewsItem } from '../hooks/useRealEstateNews';

const CATEGORY_COLORS: Record<string, string> = {
  market: 'bg-slate-100 text-slate-700',
  investment: 'bg-emerald-100 text-emerald-700',
  regulation: 'bg-amber-100 text-amber-700',
  development: 'bg-violet-100 text-violet-700',
  tourism: 'bg-rose-100 text-rose-700',
};

const NewsCard: React.FC<{ item: NewsItem; index: number; t: (key: string, fallback?: string) => string }> = ({ item, index, t }) => {
  const formattedDate = new Date(item.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <motion.a
      href={item.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
      whileHover={{ y: -4 }}
      className="group block rounded-2xl overflow-hidden border border-neutral-200 bg-white hover:shadow-xl transition-shadow"
    >
      {/* Cover image or gradient fallback */}
      <div className={`h-28 sm:h-36 relative overflow-hidden ${item.coverImageUrl ? '' : `bg-gradient-to-br ${item.imageGradient}`}`}>
        {item.coverImageUrl ? (
          <img
            src={item.coverImageUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" viewBox="0 0 200 100">
                <defs>
                  <pattern id={`grid-${item.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="200" height="100" fill={`url(#grid-${item.id})`} />
              </svg>
            </div>
          </>
        )}
        {/* Country badge */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-800">{item.countryCode}</span>
          <span className="text-[9px] sm:text-[10px] text-slate-500 hidden sm:inline">{item.country}</span>
        </div>
        {/* Category tag */}
        <span className={`absolute top-2 sm:top-3 right-2 sm:right-3 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wider ${CATEGORY_COLORS[item.category] || 'bg-neutral-100 text-neutral-700'}`}>
          {t(`home:news.category_${item.category}`, item.category)}
        </span>
      </div>

      <div className="p-3 sm:p-4">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
          {item.title}
        </h3>
        <p className="text-[10px] sm:text-xs text-slate-500 mt-1.5 sm:mt-2 line-clamp-2 leading-relaxed">{item.excerpt}</p>

        <div className="flex items-center justify-between mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-neutral-50">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-neutral-100 flex items-center justify-center">
              <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
              </svg>
            </div>
            <span className="text-[9px] sm:text-[10px] text-slate-400">{item.source}</span>
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-400">{formattedDate}</span>
        </div>

        <span className="inline-flex items-center gap-1 mt-2 text-[10px] sm:text-[11px] text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          {t('home:news.readOriginal', 'Read Original')} <span>&rarr;</span>
        </span>
      </div>
    </motion.a>
  );
};

const NewsSection: React.FC = () => {
  const { t } = useTranslation('home');
  const { news, countries, selectedCountry, setSelectedCountry, isLoading } = useRealEstateNews();

  return (
    <section className="py-12 sm:py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-10"
        >
          <span className="inline-block px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-100 text-emerald-700 mb-3 sm:mb-4">
            {t('news.badge', 'Real Estate News')}
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900">
            {t('news.title', 'Latest from the')}{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              {t('news.titleHighlight', 'Balkan Market')}
            </span>
          </h2>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm md:text-base text-slate-500 max-w-2xl mx-auto px-2">
            {t('news.subtitle', 'AI-curated real estate news from across the region. Click any article to read the full story from the original source.')}
          </p>
        </motion.div>

        {/* Country filter tabs - scrollable on mobile */}
        <div className="flex gap-1.5 sm:gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:justify-center sm:flex-wrap">
          {countries.map((country) => (
            <motion.button
              key={country}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCountry(country)}
              className={`px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                selectedCountry === country
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              {country === 'All' ? t('home:news.filterAll', 'All') : country}
            </motion.button>
          ))}
        </div>

        {/* News grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCountry}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
          >
            {news.slice(0, 6).map((item, i) => (
              <NewsCard key={item.id} item={item} index={i} t={t} />
            ))}
          </motion.div>
        </AnimatePresence>

        {news.length === 0 && (
          <div className="text-center py-8 sm:py-12 text-slate-400 text-xs sm:text-sm">
            {t('home:news.noNews', 'No news available for this country yet.')}
          </div>
        )}
      </div>
    </section>
  );
};

export default NewsSection;
