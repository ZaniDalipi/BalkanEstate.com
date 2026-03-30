import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useArticles } from '../hooks/useArticles';
import { useArticle } from '../hooks/useArticle';
import { ArticleCategory } from '../types/article.types';
import ArticleCard from './ArticleCard';
import BlogFilters from './BlogFilters';
import ArticlePage from './ArticlePage';

const BlogPage: React.FC = () => {
  const { t } = useTranslation('blog');
  const [selectedCategory, setSelectedCategory] = useState<ArticleCategory | undefined>();
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  // Extract slug from URL if present
  const slug = useMemo(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/[a-z]*\/?blog\/(.+)$/);
    return match ? match[1] : null;
  }, []);

  // If we have a slug, show the article detail page
  if (slug) {
    return <ArticlePage slug={slug} />;
  }

  // Otherwise, show the blog listing
  const { articles, pagination, isLoading, error } = useArticles({
    category: selectedCategory,
    country: selectedCountry,
    page,
    limit: 12,
  });

  // Fetch categories and countries for filters
  const { data: categoriesData } = React.useQuery({
    queryKey: ['article-categories'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5001/api/articles/categories');
      return res.json();
    },
  });

  const { data: countriesData } = React.useQuery({
    queryKey: ['article-countries'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5001/api/articles/countries');
      return res.json();
    },
  });

  const categories = categoriesData?.categories || [];
  const countries = countriesData?.countries || [];

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
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
              {t('subtitle', 'Expert insights, market analysis, and guides for property buyers, investors, and sellers across the Balkans')}
            </p>
          </motion.div>
        </div>
      </section>

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
                  onCategoryChange={setSelectedCategory}
                  onCountryChange={setSelectedCountry}
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
                <div className="text-center py-12 text-slate-400">
                  <p className="text-sm sm:text-base">{t('noArticles', 'No articles found')}</p>
                </div>
              ) : (
                <>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`articles-${selectedCategory}-${selectedCountry}-${page}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
                    >
                      {articles.map((article, i) => (
                        <ArticleCard key={article._id} article={article} index={i} t={t} />
                      ))}
                    </motion.div>
                  </AnimatePresence>

                  {/* Pagination */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="mt-12 sm:mt-16 flex items-center justify-center gap-2 sm:gap-3">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-3 sm:px-4 py-2 rounded-lg border border-neutral-200 text-sm font-medium disabled:opacity-50"
                      >
                        {t('pagination.prev', 'Previous')}
                      </button>
                      <span className="text-xs sm:text-sm text-slate-600">
                        {t('pagination.page', 'Page {{page}} of {{total}}', {
                          page,
                          total: pagination.totalPages,
                        })}
                      </span>
                      <button
                        onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                        disabled={page === pagination.totalPages}
                        className="px-3 sm:px-4 py-2 rounded-lg border border-neutral-200 text-sm font-medium disabled:opacity-50"
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

export default BlogPage;
