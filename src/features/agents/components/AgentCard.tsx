import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Agent } from '@/types';
import StarRating from '@/components/shared/StarRating';
import {
  UserCircleIcon,
  BuildingOfficeIcon,
  CheckBadgeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  HomeIcon,
  ChevronRightIcon,
  ChartBarIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  BoltIcon
} from '@/constants';
import { useAppContext } from '@/context/AppContext';
import { formatPrice } from '@/utils/currency';
import { slugify } from '@/utils/slug';
import { API_URL } from '@/src/shared/api/config';

interface AgentCardProps {
  agent: Agent;
  index?: number;
}

const AgentAvatar: React.FC<{ agent: Agent }> = ({ agent }) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Fallback placeholder when no avatar or on error
  if (!agent.avatarUrl || error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <UserCircleIcon className="w-8 h-8 sm:w-10 sm:h-10 text-blue-300" />
      </div>
    );
  }

  return (
    <>
      {/* Loading placeholder */}
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 animate-pulse" />
      )}
      <img
        src={agent.avatarUrl}
        alt={agent.name}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ aspectRatio: '1/1' }}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
        loading="lazy"
        draggable={false}
      />
    </>
  );
};

const AgentCard: React.FC<AgentCardProps> = ({ agent, index = 0 }) => {
  const { t } = useTranslation(['agents', 'common']);
  const { dispatch } = useAppContext();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [progressAnimated, setProgressAnimated] = useState(false);

  // Intersection Observer for scroll animations
  useEffect(() => {
    let progressTimer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Delay progress bar animation for smoother effect
          progressTimer = setTimeout(() => setProgressAnimated(true), 300 + index * 100);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      observer.disconnect();
      if (progressTimer) clearTimeout(progressTimer);
    };
  }, [index]);

  // Calculate price range from agent's sold properties
  const getPriceRange = () => {
    if (agent.totalSalesValue && agent.propertiesSold > 0) {
      const avgPrice = agent.totalSalesValue / agent.propertiesSold;
      const minPrice = avgPrice * 0.5;
      const maxPrice = avgPrice * 1.8;
      return `${formatPrice(minPrice, '')} - ${formatPrice(maxPrice, '')}`;
    }
    return t('agents:card.contactForPricing');
  };

  // Get first specialization for display
  const primarySpecialization = agent.specializations?.[0] || null;

  // Calculate testimonial count
  const testimonialCount = agent.testimonials?.length || 0;

  // Check if agent is part of a team/agency
  const isTeam = agent.agencyName && agent.agencyName !== 'Independent Agent';

  // Calculate performance score (0-100)
  const calculatePerformanceScore = () => {
    const ratingScore = (agent.rating / 5) * 40;
    const salesScore = Math.min(agent.propertiesSold * 2, 30);
    const listingsScore = Math.min((agent.activeListings || 0) * 3, 30);
    return Math.round(ratingScore + salesScore + listingsScore);
  };

  const performanceScore = calculatePerformanceScore();

  const handleSelectAgent = () => {
    const agentIdentifier = agent.agentId || agent.id;
    dispatch({ type: 'SET_SELECTED_AGENT', payload: agentIdentifier });
    window.history.pushState({}, '', `/agents/${agentIdentifier}`);
  };

  const handleAgencyClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!agent.agencyName || agent.agencyName === 'Independent Agent') {
      return;
    }

    const agencyIdentifier = agent.agencyId || slugify(agent.agencyName);

    try {
      const response = await fetch(`${API_URL}/agencies/${agencyIdentifier}`);

      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: data.agency });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencyDetail' });
        let urlSlug = data.agency.slug || data.agency._id;
        urlSlug = urlSlug.replace(',', '/');
        window.history.pushState({}, '', `/agencies/${urlSlug}`);
      }
    } catch (error) {
      // Error removed
    }
  };

  return (
    <div
      ref={cardRef}
      className={`
        relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/5
        border border-white/50 hover:border-blue-300/50 hover:shadow-xl hover:shadow-blue-500/10
        transition-all duration-500 cursor-pointer overflow-hidden group
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}
      style={{
        transitionDelay: `${index * 100}ms`,
        animation: isVisible ? 'cardGlow 6s ease-in-out infinite alternate' : 'none'
      }}
      onClick={handleSelectAgent}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Subtle blue background gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      {/* Animated border effect - blue */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-blue-200/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      
      {/* Agency Badge - Top Right - Compact & Visible */}
      {isTeam && (
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={handleAgencyClick}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700"
          >
            {agent.agencyLogo ? (
              <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0 bg-white/10">
                <img
                  src={agent.agencyLogo}
                  alt={agent.agencyName}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <BuildingOfficeIcon className="w-4 h-4 text-slate-300" />
            )}
            <span className="text-[11px] text-white font-semibold max-w-[100px] sm:max-w-[120px] truncate">{agent.agencyName}</span>
            <ChevronRightIcon className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      )}

      {/* Performance Score Badge - Top Left */}
      <div className="absolute top-3 left-3 z-10">
        <div className="relative group/score">
          <div className="absolute inset-0 bg-blue-500 rounded-full blur opacity-50 group-hover/score:opacity-80 transition-opacity duration-300" />
          <div className="relative bg-gradient-to-b from-blue-600/90 to-blue-700/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-blue-500/20 border border-white/20">
            <ChartBarIcon className="w-3.5 h-3.5" />
            <span>{performanceScore}%</span>
            <ArrowTrendingUpIcon className="w-3 h-3 ml-1 text-blue-200" />
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 relative z-0">
        {/* Agent Avatar and Info */}
        <div className="flex flex-col items-center text-center mb-6">
          {/* Avatar container - outer wrapper for positioning badge */}
          <div className="relative mb-4">
            {/* Avatar image container - Fixed static dimensions */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden flex-shrink-0 shadow-lg ring-4 ring-white bg-gradient-to-br from-blue-50 to-blue-100">
              <AgentAvatar agent={agent} />
            </div>

            {/* Premier Agent Badge - positioned outside overflow-hidden */}
            <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20" />
                <div className="relative bg-gradient-to-br from-blue-600 to-blue-700 rounded-full p-1.5 sm:p-2 shadow-xl">
                  <CheckBadgeIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Rating Badge - Glass effect with blue accents */}
          <div className="relative group/rating">
            <div className="absolute -inset-1 bg-blue-100 rounded-xl blur opacity-0 group-hover/rating:opacity-100 transition-opacity duration-300" />
            <div className="relative bg-white/80 backdrop-blur-md px-4 py-3 rounded-xl shadow-sm border border-white/50">
              <div className="flex items-center justify-center gap-2">
                <div className="flex items-center">
                  <StarRating rating={agent.rating} className="w-5 h-5 text-amber-400" />
                </div>
                {agent.rating > 0 ? (
                  <div className="flex flex-col items-start">
                    <span className="text-base font-bold text-gray-900">
                      {agent.rating.toFixed(1)}
                      <span className="text-xs text-blue-600 font-semibold ml-1">★</span>
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5">
                      {testimonialCount} {testimonialCount === 1 ? t('agents:card.review') : t('agents:card.reviews')}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500 italic">{t('agents:card.noReviews')}</span>
                )}
              </div>
            </div>
          </div>

          {/* Agent Name with blue hover */}
          <h3 className="text-2xl font-bold text-gray-900 mt-4 mb-2 group-hover:text-blue-700 transition-colors duration-300">
            {agent.name}
          </h3>

          {/* Location with blue animation - Glass Badge */}
          {(agent.address || agent.city || agent.country || agent.serviceAreas?.[0] || agent.officeAddress) && (
            <div className="flex items-center justify-center gap-2 mt-2 group/location px-4 py-2 bg-gradient-to-r from-blue-50/80 to-blue-100/80 backdrop-blur-sm rounded-xl border border-blue-200/50">
              <MapPinIcon className="w-4 h-4 text-blue-600 transform group-hover/location:scale-110 transition-transform duration-300" />
              <p className="text-sm font-semibold text-blue-700 group-hover/location:text-blue-800 transition-colors text-center">
                {agent.address || [agent.city, agent.country].filter(Boolean).join(', ') || agent.serviceAreas?.[0] || agent.officeAddress}
              </p>
            </div>
          )}

          {/* Specialization Badge - Glass effect */}
          {primarySpecialization && (
            <div className="flex items-center justify-center gap-2 mt-2 group/spec px-3 py-1.5 bg-gradient-to-r from-purple-50/80 to-purple-100/80 backdrop-blur-sm rounded-xl border border-purple-200/50">
              <BoltIcon className="w-3.5 h-3.5 text-purple-600" />
              <p className="text-xs font-semibold text-purple-700">
                {primarySpecialization}
              </p>
              {agent.specializations && agent.specializations.length > 1 && (
                <span className="text-xs text-purple-500">+{agent.specializations.length - 1}</span>
              )}
            </div>
          )}
        </div>

        {/* Animated Divider - Blue */}
        <div className="relative my-5">
          <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transform scale-0 group-hover:scale-100 transition-transform duration-500" />
        </div>

        {/* Stats Grid */}
        <div className="space-y-4">
          {/* Price Range Card - Glass effect blue */}
          <div className="relative group/price">
            <div className="absolute -inset-0.5 bg-blue-100 rounded-xl blur opacity-0 group-hover/price:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-blue-50/80 backdrop-blur-sm rounded-xl p-4 border border-blue-100/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                  <CurrencyDollarIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {t('agents:card.priceRange')}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-blue-700">
                  {getPriceRange()}
                </span>
                {isTeam && (
                  <span className="text-xs text-blue-600 font-semibold px-2 py-1 bg-blue-100 rounded-full">
                    {t('agents:card.agencyRates')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sales Stats Grid - Clean professional design */}
          <div className="grid grid-cols-2 gap-3">
            {/* Recent Sales */}
            <div className="group/sales relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl opacity-0 group-hover/sales:opacity-100 transition-opacity duration-300" />
              <div className="relative bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 group-hover/sales:border-blue-200/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <HomeIcon className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{t('agents:card.sales')}</span>
                  </div>
                  {agent.propertiesSold > 10 && (
                    <TrophyIcon className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">
                    {agent.propertiesSold}
                  </span>
                  <span className="text-xs text-blue-600 font-semibold">
                    +{Math.floor(agent.propertiesSold * 0.3)}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{t('agents:card.last12Months')}</p>
              </div>
            </div>

            {/* Active Listings */}
            <div className="group/listings relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl opacity-0 group-hover/listings:opacity-100 transition-opacity duration-300" />
              <div className="relative bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 group-hover/listings:border-blue-200/50 transition-all duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <HomeIcon className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{t('agents:card.active')}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">
                    {agent.activeListings || 0}
                  </span>
                  <span className="text-xs text-blue-600 font-semibold">
                    {(agent.activeListings || 0) > 5 ? t('agents:card.hot') : t('agents:card.available')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{t('agents:card.currentListings')}</p>
              </div>
            </div>
          </div>

          {/* Agency Sales Badge - Glass blue theme */}
          {isTeam && agent.city && (
            <div className="relative group/agencyBadge">
              <div className="absolute inset-0 bg-blue-100 rounded-xl blur opacity-0 group-hover/agencyBadge:opacity-50 transition-opacity duration-500" />
              <div className="relative bg-gradient-to-r from-blue-50/80 to-blue-100/80 backdrop-blur-sm rounded-xl p-3 border border-blue-200/50">
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">
                    {t('agents:card.agencyNetwork')}
                  </span>
                </div>
                <p className="text-blue-900 mt-1">
                  <span className="text-xl font-bold">{agent.propertiesSold * 3}</span>
                  <span className="text-sm font-medium ml-2">{t('agents:card.combinedSales', { city: agent.city })}</span>
                </p>
              </div>
            </div>
          )}

          {/* Performance Progress Bar - Animated */}
          <div className="relative group/performance mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t('agents:card.performanceScore')}
              </span>
              <span className="text-sm font-bold text-blue-600">{performanceScore}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: progressAnimated ? `${performanceScore}%` : '0%',
                  boxShadow: isHovered ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* CTA Button - Glass blue */}
        <div className="mt-6">
          <button
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600/90 to-blue-700/90 backdrop-blur-sm text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 border border-white/10 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group/button"
            onClick={handleSelectAgent}
          >
            <span>{t('agents:card.viewProfile')}</span>
            <ChevronRightIcon className="w-4 h-4 transform group-hover/button:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentCard;