import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import {
  LogoIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  BedIcon,
  HeartIcon,
  SparklesIcon,
  KeyIcon,
} from '@/constants';
import { ONBOARDING_IMAGES } from '@/config/cloudinaryConfig';

/* ---------------- CONFIG ---------------- */

const ICONS = [
  BuildingOfficeIcon,
  MapPinIcon,
  BedIcon,
  HeartIcon,
  SparklesIcon,
  KeyIcon,
];

const GRAVITY = 0.04;
const DAMPING = 0.75;
const MAX_VELOCITY = 3;

/* ---------------- TYPES ---------------- */

type Bot = {
  el: HTMLDivElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  size: number;
};

/* ---------------- COMPONENT ---------------- */

const Onboarding: React.FC = () => {
  const { t } = useTranslation(['common', 'nav']);
  const { dispatch } = useAppContext();

  const containerRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const botsRef = useRef<Bot[]>([]);
  const rafRef = useRef<number | null>(null);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------- INIT FLOATING ICONS ----------- */
  useEffect(() => {
    if (!backgroundRef.current || prefersReducedMotion) return;

    const bg = backgroundRef.current;
    const container = containerRef.current!;
    const { width, height } = container.getBoundingClientRect();

    botsRef.current = [];

    ICONS.forEach(Icon => {
      for (let i = 0; i < 3; i++) {
        const size = Math.random() * 30 + 30;

        const el = document.createElement('div');
        el.className =
          'absolute text-primary/10 pointer-events-none will-change-transform';
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;

        bg.appendChild(el);

        const root = document.createElement('div');
        root.style.width = '100%';
        root.style.height = '100%';
        el.appendChild(root);

        // Render icon ONCE
        import('react-dom/client').then(({ createRoot }) => {
          createRoot(root).render(<Icon className="w-full h-full" />);
        });

        botsRef.current.push({
          el,
          size,
          x: Math.random() * (width - size),
          y: Math.random() * (height - size),
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          rotation: Math.random() * 360,
          vr: (Math.random() - 0.5) * 0.6,
        });
      }
    });

    return () => {
      botsRef.current.forEach(bot => bot.el.remove());
      botsRef.current = [];
    };
  }, [prefersReducedMotion]);

  /* ------------- ANIMATION LOOP ------------- */
  useEffect(() => {
    if (prefersReducedMotion) return;

    let last = performance.now();

    const animate = (now: number) => {
      const dt = (now - last) / 16.67;
      last = now;

      const container = containerRef.current;
      if (!container) return;

      const { width, height } = container.getBoundingClientRect();

      botsRef.current.forEach(bot => {
        bot.vy += GRAVITY * dt;

        bot.vx = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, bot.vx));
        bot.vy = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, bot.vy));

        bot.x += bot.vx * dt;
        bot.y += bot.vy * dt;
        bot.rotation += bot.vr * dt;

        if (bot.x <= 0 || bot.x >= width - bot.size) {
          bot.vx *= -DAMPING;
          bot.x = Math.max(0, Math.min(width - bot.size, bot.x));
        }

        if (bot.y <= 0 || bot.y >= height - bot.size) {
          bot.vy *= -DAMPING;
          bot.y = Math.max(0, Math.min(height - bot.size, bot.y));
        }

        bot.vr *= 0.99;

        bot.el.style.transform = `
          translate(${bot.x}px, ${bot.y}px)
          rotate(${bot.rotation}deg)
        `;
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [prefersReducedMotion]);

  /* ---------------- ACTIONS ---------------- */

  const handleBuyChoice = () => {
    dispatch({ type: 'COMPLETE_ONBOARDING' });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
  };

  const handleSellChoice = () => {
    dispatch({ type: 'COMPLETE_ONBOARDING' });
    dispatch({ type: 'SET_PENDING_REDIRECT', payload: 'create-listing' });
    dispatch({
      type: 'TOGGLE_AUTH_MODAL',
      payload: { isOpen: true, view: 'signup' },
    });
  };

  /* ---------------- RENDER ---------------- */

  return (
    <>
      {/* Preload LCP image for this page - using Cloudinary CDN for faster loading */}
      <Helmet>
        <link
          rel="preload"
          as="image"
          href={ONBOARDING_IMAGES.buyCard.preload}
          imageSrcSet={ONBOARDING_IMAGES.buyCard.srcSet}
          imageSizes="(max-width: 768px) calc(100vw - 80px), 400px"
        />
      </Helmet>
      <div
        ref={containerRef}
        className="min-h-screen bg-neutral-50 relative overflow-hidden"
      >
      {/* BACKGROUND ICONS */}
      <div
        ref={backgroundRef}
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* FOREGROUND UI */}
      <div className="relative z-10 flex flex-col justify-center items-center p-4">
        {/* HEADER */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <LogoIcon className="w-12 h-12 text-primary" />
            <h1 className="text-4xl sm:text-5xl font-extrabold text-neutral-800">
              Balkan <span className="text-primary">Estate</span>
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-xl">
            {t('common:tagline')}
          </p>
        </div>

        {/* CARDS */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-4xl border border-neutral-200">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
            {t('nav:onboarding.question')}
          </h2>

          <div className="grid md:grid-cols-2 gap-8 min-h-[400px]">
            {/* BUY */}
            <div
              onClick={handleBuyChoice}
              className="group p-6 bg-white rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer flex flex-col"
            >
              <img
                src={ONBOARDING_IMAGES.buyCard.src}
                srcSet={ONBOARDING_IMAGES.buyCard.srcSet}
                sizes="(max-width: 768px) calc(100vw - 80px), 400px"
                alt={ONBOARDING_IMAGES.buyCard.alt}
                className="rounded-lg mb-6 h-48 w-full object-cover"
                loading="eager"
                decoding="async"
                fetchpriority="high"
              />
              <h3 className="text-2xl font-semibold mb-2 text-center">
                {t('nav:onboarding.lookingToBuy')}
              </h3>
              <p className="text-neutral-600 mb-6 text-center flex-grow">
                {t('nav:onboarding.buyDescription')}
              </p>
              <button className="bg-primary text-white py-3 rounded-lg font-bold group-hover:bg-primary-dark transition-colors">
                {t('nav:onboarding.startSearching')}
              </button>
            </div>

            {/* SELL */}
            <div
              onClick={handleSellChoice}
              className="group p-6 bg-white rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer flex flex-col"
            >
              <img
                src={ONBOARDING_IMAGES.sellCard.src}
                srcSet={ONBOARDING_IMAGES.sellCard.srcSet}
                sizes="(max-width: 768px) calc(100vw - 80px), 400px"
                alt={ONBOARDING_IMAGES.sellCard.alt}
                className="rounded-lg mb-6 h-48 w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <h3 className="text-2xl font-semibold mb-2 text-center">
                {t('nav:onboarding.wantToSell')}
              </h3>
              <p className="text-neutral-600 mb-6 text-center flex-grow">
                {t('nav:onboarding.sellDescription')}
              </p>
              <button className="bg-neutral-800 text-white py-3 rounded-lg font-bold group-hover:bg-neutral-900 transition-colors">
                {t('nav:onboarding.listProperty')}
              </button>
            </div>
          </div>
        </div>

        <p className="text-neutral-500 mt-8">
          {t('common:footer.copyright', {
            year: new Date().getFullYear(),
          })}
        </p>
      </div>
    </div>
    </>
  );
};

export default Onboarding;
