import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import { BuildingStorefrontIcon, SparklesIcon, ArrowRightIcon, MapPinIcon } from '../constants';
import { useFeaturedAgencies } from '../src/features/agencies/hooks/useAgencies';
import { Agency } from '../types';

const FeaturedAgencies: React.FC = () => {
  const { t } = useTranslation('agencies');
  const { dispatch } = useAppContext();
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

  // Color gradients for agency cards
  const cardStyles = [
    { gradient: "from-violet-600 via-purple-600 to-indigo-700", accent: "violet" },
    { gradient: "from-rose-500 via-pink-500 to-fuchsia-600", accent: "rose" },
    { gradient: "from-amber-500 via-orange-500 to-red-500", accent: "amber" },
    { gradient: "from-emerald-500 via-teal-500 to-cyan-600", accent: "emerald" },
  ];

  // Get agency type badge info
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
      className="relative py-12 sm:py-16 lg:py-20 overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-50 via-white to-neutral-50" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className={`text-center mb-10 sm:mb-14 transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
            <SparklesIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">{t('featured.badge')}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4">
            {t('featured.title')}
          </h2>

          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            {t('featured.subtitle')}
          </p>
        </div>

        {/* Agencies Grid - 2 columns on larger screens for bigger cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="animate-pulse">
                <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
                  <div className="h-48 sm:h-56 bg-gradient-to-br from-gray-200 to-gray-300" />
                  <div className="p-6 sm:p-8 space-y-4">
                    <div className="h-6 bg-gray-200 rounded-lg w-2/3" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="flex gap-8 pt-4">
                      <div className="space-y-2">
                        <div className="h-8 w-16 bg-gray-200 rounded" />
                        <div className="h-3 w-20 bg-gray-200 rounded" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-8 w-16 bg-gray-200 rounded" />
                        <div className="h-3 w-20 bg-gray-200 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : agencies.length > 0 ? (
            agencies.map((agency, index) => {
              const typeInfo = getAgencyTypeInfo(agency.type);
              const style = cardStyles[index % cardStyles.length];

              return (
                <div
                  key={agency._id}
                  className={`group transition-all duration-700 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${0.2 + index * 0.15}s` }}
                  onClick={() => handleAgencyClick(agency)}
                >
                  <div className="relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden cursor-pointer group-hover:-translate-y-2">
                    {/* Header with gradient or cover image */}
                    <div className="relative h-48 sm:h-56 overflow-hidden">
                      {(agency as any).coverImage ? (
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${(agency as any).coverImage})` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        </div>
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient}`}>
                          {/* Decorative pattern */}
                          <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-4 right-4 w-32 h-32 border-4 border-white/30 rounded-full" />
                            <div className="absolute bottom-4 left-4 w-24 h-24 border-4 border-white/20 rounded-full" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-4 border-white/10 rounded-full" />
                          </div>
                        </div>
                      )}

                      {/* Type Badge */}
                      <div className="absolute top-4 left-4">
                        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full">
                          <span className="text-lg">{typeInfo.emoji}</span>
                          <span className="text-white text-sm font-medium">{typeInfo.label}</span>
                        </div>
                      </div>

                      {/* Featured Badge */}
                      <div className="absolute top-4 right-4">
                        <div className="flex items-center gap-1.5 bg-amber-400 text-amber-900 px-3 py-1.5 rounded-full shadow-lg">
                          <SparklesIcon className="w-4 h-4" />
                          <span className="text-sm font-bold">{t('featured.badge')}</span>
                        </div>
                      </div>

                      {/* Logo */}
                      <div className="absolute -bottom-10 left-6 sm:left-8">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center overflow-hidden ring-4 ring-white">
                          {agency.logo ? (
                            <img
                              src={agency.logo}
                              alt={agency.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${style.gradient} flex items-center justify-center`}>
                              <BuildingStorefrontIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="pt-14 sm:pt-16 px-6 sm:px-8 pb-6 sm:pb-8">
                      {/* Agency Name & Location */}
                      <div className="mb-6">
                        <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-2 group-hover:text-primary transition-colors">
                          {agency.name}
                        </h3>
                        {agency.city && (
                          <div className="flex items-center gap-1.5 text-neutral-500">
                            <MapPinIcon className="w-4 h-4" />
                            <span className="text-sm">{agency.city}{agency.country ? `, ${agency.country}` : ''}</span>
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-8 sm:gap-12 mb-6 pb-6 border-b border-neutral-100">
                        <div>
                          <div className="text-3xl sm:text-4xl font-bold text-primary">
                            {agency.totalProperties || 0}
                          </div>
                          <div className="text-sm text-neutral-500 font-medium">
                            {t('featured.properties')}
                          </div>
                        </div>
                        <div className="w-px h-12 bg-neutral-200" />
                        <div>
                          <div className="text-3xl sm:text-4xl font-bold text-purple-600">
                            {agency.totalAgents || 0}
                          </div>
                          <div className="text-sm text-neutral-500 font-medium">
                            {t('featured.agents')}
                          </div>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <button className="w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-primary text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 group-hover:shadow-lg">
                        <span>{t('featured.viewAgency')}</span>
                        <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            // Empty state
            <div className="col-span-full text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center">
                  <BuildingStorefrontIcon className="w-12 h-12 text-gray-400" />
                </div>
                <p className="text-neutral-600 text-lg font-medium mb-2">{t('featured.empty.title')}</p>
                <p className="text-neutral-500 text-sm">{t('featured.empty.message')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Explore All Button */}
        {agencies.length > 0 && (
          <div className={`text-center mt-12 sm:mt-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`} style={{ transitionDelay: '1s' }}>
            <button
              onClick={handleExploreAll}
              className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-purple-600 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <SparklesIcon className="w-5 h-5" />
              <span>{t('featured.exploreAll')}</span>
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <p className="text-neutral-500 text-sm mt-6">
              {t('featured.selectedByAlgorithm')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedAgencies;
