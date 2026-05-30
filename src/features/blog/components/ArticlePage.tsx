import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useArticle } from '../hooks/useArticle';
import { useAppContext } from '@/context/AppContext';
import { buildLocalizedPath } from '@/src/utils/languageRouting';

interface ArticlePageProps {
  slug: string;
  onTagClick?: (tag: string) => void;
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

const ArticlePage: React.FC<ArticlePageProps> = ({ slug, onTagClick }) => {
  const { t } = useTranslation('blog');
  const { dispatch } = useAppContext();
  const { article, isLoading } = useArticle(slug);

  const goBack = () => {
    window.history.pushState({}, '', buildLocalizedPath('/blog'));
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'blog' });
  };

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
          <button onClick={goBack} className="text-blue-600 hover:text-blue-700 font-medium">
            {t('backToBlog', '← Back to Blog')}
          </button>
        </div>
      </div>
    );
  }

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  const countryFlag = article.country ? COUNTRY_FLAGS[article.country] : '';

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
        {article.tags && article.tags.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
      </Helmet>

      <article className="min-h-screen bg-white">
        {/* Hero / Cover Image */}
        {article.coverImageUrl ? (
          <div className="w-full h-64 sm:h-96 md:h-[500px] overflow-hidden">
            <img
              src={article.coverImageUrl}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-32 sm:h-48 bg-gradient-to-br from-slate-800 to-slate-900" />
        )}

        {/* Article Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16"
        >
          <button
            onClick={goBack}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm mb-8 inline-flex items-center gap-1.5 group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('backToBlog', 'Back to Blog')}
          </button>

          {/* Category + country meta */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${CATEGORY_COLORS[article.category] || 'bg-neutral-100 text-neutral-700'}`}>
              {t(`category_${article.category}`, article.category)}
            </span>
            {article.country && (
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                {countryFlag && <span>{countryFlag}</span>}
                <span>{article.country}</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
            {article.title}
          </h1>

          {/* Excerpt */}
          <p className="text-lg text-slate-500 mb-6 leading-relaxed">{article.excerpt}</p>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {article.tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => onTagClick?.(tag)}
                  className="px-3 py-1 rounded-full text-sm bg-neutral-100 text-neutral-700 hover:bg-slate-900 hover:text-white transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Author + date */}
          <div className="flex items-center gap-4 py-5 border-t border-b border-neutral-100">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {article.author?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{article.author?.name}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {publishedDate && <span>{publishedDate}</span>}
                {publishedDate && article.readTime && <span>·</span>}
                {article.readTime && <span>{article.readTime} min read</span>}
                {article.viewCount > 0 && (
                  <>
                    <span>·</span>
                    <span>{article.viewCount.toLocaleString()} views</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16"
        >
          <div
            className="
              text-slate-800 text-base sm:text-lg leading-8
              [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:mt-10 [&_h1]:mb-4
              [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-3
              [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-slate-900 [&_h3]:mt-6 [&_h3]:mb-2
              [&_p]:mb-5 [&_p]:leading-relaxed
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-5 [&_ul]:space-y-1
              [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-5 [&_ol]:space-y-1
              [&_blockquote]:border-l-4 [&_blockquote]:border-blue-400 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-6 [&_blockquote]:bg-blue-50/50 [&_blockquote]:py-3 [&_blockquote]:rounded-r-lg
              [&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-blue-800
              [&_hr]:border-neutral-200 [&_hr]:my-8
              [&_img]:max-w-full [&_img]:rounded-2xl [&_img]:my-6 [&_img]:shadow-sm
              [&_code]:bg-slate-100 [&_code]:text-slate-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
              [&_pre]:bg-slate-900 [&_pre]:text-green-300 [&_pre]:p-5 [&_pre]:rounded-2xl [&_pre]:overflow-x-auto [&_pre]:my-6 [&_pre]:text-sm
              [&_strong]:font-semibold [&_strong]:text-slate-900
              [&_table]:w-full [&_table]:border-collapse [&_table]:my-6
              [&_th]:bg-slate-100 [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold [&_th]:border [&_th]:border-neutral-200
              [&_td]:px-4 [&_td]:py-2 [&_td]:text-sm [&_td]:border [&_td]:border-neutral-200
            "
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </motion.div>

        {/* Back link footer */}
        <div className="border-t border-neutral-100 py-12 bg-slate-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('backToBlog', 'Back to Blog')}
            </button>
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {article.tags.slice(0, 4).map(tag => (
                  <button
                    key={tag}
                    onClick={() => onTagClick?.(tag)}
                    className="px-2.5 py-0.5 text-xs bg-white border border-neutral-200 text-slate-600 rounded-full hover:border-slate-400 transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>
    </>
  );
};

export default ArticlePage;
