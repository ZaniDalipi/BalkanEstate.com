import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { LogoIcon, BuildingOfficeIcon, SearchIcon, HomeIcon, MapIcon, ChartBarIcon, ShieldCheckIcon, SparklesIcon } from '@/constants';
import { ONBOARDING_IMAGES } from '@/config/cloudinaryConfig';
import { getAgencies } from '@/src/features/agencies/api';

/* ---------------- CONFIG ---------------- */

const FLOAT_SPEED = 0.0006; // Slower, more elegant floating
const FLOAT_RANGE = 15; // Subtle movement

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

      // Create bubble with agency logo - glass effect for dark theme
      el.innerHTML = `
        <div class="w-full h-full rounded-full bg-white/10 backdrop-blur-xl shadow-2xl border border-white/20 overflow-hidden flex items-center justify-center p-3 opacity-70 hover:opacity-100 transition-all duration-300 hover:scale-110 hover:bg-white/20 hover:border-white/30" style="box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);">
          <img
            src="${agency.logo}"
            alt="${agency.name}"
            class="w-full h-full object-contain brightness-110"
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

  // Stats data
  const stats = [
    { value: '2,500+', label: t('common:stats.properties', 'Properties'), icon: HomeIcon },
    { value: '11', label: t('common:stats.countries', 'Countries'), icon: MapIcon },
    { value: '50+', label: t('common:stats.agencies', 'Agencies'), icon: BuildingOfficeIcon },
    { value: '24/7', label: t('common:stats.support', 'AI Support'), icon: SparklesIcon },
  ];

  // Feature highlights
  const features = [
    { icon: SparklesIcon, title: t('common:features.aiSearch', 'AI-Powered Search'), desc: t('common:features.aiSearchDesc', 'Smart filters and recommendations') },
    { icon: MapIcon, title: t('common:features.coverage', 'Balkan Coverage'), desc: t('common:features.coverageDesc', '11 countries, 50+ cities') },
    { icon: ChartBarIcon, title: t('common:features.analytics', 'Market Insights'), desc: t('common:features.analyticsDesc', 'Real-time pricing data') },
    { icon: ShieldCheckIcon, title: t('common:features.verified', 'Verified Listings'), desc: t('common:features.verifiedDesc', 'Trusted agency partners') },
  ];

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
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        }}
      >
        {/* Animated mesh gradient background */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/40 to-cyan-400/20 rounded-full blur-[100px] animate-blob" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-violet-500/30 to-purple-400/20 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-br from-primary/25 to-indigo-500/15 rounded-full blur-[120px] animate-blob" style={{ animationDelay: '4s' }} />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* BACKGROUND AGENCY BUBBLES */}
        <div
          ref={backgroundRef}
          className="absolute inset-0 z-0 pointer-events-none"
        />

        {/* FOREGROUND UI */}
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Hero Section */}
          <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 sm:py-16">
            {/* HEADER */}
            <div className="text-center mb-10 animate-fadeIn">
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                <SparklesIcon className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-300">{t('common:aiPowered', 'AI-Powered Real Estate')}</span>
              </div>

              <div className="flex items-center justify-center gap-4 mb-5">
                <div className="p-3 bg-gradient-to-br from-primary via-blue-500 to-cyan-400 rounded-2xl shadow-lg shadow-primary/30">
                  <LogoIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight">
                  Balkan<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-primary">Estate</span>
                </h1>
              </div>

              <p className="text-lg sm:text-xl md:text-2xl text-neutral-300 max-w-2xl mx-auto leading-relaxed">
                {t('common:heroTagline', 'Discover your dream property across 11 Balkan countries with AI-powered search')}
              </p>
            </div>

            {/* Stats Bar */}
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-10 w-full max-w-3xl animate-slideUp"
              style={{ animationDelay: '0.15s' }}
            >
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="text-center p-4 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                >
                  <stat.icon className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                  <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-neutral-400">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* MAIN CONTENT CARD */}
            <div
              className="bg-white/[0.08] backdrop-blur-2xl p-6 sm:p-8 rounded-3xl w-full max-w-4xl border border-white/10 animate-slideUp"
              style={{
                boxShadow: '0 25px 80px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                animationDelay: '0.25s',
              }}
            >
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-8 text-white">
                {t('nav:onboarding.question')}
              </h2>

              <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                {/* BUY CARD */}
                <div
                  onClick={handleBuyChoice}
                  className="group relative p-5 sm:p-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:border-cyan-400/30 hover:-translate-y-2 hover:shadow-[0_30px_80px_rgba(34,211,238,0.15)] transition-all duration-500 cursor-pointer flex flex-col overflow-hidden"
                >
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/10 group-hover:to-blue-500/5 transition-all duration-500 rounded-2xl" />

                  <div className="relative z-10">
                    <div className="relative overflow-hidden rounded-xl mb-5">
                      <img
                        src={ONBOARDING_IMAGES.buyCard.src}
                        srcSet={ONBOARDING_IMAGES.buyCard.srcSet}
                        sizes="(max-width: 768px) calc(100vw - 80px), 400px"
                        alt={ONBOARDING_IMAGES.buyCard.alt}
                        className="h-44 sm:h-48 w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute top-3 left-3 p-2.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg group-hover:bg-cyan-400 group-hover:shadow-cyan-400/30 transition-all duration-300">
                        <SearchIcon className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                      </div>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-2 text-center text-white group-hover:text-cyan-300 transition-colors">
                      {t('nav:onboarding.lookingToBuy')}
                    </h3>
                    <p className="text-neutral-400 mb-5 text-center flex-grow text-sm sm:text-base group-hover:text-neutral-300 transition-colors">
                      {t('nav:onboarding.buyDescription')}
                    </p>
                    <button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 group-hover:from-cyan-400 group-hover:to-blue-400 transition-all duration-300 flex items-center justify-center gap-2">
                      <SearchIcon className="w-5 h-5" />
                      {t('nav:onboarding.startSearching')}
                    </button>
                  </div>
                </div>

                {/* SELL CARD */}
                <div
                  onClick={handleSellChoice}
                  className="group relative p-5 sm:p-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:border-violet-400/30 hover:-translate-y-2 hover:shadow-[0_30px_80px_rgba(167,139,250,0.15)] transition-all duration-500 cursor-pointer flex flex-col overflow-hidden"
                >
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-purple-500/0 group-hover:from-violet-500/10 group-hover:to-purple-500/5 transition-all duration-500 rounded-2xl" />

                  <div className="relative z-10">
                    <div className="relative overflow-hidden rounded-xl mb-5">
                      <img
                        src={ONBOARDING_IMAGES.sellCard.src}
                        srcSet={ONBOARDING_IMAGES.sellCard.srcSet}
                        sizes="(max-width: 768px) calc(100vw - 80px), 400px"
                        alt={ONBOARDING_IMAGES.sellCard.alt}
                        className="h-44 sm:h-48 w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-violet-500/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute top-3 left-3 p-2.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg group-hover:bg-violet-400 group-hover:shadow-violet-400/30 transition-all duration-300">
                        <HomeIcon className="w-5 h-5 text-neutral-700 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-2 text-center text-white group-hover:text-violet-300 transition-colors">
                      {t('nav:onboarding.wantToSell')}
                    </h3>
                    <p className="text-neutral-400 mb-5 text-center flex-grow text-sm sm:text-base group-hover:text-neutral-300 transition-colors">
                      {t('nav:onboarding.sellDescription')}
                    </p>
                    <button className="w-full bg-gradient-to-r from-violet-500 to-purple-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 group-hover:from-violet-400 group-hover:to-purple-400 transition-all duration-300 flex items-center justify-center gap-2">
                      <HomeIcon className="w-5 h-5" />
                      {t('nav:onboarding.listProperty')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* FEATURES GRID */}
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 w-full max-w-4xl animate-fadeIn"
              style={{ animationDelay: '0.4s' }}
            >
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="group p-4 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 text-center"
                >
                  <div className="w-10 h-10 mx-auto mb-3 bg-gradient-to-br from-primary/20 to-cyan-400/20 rounded-xl flex items-center justify-center group-hover:from-primary/30 group-hover:to-cyan-400/30 transition-all">
                    <feature.icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">{feature.title}</h4>
                  <p className="text-xs text-neutral-500 group-hover:text-neutral-400 transition-colors">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* AGENCY LOGOS ROW */}
            {agencies.length > 0 && (
              <div
                className="mt-10 w-full max-w-4xl animate-fadeIn"
                style={{ animationDelay: '0.5s' }}
              >
                <div className="text-center mb-4">
                  <span className="text-sm text-neutral-500">{t('common:trustedBy', 'Trusted by leading agencies')}</span>
                </div>
                <div className="flex flex-wrap justify-center items-center gap-6">
                  {agencies.slice(0, 8).map((agency) => (
                    <div
                      key={agency._id}
                      className="w-14 h-14 sm:w-16 sm:h-16 p-2 bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 hover:bg-white/20 hover:scale-110 transition-all duration-300"
                    >
                      <img
                        src={agency.logo}
                        alt={agency.name}
                        className="w-full h-full object-contain opacity-70 hover:opacity-100 transition-opacity"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="py-6 text-center border-t border-white/5">
            <p className="text-neutral-600 text-sm">
              {t('common:footer.copyright', {
                year: new Date().getFullYear(),
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Add keyframe animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.95); }
          75% { transform: translate(20px, 50px) scale(1.05); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.8s ease-out forwards;
          opacity: 0;
        }
        .animate-blob {
          animation: blob 20s infinite ease-in-out;
        }
      `}</style>
    </>
  );
};

export default Onboarding;
