import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { LogoIcon, BuildingOfficeIcon } from '@/constants';
import { ONBOARDING_IMAGES } from '@/config/cloudinaryConfig';
import { getAgencies } from '@/src/features/agencies/api';

/* ---------------- CONFIG ---------------- */

const FLOAT_SPEED = 0.0005; // Very slow floating
const FLOAT_RANGE = 15; // Pixels of movement range

/* ---------------- TYPES ---------------- */

type Agency = {
  _id: string;
  name: string;
  logo?: string;
};

type Bubble = {
  el: HTMLDivElement;
  baseX: number;
  baseY: number;
  offsetX: number;
  offsetY: number;
  phaseX: number;
  phaseY: number;
  speedX: number;
  speedY: number;
  size: number;
};

/* ---------------- COMPONENT ---------------- */

const Onboarding: React.FC = () => {
  const { t } = useTranslation(['common', 'nav']);
  const { dispatch } = useAppContext();

  const containerRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const rafRef = useRef<number | null>(null);
  const [agencies, setAgencies] = useState<Agency[]>([]);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------- FETCH AGENCIES ----------- */
  useEffect(() => {
    const fetchAgencyData = async () => {
      try {
        const response = await getAgencies({ limit: 20 });
        const agenciesWithLogos = (response.agencies || []).filter(
          (a: Agency) => a.logo
        );
        setAgencies(agenciesWithLogos.slice(0, 15)); // Limit to 15 bubbles
      } catch (error) {
        console.error('Failed to fetch agencies:', error);
      }
    };
    fetchAgencyData();
  }, []);

  /* ----------- INIT FLOATING BUBBLES ----------- */
  useEffect(() => {
    if (!backgroundRef.current || prefersReducedMotion || agencies.length === 0) return;

    const bg = backgroundRef.current;
    const container = containerRef.current!;
    const { width, height } = container.getBoundingClientRect();

    // Clear existing bubbles
    bubblesRef.current.forEach(bubble => bubble.el.remove());
    bubblesRef.current = [];

    agencies.forEach((agency) => {
      const size = Math.random() * 30 + 50; // 50-80px bubbles

      const el = document.createElement('div');
      el.className = 'absolute pointer-events-auto will-change-transform cursor-pointer';
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;

      // Create bubble with agency logo - liquid glass effect
      el.innerHTML = `
        <div class="w-full h-full rounded-full bg-white/40 backdrop-blur-md shadow-xl border border-white/50 overflow-hidden flex items-center justify-center p-2 opacity-70 hover:opacity-100 transition-all duration-300 hover:scale-110 hover:shadow-2xl" style="box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.3);">
          <img
            src="${agency.logo}"
            alt="${agency.name}"
            class="w-full h-full object-contain drop-shadow-sm"
            loading="lazy"
          />
        </div>
      `;

      bg.appendChild(el);

      // Position bubbles in a fixed grid-like pattern for better distribution
      const baseX = Math.random() * (width - size);
      const baseY = Math.random() * (height - size);

      bubblesRef.current.push({
        el,
        size,
        baseX,
        baseY,
        offsetX: 0,
        offsetY: 0,
        phaseX: Math.random() * Math.PI * 2, // Random starting phase
        phaseY: Math.random() * Math.PI * 2,
        speedX: FLOAT_SPEED * (0.8 + Math.random() * 0.4), // Slight speed variation
        speedY: FLOAT_SPEED * (0.8 + Math.random() * 0.4),
      });
    });

    return () => {
      bubblesRef.current.forEach(bubble => bubble.el.remove());
      bubblesRef.current = [];
    };
  }, [prefersReducedMotion, agencies]);

  /* ------------- ANIMATION LOOP ------------- */
  useEffect(() => {
    if (prefersReducedMotion || agencies.length === 0) return;

    const animate = (now: number) => {
      bubblesRef.current.forEach(bubble => {
        // Gentle sinusoidal floating motion - no gravity, stays in place
        bubble.phaseX += bubble.speedX;
        bubble.phaseY += bubble.speedY;

        // Calculate smooth offset using sine waves
        bubble.offsetX = Math.sin(bubble.phaseX) * FLOAT_RANGE;
        bubble.offsetY = Math.sin(bubble.phaseY) * FLOAT_RANGE;

        // Apply transform with base position + gentle floating offset
        const x = bubble.baseX + bubble.offsetX;
        const y = bubble.baseY + bubble.offsetY;
        bubble.el.style.transform = `translate(${x}px, ${y}px)`;
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [prefersReducedMotion, agencies]);

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
      {/* Preload LCP image for this page */}
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
        className="min-h-screen relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 25%, #dfe6f0 50%, #e8eef5 75%, #f0f4f8 100%)',
        }}
      >
        {/* Decorative gradient orbs for liquid glass effect */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-200/15 rounded-full blur-3xl" />

        {/* BACKGROUND AGENCY BUBBLES */}
        <div
          ref={backgroundRef}
          className="absolute inset-0 z-0 pointer-events-none"
        />

        {/* FOREGROUND UI */}
        <div className="relative z-10 flex flex-col justify-center items-center p-4">
          {/* HEADER - Glass Effect */}
          <div
            className="text-center mb-12 px-8 py-6 bg-white/30 backdrop-blur-lg rounded-2xl border border-white/30"
            style={{
              boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 20px rgba(255, 255, 255, 0.3)',
            }}
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <LogoIcon className="w-12 h-12 drop-shadow-lg" />
              <h1 className="text-4xl sm:text-5xl font-extrabold text-neutral-800 drop-shadow-sm">
                BalkanEstate<span className="text-primary">AI</span>
              </h1>
            </div>
            <p className="text-lg sm:text-xl text-neutral-600 max-w-xl">
              {t('common:tagline')}
            </p>
          </div>

          {/* CARDS - Liquid Glass Container */}
          <div
            className="bg-white/60 backdrop-blur-xl p-6 sm:p-8 rounded-3xl w-full max-w-4xl border border-white/40"
            style={{
              boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15), inset 0 0 30px rgba(255, 255, 255, 0.4)',
            }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 text-neutral-800">
              {t('nav:onboarding.question')}
            </h2>

            <div className="grid md:grid-cols-2 gap-8 min-h-[400px]">
              {/* BUY - Glass Card */}
              <div
                onClick={handleBuyChoice}
                className="group p-6 bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 hover:-translate-y-2 transition-all duration-300 cursor-pointer flex flex-col"
                style={{
                  boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 20px rgba(255, 255, 255, 0.3)',
                }}
              >
                <div className="relative overflow-hidden rounded-xl mb-6">
                  <img
                    src={ONBOARDING_IMAGES.buyCard.src}
                    srcSet={ONBOARDING_IMAGES.buyCard.srcSet}
                    sizes="(max-width: 768px) calc(100vw - 80px), 400px"
                    alt={ONBOARDING_IMAGES.buyCard.alt}
                    className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <h3 className="text-2xl font-semibold mb-2 text-center text-neutral-800">
                  {t('nav:onboarding.lookingToBuy')}
                </h3>
                <p className="text-neutral-600 mb-6 text-center flex-grow">
                  {t('nav:onboarding.buyDescription')}
                </p>
                <button className="bg-primary/90 backdrop-blur-sm text-white py-3 rounded-xl font-bold group-hover:bg-primary transition-all duration-300 shadow-lg group-hover:shadow-xl">
                  {t('nav:onboarding.startSearching')}
                </button>
              </div>

              {/* SELL - Glass Card */}
              <div
                onClick={handleSellChoice}
                className="group p-6 bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 hover:-translate-y-2 transition-all duration-300 cursor-pointer flex flex-col"
                style={{
                  boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 20px rgba(255, 255, 255, 0.3)',
                }}
              >
                <div className="relative overflow-hidden rounded-xl mb-6">
                  <img
                    src={ONBOARDING_IMAGES.sellCard.src}
                    srcSet={ONBOARDING_IMAGES.sellCard.srcSet}
                    sizes="(max-width: 768px) calc(100vw - 80px), 400px"
                    alt={ONBOARDING_IMAGES.sellCard.alt}
                    className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <h3 className="text-2xl font-semibold mb-2 text-center text-neutral-800">
                  {t('nav:onboarding.wantToSell')}
                </h3>
                <p className="text-neutral-600 mb-6 text-center flex-grow">
                  {t('nav:onboarding.sellDescription')}
                </p>
                <button className="bg-neutral-800/90 backdrop-blur-sm text-white py-3 rounded-xl font-bold group-hover:bg-neutral-900 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                  {t('nav:onboarding.listProperty')}
                </button>
              </div>
            </div>
          </div>

          {/* Agency count badge - Glass Effect */}
          {agencies.length > 0 && (
            <div
              className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-white/50 backdrop-blur-xl rounded-full border border-white/40"
              style={{
                boxShadow: '0 4px 20px rgba(31, 38, 135, 0.1), inset 0 0 15px rgba(255, 255, 255, 0.4)',
              }}
            >
              <BuildingOfficeIcon className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-neutral-700">
                {agencies.length}+ {t('common:trustedAgencies', 'Trusted Agencies')}
              </span>
            </div>
          )}

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
