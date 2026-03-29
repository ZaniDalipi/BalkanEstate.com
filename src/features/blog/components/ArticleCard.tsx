import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArticleListItem } from '../types/article.types';
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
  guide: 'bg-blue-100 text-blue-700',
  lifestyle: 'bg-pink-100 text-pink-700',
};

interface ArticleCardProps {
  article: ArticleListItem;
  index: number;
  t: (key: string, fallback?: string) => string;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, index, t }) => {
  const { dispatch } = useAppContext();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.history.pushState({}, '', buildLocalizedPath(`/blog/${article.slug}`));
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'blog' });
  };

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <motion.button
      onClick={handleClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
      whileHover={{ y: -4 }}
      className="group block w-full text-left rounded-2xl overflow-hidden border border-neutral-200 bg-white hover:shadow-xl transition-shadow"
    >
      {/* Cover image or gradient fallback */}
      <div className={`h-28 sm:h-36 relative overflow-hidden ${article.coverImageUrl ? '' : 'bg-gradient-to-br from-blue-200 to-indigo-300'}`}>
        {article.coverImageUrl ? (
          <img
            src={article.coverImageUrl}
            alt={article.title}
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
                  <pattern id={`grid-${article._id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="200" height="100" fill={`url(#grid-${article._id})`} />
              </svg>
            </div>
          </>
        )}

        {/* Country badge */}
        {article.country && (
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1">
            {COUNTRY_FLAGS[article.country] && <span className="text-xs">{COUNTRY_FLAGS[article.country]}</span>}
            <span className="text-[10px] sm:text-xs font-semibold text-slate-800">{article.countryCode}</span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 hidden sm:inline">{article.country}</span>
          </div>
        )}

        {/* Category tag */}
        <span className={`absolute top-2 sm:top-3 right-2 sm:right-3 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wider ${CATEGORY_COLORS[article.category] || 'bg-neutral-100 text-neutral-700'}`}>
          {t(`blog:category_${article.category}`, article.category)}
        </span>
      </div>

      <div className="p-3 sm:p-4">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
          {article.title}
        </h3>
        <p className="text-[10px] sm:text-xs text-slate-500 mt-1.5 sm:mt-2 line-clamp-2 leading-relaxed">{article.excerpt}</p>

        <div className="flex items-center justify-between mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-neutral-50">
          <div className="flex items-center gap-1">
            {article.readTime && (
              <>
                <span className="text-[9px] sm:text-[10px] text-slate-400">{article.readTime} min</span>
                <span className="text-[8px] text-slate-300">•</span>
              </>
            )}
            <span className="text-[9px] sm:text-[10px] text-slate-400">{article.author.name}</span>
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-400">{publishedDate}</span>
        </div>

        <span className="inline-flex items-center gap-1 mt-2 text-[10px] sm:text-[11px] text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          {t('blog:readMore', 'Read More')} <span>&rarr;</span>
        </span>
      </div>
    </motion.button>
  );
};

export default ArticleCard;
