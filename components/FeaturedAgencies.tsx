import React, { useRef, useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { BuildingStorefrontIcon ,SparklesIcon, ArrowRightIcon } from '../constants';
import { useFeaturedAgencies } from '../src/features/agencies/hooks/useAgencies';
import { Agency } from '../types';

const FeaturedAgencies: React.FC = () => {
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
        return { emoji: '👑', label: 'Luxury Properties' };
      case 'commercial':
        return { emoji: '🏢', label: 'Commercial Properties' };
      case 'boutique':
        return { emoji: '🗝️', label: 'Boutique Agency' };
      case 'team':
        return { emoji: '👥', label: 'Team Agency' };
      default:
        return { emoji: '🏠', label: 'Real Estate' };
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
            animation: isVisible ? `float 8s ease-in-out infinite` : 'none',
            animationDelay: `${i * 0.5}s`,
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

          <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-purple-600 via-primary to-blue-600 bg-clip-text text-transparent transition-all duration-700 leading-tight ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`} style={{ transitionDelay: '0.7s' }}>
            Magically Featured Agencies
          </h2>

          <p className={`text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto transition-all duration-700 px-4 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`} style={{ transitionDelay: '0.8s' }}>
            Discover properties through our enchanted network of trusted real estate partners
          </p>
        </div>

        {/* Agencies grid with staggered entrance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="animate-pulse h-full"
              >
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 overflow-hidden h-full flex flex-col">
                  <div className="h-36 sm:h-40 bg-gradient-to-br from-gray-200 to-gray-300" />
                  <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col">
                    <div className="h-5 sm:h-6 bg-gray-200 rounded-lg w-3/4" />
                    <div className="h-3 sm:h-4 bg-gray-200 rounded-md w-1/2" />
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-1">
                      <div className="bg-gray-200 rounded-xl" />
                      <div className="bg-gray-200 rounded-xl" />
                    </div>
                    <div className="h-11 sm:h-12 bg-gray-200 rounded-xl w-full" />
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
              
              {/* Agency card */}
              <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/40 overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-500 h-full flex flex-col">
                {/* Header with gradient or cover image */}
                <div
                  className={`h-36 sm:h-40 relative overflow-hidden ${
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
                        animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                        animationDelay: `${i * 0.3}s`
                      }}
                    />
                  ))}

                  {/* Logo */}
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center overflow-hidden shadow-lg ring-2 ring-white/30">
                      {agency.logo ? (
                        <img src={agency.logo} alt={agency.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl sm:text-3xl">{typeInfo.emoji}</span>
                      )}
                    </div>
                  </div>

                  {/* Featured Badge */}
                  <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 flex gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-white/25 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-lg">
                      <SparklesIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-300" />
                      <span className="text-white font-semibold text-xs sm:text-sm">Featured</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 sm:p-6 flex-1 flex flex-col">
                  <h3 className="text-lg sm:text-xl font-bold text-neutral-900 mb-2 group-hover:text-primary transition-colors duration-300 line-clamp-2 leading-tight">
                    {agency.name}
                  </h3>

                  <p className="text-xs sm:text-sm text-neutral-600 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-gradient-to-r from-purple-500 to-primary rounded-full animate-pulse flex-shrink-0" />
                    <span className="truncate">{typeInfo.label}</span>
                  </p>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5 flex-1">
                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-3 sm:p-4 text-center border border-primary/10">
                      <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">{agency.totalProperties || 0}</div>
                      <div className="text-xs sm:text-sm text-neutral-600 font-medium">Properties</div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 sm:p-4 text-center border border-purple-200">
                      <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1">{agency.totalAgents || 0}</div>
                      <div className="text-xs sm:text-sm text-neutral-600 font-medium">Agents</div>
                    </div>
                  </div>

                  {/* View Button */}
                  <button className="w-full bg-gradient-to-r from-primary to-primary-dark text-white py-3 sm:py-3.5 px-4 rounded-xl font-semibold text-sm sm:text-base hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 group/btn">
                    <span>View Agency</span>
                    <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover/btn:translate-x-1 transition-transform duration-300" />
                  </button>
                </div>

                {/* Magic corner accents - hidden on mobile for cleaner look */}
                <div className="hidden sm:block absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-purple-400/40 rounded-tl-xl" />
                <div className="hidden sm:block absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-blue-400/40 rounded-tr-xl" />
                <div className="hidden sm:block absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-purple-400/40 rounded-bl-xl" />
                <div className="hidden sm:block absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-blue-400/40 rounded-br-xl" />
              </div>
            </div>
              );
            })
          ) : (
            // Empty state
            <div className="col-span-full text-center py-12 sm:py-16">
              <div className="max-w-md mx-auto px-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                  <BuildingStorefrontIcon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
                </div>
                <p className="text-neutral-600 text-base sm:text-lg font-medium mb-2">No featured agencies available at the moment</p>
                <p className="text-neutral-500 text-sm">Check back soon for our featured partners!</p>
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
                Explore All Magical Agencies
                <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-primary rounded-xl blur opacity-0 group-hover:opacity-70 transition-opacity duration-500" />
            </button>

            <p className="text-neutral-500 text-xs sm:text-sm mt-4 sm:mt-6 flex items-center justify-center gap-2 px-4">
              <span className="animate-pulse">✨</span>
              <span className="hidden sm:inline">Each agency is carefully selected by our magical algorithms</span>
              <span className="sm:hidden">Carefully selected agencies</span>
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