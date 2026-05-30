import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useArticles } from '../hooks/useArticles';
import { ArticleCategory } from '../types/article.types';
import { API_CONFIG } from '@/src/shared/constants/app.constants';
import ArticleCard from './ArticleCard';
import BlogFilters from './BlogFilters';
import ArticlePage from './ArticlePage';

const BlogPage: React.FC = () => {
  const { t } = useTranslation('blog');
  const [selectedCategory, setSelectedCategory] = useState<ArticleCategory | undefined>();
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>();
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Extract slug from URL if present — computed once, no hooks after
  const slug = useMemo(() => {
    const path = window.location.pathname;
    const match = path.match(/^(?:\/[a-z]{2})?\/blog\/(.+)$/);
    return match ? match[1] : null;
  }, []);

  // All hooks must be called unconditionally before any early return
  const { articles, pagination, isLoading, error } = useArticles({
    category: selectedCategory,
    country: selectedCountry,
    tag: selectedTag,
    search: searchQuery || undefined,
    page,
    limit: 12,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['article-categories'],
    queryFn: async () => {
      const res = await fetch(`${API_CONFIG.BASE_URL}/articles/categories`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: countriesData } = useQuery({
    queryKey: ['article-countries'],
    queryFn: async () => {
      const res = await fetch(`${API_CONFIG.BASE_URL}/articles/countries`);
      if (!res.ok) throw new Error('Failed to fetch countries');
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  // After all hooks, handle the article detail view
  if (slug) {
    return <ArticlePage slug={slug} />;
  }

  const categories = categoriesData?.categories || [];
  const countries = countriesData?.countries || [];

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleCategoryChange = (cat: ArticleCategory | undefined) => {
    setSelectedCategory(cat);
    setPage(1);
  };

  const handleCountryChange = (c: string | undefined) => {
    setSelectedCountry(c);
    setPage(1);
  };

  const handleTagChange = (tag: string | undefined) => {
    setSelectedTag(tag);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-12 sm:py-16 md:py-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
              {t('title', 'Balkan Real Estate Blog')}
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-8">
              {t('subtitle', 'Expert insights, market analysis, and guides for property buyers, investors, and sellers across the Balkans')}
            </p>

            {/* Search bar */}
            <div className="max-w-xl mx-auto relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={handleSearch}
                placeholder={t('searchPlaceholder', 'Search articles…')}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Active filter chips */}
      {(selectedCategory || selectedCountry || selectedTag || searchQuery) && (
        <div className="bg-slate-50 border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Active filters:</span>
            {searchQuery && (
              <FilterChip label={`"${searchQuery}"`} onRemove={() => { setSearchQuery(''); setPage(1); }} />
            )}
            {selectedCategory && (
              <FilterChip label={t(`category_${selectedCategory}`, selectedCategory)} onRemove={() => handleCategoryChange(undefined)} />
            )}
            {selectedCountry && (
              <FilterChip label={selectedCountry} onRemove={() => handleCountryChange(undefined)} />
            )}
            {selectedTag && (
              <FilterChip label={`#${selectedTag}`} onRemove={() => handleTagChange(undefined)} />
            )}
            <button
              onClick={() => { setSelectedCategory(undefined); setSelectedCountry(undefined); setSelectedTag(undefined); setSearchQuery(''); setPage(1); }}
              className="text-xs text-slate-400 hover:text-slate-700 underline ml-1"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <section className="py-12 sm:py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
            {/* Filters Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <div className="sticky top-24 bg-slate-50 p-4 sm:p-6 rounded-xl border border-neutral-200">
                <BlogFilters
                  categories={categories}
                  countries={countries}
                  selectedCategory={selectedCategory}
                  selectedCountry={selectedCountry}
                  selectedTag={selectedTag}
                  onCategoryChange={handleCategoryChange}
                  onCountryChange={handleCountryChange}
                  onTagChange={handleTagChange}
                />
              </div>
            </motion.div>

            {/* Articles Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-3"
            >
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-80 bg-neutral-200 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-12 text-slate-600">
                  <p className="text-sm sm:text-base">{t('error', 'Failed to load articles')}</p>
                </div>
              ) : articles.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm sm:text-base font-medium">{t('noArticles', 'No articles found')}</p>
                  <p className="text-xs text-slate-300 mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                <>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`articles-${selectedCategory}-${selectedCountry}-${selectedTag}-${searchQuery}-${page}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
                    >
                      {articles.map((article, i) => (
                        <ArticleCard
                          key={article._id}
                          article={article}
                          index={i}
                          t={t}
                          onTagClick={tag => handleTagChange(tag)}
                        />
                      ))}
                    </motion.div>
                  </AnimatePresence>

                  {pagination && pagination.totalPages > 1 && (
                    <div className="mt-12 sm:mt-16 flex items-center justify-center gap-2 sm:gap-3">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-3 sm:px-4 py-2 rounded-lg border border-neutral-200 text-sm font-medium disabled:opacity-50 hover:bg-neutral-50 transition-colors"
                      >
                        {t('pagination.prev', 'Previous')}
                      </button>
                      <span className="text-xs sm:text-sm text-slate-600">
                        {t('pagination.page', 'Page {{page}} of {{total}}', { page, total: pagination.totalPages })}
                      </span>
                      <button
                        onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                        disabled={page === pagination.totalPages}
                        className="px-3 sm:px-4 py-2 rounded-lg border border-neutral-200 text-sm font-medium disabled:opacity-50 hover:bg-neutral-50 transition-colors"
                      >
                        {t('pagination.next', 'Next')}
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

const FilterChip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-full">
    {label}
    <button onClick={onRemove} className="hover:text-red-300 transition-colors">×</button>
  </span>
);

export default BlogPage;
