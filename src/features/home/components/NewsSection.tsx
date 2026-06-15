import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealEstateNews, NewsItem } from '../hooks/useRealEstateNews';
import { useArticles } from '../../blog/hooks/useArticles';
import { ArticleListItem } from '../../blog/types/article.types';
import { useAppContext } from '@/context/AppContext';
import { buildLocalizedPath } from '@/src/utils/languageRouting';

const COUNTRY_FLAGS: Record<string, string> = {
  'All': '🌍',
  'Albania': '🇦🇱',
  'Serbia': '🇷🇸',
  'Croatia': '🇭🇷',
  'Greece': '🇬🇷',
  'Montenegro': '🇲🇪',
  'North Macedonia': '🇲🇰',
  'Bulgaria': '🇧🇬',
  'Kosovo': '🇽🇰',
  'Slovenia': '🇸🇮',
  'Bosnia & Herzegovina': '🇧🇦',
  'Romania': '🇷🇴',
};

const CATEGORY_COLORS: Record<string, string> = {
  market: 'bg-slate-100 text-slate-700',
  investment: 'bg-emerald-100 text-emerald-700',
  regulation: 'bg-amber-100 text-amber-700',
  development: 'bg-violet-100 text-violet-700',
  tourism: 'bg-rose-100 text-rose-700',
};

const ARTICLE_CATEGORY_COLORS: Record<string, { pill: string; gradient: string }> = {
  market:      { pill: 'bg-slate-100 text-slate-700',    gradient: 'from-slate-400 to-slate-600' },
  investment:  { pill: 'bg-emerald-100 text-emerald-700', gradient: 'from-emerald-400 to-teal-500' },
  regulation:  { pill: 'bg-amber-100 text-amber-700',    gradient: 'from-amber-400 to-orange-500' },
  development: { pill: 'bg-violet-100 text-violet-700',  gradient: 'from-violet-400 to-purple-500' },
  tourism:     { pill: 'bg-rose-100 text-rose-700',      gradient: 'from-rose-400 to-pink-500' },
  guide:       { pill: 'bg-blue-100 text-blue-700',      gradient: 'from-blue-400 to-indigo-500' },
  lifestyle:   { pill: 'bg-pink-100 text-pink-700',      gradient: 'from-pink-400 to-rose-500' },
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
            decoding="async"
            width={400}
            height={144}
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
          {COUNTRY_FLAGS[item.country] && <span className="text-xs">{COUNTRY_FLAGS[item.country]}</span>}
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

const ArticleMiniCard: React.FC<{ article: ArticleListItem; index: number; onNavigate: (slug: string) => void }> = ({ article, index, onNavigate }) => {
  const cat = ARTICLE_CATEGORY_COLORS[article.category] ?? { pill: 'bg-neutral-100 text-neutral-700', gradient: 'from-slate-400 to-slate-600' };
  const flag = article.country ? COUNTRY_FLAGS[article.country] : '';
  const formattedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
      whileHover={{ y: -4 }}
      onClick={() => onNavigate(article.slug)}
      className="group block rounded-2xl overflow-hidden border border-neutral-200 bg-white hover:shadow-xl transition-shadow cursor-pointer"
    >
      {/* Cover */}
      <div className={`h-28 sm:h-36 relative overflow-hidden ${article.coverImageUrl ? '' : `bg-gradient-to-br ${cat.gradient}`}`}>
        {article.coverImageUrl ? (
          <img
            src={article.coverImageUrl}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            decoding="async"
            width={400}
            height={144}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
        )}
        {flag && article.country && (
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1">
            <span className="text-xs">{flag}</span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 hidden sm:inline">{article.country}</span>
          </div>
        )}
        <span className={`absolute top-2 sm:top-3 right-2 sm:right-3 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wider ${cat.pill}`}>
          {article.category}
        </span>
        {article.isFeatured && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 text-[9px] font-bold">
            ★ Featured
          </span>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
          {article.title}
        </h3>
        <p className="text-[10px] sm:text-xs text-slate-500 mt-1.5 sm:mt-2 line-clamp-2 leading-relaxed">{article.excerpt}</p>

        <div className="flex items-center justify-between mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-neutral-50">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-600 to-slate-900 flex items-center justify-center text-white text-[9px] font-bold">
              {article.author?.name?.charAt(0)?.toUpperCase() || 'B'}
            </div>
            <span className="text-[9px] sm:text-[10px] text-slate-400 truncate max-w-[80px]">{article.author?.name || 'BalkanEstate'}</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-slate-400">
            {article.readTime && <span>{article.readTime}m read</span>}
            {article.readTime && formattedDate && <span>·</span>}
            {formattedDate && <span>{formattedDate}</span>}
          </div>
        </div>

        <span className="inline-flex items-center gap-1 mt-2 text-[10px] sm:text-[11px] text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Read article <span>&rarr;</span>
        </span>
      </div>
    </motion.div>
  );
};

const NewsSection: React.FC = () => {
  const { t } = useTranslation('home');
  const { dispatch } = useAppContext();
  const { news, countries, selectedCountry, setSelectedCountry, isLoading } = useRealEstateNews();
  const [activeTab, setActiveTab] = useState<'news' | 'articles'>('articles');

  const { articles, isLoading: articlesLoading } = useArticles({ limit: 6 });

  const handleArticleNavigate = (slug: string) => {
    window.history.pushState({}, '', buildLocalizedPath(`/blog/${slug}`));
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'blog' });
  };

  const handleViewAllArticles = () => {
    window.history.pushState({}, '', buildLocalizedPath('/blog'));
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'blog' });
  };

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

        {/* Tab switcher */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="inline-flex rounded-xl border border-neutral-200 p-1 bg-neutral-50 gap-1">
            <button
              onClick={() => setActiveTab('articles')}
              className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'articles'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t('news.tabArticles', 'Our Articles')}
              {articles.length > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                  {articles.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'news'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t('news.tabNews', 'Market News')}
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'news' ? (
            <motion.div key="news-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {/* Country filter tabs */}
              <div className="flex gap-1.5 sm:gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:justify-center sm:flex-wrap">
                {countries.map((country) => (
                  <motion.button
                    key={country}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCountry(country)}
                    className={`px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 inline-flex items-center gap-1.5 ${
                      selectedCountry === country
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {COUNTRY_FLAGS[country] && <span className="text-sm">{COUNTRY_FLAGS[country]}</span>}
                    {country === 'All' ? t('home:news.filterAll', 'All') : country}
                  </motion.button>
                ))}
              </div>

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
                    <NewsCard key={item.id} item={item} index={i} t={t as (key: string, fallback?: string) => string} />
                  ))}
                </motion.div>
              </AnimatePresence>

              {news.length === 0 && (
                <div className="text-center py-8 sm:py-12 text-slate-400 text-xs sm:text-sm">
                  {t('home:news.noNews', 'No news available for this country yet.')}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="articles-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {articlesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-64 bg-neutral-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : articles.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium">No articles published yet</p>
                  <p className="text-xs text-slate-300 mt-1">Check back soon for expert insights</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {articles.map((article, i) => (
                      <ArticleMiniCard
                        key={article._id}
                        article={article}
                        index={i}
                        onNavigate={handleArticleNavigate}
                      />
                    ))}
                  </div>
                  <div className="mt-8 text-center">
                    <button
                      onClick={handleViewAllArticles}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
                    >
                      View all articles
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default NewsSection;
