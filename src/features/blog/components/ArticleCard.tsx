import React from 'react';
import { motion } from 'framer-motion';
import { ArticleListItem } from '../types/article.types';
import { useAppContext } from '@/context/AppContext';
import { buildLocalizedPath } from '@/src/utils/languageRouting';

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

interface ArticleCardProps {
  article: ArticleListItem;
  index: number;
  t: (key: string, fallback?: string) => string;
  onTagClick?: (tag: string) => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, index, t, onTagClick }) => {
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
      whileHover={{ y: -4 }}
      className="group block w-full text-left rounded-2xl overflow-hidden border border-neutral-200 bg-white hover:shadow-xl transition-shadow"
    >
      {/* Clickable area for article */}
      <button onClick={handleClick} className="block w-full text-left">
        {/* Cover image or gradient fallback — 16:9 aspect ratio */}
        <div className={`aspect-[16/9] relative overflow-hidden ${article.coverImageUrl ? '' : 'bg-gradient-to-br from-blue-200 to-indigo-300'}`}>
          {article.coverImageUrl ? (
            <img
              src={article.coverImageUrl}
              alt={article.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="absolute inset-0 bg-black/10">
              <svg className="w-full h-full opacity-10" viewBox="0 0 200 100">
                <defs>
                  <pattern id={`grid-${article._id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="200" height="100" fill={`url(#grid-${article._id})`} />
              </svg>
            </div>
          )}

          {/* Country badge */}
          {article.country && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1">
              {COUNTRY_FLAGS[article.country] && <span className="text-xs">{COUNTRY_FLAGS[article.country]}</span>}
              <span className="text-xs font-semibold text-slate-800">{article.country}</span>
            </div>
          )}

          {/* Category tag */}
          <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${CATEGORY_COLORS[article.category] || 'bg-neutral-100 text-neutral-700'}`}>
            {t(`blog:category_${article.category}`, article.category)}
          </span>

          {/* Featured badge */}
          {article.isFeatured && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-amber-400 text-amber-900 rounded-full px-2 py-0.5">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-[9px] font-bold">Featured</span>
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug mb-1.5">
            {article.title}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">{article.excerpt}</p>

          <div className="flex items-center justify-between pt-3 border-t border-neutral-50">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                {article.author?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span className="text-[10px] text-slate-500 truncate max-w-[80px]">{article.author?.name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              {article.readTime && <span>{article.readTime}m read</span>}
              {article.readTime && publishedDate && <span>·</span>}
              {publishedDate && <span>{publishedDate}</span>}
            </div>
          </div>
        </div>
      </button>

      {/* Tags — clickable, separate from the article click */}
      {article.tags && article.tags.length > 0 && (
        <div className="px-4 pb-4 flex flex-wrap gap-1.5">
          {article.tags.slice(0, 3).map(tag => (
            <button
              key={tag}
              onClick={e => { e.stopPropagation(); onTagClick?.(tag); }}
              className="px-2 py-0.5 text-[10px] text-slate-500 bg-neutral-100 hover:bg-slate-900 hover:text-white rounded-full transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ArticleCard;
