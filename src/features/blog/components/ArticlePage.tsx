import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useArticle } from '../hooks/useArticles';
import { useAppContext } from '@/context/AppContext';
import { buildLocalizedPath } from '@/src/utils/languageRouting';

interface ArticlePageProps {
  slug: string;
}

const COUNTRY_FLAGS: Record<string, string> = {
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
  guide: 'bg-blue-100 text-blue-700',
  lifestyle: 'bg-pink-100 text-pink-700',
};

const ArticlePage: React.FC<ArticlePageProps> = ({ slug }) => {
  const { t } = useTranslation('blog');
  const { dispatch } = useAppContext();
  const { data: articleData, isLoading } = React.useQuery({
    queryKey: ['article', slug],
    queryFn: async () => {
      const res = await fetch(`http://localhost:5001/api/articles/${slug}`);
      if (!res.ok) throw new Error('Article not found');
      return res.json();
    },
  });

  const article = articleData?.article;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('articleNotFound', 'Article not found')}</h1>
          <button
            onClick={() => {
              window.history.back();
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('backToBlog', 'Back to Blog')}
          </button>
        </div>
      </div>
    );
  }

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <>
      <Helmet>
        <title>{article.title} | BalkanEstate</title>
        <meta name="description" content={article.excerpt} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.excerpt} />
        {article.coverImageUrl && <meta property="og:image" content={article.coverImageUrl} />}
        <meta property="og:type" content="article" />
        {article.publishedAt && <meta property="article:published_time" content={article.publishedAt} />}
      </Helmet>

      <article className="min-h-screen bg-white">
        {/* Cover Image */}
        {article.coverImageUrl && (
          <div className="w-full h-64 sm:h-96 md:h-[500px] overflow-hidden">
            <img
              src={article.coverImageUrl}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Article Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16"
        >
          {/* Back Button */}
          <button
            onClick={() => {
              window.history.pushState({}, '', buildLocalizedPath('/blog'));
              dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'blog' });
            }}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm mb-6 inline-flex items-center gap-1"
          >
            ← {t('backToBlog', 'Back to Blog')}
          </button>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 mb-6 text-sm text-slate-600">
            {article.country && (
              <div className="flex items-center gap-1.5">
                {COUNTRY_FLAGS[article.country] && <span>{COUNTRY_FLAGS[article.country]}</span>}
                <span>{article.country}</span>
              </div>
            )}
            {article.readTime && <span>•</span>}
            {article.readTime && <span>{article.readTime} min read</span>}
            {publishedDate && <span>•</span>}
            {publishedDate && <span>{publishedDate}</span>}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
            {article.title}
          </h1>

          {/* Category Badge */}
          <div className="flex flex-wrap gap-3 mb-6">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${CATEGORY_COLORS[article.category] || 'bg-neutral-100 text-neutral-700'}`}>
              {t(`category_${article.category}`, article.category)}
            </span>
            {article.tags && article.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full text-sm bg-neutral-100 text-neutral-700">
                #{tag}
              </span>
            ))}
          </div>

          {/* Author Info */}
          <div className="flex items-center gap-4 py-6 border-t border-b border-neutral-200">
            <div>
              <p className="font-semibold text-slate-900">{article.author.name}</p>
              <p className="text-xs text-slate-600">{publishedDate}</p>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12"
        >
          <div
            className="prose prose-sm sm:prose max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:bg-slate-100 prose-code:text-slate-900 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </motion.div>

        {/* Related Articles Section (Future Enhancement) */}
        <div className="py-12 sm:py-16 md:py-24 bg-slate-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              {t('moreArticles', 'More Articles')}
            </h2>
            <p className="text-slate-600 mb-8">
              {t('moreArticlesDesc', 'Check back soon for more articles on real estate investment and market insights.')}
            </p>
          </div>
        </div>
      </article>
    </>
  );
};

export default ArticlePage;
