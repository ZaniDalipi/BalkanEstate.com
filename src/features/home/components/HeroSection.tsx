import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useInView } from 'framer-motion';
import { Typewriter } from '@/src/components/ui/typewriter';

interface HeroSectionProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onNavigate: (view: string, path: string) => void;
}

const POPULAR_CITIES = ['Tirana', 'Belgrade', 'Skopje', 'Pristina', 'Sarajevo', 'Zagreb'];

/* ─── Animated number counter ─── */
const AnimatedNumber: React.FC<{ value: string; delay?: number }> = ({ value, delay = 0 }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState('0');

  const numericMatch = value.match(/^([\d,]+)(.*)$/);
  const targetNum = numericMatch ? parseInt(numericMatch[1].replace(/,/g, ''), 10) : 0;
  const suffix = numericMatch ? numericMatch[2] : value;

  React.useEffect(() => {
    if (!isInView) return;
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
  }, [isInView, targetNum, delay]);

  return <span ref={ref}>{display}{suffix}</span>;
};

/* ─── Simple fade-in variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  onSearchChange,
  onSearch,
  onNavigate,
}) => {
  const { t } = useTranslation(['home']);
  const [isFocused, setIsFocused] = useState(false);

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
        onSearch();
      }
    },
    [onSearch]
  );

  const handleCityClick = useCallback(
    (city: string) => {
      onSearchChange(city);
      // Use setTimeout to ensure state is updated before search fires
      setTimeout(() => onSearch(), 0);
    },
    [onSearchChange, onSearch]
  );

  return (
    <section className="relative bg-gradient-to-b from-slate-50 via-white to-white overflow-hidden">
      {/* Lightweight static background decoration */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[120px] bg-blue-100/50 -translate-y-1/4 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full blur-[100px] bg-indigo-100/30 translate-y-1/4 -translate-x-1/4" />

      {/* Main content */}
      <motion.div
        className="relative z-10 max-w-6xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div className="flex justify-center mb-6" variants={fadeUp}>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-blue-700 border border-blue-200/60 bg-blue-50/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t('home:hero.badge')}
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-center text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto"
          variants={fadeUp}
        >
          {t('home:hero.title')}{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600">
            <Typewriter
              words={typewriterWords}
              speed={80}
              delayBetweenWords={2000}
              cursor={true}
              cursorChar="|"
            />
          </span>
          <br className="hidden sm:block" />
          <span className="text-slate-600 text-2xl sm:text-4xl lg:text-5xl font-semibold">
            {' '}{t('home:hero.titleEnd')}
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mt-5 text-center text-base sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed"
          variants={fadeUp}
        >
          {t('home:hero.subtitle')}
        </motion.p>

        {/* Search Bar */}
        <motion.div className="mt-10 max-w-2xl mx-auto" variants={fadeUp}>
          <div
            className={`flex items-center rounded-2xl bg-white border transition-shadow duration-200 ${
              isFocused
                ? 'border-blue-300 shadow-[0_0_0_2px_rgba(59,130,246,0.2),0_8px_24px_rgba(0,0,0,0.06)]'
                : 'border-neutral-200 shadow-sm'
            }`}
          >
            <div className="pl-5 sm:pl-6 flex-shrink-0">
              <svg
                className={`w-[18px] h-[18px] transition-colors ${isFocused ? 'text-blue-500' : 'text-slate-400'}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={t('home:hero.searchPlaceholder')}
              className="flex-1 py-4 sm:py-5 px-3 text-sm sm:text-base text-slate-900 placeholder-slate-400 bg-transparent outline-none"
              aria-label={t('home:hero.searchPlaceholder')}
            />

            <button
              onClick={onSearch}
              className="m-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm font-semibold text-white flex-shrink-0 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors"
              aria-label={t('home:hero.searchButton')}
            >
              {t('home:hero.searchButton')}
            </button>
          </div>

          {/* Popular searches */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-slate-400 font-medium">
              {t('home:hero.popularSearches')}
            </span>
            {POPULAR_CITIES.map((city) => (
              <button
                key={city}
                onClick={() => handleCityClick(city)}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 bg-white border border-neutral-200 hover:border-neutral-300 hover:text-slate-800 active:bg-neutral-50 transition-colors"
              >
                {city}
              </button>
            ))}
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div className="mt-8 flex flex-wrap justify-center gap-3" variants={fadeUp}>
          <button
            onClick={() => onNavigate('search', '/search')}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-700 transition-colors"
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
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-700 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 active:bg-neutral-100 transition-colors"
            >
              {btn.label}
            </button>
          ))}
        </motion.div>

        {/* Stats Strip */}
        <motion.div
          className="mt-14 max-w-3xl mx-auto"
          variants={fadeUp}
        >
          <div className="rounded-2xl px-6 py-5 sm:px-8 sm:py-6 bg-white border border-neutral-200/80 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
              {[
                { value: '10,000+', label: t('home:stats.properties'), delay: 200 },
                { value: '11', label: t('home:stats.countries'), delay: 400 },
                { value: '500+', label: t('home:stats.agents'), delay: 600 },
                { value: '10', label: t('home:stats.languages'), delay: 800 },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900 leading-none">
                    <AnimatedNumber value={stat.value} delay={stat.delay} />
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-400 mt-1 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
