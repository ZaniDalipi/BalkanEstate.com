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
  <div className="relative group rounded-[22px] p-[1px] overflow-hidden">
    {/* Rotating conic gradient border */}
    <div
      className="absolute inset-0 rounded-[22px]"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 40%, rgba(59,130,246,0.3) 60%, rgba(255,255,255,0.1) 100%)',
      }}
    />
    <motion.div
      className="absolute -inset-[100%] rounded-[22px]"
      style={{
        background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.3) 10%, transparent 20%, transparent 80%, rgba(59,130,246,0.4) 90%, transparent 100%)',
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
    />
    {/* Hover glow */}
    <motion.div
      className="absolute -inset-2 rounded-[26px] blur-xl"
      style={{
        background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
      }}
      initial={{ opacity: 0 }}
      whileHover={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    />
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
      className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Animated mesh gradient background */}
      <motion.div className="absolute inset-0" style={{ y: bgY, opacity: bgOpacity }}>
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        {/* Floating orbs with mouse parallax */}
        <FloatingOrb
          mouseX={mouseX}
          mouseY={mouseY}
          factor={0.03}
          className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full blur-[140px]"
          // Blue orb - breathing animation via CSS
        />
        <FloatingOrb
          mouseX={mouseX}
          mouseY={mouseY}
          factor={-0.02}
          className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px]"
        />
        <FloatingOrb
          mouseX={mouseX}
          mouseY={mouseY}
          factor={0.015}
          className="absolute top-[30%] left-[20%] w-[300px] h-[300px] rounded-full blur-[100px]"
        />
      </motion.div>

      {/* Orb color via style (to enable breathing animation) */}
      <style>{`
        @keyframes breathe1 {
          0%, 100% { background: rgba(59, 130, 246, 0.12); }
          50% { background: rgba(59, 130, 246, 0.2); }
        }
        @keyframes breathe2 {
          0%, 100% { background: rgba(99, 102, 241, 0.08); }
          50% { background: rgba(99, 102, 241, 0.15); }
        }
        @keyframes breathe3 {
          0%, 100% { background: rgba(6, 182, 212, 0.06); }
          50% { background: rgba(6, 182, 212, 0.12); }
        }
        section > div:first-child > div:nth-child(2) { animation: breathe1 6s ease-in-out infinite; }
        section > div:first-child > div:nth-child(3) { animation: breathe2 8s ease-in-out infinite 2s; }
        section > div:first-child > div:nth-child(4) { animation: breathe3 7s ease-in-out infinite 4s; }

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
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-blue-200 border border-white/10"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)',
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
          className="text-center text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight max-w-3xl mx-auto"
          variants={fadeUp}
        >
          {t('home:hero.title')}{' '}
          <motion.span
            className="bg-clip-text text-transparent inline-block"
            style={{
              backgroundImage: 'linear-gradient(90deg, #60a5fa, #22d3ee, #818cf8, #60a5fa)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          >
            {t('home:hero.titleHighlight')}
          </motion.span>
          <br className="hidden sm:block" />
          <motion.span
            className="text-white/80 text-2xl sm:text-4xl lg:text-5xl font-semibold"
            variants={fadeUp}
          >
            {' '}{t('home:hero.titleEnd')}
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mt-5 text-center text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed"
          variants={fadeUp}
        >
          {t('home:hero.subtitle')}
        </motion.p>

        {/* Liquid Glass Search Bar */}
        <motion.div className="mt-10 max-w-2xl mx-auto" variants={fadeScale}>
          <ShimmerBorder>
            <motion.div
              className="relative flex items-center rounded-[21px] overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
                backdropFilter: 'blur(40px) saturate(1.8)',
                WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
              }}
              animate={isFocused ? {
                boxShadow: '0 0 0 2px rgba(59,130,246,0.3), 0 8px 40px rgba(59,130,246,0.15)',
              } : {
                boxShadow: '0 0 0 0px transparent, 0 4px 20px rgba(0,0,0,0.1)',
              }}
              transition={{ duration: 0.3 }}
            >
              {/* Search icon with animation */}
              <motion.div
                className="pl-5 sm:pl-6 flex-shrink-0"
                animate={isFocused ? { scale: 1.1, opacity: 0.8 } : { scale: 1, opacity: 0.5 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <svg className="w-[18px] h-[18px] text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
                className="flex-1 py-4 sm:py-5 px-3 text-sm sm:text-base text-white placeholder-white/35 bg-transparent outline-none"
                aria-label={t('home:hero.searchPlaceholder')}
              />

              <motion.button
                onClick={onSearch}
                className="m-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-[14px] text-sm font-semibold text-white flex-shrink-0 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.85) 0%, rgba(37,99,235,0.95) 100%)',
                  boxShadow: '0 2px 16px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}
                whileHover={{ scale: 1.04, boxShadow: '0 4px 24px rgba(59,130,246,0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}
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
            <motion.span className="text-xs text-white/30 font-medium" variants={fadeUp}>
              {t('home:hero.popularSearches')}
            </motion.span>
            {POPULAR_CITIES.map((city, i) => (
              <motion.button
                key={city}
                onClick={() => {
                  onSearchChange(city);
                  onSearch();
                }}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium text-white/60"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                variants={fadeUp}
                whileHover={{
                  scale: 1.08,
                  color: 'rgba(255,255,255,0.95)',
                  borderColor: 'rgba(255,255,255,0.25)',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.06) 100%)',
                }}
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
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-900 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,1)',
            }}
            whileHover={{
              scale: 1.05,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,1)',
            }}
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
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white/90"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
              whileHover={{
                scale: 1.05,
                borderColor: 'rgba(255,255,255,0.3)',
                color: 'rgba(255,255,255,1)',
              }}
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
          <div
            className="rounded-2xl px-6 py-5 sm:px-8 sm:py-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
              backdropFilter: 'blur(40px) saturate(1.5)',
              WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* Subtle shimmer across the card */}
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                animation: 'shimmer-slide 6s ease-in-out infinite',
              }}
            />

            <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
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
                  <div className="text-2xl sm:text-3xl font-bold text-white leading-none">
                    <AnimatedNumber value={stat.value} delay={stat.delay} />
                  </div>
                  <div className="text-[11px] sm:text-xs text-white/40 mt-1 font-medium">{stat.label}</div>
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
