import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Typewriter } from '@/src/components/ui/typewriter';
import { apiRequest } from '@/src/shared/api';
import { splitHighlights } from '@/shared/search';
import { useUniversalSearch } from '@/src/features/search/universal/useUniversalSearch';
import { rememberSearch } from '@/src/features/search/universal/recentSearches';
import type { Suggestion } from '@/src/features/search/universal/types';

interface HeroSectionProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onNavigate: (view: string, path: string) => void;
  /**
   * Rendered directly under the Buy / Rent / List buttons, inside the hero's
   * own container. A slot rather than an import so the hero stays unaware of
   * whatever the home page decides to put there — today the city gallery.
   */
  belowActions?: React.ReactNode;
}

interface PlatformStats {
  properties: number;
  countries: number;
  agents: number;
  languages: number;
}

/* ─── Animated number counter (no framer-motion) ─── */
const AnimatedNumber: React.FC<{ value: string; delay?: number }> = ({ value, delay = 0 }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState('0');
  const hasAnimated = useRef(false);

  const numericMatch = value.match(/^([\d,]+)(.*)$/);
  const targetNum = numericMatch ? parseInt(numericMatch[1].replace(/,/g, ''), 10) : 0;
  const suffix = numericMatch ? numericMatch[2] : value;

  React.useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || hasAnimated.current) return;
      hasAnimated.current = true;
      observer.disconnect();
      const timeout = setTimeout(() => {
        const duration = 1500;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.floor(eased * targetNum).toLocaleString());
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, delay);
      return () => clearTimeout(timeout);
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetNum, delay]);

  return <span ref={ref}>{display}{suffix}</span>;
};

const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  onSearchChange,
  onSearch,
  onNavigate,
  belowActions,
}) => {
  const { t } = useTranslation(['home', 'search']);
  const [isFocused, setIsFocused] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  /**
   * The hero box is the same engine as the search page's, wearing the hero's
   * clothes: local places answer instantly, listings are offered alongside
   * them, and the geocoder only fills in what the app does not already know.
   */
  const { groups, suggestions, isSearching } = useUniversalSearch({
    query: searchQuery,
    enabled: isFocused && !isDismissed,
  });

  // Fetch real stats from backend
  const { data: stats } = useQuery<PlatformStats>({
    queryKey: ['platformStats'],
    queryFn: async () => {
      const [propsRes, agentsRes] = await Promise.all([
        apiRequest<{ pagination?: { total?: number } }>('/properties?limit=1&status=active', { requiresAuth: false }),
        apiRequest<{ total?: number; pagination?: { total?: number }; agents?: unknown[] }>('/agents', { requiresAuth: false }),
      ]);
      return {
        properties: propsRes.pagination?.total || 0,
        countries: 11,
        agents: agentsRes.total || agentsRes.pagination?.total || (Array.isArray(agentsRes.agents) ? agentsRes.agents.length : 0),
        languages: 10,
      };
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  // A fresh keystroke re-opens a list the user dismissed with Escape.
  useEffect(() => {
    setIsDismissed(false);
  }, [searchQuery]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsDismissed(true);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /**
   * Every row leads to the same place from the hero: the search page, for
   * the text the row stands for. A place row carries its canonical spelling
   * ("Bečići, Budva"), so the search that runs is the one the label promised.
   */
  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    const value =
      suggestion.type === 'place'
        ? suggestion.searchValue
        : suggestion.type === 'property'
          ? [suggestion.property.city, suggestion.property.country].filter(Boolean).join(', ')
          : suggestion.title;

    onSearchChange(value);
    rememberSearch(value);
    setIsDismissed(true);
    setTimeout(() => onSearch(), 0);
  }, [onSearchChange, onSearch]);

  const formatStat = (value: number): string => {
    if (value >= 10000) return `${Math.floor(value / 1000)},${String(value % 1000).padStart(3, '0')}+`;
    if (value >= 1000) return `${value.toLocaleString()}+`;
    if (value > 0) return `${value}+`;
    return '—';
  };

  const statsDisplay = useMemo(() => [
    { value: stats ? formatStat(stats.properties) : '—', label: t('home:stats.properties'), delay: 200 },
    { value: stats ? String(stats.countries) : '—', label: t('home:stats.countries'), delay: 400 },
    { value: stats ? formatStat(stats.agents) : '—', label: t('home:stats.agents'), delay: 600 },
    { value: stats ? String(stats.languages) : '—', label: t('home:stats.languages'), delay: 800 },
  ], [stats, t]);

  const typewriterWords = useMemo(
    () => [
      t('home:hero.titleHighlight', 'Dream Home'),
      t('home:hero.typewriterWord2', 'Perfect Villa'),
      t('home:hero.typewriterWord3', 'Ideal Apartment'),
      t('home:hero.typewriterWord4', 'New Beginning'),
    ],
    [t]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        setIsDismissed(true);
        if (searchQuery.trim()) rememberSearch(searchQuery.trim());
        onSearch();
      }
      if (e.key === 'Escape') setIsDismissed(true);
    },
    [onSearch, searchQuery]
  );

  return (
    <section className="relative overflow-hidden" style={{
      background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 50%, #ffffff 100%)',
    }}>
      {/* Lightweight decorative background (no blur filters for better paint performance) */}
      <div style={{
        position: 'absolute', top: '-80px', right: '-60px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-40px', left: '-80px',
        width: '350px', height: '350px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* hero-top-pad rather than a plain pt-*: installed as a PWA there is no
          browser chrome above this, so the heading started directly under the
          status bar and behind the floating menu button. */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 hero-top-pad pb-16 sm:pb-28 hero-stagger">
        {/* Title */}
        <h1
          className="text-center text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto hero-fade-up"
          style={{ minHeight: '2.6em' }}
        >
          <span className="block">
            {t('home:hero.title')}{' '}
            {/* The gradient goes to the Typewriter, which puts it on the span
                holding the glyphs. `background-clip: text` only clips to text
                the styled element renders itself, so on a wrapper it would
                have nothing to clip to and the word would disappear.
                No min-width guess here any more either — the Typewriter
                reserves the width of its longest word, measured in the real
                font, so the line cannot reflow as it types. */}
            <span className="inline-block align-bottom">
              <Typewriter
                className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600"
                words={typewriterWords}
                speed={80}
                delayBetweenWords={2000}
                cursor={true}
                cursorChar="|"
              />
            </span>
          </span>
          <span className="block text-slate-600 text-xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold">
            {t('home:hero.titleEnd')}
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="mt-4 sm:mt-5 text-center text-sm sm:text-base md:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed px-2 hero-fade-up"
          style={{ animationDelay: '0.08s' }}
        >
          {t('home:hero.subtitle')}
        </p>

        {/* Search Bar — liquid glass */}
        <div className="mt-6 sm:mt-8 max-w-2xl mx-auto relative z-20 hero-fade-up" style={{ animationDelay: '0.16s' }} ref={wrapperRef}>
          <div style={{
            position: 'relative',
            zIndex: 10,
            borderRadius: '20px',
            background: isFocused
              ? 'rgba(255,255,255,0.9)'
              : 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: isFocused
              ? '1px solid rgba(59,130,246,0.3)'
              : '1px solid rgba(226,232,240,0.8)',
            boxShadow: isFocused
              ? '0 0 0 3px rgba(59,130,246,0.1), 0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)'
              : '0 4px 16px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
            transition: 'all 0.3s ease',
          }}>
            {/* Glass shine line */}
            <div style={{
              position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95) 30%, rgba(255,255,255,0.95) 70%, transparent)',
              borderRadius: '20px 20px 0 0', pointerEvents: 'none', zIndex: 5,
            }} />

            <div className="flex items-center">
              <div className="pl-4 sm:pl-6 flex-shrink-0">
                {isSearching ? (
                  <div className="w-4 h-4 sm:w-[18px] sm:h-[18px] border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                ) : (
                  <svg
                    className={`w-4 h-4 sm:w-[18px] sm:h-[18px] transition-colors ${isFocused ? 'text-blue-500' : 'text-slate-400'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                )}
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                placeholder={t('home:hero.searchPlaceholder')}
                className="flex-1 py-3.5 sm:py-5 px-3 text-base text-slate-900 placeholder-slate-400 bg-transparent outline-none focus:outline-none focus:ring-0 min-w-0"
                style={{ boxShadow: 'none' }}
                aria-label={t('home:hero.searchPlaceholder')}
              />

              {searchQuery && (
                <button
                  onClick={() => { onSearchChange(''); setIsDismissed(false); }}
                  className="mr-1 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 transition-colors"
                  aria-label="Clear"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              <button
                onClick={() => { setIsDismissed(true); if (searchQuery.trim()) rememberSearch(searchQuery.trim()); onSearch(); }}
                style={{
                  margin: '6px 8px',
                  padding: '8px 20px',
                  borderRadius: '14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#fff',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.4), inset 0 1px 0 rgba(255,255,255,0.15)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'; }}
                aria-label={t('home:hero.searchButton')}
              >
                {t('home:hero.searchButton')}
              </button>
            </div>

            {/* Autocomplete suggestions dropdown — liquid glass */}
            {suggestions.length > 0 && isFocused && !isDismissed && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                marginTop: '6px', borderRadius: '16px', overflow: 'hidden',
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                border: '1px solid rgba(226,232,240,0.7)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
                zIndex: 50, maxHeight: '320px', overflowY: 'auto',
              }}>
                {groups.map((group) => (
                  <React.Fragment key={group.labelKey || 'primary'}>
                    {group.labelKey && (
                      <div style={{
                        padding: '8px 16px 4px', fontSize: '11px', fontWeight: 600,
                        letterSpacing: '0.04em', textTransform: 'uppercase', color: '#94a3b8',
                      }}>
                        {t(group.labelKey)}
                      </div>
                    )}
                    {group.suggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onMouseDown={() => handleSuggestionClick(suggestion)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          width: '100%', padding: '10px 16px',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          textAlign: 'left', fontSize: '13px', color: '#334155',
                          transition: 'background 0.15s',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(248,250,252,0.8)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          {suggestion.type === 'property' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.5a1.125 1.125 0 001.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21.375h4.125A1.125 1.125 0 0019.5 20.25V9.75" />
                          ) : suggestion.type === 'recent' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          ) : suggestion.type === 'query' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                          ) : (
                            <>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                            </>
                          )}
                        </svg>
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {suggestion.type === 'query'
                              ? suggestion.title
                              : splitHighlights(suggestion.title, searchQuery).map((part, index) => (
                                  <React.Fragment key={index}>
                                    {part.match ? <strong style={{ fontWeight: 600, color: '#0f172a' }}>{part.text}</strong> : part.text}
                                  </React.Fragment>
                                ))}
                          </span>
                          {suggestion.subtitle && (
                            <span style={{
                              display: 'block', fontSize: '11px', color: '#94a3b8',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {suggestion.subtitle}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CTA Buttons — liquid glass */}
        <div className="mt-5 sm:mt-6 flex flex-wrap justify-center gap-2 sm:gap-3 hero-fade-up" style={{ animationDelay: '0.24s' }}>
          <button
            onClick={() => onNavigate('search', '/search')}
            style={{
              padding: '10px 24px', borderRadius: '14px',
              fontSize: '13px', fontWeight: 600,
              color: '#fff',
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(15,23,42,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,23,42,0.3), inset 0 1px 0 rgba(255,255,255,0.08)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(15,23,42,0.2), inset 0 1px 0 rgba(255,255,255,0.08)'; }}
          >
            {t('home:hero.ctaBuy')}
          </button>
          {[
            { label: t('home:hero.ctaRent'), action: () => onNavigate('rentals', '/rent') },
            { label: t('home:hero.ctaSell'), action: () => onNavigate('create-listing', '/create-listing') },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              style={{
                padding: '10px 24px', borderRadius: '14px',
                fontSize: '13px', fontWeight: 600,
                color: '#475569',
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(226,232,240,0.7)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.95)'; e.currentTarget.style.borderColor = 'rgba(203,213,225,0.8)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(226,232,240,0.7)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {belowActions}

        {/* Stats Strip — liquid glass card */}
        <div className="mt-10 sm:mt-12 max-w-3xl mx-auto hero-fade-up" style={{ animationDelay: '0.32s' }}>
          <div style={{
            borderRadius: '20px',
            padding: '1rem 1.5rem',
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(255,255,255,0.3)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Glass shine */}
            <div style={{
              position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95) 30%, rgba(255,255,255,0.95) 70%, transparent)',
              pointerEvents: 'none',
            }} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
              {statsDisplay.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 leading-none">
                    {stat.value !== '—' ? (
                      <AnimatedNumber value={stat.value} delay={stat.delay} />
                    ) : (
                      <span className="inline-block w-12 h-6 sm:h-8 bg-slate-100 rounded animate-pulse" />
                    )}
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-400 mt-1 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
