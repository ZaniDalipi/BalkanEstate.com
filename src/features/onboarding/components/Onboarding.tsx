import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { LogoIcon, SearchIcon, HomeIcon } from '@/constants';
import { ONBOARDING_IMAGES } from '@/config/cloudinaryConfig';

/* ---------------- CONSTANTS ---------------- */

const STORAGE_KEY = 'balkanestate_onboarding_complete';
const PARTICLE_COUNT = 40;

/* ---------------- PARTICLE SYSTEM ---------------- */

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  hue: number;
}

const createParticle = (width: number, height: number): Particle => ({
  x: Math.random() * width,
  y: Math.random() * height,
  size: Math.random() * 3 + 1,
  speedX: (Math.random() - 0.5) * 0.3,
  speedY: (Math.random() - 0.5) * 0.3 - 0.2,
  opacity: Math.random() * 0.4 + 0.1,
  hue: Math.random() * 40 + 210, // Blue range
});

/* ---------------- COMPONENT ---------------- */

const Onboarding: React.FC = () => {
  const { t } = useTranslation(['common', 'nav']);
  const { dispatch } = useAppContext();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeCard, setActiveCard] = useState<'buy' | 'sell' | null>(null);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------- CHECK IF SHOULD SHOW ----------- */
  useEffect(() => {
    // Check if user has already completed onboarding
    const hasCompleted = localStorage.getItem(STORAGE_KEY);
    if (hasCompleted === 'true') {
      // Skip onboarding entirely
      dispatch({ type: 'COMPLETE_ONBOARDING' });
      return;
    }

    // Show with entrance animation
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, [dispatch]);

  /* ----------- PARTICLE ANIMATION ----------- */
  useEffect(() => {
    if (prefersReducedMotion || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight * 2; // Make canvas taller for scrolling
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize particles
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(canvas.width, canvas.height)
    );

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle with soft glow
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 3
        );
        gradient.addColorStop(0, `hsla(${particle.hue}, 80%, 55%, ${particle.opacity})`);
        gradient.addColorStop(1, `hsla(${particle.hue}, 80%, 55%, 0)`);
        ctx.fillStyle = gradient;
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [prefersReducedMotion]);

  /* ---------------- ACTIONS ---------------- */

  const completeOnboarding = useCallback(() => {
    // Save to localStorage so it won't show again
    localStorage.setItem(STORAGE_KEY, 'true');
    dispatch({ type: 'COMPLETE_ONBOARDING' });
  }, [dispatch]);

  const handleBuyChoice = () => {
    setActiveCard('buy');
    setTimeout(() => {
      completeOnboarding();
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
    }, 300);
  };

  const handleSellChoice = () => {
    setActiveCard('sell');
    setTimeout(() => {
      completeOnboarding();
      dispatch({ type: 'SET_PENDING_REDIRECT', payload: 'create-listing' });
      dispatch({
        type: 'TOGGLE_AUTH_MODAL',
        payload: { isOpen: true, view: 'signup' },
      });
    }, 300);
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
        className={`fixed inset-0 z-[9999] overflow-y-auto transition-opacity duration-1000 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Light gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 25%, #ddd6fe 50%, #fce7f3 75%, #fff1f2 100%)',
          }}
        >
          {/* Animated gradient orbs */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-60"
              style={{
                background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)',
                animation: 'float1 20s ease-in-out infinite',
              }}
            />
            <div
              className="absolute top-1/3 -right-20 w-[500px] h-[500px] rounded-full opacity-50"
              style={{
                background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)',
                animation: 'float2 15s ease-in-out infinite',
              }}
            />
            <div
              className="absolute -bottom-20 left-1/3 w-[700px] h-[700px] rounded-full opacity-40"
              style={{
                background: 'radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%)',
                animation: 'float3 18s ease-in-out infinite',
              }}
            />
          </div>

          {/* Particle canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
          />

          {/* Subtle pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
          {/* Logo and title */}
          <div
            className={`text-center mb-10 transform transition-all duration-1000 delay-300 ${
              isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'
            }`}
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-violet-500 rounded-2xl blur-xl opacity-40 animate-pulse" />
                <div className="relative p-4 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl shadow-xl shadow-blue-500/20">
                  <LogoIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                </div>
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight mb-4">
              Balkan<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600">Estate</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 max-w-lg mx-auto">
              {t('common:heroTagline', 'Discover your dream property across 11 Balkan countries')}
            </p>
          </div>

          {/* Main question */}
          <h2
            className={`text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 text-center mb-10 transform transition-all duration-1000 delay-500 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}
          >
            {t('nav:onboarding.question', 'How can we help you today?')}
          </h2>

          {/* Choice cards */}
          <div
            className={`grid md:grid-cols-2 gap-6 md:gap-8 w-full max-w-4xl transform transition-all duration-1000 delay-700 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
            }`}
          >
            {/* Buy Card */}
            <button
              onClick={handleBuyChoice}
              className={`group relative overflow-hidden rounded-3xl transition-all duration-500 text-left ${
                activeCard === 'buy'
                  ? 'scale-105 ring-4 ring-blue-400'
                  : activeCard === 'sell'
                    ? 'scale-95 opacity-50'
                    : 'hover:scale-[1.02] hover:-translate-y-1'
              }`}
            >
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 rounded-3xl opacity-0 group-hover:opacity-50 blur-xl transition-all duration-500" />

              {/* Card content */}
              <div className="relative bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-6 sm:p-8 shadow-xl shadow-gray-200/50 group-hover:shadow-2xl group-hover:shadow-blue-200/50 transition-all duration-500">
                {/* Image */}
                <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden mb-6">
                  <img
                    src={ONBOARDING_IMAGES.buyCard.src}
                    srcSet={ONBOARDING_IMAGES.buyCard.srcSet}
                    sizes="(max-width: 768px) calc(100vw - 80px), 400px"
                    alt={ONBOARDING_IMAGES.buyCard.alt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="eager"
                    decoding="async"
                    fetchpriority="high"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                  {/* Icon badge */}
                  <div className="absolute top-4 left-4 p-3 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                    <SearchIcon className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Text */}
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {t('nav:onboarding.lookingToBuy', "I'm looking to buy")}
                </h3>
                <p className="text-gray-600 mb-6 group-hover:text-gray-700 transition-colors">
                  {t('nav:onboarding.buyDescription', 'Find your dream home with our powerful search tools and real-time alerts.')}
                </p>

                {/* CTA */}
                <div className="flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl font-bold text-white shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 group-hover:from-blue-600 group-hover:to-blue-700 transition-all">
                  <SearchIcon className="w-5 h-5" />
                  <span>{t('nav:onboarding.startSearching', 'Start Searching')}</span>
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Sell Card */}
            <button
              onClick={handleSellChoice}
              className={`group relative overflow-hidden rounded-3xl transition-all duration-500 text-left ${
                activeCard === 'sell'
                  ? 'scale-105 ring-4 ring-violet-400'
                  : activeCard === 'buy'
                    ? 'scale-95 opacity-50'
                    : 'hover:scale-[1.02] hover:-translate-y-1'
              }`}
            >
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-500 rounded-3xl opacity-0 group-hover:opacity-50 blur-xl transition-all duration-500" />

              {/* Card content */}
              <div className="relative bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-6 sm:p-8 shadow-xl shadow-gray-200/50 group-hover:shadow-2xl group-hover:shadow-violet-200/50 transition-all duration-500">
                {/* Image */}
                <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden mb-6">
                  <img
                    src={ONBOARDING_IMAGES.sellCard.src}
                    srcSet={ONBOARDING_IMAGES.sellCard.srcSet}
                    sizes="(max-width: 768px) calc(100vw - 80px), 400px"
                    alt={ONBOARDING_IMAGES.sellCard.alt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                  {/* Icon badge */}
                  <div className="absolute top-4 left-4 p-3 bg-violet-500 rounded-xl shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform">
                    <HomeIcon className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Text */}
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 group-hover:text-violet-600 transition-colors">
                  {t('nav:onboarding.wantToSell', 'I want to sell')}
                </h3>
                <p className="text-gray-600 mb-6 group-hover:text-gray-700 transition-colors">
                  {t('nav:onboarding.sellDescription', 'List your property, reach thousands of potential buyers, and use our smart tools.')}
                </p>

                {/* CTA */}
                <div className="flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-violet-500 to-violet-600 rounded-xl font-bold text-white shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 group-hover:from-violet-600 group-hover:to-violet-700 transition-all">
                  <HomeIcon className="w-5 h-5" />
                  <span>{t('nav:onboarding.listProperty', 'List my Property')}</span>
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </button>
          </div>

          {/* Bottom tagline */}
          <p
            className={`text-gray-500 text-sm mt-10 text-center transform transition-all duration-1000 delay-1000 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}
          >
            11 countries &bull; 50+ cities &bull; Thousands of properties
          </p>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(50px, 30px) scale(1.05); }
          50% { transform: translate(-30px, 60px) scale(0.95); }
          75% { transform: translate(40px, -20px) scale(1.02); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 40px) scale(1.08); }
          66% { transform: translate(30px, -30px) scale(0.92); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -40px) scale(1.1); }
        }
      `}</style>
    </>
  );
};

export default Onboarding;
