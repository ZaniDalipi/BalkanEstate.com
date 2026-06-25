import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { useArticle } from '../hooks/useArticle';
import { useArticles } from '../hooks/useArticles';
import { API_CONFIG } from '@/src/shared/constants/app.constants';
import { useAppContext } from '@/context/AppContext';
import { buildLocalizedPath } from '@/src/utils/languageRouting';
import ArticleCard from './ArticleCard';
import { cn } from '@/lib/utils';

interface ArticlePageProps {
  slug: string;
  onTagClick?: (tag: string) => void;
}

const COUNTRY_FLAGS: Record<string, string> = {
  Albania: '🇦🇱', Serbia: '🇷🇸', Croatia: '🇭🇷', Greece: '🇬🇷',
  Montenegro: '🇲🇪', 'North Macedonia': '🇲🇰', Bulgaria: '🇧🇬',
  Kosovo: '🇽🇰', Slovenia: '🇸🇮', 'Bosnia & Herzegovina': '🇧🇦', Romania: '🇷🇴',
};

const CATEGORY_COLORS: Record<string, string> = {
  market: 'bg-slate-100 text-slate-700', investment: 'bg-emerald-100 text-emerald-700',
  regulation: 'bg-amber-100 text-amber-700', development: 'bg-violet-100 text-violet-700',
  tourism: 'bg-rose-100 text-rose-700', guide: 'bg-blue-100 text-blue-700',
  lifestyle: 'bg-pink-100 text-pink-700',
};

// ── Share utilities ──────────────────────────────────────────────────────────
// Return the clean, canonical article URL (origin + path) so the link pasted
// into each social post is stable and matches the OG-preview crawler route —
// dropping any transient hash/query that may sit in the address bar.
const getShareUrl = () => {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}`;
};

// Every entry embeds the article `url` so the link is always part of the
// resulting post/composer on the target platform.
const shareLinks = (title: string, url: string) => ({
  twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}&via=balkanestate`,
  linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
  telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  reddit: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title}\n\n${url}`)}`,
});

// ── Reading progress hook ────────────────────────────────────────────────────
const useReadingProgress = (contentRef: React.RefObject<HTMLElement | null>) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const windowH = window.innerHeight;
      const total = el.offsetHeight - windowH;
      const scrolled = -rect.top;
      setProgress(Math.min(100, Math.max(0, total > 0 ? (scrolled / total) * 100 : 0)));
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [contentRef]);

  return progress;
};

// ── Share Button ─────────────────────────────────────────────────────────────
const ShareButton: React.FC<{ href?: string; onClick?: () => void; label: string; children: React.ReactNode; copied?: boolean }> = ({
  href, onClick, label, children, copied,
}) => {
  const cls = `inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 bg-white border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all duration-200 text-xs font-medium ${copied ? 'border-emerald-400 text-emerald-700' : ''}`;
  const inner = (
    <>
      {children}
      <span className="hidden sm:inline">{copied ? 'Copied!' : label}</span>
    </>
  );
  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={cls}>{inner}</a>;
  }
  return <button onClick={onClick} aria-label={label} className={cls}>{inner}</button>;
};

// ── All share buttons in one place ────────────────────────────────────────────
interface ShareLinksType {
  twitter: string; linkedin: string; facebook: string;
  whatsapp: string; telegram: string; reddit: string; email: string;
}
const ShareButtons: React.FC<{
  links: ShareLinksType;
  copied: boolean;
  onCopy: () => void;
  onNativeShare: () => void;
}> = ({ links, copied, onCopy, onNativeShare }) => (
  <div className="flex flex-wrap gap-1.5 sm:gap-2">
    <ShareButton href={links.twitter} label="X / Twitter">
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </ShareButton>
    <ShareButton href={links.linkedin} label="LinkedIn">
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    </ShareButton>
    <ShareButton href={links.facebook} label="Facebook">
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    </ShareButton>
    <ShareButton href={links.whatsapp} label="WhatsApp">
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    </ShareButton>
    <ShareButton href={links.telegram} label="Telegram">
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    </ShareButton>
    <ShareButton href={links.reddit} label="Reddit">
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    </ShareButton>
    <ShareButton href={links.email} label="Email">
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    </ShareButton>
    {typeof navigator !== 'undefined' && 'share' in navigator && (
      <ShareButton onClick={onNativeShare} label="More">
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </ShareButton>
    )}
    <ShareButton onClick={onCopy} label={copied ? 'Copied!' : 'Copy link'} copied={copied}>
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={copied ? 'M5 13l4 4L19 7' : 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'} />
      </svg>
    </ShareButton>
  </div>
);

// ── HTML page renderer — sandboxed iframe with auto-height ───────────────────
const HtmlPageRenderer: React.FC<{ content: string }> = ({ content }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const autoResize = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    iframe.style.height = '0px';
    const h = Math.max(doc.body?.scrollHeight ?? 0, doc.documentElement?.scrollHeight ?? 0);
    iframe.style.height = `${h + 32}px`;
  };

  return (
    <iframe
      ref={iframeRef}
      srcDoc={content}
      sandbox="allow-same-origin"
      className="w-full border-0"
      style={{ minHeight: '400px', display: 'block' }}
      onLoad={autoResize}
      title="Article content"
    />
  );
};

// ── Article skeleton ─────────────────────────────────────────────────────────
const ArticleSkeleton: React.FC = () => (
  <div className="min-h-screen bg-white animate-pulse">
    <div className="w-full aspect-[1200/628] bg-neutral-200" />
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-4">
      <div className="h-4 w-24 bg-neutral-200 rounded-full" />
      <div className="h-10 w-3/4 bg-neutral-200 rounded-xl" />
      <div className="h-10 w-1/2 bg-neutral-200 rounded-xl" />
      <div className="h-5 w-full bg-neutral-200 rounded-lg" />
      <div className="h-5 w-5/6 bg-neutral-200 rounded-lg" />
      <div className="h-px bg-neutral-200 my-6" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-4 bg-neutral-200 rounded-lg" style={{ width: `${70 + Math.random() * 30}%` }} />
      ))}
    </div>
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────
const ArticlePage: React.FC<ArticlePageProps> = ({ slug, onTagClick }) => {
  const { t } = useTranslation('blog');
  const { dispatch } = useAppContext();
  const { article, isLoading, error } = useArticle(slug);
  const contentRef = useRef<HTMLDivElement>(null);
  const progress = useReadingProgress(contentRef as React.RefObject<HTMLElement>);
  const [copied, setCopied] = useState(false);

  // Related articles (same category, excluding current)
  const { articles: relatedArticles } = useArticles({
    category: article?.category,
    limit: 3,
    page: 1,
  });
  const related = relatedArticles.filter(a => a.slug !== slug).slice(0, 2);

  const isHtmlPage = !!(article?.content && (
    article.content.includes('<style') ||
    article.content.trimStart().startsWith('<!DOCTYPE') ||
    article.content.trimStart().startsWith('<html')
  ));

  // Sanitise article HTML once — prevents XSS while preserving safe formatting
  const sanitisedContent = useMemo(() => {
    if (!article?.content || isHtmlPage) return '';
    return DOMPurify.sanitize(article.content, {
      ALLOWED_TAGS: [
        'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'strong', 'em', 'u', 's', 'blockquote', 'code', 'pre',
        'ul', 'ol', 'li', 'a', 'img', 'hr', 'table', 'thead',
        'tbody', 'tr', 'th', 'td', 'figure', 'figcaption', 'span', 'div',
        'section', 'article', 'aside', 'header', 'footer', 'main', 'nav',
        'mark', 'small', 'sub', 'sup', 'del', 'ins',
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'class', 'width', 'height', 'style'],
      ALLOW_DATA_ATTR: false,
      FORCE_BODY: true,
    });
  }, [article?.content, isHtmlPage]);

  const goBack = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.history.pushState({}, '', buildLocalizedPath('/blog'));
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'blog' });
  }, [dispatch]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the text
    }
  }, []);

  const nativeShare = useCallback(async (title: string, url: string) => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title, url });
    } catch {
      // User dismissed — no-op
    }
  }, []);

  // Track view — fire once per slug
  useEffect(() => {
    if (!slug) return;
    const key = `viewed_${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    fetch(`${API_CONFIG.BASE_URL}/articles/${slug}/view`, {
      method: 'POST',
    }).catch(() => {});
  }, [slug]);

  if (isLoading) return <ArticleSkeleton />;

  if (error || !article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">{t('articleNotFound', 'Article not found')}</h1>
          <p className="text-sm text-slate-500 mb-5">{t('articleNotFoundDesc', 'This article may have been moved or deleted.')}</p>
          <button
            onClick={goBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('backToBlog', 'Back to Blog')}
          </button>
        </div>
      </div>
    );
  }

  const shareUrl = getShareUrl();
  const links = shareLinks(article.title, shareUrl);
  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const publishedTime = article.publishedAt
    ? new Date(article.publishedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';
  const countryFlag = article.country ? COUNTRY_FLAGS[article.country] : '';
  const pageTitle = `${article.title} | BalkanEstate Blog`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={article.excerpt} />
        <link rel="canonical" href={shareUrl} />
        {/* Open Graph */}
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={shareUrl} />
        {article.coverImageUrl && <meta property="og:image" content={article.coverImageUrl} />}
        <meta property="og:site_name" content="BalkanEstate" />
        {article.publishedAt && <meta property="article:published_time" content={article.publishedAt} />}
        {article.tags?.map(tag => <meta key={tag} property="article:tag" content={tag} />)}
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={article.excerpt} />
        {article.coverImageUrl && <meta name="twitter:image" content={article.coverImageUrl} />}
        <meta name="twitter:site" content="@balkanestate" />
        {/* Open Graph image dimensions */}
        {article.coverImageUrl && <meta property="og:image:width" content="1200" />}
        {article.coverImageUrl && <meta property="og:image:height" content="628" />}
        {article.coverImageUrl && <meta property="og:image:type" content="image/jpeg" />}
        {/* JSON-LD structured data — improves link previews and rich snippets */}
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.excerpt,
          ...(article.coverImageUrl ? { image: [article.coverImageUrl] } : {}),
          ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
          dateModified: article.updatedAt || article.publishedAt,
          author: { '@type': 'Person', name: article.author?.name || 'BalkanEstate' },
          publisher: {
            '@type': 'Organization',
            name: 'BalkanEstate',
            logo: { '@type': 'ImageObject', url: `${typeof window !== 'undefined' ? window.location.origin : ''}/logo.png` },
          },
          mainEntityOfPage: { '@type': 'WebPage', '@id': shareUrl },
          keywords: article.tags?.join(', '),
        })}</script>
      </Helmet>

      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-neutral-200">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 origin-left"
          style={{ scaleX: progress / 100 }}
          transition={{ ease: 'linear' }}
        />
      </div>

      <article className="min-h-screen bg-white" ref={contentRef}>
        {/* ── Hero Image ─────────────────────────────────────────────────────── */}
        {article.coverImageUrl ? (
          <div className="w-full aspect-[1200/628] overflow-hidden bg-slate-100">
            <motion.img
              src={article.coverImageUrl}
              alt={article.title}
              className={cn(
                'w-full h-full object-center',
                article.coverImageFit === 'contain'
                  ? 'object-contain bg-slate-100'
                  : article.coverImageFit === 'fill'
                  ? 'object-fill'
                  : 'object-cover',
              )}
              initial={{ scale: 1.05, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>
        ) : (
          <div className="w-full h-24 sm:h-32 bg-gradient-to-br from-slate-800 to-slate-900" />
        )}

        {/* ── Article Header ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6"
        >
          {/* Back link */}
          <button
            onClick={goBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6 group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('backToBlog', 'Back to Blog')}
          </button>

          {/* Category + country meta */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${CATEGORY_COLORS[article.category] || 'bg-neutral-100 text-neutral-700'}`}>
              {t(`category_${article.category}`, article.category)}
            </span>
            {article.country && (
              <span className="flex items-center gap-1.5 text-sm text-slate-500">
                {countryFlag && <span>{countryFlag}</span>}
                <span>{article.country}</span>
              </span>
            )}
            {article.isFeatured && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Featured
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-[2.625rem] font-bold text-slate-900 mb-4 leading-tight tracking-tight">
            {article.title}
          </h1>

          {/* Excerpt */}
          <p className="text-lg sm:text-xl text-slate-500 mb-6 leading-relaxed font-light">
            {article.excerpt}
          </p>

          {/* Author + date + read time */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-5 border-t border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
                {article.author?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{article.author?.name || 'BalkanEstate'}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {publishedDate && (
                    <span>{publishedDate}{publishedTime && <span className="text-slate-300 ml-1">· {publishedTime}</span>}</span>
                  )}
                  {publishedDate && article.readTime && <span>·</span>}
                  {article.readTime && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {article.readTime} min read
                    </span>
                  )}
                  {article.viewCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {article.viewCount.toLocaleString()} views
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Share buttons — top */}
            <ShareButtons links={links} copied={copied} onCopy={copyLink} onNativeShare={() => nativeShare(article.title, shareUrl)} />
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-5">
              {article.tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => onTagClick?.(tag)}
                  className="px-3 py-1 rounded-full text-sm bg-neutral-100 text-neutral-600 hover:bg-slate-900 hover:text-white transition-all duration-200"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Article Content ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className={isHtmlPage ? 'w-full pb-16 overflow-hidden' : 'max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16'}
        >
          {isHtmlPage ? (
            <HtmlPageRenderer content={article.content} />
          ) : (
            <div
              className="
                text-slate-800 text-base sm:text-[1.0625rem] leading-[1.85]
                [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:mt-12 [&_h1]:mb-4 [&_h1]:tracking-tight
                [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:tracking-tight
                [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-slate-900 [&_h3]:mt-7 [&_h3]:mb-2
                [&_p]:mb-5 [&_p]:leading-[1.85]
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-5 [&_ul]:space-y-1.5
                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-5 [&_ol]:space-y-1.5
                [&_li]:leading-relaxed
                [&_blockquote]:border-l-4 [&_blockquote]:border-blue-400 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-8 [&_blockquote]:bg-blue-50/60 [&_blockquote]:py-4 [&_blockquote]:pr-4 [&_blockquote]:rounded-r-xl [&_blockquote]:text-lg
                [&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-blue-800
                [&_hr]:border-neutral-200 [&_hr]:my-10
                [&_img]:w-full [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-2xl [&_img]:my-8 [&_img]:shadow-lg [&_img]:object-cover
                [&_code]:bg-slate-100 [&_code]:text-slate-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
                [&_pre]:bg-slate-900 [&_pre]:text-green-300 [&_pre]:p-5 [&_pre]:rounded-2xl [&_pre]:overflow-x-auto [&_pre]:my-8 [&_pre]:text-sm [&_pre]:leading-relaxed
                [&_strong]:font-semibold [&_strong]:text-slate-900
                [&_em]:text-slate-600
                [&_table]:w-full [&_table]:border-collapse [&_table]:my-8 [&_table]:text-sm
                [&_th]:bg-slate-100 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:border [&_th]:border-neutral-200
                [&_td]:px-4 [&_td]:py-2.5 [&_td]:border [&_td]:border-neutral-200
                [&_tr:nth-child(even)_td]:bg-slate-50
              "
              dangerouslySetInnerHTML={{ __html: sanitisedContent }}
            />
          )}
        </motion.div>

        {/* ── Bottom share + back ─────────────────────────────────────────────── */}
        <div className="border-t border-neutral-100 py-10 bg-slate-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3">Share this article</p>
                <ShareButtons links={links} copied={copied} onCopy={copyLink} onNativeShare={() => nativeShare(article.title, shareUrl)} />
              </div>
              <button
                onClick={goBack}
                className="self-start sm:self-auto inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors group flex-shrink-0"
              >
                <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t('backToBlog', 'Back to Blog')}
              </button>
            </div>
          </div>
        </div>

        {/* ── Related Articles ────────────────────────────────────────────────── */}
        {related.length > 0 && (
          <section className="py-12 sm:py-16 bg-white border-t border-neutral-100">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-xl font-bold text-slate-900 mb-8">{t('relatedArticles', 'Related Articles')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {related.map((a, i) => (
                  <ArticleCard key={a._id} article={a} index={i} t={t as (key: string, fallback?: string) => string} onTagClick={onTagClick} />
                ))}
              </div>
            </div>
          </section>
        )}
      </article>
    </>
  );
};

export default ArticlePage;
