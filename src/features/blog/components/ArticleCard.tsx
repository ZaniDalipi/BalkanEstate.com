import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ArticleListItem } from '../types/article.types';
import { useAppContext } from '@/context/AppContext';
import { buildLocalizedPath } from '@/src/utils/languageRouting';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/shared/UserAvatar';
const COUNTRY_FLAGS: Record<string, string> = {
  Albania: '🇦🇱', Serbia: '🇷🇸', Croatia: '🇭🇷', Greece: '🇬🇷',
  Montenegro: '🇲🇪', 'North Macedonia': '🇲🇰', Bulgaria: '🇧🇬',
  Kosovo: '🇽🇰', Slovenia: '🇸🇮', 'Bosnia & Herzegovina': '🇧🇦', Romania: '🇷🇴',
};

const CATEGORY_COLORS: Record<string, { pill: string; accent: string }> = {
  market:      { pill: 'bg-slate-100 text-slate-700',    accent: 'from-slate-400 to-slate-600' },
  investment:  { pill: 'bg-emerald-100 text-emerald-700', accent: 'from-emerald-400 to-teal-500' },
  regulation:  { pill: 'bg-amber-100 text-amber-700',    accent: 'from-amber-400 to-orange-500' },
  development: { pill: 'bg-violet-100 text-violet-700',  accent: 'from-violet-400 to-purple-500' },
  tourism:     { pill: 'bg-rose-100 text-rose-700',      accent: 'from-rose-400 to-pink-500' },
  guide:       { pill: 'bg-blue-100 text-blue-700',      accent: 'from-blue-400 to-indigo-500' },
  lifestyle:   { pill: 'bg-pink-100 text-pink-700',      accent: 'from-pink-400 to-rose-500' },
};

interface ArticleCardProps {
  article: ArticleListItem;
  index: number;
  t: (key: string, fallback?: string) => string;
  onTagClick?: (tag: string) => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, index, t, onTagClick }) => {
  const { dispatch } = useAppContext();
  const cardRef = useRef<HTMLDivElement>(null);   // outer — only used for IntersectionObserver
  const tiltRef = useRef<HTMLDivElement>(null);   // inner — JS tilt applied here, away from image
  const glareRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);  // image zoom controlled directly
  const [isVisible, setIsVisible] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Intersection observer — animate in on scroll
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: '40px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Tilt applied only to inner wrapper — never touches the image's transform
  const handleMouseEnter = useCallback(() => {
    const img = imgRef.current;
    if (img) {
      img.style.transition = 'transform 1400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      img.style.transform = 'scale(1.10)';
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const tilt = tiltRef.current;
    const glare = glareRef.current;
    if (!tilt) return;
    const rect = tilt.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotX = ((y - cy) / cy) * -5;
    const rotY = ((x - cx) / cx) * 5;
    tilt.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    tilt.style.transition = 'transform 0.15s ease-out';
    if (glare) {
      const angle = Math.atan2(y - cy, x - cx) * (180 / Math.PI) + 180;
      glare.style.opacity = '1';
      glare.style.background = `linear-gradient(${angle}deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 60%)`;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    const tilt = tiltRef.current;
    const glare = glareRef.current;
    const img = imgRef.current;
    if (tilt) {
      tilt.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
      tilt.style.transition = 'transform 0.5s ease-out';
    }
    if (glare) {
      glare.style.opacity = '0';
      glare.style.transition = 'opacity 0.4s ease-out';
    }
    if (img) {
      img.style.transition = 'transform 900ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      img.style.transform = 'scale(1)';
    }
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.history.pushState({}, '', buildLocalizedPath(`/blog/${article.slug}`));
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'blog' });
  };

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  const cat = CATEGORY_COLORS[article.category] ?? { pill: 'bg-neutral-100 text-neutral-700', accent: 'from-slate-400 to-slate-600' };
  const flag = article.country ? COUNTRY_FLAGS[article.country] : '';

  return (
    // Outer: visibility animation only — no transform that would conflict with image
    <div
      ref={cardRef}
      className={cn(
        'group relative rounded-3xl bg-white w-full cursor-pointer',
        'shadow-[8px_8px_20px_rgba(0,0,0,0.08),-8px_-8px_20px_rgba(255,255,255,0.9)]',
        'transition-[opacity,transform,box-shadow] duration-700',
        'hover:shadow-[14px_14px_28px_rgba(0,0,0,0.12),-14px_-14px_28px_rgba(255,255,255,1)]',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
      )}
      style={{ transitionDelay: `${index * 80}ms` }}
      onClick={handleClick}
    >
      {/* Inner tilt wrapper — JS transform lives here, isolated from image */}
      <div
        ref={tiltRef}
        className="rounded-3xl overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
      {/* Cover image — LinkedIn 1200x628 (1.91:1) */}
      <div className={cn(
        'aspect-[1200/628] relative overflow-hidden',
        !article.coverImageUrl || imgError ? `bg-gradient-to-br ${cat.accent}` : '',
      )}>
        {article.coverImageUrl && !imgError ? (
          <>
            {!imgLoaded && (
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.accent} opacity-40 animate-pulse`} />
            )}
            <img
              ref={imgRef}
              src={article.coverImageUrl}
              alt={article.title}
              className={cn(
                'absolute inset-0 w-full h-full object-center will-change-transform',
                article.coverImageFit === 'contain'
                  ? 'object-contain bg-slate-100'
                  : article.coverImageFit === 'fill'
                  ? 'object-fill'
                  : 'object-cover',
                imgLoaded ? 'opacity-100' : 'opacity-0',
              )}
              style={{ transition: 'opacity 500ms ease, transform 1400ms cubic-bezier(0.25,0.46,0.45,0.94)', transform: 'scale(1)' }}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          // Gradient placeholder with icon
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-12 h-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
        )}

        {/* Gradient fade at bottom for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {flag && article.country && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-semibold text-slate-800 shadow-sm">
              {flag} {article.country}
            </span>
          )}
        </div>
        <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${cat.pill}`}>
          {t(`category_${article.category}`, article.category)}
        </span>
        {article.isFeatured && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-amber-900 text-[10px] font-bold shadow-sm">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Featured
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-5">
        {/* Title */}
        <h3 className={cn(
          'text-sm font-bold text-slate-900 line-clamp-2 leading-snug mb-2',
          'transition-colors duration-300 group-hover:text-blue-600',
        )}>
          {article.title}
        </h3>

        {/* Excerpt */}
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
          {article.excerpt}
        </p>

        {/* Animated accent line */}
        <div className="relative h-px bg-neutral-100 mb-4 overflow-hidden">
          <div className={cn(
            'absolute left-0 top-0 h-full w-0 bg-gradient-to-r rounded-full',
            cat.accent,
            'transition-[width] duration-500 group-hover:w-full',
          )} />
        </div>

        {/* Author + meta */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-full overflow-hidden flex-shrink-0',
              'shadow-[2px_2px_6px_rgba(0,0,0,0.12)] bg-gradient-to-br from-slate-100 to-slate-200',
            )}>
              <UserAvatar
                src={article.author?.avatarUrl}
                alt={article.author?.name || ''}
                gender={article.author?.gender}
                seed={article.author?._id || article.author?.name}
                avatarOptions={article.author?.avatarOptions}
                width={56}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-[11px] text-slate-500 truncate max-w-[90px] font-medium">
              {article.author?.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            {article.readTime && (
              <span className="flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {article.readTime}m
              </span>
            )}
            {article.readTime && publishedDate && <span>·</span>}
            {publishedDate && <span>{publishedDate}</span>}
          </div>
        </div>
      </div>

      {/* Tags — separate from card click */}
      {article.tags && article.tags.length > 0 && (
        <div className="px-5 pb-5 flex flex-wrap gap-1.5" onClick={e => e.stopPropagation()}>
          {article.tags.slice(0, 3).map(tag => (
            <button
              key={tag}
              onClick={e => { e.stopPropagation(); onTagClick?.(tag); }}
              className={cn(
                'px-2.5 py-0.5 text-[10px] text-slate-500 rounded-full',
                'shadow-[2px_2px_4px_rgba(0,0,0,0.04),-2px_-2px_4px_rgba(255,255,255,0.8)]',
                'hover:shadow-none hover:bg-slate-900 hover:text-white',
                'transition-all duration-200',
              )}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Read more CTA row */}
      <div className="px-5 pb-5">
        <div className={cn(
          'flex items-center justify-between px-4 py-2.5 rounded-2xl',
          'shadow-[3px_3px_6px_rgba(0,0,0,0.05),-3px_-3px_6px_rgba(255,255,255,0.8)]',
          'transition-all duration-300 group-hover:shadow-none group-hover:bg-slate-900',
        )}>
          <span className="text-xs font-semibold text-slate-600 group-hover:text-white transition-colors duration-300">
            Read article
          </span>
          <svg
            className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all duration-300"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Glare overlay */}
      <div
        ref={glareRef}
        className="pointer-events-none absolute inset-0 rounded-3xl z-20"
        style={{ opacity: 0 }}
      />

      {/* Hover border */}
      <div className="absolute inset-0 rounded-3xl border border-blue-200/0 group-hover:border-blue-200/80 transition-colors duration-500 pointer-events-none" />
      </div>{/* end tilt wrapper */}
    </div>
  );
};

export default React.memo(ArticleCard);
