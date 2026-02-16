import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Agent } from '@/types';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import StarRating from '@/components/shared/StarRating';
import DefaultAvatar from '@/components/shared/DefaultAvatar';
import {
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
import { cn } from '@/lib/utils';

interface AgentCardProps {
  agent: Agent;
  index?: number;
}

const AgentAvatar: React.FC<{ agent: Agent }> = ({ agent }) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { state } = useAppContext();

  // Use AppContext avatar if this agent is the current user (immediate propagation)
  const isCurrentUser = state.currentUser && (
    agent.userId === state.currentUser.id ||
    agent.id === state.currentUser.id ||
    agent._id === state.currentUser._id
  );
  const avatarUrl = isCurrentUser && state.currentUser?.avatarUrl
    ? state.currentUser.avatarUrl
    : agent.avatarUrl;

  if (!agent.avatarUrl || error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <DefaultAvatar gender={agent.gender} seed={agent.agentId || agent.id || agent.name} avatarOptions={agent.avatarOptions} show3d />
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 animate-pulse" />
      )}
      <img
        src={optimizeCloudinaryUrl(avatarUrl, { width: 192, quality: 'auto', crop: 'fill' })}
        alt={`${agent.name} - Real Estate Agent${agent.city ? ` in ${agent.city}` : ''}${agent.country ? `, ${agent.country}` : ''}`}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ aspectRatio: '1/1' }}
        width={192}
        height={192}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
        loading="lazy"
        decoding="async"
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

  useEffect(() => {
    let progressTimer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
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

  const getPriceRange = () => {
    if (agent.totalSalesValue && agent.propertiesSold > 0) {
      const avgPrice = agent.totalSalesValue / agent.propertiesSold;
      const minPrice = avgPrice * 0.5;
      const maxPrice = avgPrice * 1.8;
      return `${formatPrice(minPrice, '')} - ${formatPrice(maxPrice, '')}`;
    }
    return t('agents:card.contactForPricing');
  };

  const primarySpecialization = agent.specializations?.[0] || null;
  const testimonialCount = agent.testimonials?.length || 0;
  const isTeam = agent.agencyName && agent.agencyName !== 'Independent Agent';

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
      className={cn(
        'group relative rounded-3xl bg-white p-6 w-full overflow-visible',
        'shadow-[8px_8px_16px_rgba(0,0,0,0.08),-8px_-8px_16px_rgba(255,255,255,0.9)]',
        'transition-all duration-500 cursor-pointer',
        'hover:shadow-[12px_12px_24px_rgba(0,0,0,0.12),-12px_-12px_24px_rgba(255,255,255,1)]',
        'hover:scale-[1.02] hover:-translate-y-1',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      )}
      style={{ transitionDelay: `${index * 100}ms` }}
      onClick={handleSelectAgent}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top badges row */}
      <div className="flex items-start justify-between mb-4">
        {/* Performance score */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-xs font-bold text-blue-600 shadow-[3px_3px_6px_rgba(0,0,0,0.06),-3px_-3px_6px_rgba(255,255,255,0.8)] transition-all duration-300 group-hover:shadow-[1px_1px_3px_rgba(0,0,0,0.04),-1px_-1px_3px_rgba(255,255,255,0.6)] group-hover:text-blue-700">
          <ChartBarIcon className="w-3.5 h-3.5" />
          <span>{performanceScore}%</span>
          <ArrowTrendingUpIcon className="w-3 h-3 text-blue-400" />
        </div>

        {/* Status & verified */}
        <div className="flex items-center gap-2">
          {agent.licenseVerified && (
            <div className="rounded-full bg-blue-500 p-1 shadow-[2px_2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-[0_0_12px_rgba(59,130,246,0.4)]">
              <CheckBadgeIcon className="h-3.5 w-3.5 text-white" />
            </div>
          )}
          <div className="relative">
            <div
              className={cn(
                'h-3 w-3 rounded-full border-2 border-white transition-all duration-300 group-hover:scale-125',
                (agent.activeListings || 0) > 0
                  ? 'bg-green-500 group-hover:shadow-[0_0_12px_rgba(34,197,94,0.5)]'
                  : 'bg-gray-400'
              )}
            />
            {(agent.activeListings || 0) > 0 && (
              <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500 animate-ping opacity-30" />
            )}
          </div>
        </div>
      </div>

      {/* Avatar — pops out of frame on hover */}
      <div className="mb-4 flex justify-center relative z-20" style={{ marginTop: '-8px' }}>
        <div className="relative transition-transform duration-500 ease-out group-hover:scale-[1.25] group-hover:-translate-y-3">
          {/* Shadow underneath for floating effect */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-black/10 rounded-full blur-md transition-all duration-500 group-hover:w-12 group-hover:bg-black/15 group-hover:-bottom-4" />
          <div className="h-24 w-24 overflow-hidden rounded-full bg-white p-1 shadow-[4px_4px_10px_rgba(0,0,0,0.12),-4px_-4px_10px_rgba(255,255,255,0.9)] transition-all duration-500 group-hover:shadow-[6px_8px_20px_rgba(0,0,0,0.2),-4px_-4px_12px_rgba(255,255,255,1)]">
            <div className="relative w-full h-full rounded-full overflow-hidden">
              <AgentAvatar agent={agent} />
            </div>
          </div>
          {/* Glow ring on hover */}
          <div className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-all duration-500" />
        </div>
      </div>

      {/* Name & role */}
      <div className="text-center transition-transform duration-300 group-hover:-translate-y-0.5">
        <h3 className="text-lg font-semibold text-gray-900 transition-colors duration-300 group-hover:text-blue-600">
          {agent.name}
        </h3>
        {primarySpecialization && (
          <p className="mt-1 text-sm text-gray-500 transition-colors duration-300 group-hover:text-gray-700">
            {primarySpecialization}
          </p>
        )}
      </div>

      {/* Location */}
      {(agent.address || agent.city || agent.country || agent.serviceAreas?.[0] || agent.officeAddress) && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <MapPinIcon className="w-3.5 h-3.5 text-blue-500 transition-transform duration-300 group-hover:scale-110" />
          <p className="text-xs font-medium text-gray-500 group-hover:text-blue-600 transition-colors duration-300 truncate max-w-[200px]">
            {agent.address || [agent.city, agent.country].filter(Boolean).join(', ') || agent.serviceAreas?.[0] || agent.officeAddress}
          </p>
        </div>
      )}

      {/* Rating */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <StarRating rating={agent.rating} className="w-4 h-4" />
        {agent.rating > 0 ? (
          <span className="text-sm font-semibold text-gray-800">{agent.rating.toFixed(1)}</span>
        ) : null}
        <span className="text-xs text-gray-400">
          ({testimonialCount} {testimonialCount === 1 ? t('agents:card.review') : t('agents:card.reviews')})
        </span>
      </div>

      {/* Tags */}
      <div className="mt-3 flex justify-center gap-2 flex-wrap">
        {agent.specializations?.slice(0, 2).map((spec, i) => (
          <span
            key={i}
            className={cn(
              'inline-block rounded-full bg-white px-3 py-1 text-xs font-medium',
              'shadow-[2px_2px_4px_rgba(0,0,0,0.04),-2px_-2px_4px_rgba(255,255,255,0.8)]',
              'transition-all duration-300 group-hover:scale-105',
              i === 0
                ? 'text-blue-600 group-hover:bg-blue-50 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.2)]'
                : 'text-gray-600 group-hover:bg-gray-50'
            )}
          >
            {spec}
          </span>
        ))}
        {(agent.specializations?.length || 0) > 2 && (
          <span className="inline-block rounded-full bg-white px-2 py-1 text-xs text-gray-400 shadow-[2px_2px_4px_rgba(0,0,0,0.04),-2px_-2px_4px_rgba(255,255,255,0.8)]">
            +{(agent.specializations?.length || 0) - 2}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="relative my-4">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transform scale-0 group-hover:scale-100 transition-transform duration-500" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        {/* Price range */}
        <div className="rounded-2xl bg-white p-3 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.04),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] transition-all duration-300 group-hover:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.03),inset_-1px_-1px_2px_rgba(255,255,255,0.6)]">
          <div className="flex items-center gap-1.5 mb-1">
            <CurrencyDollarIcon className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('agents:card.priceRange')}</span>
          </div>
          <p className="text-xs font-bold text-blue-700 truncate">{getPriceRange()}</p>
        </div>

        {/* Sales */}
        <div className="rounded-2xl bg-white p-3 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.04),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] transition-all duration-300 group-hover:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.03),inset_-1px_-1px_2px_rgba(255,255,255,0.6)]">
          <div className="flex items-center gap-1.5 mb-1">
            <HomeIcon className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('agents:card.sales')}</span>
            {agent.propertiesSold > 10 && (
              <TrophyIcon className="w-3 h-3 text-amber-500" />
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-gray-900">{agent.propertiesSold}</span>
            <span className="text-[10px] text-blue-500 font-semibold">+{Math.floor(agent.propertiesSold * 0.3)}%</span>
          </div>
        </div>

        {/* Active listings */}
        <div className="rounded-2xl bg-white p-3 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.04),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] transition-all duration-300 group-hover:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.03),inset_-1px_-1px_2px_rgba(255,255,255,0.6)]">
          <div className="flex items-center gap-1.5 mb-1">
            <HomeIcon className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('agents:card.active')}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-gray-900">{agent.activeListings || 0}</span>
            <span className="text-[10px] text-blue-500 font-semibold">
              {(agent.activeListings || 0) > 5 ? t('agents:card.hot') : t('agents:card.available')}
            </span>
          </div>
        </div>

        {/* Agency badge or performance mini */}
        {isTeam ? (
          <button
            onClick={handleAgencyClick}
            className="rounded-2xl bg-white p-3 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.04),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] transition-all duration-300 hover:shadow-[1px_1px_3px_rgba(0,0,0,0.04),-1px_-1px_3px_rgba(255,255,255,0.6)] hover:scale-[0.97] active:scale-95 text-left"
          >
            <div className="flex items-center gap-1.5 mb-1">
              {agent.agencyLogo ? (
                <div className="w-4 h-4 rounded overflow-hidden flex-shrink-0">
                  <img
                    src={optimizeCloudinaryUrl(agent.agencyLogo, { width: 40, quality: 'auto', crop: 'fill' })}
                    alt={`${agent.agencyName} logo`}
                    loading="lazy"
                    decoding="async"
                    width={16}
                    height={16}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <BuildingOfficeIcon className="w-3.5 h-3.5 text-gray-500" />
              )}
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('agents:card.agencyRates')}</span>
            </div>
            <p className="text-xs font-bold text-gray-800 truncate">{agent.agencyName}</p>
          </button>
        ) : (
          <div className="rounded-2xl bg-white p-3 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.04),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]">
            <div className="flex items-center gap-1.5 mb-1">
              <BoltIcon className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('agents:card.performanceScore')}</span>
            </div>
            <p className="text-xs font-bold text-blue-700">{performanceScore}%</p>
          </div>
        )}
      </div>

      {/* Performance progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            {t('agents:card.performanceScore')}
          </span>
          <span className="text-xs font-bold text-blue-600">{performanceScore}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.06)] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000 ease-out"
            style={{
              width: progressAnimated ? `${performanceScore}%` : '0%',
              boxShadow: isHovered ? '0 0 8px rgba(59, 130, 246, 0.4)' : 'none'
            }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-5 flex gap-2">
        <button
          className="flex-1 rounded-full bg-white py-3 text-sm font-semibold text-blue-600 shadow-[4px_4px_8px_rgba(0,0,0,0.06),-4px_-4px_8px_rgba(255,255,255,0.8)] transition-all duration-300 hover:shadow-[2px_2px_4px_rgba(0,0,0,0.04),-2px_-2px_4px_rgba(255,255,255,0.6)] hover:scale-[0.97] active:scale-95 group-hover:bg-blue-50 flex items-center justify-center gap-2"
          onClick={handleSelectAgent}
        >
          <span>{t('agents:card.viewProfile')}</span>
          <ChevronRightIcon className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Animated border on hover */}
      <div className="absolute inset-0 rounded-3xl border border-blue-200 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </div>
  );
};

export default React.memo(AgentCard);
