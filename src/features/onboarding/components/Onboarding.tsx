import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { LogoIcon, BuildingOfficeIcon, SearchIcon, HomeIcon, MapIcon, ChartBarIcon, ShieldCheckIcon, StarIcon } from '@/constants';
import { ONBOARDING_IMAGES } from '@/config/cloudinaryConfig';
import { getAgencies } from '@/src/features/agencies/api';
import { apiRequest } from '@/src/shared/api';

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
  const [visibleAgencyIndex, setVisibleAgencyIndex] = useState(0);
  const [platformStats, setPlatformStats] = useState({
    propertiesCount: 0,
    countriesCount: 11, // Balkan countries - can be made dynamic if needed
    agenciesCount: 0,
  });
  const VISIBLE_AGENCY_COUNT = 5; // Show 5 agencies at a time
  const ROTATION_INTERVAL = 3000; // Rotate every 3 seconds

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------- FETCH PLATFORM STATS & AGENCIES ----------- */
  useEffect(() => {
    const fetchPlatformData = async () => {
      try {
        // Fetch agencies
        const agencyResponse = await getAgencies({ limit: 100 });
        const allAgencies = agencyResponse.agencies || [];
        const agenciesWithLogos = allAgencies.filter((a: Agency) => a.logo);
        setAgencies(agenciesWithLogos);

        // Fetch properties count (just need pagination info)
        const propertiesResponse = await apiRequest<{ pagination: { total: number } }>('/properties?limit=1');

        // Update platform stats with real data
        setPlatformStats({
          propertiesCount: propertiesResponse.pagination?.total || 0,
          countriesCount: 11, // Fixed: 11 Balkan countries
          agenciesCount: allAgencies.length,
        });
      } catch (error) {
        console.error('Failed to fetch platform data:', error);
      }
    };
    fetchPlatformData();
  }, []);

  /* ----------- ROTATE VISIBLE AGENCIES ----------- */
  useEffect(() => {
    if (agencies.length <= VISIBLE_AGENCY_COUNT) return;

    const interval = setInterval(() => {
      setVisibleAgencyIndex((prev) => (prev + 1) % agencies.length);
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [agencies.length]);

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

    // Only use first 8 agencies for floating bubbles
    agencies.slice(0, 8).forEach((agency, index) => {
      const size = 65 + Math.random() * 35; // 65-100px bubbles (larger)

      const el = document.createElement('div');
      el.className = 'absolute pointer-events-auto will-change-transform cursor-pointer z-[1]';
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;

      // Create bubble with agency logo - glass effect for light theme
      el.innerHTML = `
        <div class="w-full h-full rounded-full bg-white/80 backdrop-blur-xl shadow-lg border border-white/60 overflow-hidden flex items-center justify-center p-3 opacity-80 hover:opacity-100 transition-all duration-300 hover:scale-110 hover:shadow-xl" style="box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.5);">
          <img
            src="${agency.logo}"
            alt="${agency.name}"
            class="w-full h-full object-contain"
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

  // Stats data - using real platform stats
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}k+`;
    }
    return num > 0 ? `${num.toLocaleString()}+` : '0';
  };

  const stats = [
    { value: formatNumber(platformStats.propertiesCount), label: t('common:stats.properties', 'Properties'), icon: HomeIcon },
    { value: String(platformStats.countriesCount), label: t('common:stats.countries', 'Countries'), icon: MapIcon },
    { value: platformStats.agenciesCount > 0 ? `${platformStats.agenciesCount}+` : '0', label: t('common:stats.agencies', 'Agencies'), icon: BuildingOfficeIcon },
    { value: '24/7', label: t('common:stats.support', 'Support'), icon: StarIcon },
  ];

  // Feature highlights
  const features = [
    { icon: SearchIcon, title: t('common:features.smartSearch', 'Smart Search'), desc: t('common:features.smartSearchDesc', 'Advanced filters & maps') },
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
          background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 25%, #dbeafe 50%, #ede9fe 75%, #fce7f3 100%)',
        }}
      >
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-300/30 to-cyan-200/20 rounded-full blur-[80px] animate-blob" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-violet-300/25 to-purple-200/15 rounded-full blur-[80px] animate-blob" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/15 to-indigo-300/10 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '4s' }} />
          <div className="absolute top-1/4 right-1/3 w-[300px] h-[300px] bg-gradient-to-br from-rose-200/20 to-orange-200/10 rounded-full blur-[60px] animate-blob" style={{ animationDelay: '3s' }} />
        </div>

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
              <div className="flex items-center justify-center gap-4 mb-5">
                <div className="p-3 bg-gradient-to-br from-primary to-blue-600 rounded-2xl shadow-lg shadow-primary/25">
                  <LogoIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-neutral-800 tracking-tight">
                  Balkan<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-violet-500">Estate</span>
                </h1>
              </div>

              <p className="text-lg sm:text-xl md:text-2xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
                {t('common:heroTagline', 'Discover your dream property across 11 Balkan countries')}
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
                  className="text-center p-4 bg-white/60 backdrop-blur-lg rounded-2xl border border-white/50 hover:bg-white/80 hover:shadow-lg transition-all duration-300"
                  style={{ boxShadow: '0 4px 20px rgba(31, 38, 135, 0.08)' }}
                >
                  <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                  <div className="text-2xl sm:text-3xl font-bold text-neutral-800">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-neutral-500">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* MAIN CONTENT CARD */}
            <div
              className="bg-white/70 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl w-full max-w-4xl border border-white/60 animate-slideUp"
              style={{
                boxShadow: '0 20px 60px rgba(31, 38, 135, 0.12), inset 0 0 40px rgba(255, 255, 255, 0.5)',
                animationDelay: '0.25s',
              }}
            >
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-8 text-neutral-800">
                {t('nav:onboarding.question')}
              </h2>

              <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                {/* BUY CARD */}
                <div
                  onClick={handleBuyChoice}
                  className="group relative p-5 sm:p-6 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-2xl border border-white/60 hover:border-primary/30 hover:-translate-y-2 hover:shadow-[0_25px_60px_rgba(59,130,246,0.15)] transition-all duration-500 cursor-pointer flex flex-col overflow-hidden"
                  style={{ boxShadow: '0 8px 30px rgba(31, 38, 135, 0.08)' }}
                >
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/5 group-hover:to-cyan-500/5 transition-all duration-500 rounded-2xl" />

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
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute top-3 left-3 p-2.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg group-hover:bg-primary group-hover:shadow-primary/30 transition-all duration-300">
                        <SearchIcon className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                      </div>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-2 text-center text-neutral-800 group-hover:text-primary transition-colors">
                      {t('nav:onboarding.lookingToBuy')}
                    </h3>
                    <p className="text-neutral-500 mb-5 text-center flex-grow text-sm sm:text-base group-hover:text-neutral-600 transition-colors">
                      {t('nav:onboarding.buyDescription')}
                    </p>
                    <button className="w-full bg-gradient-to-r from-primary to-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20 group-hover:shadow-primary/40 group-hover:from-primary-dark group-hover:to-blue-700 transition-all duration-300 flex items-center justify-center gap-2">
                      <SearchIcon className="w-5 h-5" />
                      {t('nav:onboarding.startSearching')}
                    </button>
                  </div>
                </div>

                {/* SELL CARD */}
                <div
                  onClick={handleSellChoice}
                  className="group relative p-5 sm:p-6 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-2xl border border-white/60 hover:border-violet-400/30 hover:-translate-y-2 hover:shadow-[0_25px_60px_rgba(139,92,246,0.15)] transition-all duration-500 cursor-pointer flex flex-col overflow-hidden"
                  style={{ boxShadow: '0 8px 30px rgba(31, 38, 135, 0.08)' }}
                >
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-purple-500/0 group-hover:from-violet-500/5 group-hover:to-purple-500/5 transition-all duration-500 rounded-2xl" />

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
                      <div className="absolute inset-0 bg-gradient-to-t from-violet-500/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute top-3 left-3 p-2.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg group-hover:bg-violet-500 group-hover:shadow-violet-500/30 transition-all duration-300">
                        <HomeIcon className="w-5 h-5 text-violet-600 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-2 text-center text-neutral-800 group-hover:text-violet-600 transition-colors">
                      {t('nav:onboarding.wantToSell')}
                    </h3>
                    <p className="text-neutral-500 mb-5 text-center flex-grow text-sm sm:text-base group-hover:text-neutral-600 transition-colors">
                      {t('nav:onboarding.sellDescription')}
                    </p>
                    <button className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 group-hover:from-violet-600 group-hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-2">
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
                  className="group p-4 bg-white/50 backdrop-blur-lg rounded-2xl border border-white/50 hover:bg-white/80 hover:shadow-lg transition-all duration-300 text-center"
                >
                  <div className="w-10 h-10 mx-auto mb-3 bg-gradient-to-br from-primary/10 to-blue-400/10 rounded-xl flex items-center justify-center group-hover:from-primary/20 group-hover:to-blue-400/20 transition-all">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="text-sm font-semibold text-neutral-800 mb-1">{feature.title}</h4>
                  <p className="text-xs text-neutral-500 group-hover:text-neutral-600 transition-colors">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* AGENCY LOGOS ROW - ROTATING */}
            {agencies.length > 0 && (
              <div
                className="mt-10 w-full max-w-4xl animate-fadeIn"
                style={{ animationDelay: '0.5s' }}
              >
                <div className="text-center mb-4">
                  <span className="text-sm text-neutral-500">{t('common:trustedBy', 'Trusted by leading agencies')}</span>
                </div>
                <div className="flex justify-center items-center gap-6 overflow-hidden">
                  {Array.from({ length: VISIBLE_AGENCY_COUNT }).map((_, i) => {
                    const agencyIndex = (visibleAgencyIndex + i) % agencies.length;
                    const agency = agencies[agencyIndex];
                    if (!agency) return null;
                    return (
                      <div
                        key={`${agency._id}-${i}`}
                        className="w-14 h-14 sm:w-16 sm:h-16 p-2 bg-white/70 backdrop-blur-lg rounded-xl border border-white/50 hover:bg-white hover:shadow-lg hover:scale-110 transition-all duration-500 animate-agencyFadeIn"
                      >
                        <img
                          src={agency.logo}
                          alt={agency.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="py-6 text-center border-t border-neutral-200/50">
            <p className="text-neutral-500 text-sm">
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
        @keyframes agencyFadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
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
        .animate-agencyFadeIn {
          animation: agencyFadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default Onboarding;
