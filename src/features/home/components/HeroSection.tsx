import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useMotionValue, useTransform, useSpring, useScroll, useInView, AnimatePresence } from 'framer-motion';

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

  // Extract numeric part and suffix
  const numericMatch = value.match(/^([\d,]+)(.*)$/);
  const targetNum = numericMatch ? parseInt(numericMatch[1].replace(/,/g, ''), 10) : 0;
  const suffix = numericMatch ? numericMatch[2] : value;

  useEffect(() => {
    if (!isInView) return;

    const timeout = setTimeout(() => {
      const duration = 1800;
      const start = Date.now();

      const tick = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(eased * targetNum);
        setDisplay(current.toLocaleString());

        if (progress < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    }, delay);

    return () => clearTimeout(timeout);
  }, [isInView, targetNum, delay]);

  return (
    <span ref={ref}>
      {display}{suffix}
    </span>
  );
};

/* ─── Floating orb with mouse parallax ─── */
const FloatingOrb: React.FC<{
  className: string;
  mouseX: ReturnType<typeof useMotionValue>;
  mouseY: ReturnType<typeof useMotionValue>;
  factor?: number;
}> = ({ className, mouseX, mouseY, factor = 0.02 }) => {
  const x = useTransform(mouseX, (v) => v * factor);
  const y = useTransform(mouseY, (v) => v * factor);
  const springX = useSpring(x, { stiffness: 50, damping: 30 });
  const springY = useSpring(y, { stiffness: 50, damping: 30 });

  return (
    <motion.div
      className={className}
      style={{ x: springX, y: springY }}
    />
  );
};

/* ─── Shimmer border animation ─── */
const ShimmerBorder: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative group rounded-[22px]">
    {children}
  </div>
);

/* ─── Stagger animation variants ─── */
const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.25, 0.4, 0.25, 1] },
  },
};

const fadeScale = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.25, 0.4, 0.25, 1] },
  },
};

const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  onSearchChange,
  onSearch,
  onNavigate,
}) => {
  const { t } = useTranslation(['home']);
  const sectionRef = useRef<HTMLElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Mouse tracking for parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }, [mouseX, mouseY]);

  // Scroll-based parallax for background
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') onSearch();
    },
    [onSearch]
  );

  return (
    <section
      ref={sectionRef}
      className="relative bg-gradient-to-b from-slate-50 via-white to-white overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Subtle animated background */}
      <motion.div className="absolute inset-0" style={{ y: bgY, opacity: bgOpacity }}>
        {/* Soft gradient orbs */}
        <FloatingOrb
          mouseX={mouseX}
          mouseY={mouseY}
          factor={0.03}
          className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[120px] bg-blue-100/60"
        />
        <FloatingOrb
          mouseX={mouseX}
          mouseY={mouseY}
          factor={-0.02}
          className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[100px] bg-indigo-100/40"
        />
        <FloatingOrb
          mouseX={mouseX}
          mouseY={mouseY}
          factor={0.015}
          className="absolute top-[30%] left-[20%] w-[250px] h-[250px] rounded-full blur-[80px] bg-cyan-100/30"
        />
      </motion.div>

      <style>{`
        @keyframes shimmer-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* Main content */}
      <motion.div
        className="relative z-10 max-w-6xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div className="flex justify-center mb-6" variants={fadeUp}>
          <motion.span
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-blue-700 border border-blue-200/60 bg-blue-50/80"
            style={{
              backdropFilter: 'blur(20px)',
            }}
            whileHover={{ scale: 1.05, borderColor: 'rgba(255,255,255,0.2)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t('home:hero.badge')}
          </motion.span>
        </motion.div>

        {/* Title with gradient text animation */}
        <motion.h1
          className="text-center text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto"
          variants={fadeUp}
        >
          {t('home:hero.title')}{' '}
          <motion.span
            className="bg-clip-text text-transparent inline-block"
            style={{
              backgroundImage: 'linear-gradient(90deg, #2563eb, #0891b2, #4f46e5, #2563eb)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          >
            {t('home:hero.titleHighlight')}
          </motion.span>
          <br className="hidden sm:block" />
          <motion.span
            className="text-slate-600 text-2xl sm:text-4xl lg:text-5xl font-semibold"
            variants={fadeUp}
          >
            {' '}{t('home:hero.titleEnd')}
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mt-5 text-center text-base sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed"
          variants={fadeUp}
        >
          {t('home:hero.subtitle')}
        </motion.p>

        {/* Liquid Glass Search Bar */}
        <motion.div className="mt-10 max-w-2xl mx-auto" variants={fadeScale}>
          <ShimmerBorder>
            <motion.div
              className="relative flex items-center rounded-[21px] overflow-hidden bg-white border border-neutral-200/80"
              style={{
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
              animate={isFocused ? {
                boxShadow: '0 0 0 2px rgba(59,130,246,0.3), 0 8px 30px rgba(0,0,0,0.08)',
              } : {
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              }}
              transition={{ duration: 0.3 }}
            >
              {/* Search icon with animation */}
              <motion.div
                className="pl-5 sm:pl-6 flex-shrink-0"
                animate={isFocused ? { scale: 1.1, opacity: 0.8 } : { scale: 1, opacity: 0.5 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <svg className="w-[18px] h-[18px] text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </motion.div>

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

              <motion.button
                onClick={onSearch}
                className="m-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-[14px] text-sm font-semibold text-white flex-shrink-0 relative overflow-hidden bg-blue-600 hover:bg-blue-700"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                aria-label={t('home:hero.searchButton')}
              >
                {/* Button shimmer */}
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                    animation: 'shimmer-slide 3s ease-in-out infinite',
                  }}
                />
                <span className="relative">{t('home:hero.searchButton')}</span>
              </motion.button>
            </motion.div>
          </ShimmerBorder>

          {/* Popular searches - staggered glass pills */}
          <motion.div
            className="mt-5 flex flex-wrap items-center justify-center gap-2"
            variants={stagger}
          >
            <motion.span className="text-xs text-slate-400 font-medium" variants={fadeUp}>
              {t('home:hero.popularSearches')}
            </motion.span>
            {POPULAR_CITIES.map((city, i) => (
              <motion.button
                key={city}
                onClick={() => {
                  onSearchChange(city);
                  onSearch();
                }}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-500 bg-white border border-neutral-200 hover:border-neutral-300 hover:text-slate-800"
                variants={fadeUp}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                {city}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>

        {/* CTA Buttons - glass style with spring */}
        <motion.div className="mt-8 flex flex-wrap justify-center gap-3" variants={fadeUp}>
          <motion.button
            onClick={() => onNavigate('search', '/search')}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            {t('home:hero.ctaBuy')}
          </motion.button>
          {[
            { label: t('home:hero.ctaRent'), action: () => onNavigate('rentals', '/rent') },
            { label: t('home:hero.ctaSell'), action: () => onNavigate('create-listing', '/create-listing') },
          ].map((btn, i) => (
            <motion.button
              key={i}
              onClick={btn.action}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-700 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {btn.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Stats Strip - Glass card with animated counters */}
        <motion.div
          className="mt-14 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 40, filter: 'blur(20px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1], delay: 0.3 }}
        >
          <div className="rounded-2xl px-6 py-5 sm:px-8 sm:py-6 bg-white border border-neutral-200/80 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
              {[
                { value: '10,000+', label: t('home:stats.properties'), delay: 400 },
                { value: '11', label: t('home:stats.countries'), delay: 600 },
                { value: '500+', label: t('home:stats.agents'), delay: 800 },
                { value: '10', label: t('home:stats.languages'), delay: 1000 },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  className="text-center"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                >
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900 leading-none">
                    <AnimatedNumber value={stat.value} delay={stat.delay} />
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-400 mt-1 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
