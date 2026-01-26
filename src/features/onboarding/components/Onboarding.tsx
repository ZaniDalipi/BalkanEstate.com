import React, { useEffect, useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import {
  LogoIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  SparklesIcon,
  HomeIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  StarIcon,
} from '@/constants';

/* ---------------- HIGH-QUALITY IMAGES ---------------- */
const HERO_IMAGES = {
  // Stunning luxury interior for buy card
  buy: {
    src: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop&q=90&fm=webp',
    srcSet: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop&q=85&fm=webp 400w',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=450&fit=crop&q=85&fm=webp 600w',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop&q=90&fm=webp 800w',
    ].join(', '),
    alt: 'Luxury modern home exterior',
  },
  // Beautiful modern house for sell card
  sell: {
    src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop&q=90&fm=webp',
    srcSet: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop&q=85&fm=webp 400w',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=450&fit=crop&q=85&fm=webp 600w',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop&q=90&fm=webp 800w',
    ].join(', '),
    alt: 'Elegant modern house',
  },
  // Hero background
  background: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1920&h=1080&fit=crop&q=80&fm=webp',
};

/* ---------------- FLOATING PARTICLE ---------------- */
const FloatingParticle: React.FC<{ delay: number; size: number; left: string; duration: number }> = ({ delay, size, left, duration }) => (
  <div
    className="absolute rounded-full bg-white/20 backdrop-blur-sm animate-float-up pointer-events-none"
    style={{
      width: size,
      height: size,
      left,
      bottom: '-20px',
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
    }}
  />
);

/* ---------------- FEATURE BADGE ---------------- */
const FeatureBadge: React.FC<{ icon: React.ReactNode; text: string; delay: number }> = ({ icon, text, delay }) => (
  <div
    className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white/90 text-xs sm:text-sm font-medium animate-fade-in-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    {icon}
    <span>{text}</span>
  </div>
);

/* ---------------- MAIN COMPONENT ---------------- */
const Onboarding: React.FC = () => {
  const { t } = useTranslation(['common', 'nav']);
  const { dispatch } = useAppContext();
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger animations after mount
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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

  return (
    <>
      <Helmet>
        <link rel="preload" as="image" href={HERO_IMAGES.buy.src} />
      </Helmet>

      {/* CSS Animations */}
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-scale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes float-up {
          0% {
            opacity: 0;
            transform: translateY(0) scale(1);
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.3;
          }
          100% {
            opacity: 0;
            transform: translateY(-100vh) scale(0.5);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(59, 130, 246, 0.5);
          }
        }

        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-fade-in-scale {
          animation: fade-in-scale 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-float-up {
          animation: float-up linear infinite;
        }

        .animate-shimmer {
          animation: shimmer 3s linear infinite;
          background-size: 200% 100%;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .animate-gradient {
          animation: gradient-shift 8s ease infinite;
          background-size: 200% 200%;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .glass-card-light {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }

        .liquid-border {
          position: relative;
        }

        .liquid-border::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: inherit;
          padding: 2px;
          background: linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1), rgba(255,255,255,0.3));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }
      `}</style>

      <div
        ref={containerRef}
        className="min-h-screen relative overflow-hidden"
      >
        {/* Dynamic Gradient Background */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 animate-gradient"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at ${mousePosition.x * 100}% ${mousePosition.y * 100}%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
              linear-gradient(135deg, #0f172a 0%, #1e3a5f 25%, #1e1b4b 50%, #312e81 75%, #1e1b4b 100%)
            `,
          }}
        />

        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating Orbs */}
          <div className="absolute top-20 left-[10%] w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-20 right-[10%] w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl" />

          {/* Floating Particles */}
          {isLoaded && [...Array(15)].map((_, i) => (
            <FloatingParticle
              key={i}
              delay={i * 0.8}
              size={Math.random() * 8 + 4}
              left={`${Math.random() * 100}%`}
              duration={Math.random() * 10 + 15}
            />
          ))}

          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header */}
          <header className={`pt-6 sm:pt-8 px-4 sm:px-6 lg:px-8 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
            <div className="max-w-7xl mx-auto flex items-center justify-center">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/30 rounded-xl blur-xl animate-pulse" />
                  <div className="relative glass-card p-2.5 sm:p-3 rounded-xl">
                    <LogoIcon className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                    Balkan <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Estate</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-white/60 font-medium hidden sm:block">
                    {t('common:tagline')}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="max-w-6xl mx-auto w-full">
              {/* Hero Text */}
              <div className={`text-center mb-8 sm:mb-12 transition-all duration-1000 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 glass-card rounded-full">
                  <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  <span className="text-white/90 text-sm sm:text-base font-semibold">
                    {t('nav:onboarding.question')}
                  </span>
                  <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                </div>

                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 sm:mb-6 leading-tight">
                  <span className="block">{t('common:hero.findYour', 'Find Your')}</span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 animate-shimmer">
                    {t('common:hero.dreamHome', 'Dream Home')}
                  </span>
                </h2>

                <p className="text-base sm:text-lg lg:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
                  {t('common:hero.subtitle', 'Discover thousands of properties across the Balkans with our AI-powered platform')}
                </p>
              </div>

              {/* Feature Badges - Desktop */}
              <div className={`hidden sm:flex flex-wrap justify-center gap-3 mb-10 transition-all duration-1000 delay-400 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <FeatureBadge icon={<MagnifyingGlassIcon className="w-4 h-4" />} text={t('common:features.smartSearch', 'Smart Search')} delay={500} />
                <FeatureBadge icon={<ShieldCheckIcon className="w-4 h-4" />} text={t('common:features.verified', 'Verified Listings')} delay={600} />
                <FeatureBadge icon={<ChartBarIcon className="w-4 h-4" />} text={t('common:features.analytics', 'Market Analytics')} delay={700} />
                <FeatureBadge icon={<StarIcon className="w-4 h-4" />} text={t('common:features.topAgents', 'Top Agents')} delay={800} />
              </div>

              {/* Cards Container */}
              <div className={`grid md:grid-cols-2 gap-6 lg:gap-8 transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>

                {/* Buy Card */}
                <div
                  onClick={handleBuyChoice}
                  className="group relative cursor-pointer"
                >
                  {/* Glow Effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-3xl opacity-0 group-hover:opacity-50 blur-xl transition-all duration-500" />

                  {/* Card */}
                  <div className="relative glass-card-light rounded-3xl overflow-hidden shadow-2xl shadow-black/20 transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-3xl liquid-border">
                    {/* Image Section */}
                    <div className="relative h-48 sm:h-56 lg:h-64 overflow-hidden">
                      <img
                        src={HERO_IMAGES.buy.src}
                        srcSet={HERO_IMAGES.buy.srcSet}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        alt={HERO_IMAGES.buy.alt}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="eager"
                      />
                      {/* Image Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                      {/* Floating Badge */}
                      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-semibold text-gray-800">{t('nav:onboarding.activeListings', '1,200+ Active')}</span>
                      </div>

                      {/* Icon */}
                      <div className="absolute bottom-4 right-4 w-12 h-12 sm:w-14 sm:h-14 glass-card rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <MagnifyingGlassIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-5 sm:p-6 lg:p-8">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                          <HomeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                            {t('nav:onboarding.lookingToBuy')}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500">{t('nav:onboarding.buySubtitle', 'Start your journey')}</p>
                        </div>
                      </div>

                      <p className="text-gray-600 text-sm sm:text-base mb-5 leading-relaxed">
                        {t('nav:onboarding.buyDescription')}
                      </p>

                      {/* Features */}
                      <div className="flex flex-wrap gap-2 mb-5">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                          {t('nav:onboarding.aiMatching', 'AI Matching')}
                        </span>
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                          {t('nav:onboarding.virtualTours', 'Virtual Tours')}
                        </span>
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                          {t('nav:onboarding.priceAlerts', 'Price Alerts')}
                        </span>
                      </div>

                      {/* Button */}
                      <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 group-hover:shadow-lg group-hover:shadow-blue-500/30 animate-pulse-glow">
                        <span>{t('nav:onboarding.startSearching')}</span>
                        <ArrowRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sell Card */}
                <div
                  onClick={handleSellChoice}
                  className="group relative cursor-pointer"
                >
                  {/* Glow Effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-purple-500 rounded-3xl opacity-0 group-hover:opacity-50 blur-xl transition-all duration-500" />

                  {/* Card */}
                  <div className="relative glass-card-light rounded-3xl overflow-hidden shadow-2xl shadow-black/20 transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-3xl liquid-border">
                    {/* Image Section */}
                    <div className="relative h-48 sm:h-56 lg:h-64 overflow-hidden">
                      <img
                        src={HERO_IMAGES.sell.src}
                        srcSet={HERO_IMAGES.sell.srcSet}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        alt={HERO_IMAGES.sell.alt}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                      />
                      {/* Image Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                      {/* Floating Badge */}
                      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg">
                        <ChartBarIcon className="w-3.5 h-3.5 text-violet-600" />
                        <span className="text-xs font-semibold text-gray-800">{t('nav:onboarding.freeValuation', 'Free Valuation')}</span>
                      </div>

                      {/* Icon */}
                      <div className="absolute bottom-4 right-4 w-12 h-12 sm:w-14 sm:h-14 glass-card rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <BuildingOfficeIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-5 sm:p-6 lg:p-8">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                          <MapPinIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                            {t('nav:onboarding.wantToSell')}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500">{t('nav:onboarding.sellSubtitle', 'Maximize your value')}</p>
                        </div>
                      </div>

                      <p className="text-gray-600 text-sm sm:text-base mb-5 leading-relaxed">
                        {t('nav:onboarding.sellDescription')}
                      </p>

                      {/* Features */}
                      <div className="flex flex-wrap gap-2 mb-5">
                        <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-medium rounded-full">
                          {t('nav:onboarding.proPhotos', 'Pro Photos')}
                        </span>
                        <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-medium rounded-full">
                          {t('nav:onboarding.maxExposure', 'Max Exposure')}
                        </span>
                        <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-medium rounded-full">
                          {t('nav:onboarding.expertSupport', 'Expert Support')}
                        </span>
                      </div>

                      {/* Button */}
                      <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 group-hover:shadow-lg group-hover:shadow-gray-900/30">
                        <span>{t('nav:onboarding.listProperty')}</span>
                        <ArrowRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Row - Mobile */}
              <div className={`flex sm:hidden justify-center gap-6 mt-8 transition-all duration-1000 delay-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="text-center">
                  <div className="text-2xl font-black text-white">10K+</div>
                  <div className="text-xs text-white/60">{t('common:stats.properties', 'Properties')}</div>
                </div>
                <div className="w-px bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl font-black text-white">500+</div>
                  <div className="text-xs text-white/60">{t('common:stats.agents', 'Agents')}</div>
                </div>
                <div className="w-px bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl font-black text-white">8</div>
                  <div className="text-xs text-white/60">{t('common:stats.countries', 'Countries')}</div>
                </div>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className={`py-6 px-4 text-center transition-all duration-1000 delay-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-white/40 text-sm">
              {t('common:footer.copyright', { year: new Date().getFullYear() })}
            </p>
          </footer>
        </div>
      </div>
    </>
  );
};

export default Onboarding;
