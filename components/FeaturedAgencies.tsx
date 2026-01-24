import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import { BuildingStorefrontIcon ,SparklesIcon, ArrowRightIcon } from '../constants';
import { useFeaturedAgencies } from '../src/features/agencies/hooks/useAgencies';
import { Agency } from '../types';

const FeaturedAgencies: React.FC = () => {
  const { t } = useTranslation('agencies');
  const { state, dispatch } = useAppContext();
  const { agencies, isLoading } = useFeaturedAgencies(4);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsVisible(true);
          setHasAnimated(true);
          
          // Trigger confetti effect
          triggerConfetti();
        }
      },
      {
        threshold: 0.2,
        rootMargin: '50px'
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [hasAnimated]);

  const triggerConfetti = () => {
    // Create confetti effect
    const confettiCount = 30;
    const container = containerRef.current;
    
    if (!container) return;
    
    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'absolute w-2 h-2 rounded-full';
      confetti.style.background = `linear-gradient(45deg, 
        ${['#8B5CF6', '#3B82F6', '#EC4899', '#F59E0B'][Math.floor(Math.random() * 4)]}, 
        ${['#8B5CF6', '#3B82F6', '#EC4899', '#F59E0B'][Math.floor(Math.random() * 4)]}
      )`;
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.top = `-20px`;
      confetti.style.opacity = '0';
      confetti.style.zIndex = '50';
      
      container.appendChild(confetti);
      
      // Animate confetti
      setTimeout(() => {
        confetti.style.transition = 'all 1.2s cubic-bezier(0.1, 0.8, 0.3, 1)';
        confetti.style.opacity = '1';
        confetti.style.transform = `translateY(${window.innerHeight * 0.5}px) rotate(${Math.random() * 720}deg)`;
        confetti.style.left = `${parseFloat(confetti.style.left) + (Math.random() * 40 - 20)}%`;
      }, i * 30);
      
      // Remove confetti after animation
      setTimeout(() => {
        confetti.style.opacity = '0';
        setTimeout(() => {
          if (container.contains(confetti)) {
            container.removeChild(confetti);
          }
        }, 300);
      }, 1200);
    }
  };

  // Color gradients for agency cards
  const colorGradients = [
    "from-purple-500 to-pink-500",
    "from-amber-500 to-orange-500",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-green-500",
  ];

  // Get agency type badge color and emoji
  const getAgencyTypeInfo = (type?: string) => {
    switch (type) {
      case 'luxury':
        return { emoji: '👑', label: t('featured.agencyTypes.luxury') };
      case 'commercial':
        return { emoji: '🏢', label: t('featured.agencyTypes.commercial') };
      case 'boutique':
        return { emoji: '🗝️', label: t('featured.agencyTypes.boutique') };
      case 'team':
        return { emoji: '👥', label: t('featured.agencyTypes.team') };
      default:
        return { emoji: '🏠', label: t('featured.agencyTypes.default') };
    }
  };

  const handleAgencyClick = (agency: Agency) => {
    dispatch({ type: 'SET_SELECTED_AGENCY', payload: agency._id });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencyDetail' });
    let urlSlug = agency.slug || agency._id;
    urlSlug = urlSlug.replace(',', '/');
    window.history.pushState({}, '', `/agencies/${urlSlug}`);
  };

  const handleExploreAll = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' });
    window.history.pushState({}, '', '/agencies');
  };

  return (
    <div
      ref={containerRef}
      className="relative py-10 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      {/* Magic curtain effect */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-transparent transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
        }`}
        style={{
          clipPath: isVisible ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' : 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
          transition: 'clip-path 1.2s cubic-bezier(0.77, 0, 0.175, 1)'
        }}
      />
      
      {/* Floating magic orbs */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className={`absolute rounded-full bg-gradient-to-r from-purple-400/20 to-blue-400/20 backdrop-blur-sm transition-all duration-1000 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            width: `${40 + i * 10}px`,
            height: `${40 + i * 10}px`,
            left: `${10 + i * 15}%`,
            top: `${20 + i * 5}%`,
            animation: isVisible ? `float 8s ease-in-out ${i * 0.5}s infinite` : 'none',
            filter: 'blur(10px)',
            transitionDelay: `${i * 0.1}s`
          }}
        />
      ))}
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header with magical entrance */}
        <div className={`text-center mb-10 sm:mb-12 lg:mb-16 transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`} style={{ transitionDelay: '0.3s' }}>
          <div className="inline-flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className={`relative transition-all duration-700 ${
              isVisible ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-90'
            }`} style={{ transitionDelay: '0.4s' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-primary blur-lg rounded-full opacity-60 animate-pulse" />
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-white to-purple-50 rounded-2xl flex items-center justify-center shadow-xl border border-white/30">
                <BuildingStorefrontIcon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary" />
                <SparklesIcon className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 animate-spin" />
              </div>
            </div>

            <div className={`h-10 sm:h-12 w-1 bg-gradient-to-b from-purple-400 to-primary rounded-full transition-all duration-700 ${
              isVisible ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
            }`} style={{ transitionDelay: '0.5s' }} />

            <div className={`relative transition-all duration-700 ${
              isVisible ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-90'
            }`} style={{ transitionDelay: '0.6s' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-500 blur-lg rounded-full opacity-60 animate-pulse" />
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-white to-blue-50 rounded-2xl flex items-center justify-center shadow-xl border border-white/30">
                <SparklesIcon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-blue-500" />
              </div>
            </div>
          </div>

          <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 pb-2 bg-gradient-to-r from-purple-600 via-primary to-blue-600 bg-clip-text text-transparent transition-all duration-700 leading-normal ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`} style={{ transitionDelay: '0.7s' }}>
            {t('featured.title')}
          </h2>

          <p className={`text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto transition-all duration-700 px-4 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`} style={{ transitionDelay: '0.8s' }}>
            {t('featured.subtitle')}
          </p>
        </div>

        {/* Agencies grid with staggered entrance - larger cards for better visual impact */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
          {isLoading ? (
            // Loading skeleton - matches new card design
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="animate-pulse h-full"
              >
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border border-white/30 overflow-hidden h-full flex flex-col">
                  <div className="h-24 sm:h-32 md:h-36 lg:h-40 bg-gradient-to-br from-gray-200 to-gray-300 relative">
                    {/* Logo skeleton */}
                    <div className="absolute -bottom-6 sm:-bottom-8 left-1/2 -translate-x-1/2">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-300 rounded-xl sm:rounded-2xl ring-2 sm:ring-4 ring-white" />
                    </div>
                  </div>
                  <div className="px-2 pb-3 pt-8 sm:px-5 sm:pb-5 sm:pt-12 md:px-6 md:pb-6 md:pt-14 space-y-3 sm:space-y-4 flex-1 flex flex-col">
                    <div className="h-4 sm:h-5 md:h-6 bg-gray-200 rounded-lg w-3/4 mx-auto" />
                    <div className="flex items-center justify-center gap-3 sm:gap-6 py-2 sm:py-3 border-y border-neutral-100">
                      <div className="text-center space-y-1 sm:space-y-2">
                        <div className="h-5 sm:h-7 w-8 sm:w-12 bg-gray-200 rounded mx-auto" />
                        <div className="h-2 sm:h-3 w-10 sm:w-16 bg-gray-200 rounded mx-auto" />
                      </div>
                      <div className="w-px h-8 sm:h-10 bg-neutral-200" />
                      <div className="text-center space-y-1 sm:space-y-2">
                        <div className="h-5 sm:h-7 w-8 sm:w-12 bg-gray-200 rounded mx-auto" />
                        <div className="h-2 sm:h-3 w-10 sm:w-16 bg-gray-200 rounded mx-auto" />
                      </div>
                    </div>
                    <div className="h-8 sm:h-11 md:h-12 bg-gray-200 rounded-lg sm:rounded-xl w-full mt-auto" />
                  </div>
                </div>
              </div>
            ))
          ) : agencies.length > 0 ? (
            agencies.map((agency, index) => {
              const typeInfo = getAgencyTypeInfo(agency.type);
              const colorGradient = colorGradients[index % colorGradients.length];

              return (
            <div
              key={agency._id}
              className={`group relative transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{
                transitionDelay: `${0.9 + index * 0.1}s`,
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)'
              }}
              onClick={() => handleAgencyClick(agency)}
            >
              {/* Magic glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 via-primary to-blue-400 rounded-2xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
              
              {/* Magic trail effect on hover */}
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                   style={{
                     backgroundSize: '200% 100%',
                     animation: 'shimmer 2s infinite linear'
                   }} />
              
              {/* Agency card - redesigned for better proportions */}
              <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl border border-white/40 overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-500 h-full flex flex-col group-hover:-translate-y-1">
                {/* Header with gradient or cover image - increased height */}
                <div
                  className={`h-24 sm:h-32 md:h-36 lg:h-40 relative overflow-hidden ${
                    (agency as any).coverImage
                      ? ''
                      : (agency as any).coverGradient
                        ? `bg-gradient-to-br ${(agency as any).coverGradient}`
                        : `bg-gradient-to-br ${colorGradient}`
                  }`}
                  style={(agency as any).coverImage ? {
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${(agency as any).coverImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  } : {}}>
                  {/* Animated particles in header */}
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 bg-white/30 rounded-full"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animation: `float ${3 + Math.random() * 4}s ease-in-out ${i * 0.3}s infinite`
                      }}
                    />
                  ))}

                  {/* Featured Badge - top left */}
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3 md:top-4 md:left-4 flex gap-1 sm:gap-2">
                    <div className="flex items-center gap-1 sm:gap-1.5 bg-white/25 backdrop-blur-md px-2 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-lg">
                      <SparklesIcon className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-300" />
                      <span className="text-white font-semibold text-[10px] sm:text-xs hidden sm:inline">{t('featured.badge')}</span>
                    </div>
                  </div>

                  {/* Type Badge - top right - hidden on very small screens */}
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 hidden sm:block">
                    <div className="flex items-center gap-1 sm:gap-1.5 bg-black/30 backdrop-blur-md px-2 py-1 sm:px-3 sm:py-1.5 rounded-full">
                      <span className="text-xs sm:text-sm">{typeInfo.emoji}</span>
                      <span className="text-white text-[10px] sm:text-xs font-medium">{typeInfo.label}</span>
                    </div>
                  </div>

                  {/* Logo - centered at bottom, overlapping content */}
                  <div className="absolute -bottom-6 sm:-bottom-8 left-1/2 -translate-x-1/2">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center overflow-hidden shadow-xl ring-2 sm:ring-4 ring-white">
                      {agency.logo ? (
                        <img src={agency.logo} alt={agency.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${colorGradient} flex items-center justify-center`}>
                          <span className="text-2xl sm:text-3xl md:text-4xl">{typeInfo.emoji}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content - adjusted padding for logo overlap */}
                <div className="px-2 pb-3 pt-8 sm:px-5 sm:pb-5 sm:pt-12 md:px-6 md:pb-6 md:pt-14 flex-1 flex flex-col">
                  {/* Agency Name - centered */}
                  <h3 className="text-sm sm:text-lg md:text-xl font-bold text-neutral-900 mb-2 sm:mb-3 group-hover:text-primary transition-colors duration-300 line-clamp-2 leading-tight text-center">
                    {agency.name}
                  </h3>

                  {/* Stats Row - horizontal layout */}
                  <div className="flex items-center justify-center gap-3 sm:gap-6 mb-3 sm:mb-5 py-2 sm:py-3 border-y border-neutral-100">
                    <div className="text-center">
                      <div className="text-lg sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">{agency.totalProperties || 0}</div>
                      <div className="text-[10px] sm:text-xs text-neutral-500 font-medium mt-0.5">{t('featured.properties')}</div>
                    </div>

                    <div className="w-px h-8 sm:h-10 bg-neutral-200" />

                    <div className="text-center">
                      <div className="text-lg sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">{agency.totalAgents || 0}</div>
                      <div className="text-[10px] sm:text-xs text-neutral-500 font-medium mt-0.5">{t('featured.agents')}</div>
                    </div>
                  </div>

                  {/* View Button */}
                  <button className="w-full bg-gradient-to-r from-primary to-primary-dark text-white py-2 sm:py-3 md:py-3.5 px-2 sm:px-4 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 group/btn mt-auto">
                    <span>{t('featured.viewAgency')}</span>
                    <ArrowRightIcon className="w-3 h-3 sm:w-4 sm:h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
                  </button>
                </div>

                {/* Decorative gradient border on hover */}
                <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-gradient-to-r group-hover:from-purple-400/30 group-hover:to-primary/30 transition-all duration-500 pointer-events-none" />
              </div>
            </div>
              );
            })
          ) : (
            // Empty state
            <div className="col-span-full text-center py-12 md:py-16">
              <div className="max-w-md mx-auto px-4">
                <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center">
                  <BuildingStorefrontIcon className="w-10 h-10 md:w-12 md:h-12 text-gray-400" />
                </div>
                <p className="text-neutral-600 text-base md:text-lg font-medium mb-2">{t('featured.empty.title')}</p>
                <p className="text-neutral-500 text-sm">{t('featured.empty.message')}</p>
              </div>
            </div>
          )}
        </div>

        {/* CTA with magical entrance */}
        {agencies.length > 0 && (
          <div className={`text-center mt-10 sm:mt-12 lg:mt-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`} style={{ transitionDelay: '1.5s' }}>
            <button
              onClick={handleExploreAll}
              className="group relative px-6 sm:px-8 lg:px-10 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-primary text-white font-bold text-sm sm:text-base rounded-xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]">
              <span className="relative z-10 flex items-center gap-2 sm:gap-3">
                <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                {t('featured.exploreAll')}
                <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-primary rounded-xl blur opacity-0 group-hover:opacity-70 transition-opacity duration-500" />
            </button>

            <p className="text-neutral-500 text-xs sm:text-sm mt-4 sm:mt-6 flex items-center justify-center gap-2 px-4">
              <span className="animate-pulse">✨</span>
              <span className="hidden sm:inline">{t('featured.selectedByAlgorithm')}</span>
              <span className="sm:hidden">{t('featured.selectedByAlgorithmMobile')}</span>
              <span className="animate-pulse">✨</span>
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(180deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default FeaturedAgencies;