import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { LogoIcon, BuildingOfficeIcon, SearchIcon, HomeIcon } from '@/constants';
import { ONBOARDING_IMAGES } from '@/config/cloudinaryConfig';
import { getAgencies } from '@/src/features/agencies/api';

/* ---------------- CONFIG ---------------- */

const FLOAT_SPEED = 0.0008; // Floating speed
const FLOAT_RANGE = 20; // Pixels of movement range

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
        setAgencies(agenciesWithLogos.slice(0, 12)); // Limit to 12 bubbles
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

    // Define zones for bubble placement (avoid center where content is)
    const zones = [
      // Left side
      { minX: 0, maxX: width * 0.2, minY: 0, maxY: height },
      // Right side
      { minX: width * 0.8, maxX: width, minY: 0, maxY: height },
      // Top
      { minX: width * 0.2, maxX: width * 0.8, minY: 0, maxY: height * 0.15 },
      // Bottom
      { minX: width * 0.2, maxX: width * 0.8, minY: height * 0.85, maxY: height },
    ];

    agencies.forEach((agency, index) => {
      const size = 65 + Math.random() * 35; // 65-100px bubbles (larger)

      const el = document.createElement('div');
      el.className = 'absolute pointer-events-auto will-change-transform cursor-pointer z-[1]';
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;

      // Create bubble with agency logo - enhanced glass effect
      el.innerHTML = `
        <div class="w-full h-full rounded-full bg-white/70 backdrop-blur-lg shadow-2xl border-2 border-white/60 overflow-hidden flex items-center justify-center p-3 opacity-90 hover:opacity-100 transition-all duration-300 hover:scale-110 hover:shadow-[0_20px_50px_rgba(31,38,135,0.25)]" style="box-shadow: 0 10px 40px rgba(31, 38, 135, 0.2), inset 0 0 30px rgba(255, 255, 255, 0.5);">
          <img
            src="${agency.logo}"
            alt="${agency.name}"
            class="w-full h-full object-contain drop-shadow-md"
            loading="lazy"
          />
        </div>
      `;

      bg.appendChild(el);

      // Distribute bubbles in edge zones
      const zone = zones[index % zones.length];
      const baseX = zone.minX + Math.random() * (zone.maxX - zone.minX - size);
      const baseY = zone.minY + Math.random() * (zone.maxY - zone.minY - size);

      bubblesRef.current.push({
        el,
        size,
        baseX: Math.max(0, Math.min(width - size, baseX)),
        baseY: Math.max(0, Math.min(height - size, baseY)),
        offsetX: 0,
        offsetY: 0,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        speedX: FLOAT_SPEED * (0.7 + Math.random() * 0.6),
        speedY: FLOAT_SPEED * (0.7 + Math.random() * 0.6),
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

    const animate = () => {
      bubblesRef.current.forEach(bubble => {
        bubble.phaseX += bubble.speedX;
        bubble.phaseY += bubble.speedY;

        bubble.offsetX = Math.sin(bubble.phaseX) * FLOAT_RANGE;
        bubble.offsetY = Math.sin(bubble.phaseY) * FLOAT_RANGE;

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
          background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 30%, #dbeafe 60%, #e0e7ff 100%)',
        }}
      >
        {/* Animated gradient orbs */}
        <div className="absolute top-10 left-[5%] w-80 h-80 bg-gradient-to-br from-blue-400/30 to-cyan-300/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-[5%] w-96 h-96 bg-gradient-to-br from-purple-400/25 to-pink-300/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-br from-primary/20 to-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-gradient-to-br from-indigo-300/20 to-violet-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />

        {/* BACKGROUND AGENCY BUBBLES */}
        <div
          ref={backgroundRef}
          className="absolute inset-0 z-0 pointer-events-none"
        />

        {/* FOREGROUND UI */}
        <div className="relative z-10 flex flex-col justify-center items-center min-h-screen p-4 py-8">
          {/* HEADER */}
          <div
            className="text-center mb-8 px-8 py-6 bg-white/50 backdrop-blur-xl rounded-3xl border border-white/50 animate-fadeIn"
            style={{
              boxShadow: '0 15px 50px rgba(31, 38, 135, 0.12), inset 0 0 30px rgba(255, 255, 255, 0.5)',
            }}
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-primary to-blue-600 rounded-xl shadow-lg">
                <LogoIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-800">
                BalkanEstate<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">AI</span>
              </h1>
            </div>
            <p className="text-base sm:text-lg text-neutral-600 max-w-md">
              {t('common:tagline')}
            </p>
          </div>

          {/* MAIN CONTENT CARD */}
          <div
            className="bg-white/60 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl w-full max-w-4xl border border-white/50 animate-slideUp"
            style={{
              boxShadow: '0 20px 60px rgba(31, 38, 135, 0.15), inset 0 0 40px rgba(255, 255, 255, 0.5)',
              animationDelay: '0.2s',
            }}
          >
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-8 text-neutral-800">
              {t('nav:onboarding.question')}
            </h2>

            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
              {/* BUY CARD */}
              <div
                onClick={handleBuyChoice}
                className="group p-5 sm:p-6 bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-lg rounded-2xl border border-white/60 hover:-translate-y-3 hover:shadow-[0_25px_60px_rgba(59,130,246,0.2)] transition-all duration-400 cursor-pointer flex flex-col"
                style={{
                  boxShadow: '0 10px 40px rgba(31, 38, 135, 0.1), inset 0 0 25px rgba(255, 255, 255, 0.4)',
                }}
              >
                <div className="relative overflow-hidden rounded-xl mb-5">
                  <img
                    src={ONBOARDING_IMAGES.buyCard.src}
                    srcSet={ONBOARDING_IMAGES.buyCard.srcSet}
                    sizes="(max-width: 768px) calc(100vw - 80px), 400px"
                    alt={ONBOARDING_IMAGES.buyCard.alt}
                    className="h-44 sm:h-48 w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-3 left-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg">
                    <SearchIcon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-2 text-center text-neutral-800 group-hover:text-primary transition-colors">
                  {t('nav:onboarding.lookingToBuy')}
                </h3>
                <p className="text-neutral-600 mb-5 text-center flex-grow text-sm sm:text-base">
                  {t('nav:onboarding.buyDescription')}
                </p>
                <button className="w-full bg-gradient-to-r from-primary to-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg group-hover:shadow-xl group-hover:from-primary-dark group-hover:to-blue-700 transition-all duration-300 flex items-center justify-center gap-2">
                  <SearchIcon className="w-5 h-5" />
                  {t('nav:onboarding.startSearching')}
                </button>
              </div>

              {/* SELL CARD */}
              <div
                onClick={handleSellChoice}
                className="group p-5 sm:p-6 bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-lg rounded-2xl border border-white/60 hover:-translate-y-3 hover:shadow-[0_25px_60px_rgba(55,65,81,0.2)] transition-all duration-400 cursor-pointer flex flex-col"
                style={{
                  boxShadow: '0 10px 40px rgba(31, 38, 135, 0.1), inset 0 0 25px rgba(255, 255, 255, 0.4)',
                }}
              >
                <div className="relative overflow-hidden rounded-xl mb-5">
                  <img
                    src={ONBOARDING_IMAGES.sellCard.src}
                    srcSet={ONBOARDING_IMAGES.sellCard.srcSet}
                    sizes="(max-width: 768px) calc(100vw - 80px), 400px"
                    alt={ONBOARDING_IMAGES.sellCard.alt}
                    className="h-44 sm:h-48 w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-3 left-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg">
                    <HomeIcon className="w-5 h-5 text-neutral-700" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-2 text-center text-neutral-800 group-hover:text-neutral-900 transition-colors">
                  {t('nav:onboarding.wantToSell')}
                </h3>
                <p className="text-neutral-600 mb-5 text-center flex-grow text-sm sm:text-base">
                  {t('nav:onboarding.sellDescription')}
                </p>
                <button className="w-full bg-gradient-to-r from-neutral-800 to-neutral-900 text-white py-3.5 rounded-xl font-bold shadow-lg group-hover:shadow-xl group-hover:from-neutral-900 group-hover:to-black transition-all duration-300 flex items-center justify-center gap-2">
                  <HomeIcon className="w-5 h-5" />
                  {t('nav:onboarding.listProperty')}
                </button>
              </div>
            </div>
          </div>

          {/* FEATURES ROW */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
            {[
              { icon: '🔍', text: 'AI-Powered Search' },
              { icon: '🏠', text: '10+ Balkan Countries' },
              { icon: '📊', text: 'Market Analytics' },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/50 backdrop-blur-lg rounded-full border border-white/50 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                <span className="text-lg">{feature.icon}</span>
                <span className="text-sm font-medium text-neutral-700">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* AGENCY BADGE */}
          {agencies.length > 0 && (
            <div
              className="mt-6 flex items-center gap-3 px-6 py-3 bg-white/60 backdrop-blur-xl rounded-full border border-white/50 shadow-lg animate-fadeIn"
              style={{
                boxShadow: '0 8px 30px rgba(31, 38, 135, 0.12), inset 0 0 20px rgba(255, 255, 255, 0.5)',
                animationDelay: '0.5s',
              }}
            >
              <div className="p-2 bg-primary/10 rounded-full">
                <BuildingOfficeIcon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-neutral-700">
                {agencies.length}+ {t('common:trustedAgencies', 'Trusted Agencies')}
              </span>
            </div>
          )}

          {/* FOOTER */}
          <p className="text-neutral-500 mt-8 text-sm">
            {t('common:footer.copyright', {
              year: new Date().getFullYear(),
            })}
          </p>
        </div>
      </div>

      {/* Add keyframe animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.6s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default Onboarding;
