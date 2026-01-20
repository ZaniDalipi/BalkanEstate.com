import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Agency } from '../types';
import { Agent } from '../types';
import { Property } from '../types';
import { UserRole } from '../types';
import { getAgencies } from '../src/features/agencies/api';
import {
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  StarIcon,
  SearchIcon,
  FilterIcon,
  TrophyIcon,
  UsersIcon,
  HomeIcon,
  CalendarIcon,
  SparklesIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon
} from '../constants';
import { useAppContext } from '../context/AppContext';
import Footer from './shared/Footer';
import { SEO } from '../src/components/seo';
import AgenciesHeroBanner from './shared/AgenciesHeroBanner';
import { FloatingSphere, GlossyPill, AbstractBlob, RealEstateOrb, Decorative3DStyles } from './shared/Decorative3D';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const AgenciesListPage: React.FC = () => {
  const { t } = useTranslation(['agents']);
  const { dispatch, state } = useAppContext();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'featured' | 'myAgency'>('all');
  const [sortBy, setSortBy] = useState<'properties' | 'agents' | 'years' | 'name'>('properties');

  // Universal search state - searches across name, city, country, description, specialties
  const [searchQuery, setSearchQuery] = useState('');

  const currentUser = state.currentUser;
  const hasAgency = currentUser?.role === 'agent' && currentUser?.agencyId;

  // Check if user is an agent using multiple indicators (matches backend logic)
  const isUserAgent =
    currentUser?.availableRoles?.includes(UserRole.AGENT) ||
    currentUser?.role === UserRole.AGENT ||
    currentUser?.role === 'agent' ||
    !!currentUser?.agentId ||
    !!currentUser?.licenseNumber;

  // Calculate total stats from agencies data
  const totalStats = useMemo(() => {
    const totalAgents = agencies.reduce((sum, agency) => sum + (agency.totalAgents || 0), 0);
    const totalProperties = agencies.reduce((sum, agency) => sum + (agency.totalProperties || 0), 0);
    return { totalAgents, totalProperties };
  }, [agencies]);

  useEffect(() => {
    fetchAgencies();
  }, [filter, searchQuery, sortBy]);

  const fetchAgencies = async () => {
    try {
      setLoading(true);
      setError(null);

      if (filter === 'myAgency' && currentUser?.agencyId) {
        const response = await fetch(`${API_URL}/agencies/${currentUser.agencyId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('balkan_estate_token')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setAgencies([data.agency]);
        } else {
          setError(`Failed to load agency (${response.status})`);
          setAgencies([]);
        }
      } else {
        const response = await getAgencies({
          featured: filter === 'featured' ? true : undefined,
          search: searchQuery ? searchQuery : undefined, // Universal search across all fields
          limit: 50,
        });
        const fetchedAgencies = response.agencies || [];
        
        // Sort agencies
        const sortedAgencies = [...fetchedAgencies].sort((a, b) => {
          switch (sortBy) {
            case 'properties':
              return (b.totalProperties || 0) - (a.totalProperties || 0);
            case 'agents':
              return (b.totalAgents || 0) - (a.totalAgents || 0);
            case 'years':
              return (b.yearsInBusiness || 0) - (a.yearsInBusiness || 0);
            case 'name':
              return a.name.localeCompare(b.name);
            default:
              return 0;
          }
        });
        
        setAgencies(sortedAgencies);
      }
    } catch (error) {
      console.error('Failed to fetch agencies:', error);
      setError(t('agencies.unableToLoad'));
      setAgencies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEnterprise = () => {
    // Check if user is authenticated
    if (!state.isAuthenticated || !currentUser) {
      dispatch({
        type: 'SHOW_ALERT',
        payload: {
          type: 'warning',
          title: t('agencies.loginRequired', 'Login Required'),
          message: t('agencies.loginToCreateAgency', 'Please login to create an agency.'),
        },
      });
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
      return;
    }

    // Check if user already has an agency
    if (hasAgency) {
      dispatch({
        type: 'SHOW_ALERT',
        payload: {
          type: 'info',
          title: t('agencies.alreadyHaveAgency', 'You Already Have an Agency'),
          message: t('agencies.viewYourAgency', 'You are already part of an agency. View your agency from the filters above.'),
        },
      });
      setFilter('myAgency');
      return;
    }

    // Check if user is an agent
    if (!isUserAgent) {
      dispatch({
        type: 'SHOW_ALERT',
        payload: {
          type: 'warning',
          title: t('agencies.agentRequired', 'Agent Status Required'),
          message: t('agencies.becomeAgentFirst', 'You must be a registered agent to create an agency. Please update your profile to become an agent first.'),
        },
      });
      // Navigate to profile page where they can become an agent
      dispatch({ type: 'SET_ACCOUNT_TAB', payload: 'profile' });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
      return;
    }

    // User is an agent without an agency - open the enterprise modal
    dispatch({ type: 'TOGGLE_ENTERPRISE_MODAL', payload: true });
  };

  const handleViewAgency = (agency: Agency) => {
    dispatch({ type: 'SET_SELECTED_AGENCY', payload: agency._id });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencyDetail' });
    let urlSlug = agency.slug || agency._id;
    urlSlug = urlSlug.replace(',', '/');
    window.history.pushState({}, '', `/agencies/${urlSlug}`);
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return { bg: 'from-amber-400 to-amber-600', text: '1st', emoji: '🏆' };
    if (index === 1) return { bg: 'from-slate-300 to-slate-500', text: '2nd', emoji: '🥈' };
    if (index === 2) return { bg: 'from-orange-400 to-orange-600', text: '3rd', emoji: '🥉' };
    return { bg: 'from-primary to-primary-dark', text: `${index + 1}`, emoji: '' };
  };

  const renderAgencyCard = (agency: Agency, index: number, isCompact: boolean = false) => {
    const rankStyle = getRankStyle(index);
    const logoSize = isCompact ? 56 : 72; // Fixed pixel sizes for logo container

    return (
      <div
        key={agency._id}
        onClick={() => handleViewAgency(agency)}
        className="group relative bg-white rounded-2xl sm:rounded-3xl shadow-md hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden border border-gray-100 hover:border-primary/40 active:scale-[0.98]"
      >
        {/* Modern gradient accent */}
        <div className={`h-1 sm:h-1.5 bg-gradient-to-r ${index < 3 ? rankStyle.bg : 'from-primary via-blue-500 to-violet-500'}`} />

        <div className="p-4 sm:p-6">
          {/* Header Row */}
          <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-5">
            {/* Logo Container - STRICTLY fixed dimensions */}
            <div className="relative flex-shrink-0">
              <div
                className="relative rounded-xl sm:rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden border-2 border-white shadow-lg group-hover:shadow-xl transition-all duration-300"
                style={{
                  width: `${logoSize}px`,
                  height: `${logoSize}px`,
                  minWidth: `${logoSize}px`,
                  minHeight: `${logoSize}px`,
                  maxWidth: `${logoSize}px`,
                  maxHeight: `${logoSize}px`
                }}
              >
                {agency.logo ? (
                  <img
                    src={agency.logo}
                    alt={agency.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <BuildingOfficeIcon className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                  </div>
                )}
              </div>
              {/* Rank badge */}
              {index < 10 && (
                <div className={`absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gradient-to-r ${rankStyle.bg} rounded-lg text-white text-[9px] sm:text-[10px] font-bold shadow-lg flex items-center gap-0.5 sm:gap-1`}>
                  {rankStyle.emoji && <span className="text-xs">{rankStyle.emoji}</span>}
                  <span>#{index + 1}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                <h3 className={`${isCompact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'} font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-1`}>
                  {agency.name}
                </h3>
                {agency.isFeatured && (
                  <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full text-[9px] sm:text-[10px] font-bold shadow-sm flex-shrink-0">
                    <SparklesIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span className="hidden xs:inline">Featured</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-gray-500">
                <MapPinIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/60 flex-shrink-0" />
                <span className="text-xs sm:text-sm truncate">{agency.city}, {agency.country}</span>
              </div>

              {/* Quick contact - visible only on larger screens */}
              {agency.phone && (
                <div className="hidden sm:flex items-center gap-2 mt-2">
                  <a
                    href={`tel:${agency.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors"
                  >
                    <PhoneIcon className="w-3 h-3" />
                    <span>{agency.phone}</span>
                  </a>
                </div>
              )}
            </div>

            <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
          </div>

          {/* Stats Grid - Responsive */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center group/stat hover:from-blue-100 hover:to-blue-200/50 transition-colors">
              <div className="absolute -top-4 -right-4 w-10 h-10 sm:w-12 sm:h-12 bg-blue-200/30 rounded-full blur-xl" />
              <HomeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary mx-auto mb-0.5 sm:mb-1" />
              <div className="text-base sm:text-xl font-bold text-gray-900">{agency.totalProperties || 0}</div>
              <div className="text-[8px] sm:text-[10px] text-gray-500 font-medium uppercase tracking-wide">{t('agencies.properties')}</div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center group/stat hover:from-emerald-100 hover:to-emerald-200/50 transition-colors">
              <div className="absolute -top-4 -right-4 w-10 h-10 sm:w-12 sm:h-12 bg-emerald-200/30 rounded-full blur-xl" />
              <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 mx-auto mb-0.5 sm:mb-1" />
              <div className="text-base sm:text-xl font-bold text-gray-900">{agency.totalAgents || 0}</div>
              <div className="text-[8px] sm:text-[10px] text-gray-500 font-medium uppercase tracking-wide">{t('agencies.agents')}</div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center group/stat hover:from-violet-100 hover:to-violet-200/50 transition-colors">
              <div className="absolute -top-4 -right-4 w-10 h-10 sm:w-12 sm:h-12 bg-violet-200/30 rounded-full blur-xl" />
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600 mx-auto mb-0.5 sm:mb-1" />
              <div className="text-base sm:text-xl font-bold text-gray-900">{agency.yearsInBusiness || 0}+</div>
              <div className="text-[8px] sm:text-[10px] text-gray-500 font-medium uppercase tracking-wide">{t('agencies.years')}</div>
            </div>
          </div>

          {/* Action Row - Mobile optimized */}
          <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {agency.phone && (
                <a
                  href={`tel:${agency.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg sm:rounded-xl bg-gray-100 text-gray-600 hover:bg-primary hover:text-white transition-all active:scale-95"
                  aria-label={t('agencies.call')}
                >
                  <PhoneIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </a>
              )}
              {agency.email && (
                <a
                  href={`mailto:${agency.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg sm:rounded-xl bg-gray-100 text-gray-600 hover:bg-primary hover:text-white transition-all active:scale-95"
                  aria-label={t('agencies.email')}
                >
                  <EnvelopeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </a>
              )}
            </div>

            <button className="px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-primary to-blue-600 hover:from-primary-dark hover:to-blue-700 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg active:scale-95">
              {t('agencies.view')}
              <ChevronRightIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Mouse position state for parallax effect
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // CSS animations inline style
  const cssAnimations = `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes gradientX {
      0%, 100% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 100% 50%;
      }
    }

    @keyframes meshFloat {
      0%, 100% {
        transform: translateY(0) rotateX(0deg);
      }
      50% {
        transform: translateY(-5px) rotateX(2deg);
      }
    }

    .animate-fade-in-up {
      animation: fadeInUp 0.8s ease-out forwards;
    }

    .animate-gradient-x {
      background-size: 200% auto;
      background-image: linear-gradient(to right, #3b82f6, #8b5cf6, #3b82f6);
      animation: gradientX 3s ease infinite;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .mesh-3d {
      perspective: 1000px;
      transform-style: preserve-3d;
    }

    .mesh-layer {
      transition: transform 0.1s ease-out;
    }
  `;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 relative">
      {/* Include 3D animation styles */}
      <Decorative3DStyles />

      {/* 3D Decorative Background Elements with Real Estate Icons */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Top right - Building icon */}
        <div className="absolute -top-10 right-[5%] opacity-30 hidden lg:block">
          <RealEstateOrb size="xl" color="blue" icon="building" />
        </div>
        {/* Left side - House icon */}
        <div className="absolute bottom-[30%] -left-12 opacity-25 hidden lg:block">
          <RealEstateOrb size="lg" color="pink" icon="house" animate={false} />
        </div>
        {/* Abstract blob */}
        <div className="absolute top-[25%] left-[3%] opacity-15 hidden xl:block">
          <AbstractBlob variant={1} color="purple" />
        </div>
        {/* Right side pill */}
        <div className="absolute top-[50%] -right-8 opacity-25 hidden lg:block rotate-[15deg]">
          <GlossyPill orientation="vertical" size="lg" color="cyan" />
        </div>
        {/* Key icon */}
        <div className="absolute bottom-[20%] right-[15%] opacity-30 hidden md:block">
          <RealEstateOrb size="md" color="purple" icon="key" />
        </div>
        {/* Map pin */}
        <div className="absolute top-[60%] left-[10%] opacity-25 hidden lg:block">
          <RealEstateOrb size="sm" color="cyan" icon="pin" />
        </div>
        {/* Heart home */}
        <div className="absolute bottom-[45%] right-[3%] opacity-20 hidden xl:block">
          <RealEstateOrb size="md" color="peach" icon="heart" />
        </div>
        {/* Gradient overlays */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-200/15 via-purple-200/10 to-transparent rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-tl from-pink-200/10 via-rose-200/5 to-transparent rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
      </div>

      {/* SEO Meta Tags */}
      <SEO
        title="Real Estate Agencies in the Balkans"
        description={`Discover ${agencies.length}+ trusted real estate agencies across Serbia, Montenegro, Croatia, Bosnia, and the Balkans. Find professional agencies to help with your property needs.`}
        canonical={`${typeof window !== 'undefined' ? window.location.origin : ''}/agencies`}
        type="website"
      />

      {/* Add CSS animations */}
      <style>{cssAnimations}</style>

      {/* Hero Section - Special Agencies Banner */}
      <AgenciesHeroBanner
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearch={fetchAgencies}
        totalAgencies={agencies.length}
        totalAgents={totalStats.totalAgents}
        totalProperties={totalStats.totalProperties}
        popularSearches={['Belgrade', 'Zagreb', 'Luxury', 'Tirana', 'Commercial', 'Residential']}
      />

      {/* Main Content */}
      <main className="w-full flex-grow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Filters Section - Mobile Optimized */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md sm:shadow-xl border border-gray-200 p-4 sm:p-6 md:p-8 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 items-stretch sm:items-center justify-between">
              {/* Filter Tabs - Scrollable on mobile */}
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0 scrollbar-hide">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-medium transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-sm sm:text-base flex-shrink-0 ${
                    filter === 'all'
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  <FilterIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {t('agencies.filterAll')}
                </button>
                <button
                  onClick={() => setFilter('featured')}
                  className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-medium transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-sm sm:text-base flex-shrink-0 ${
                    filter === 'featured'
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  <StarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {t('agencies.filterFeatured')}
                </button>
                {hasAgency && (
                  <button
                    onClick={() => setFilter('myAgency')}
                    className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-medium transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-sm sm:text-base flex-shrink-0 ${
                      filter === 'myAgency'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                    }`}
                  >
                    <BuildingOfficeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {t('agencies.filterMyAgency')}
                  </button>
                )}
              </div>

              {/* Sort Options */}
              <div className="w-full sm:w-auto">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full sm:w-auto bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:ring-2 focus:ring-primary focus:bg-white focus:border-primary transition-all"
                >
                  <option value="properties">{t('agencies.sortMostProperties')}</option>
                  <option value="agents">{t('agencies.sortMostAgents')}</option>
                  <option value="years">{t('agencies.sortMostExperienced')}</option>
                  <option value="name">{t('agencies.sortAlphabetical')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Agencies Grid */}
          <div className="mb-8 sm:mb-12">
            {/* Header with inline count */}
            <div className="mb-5 sm:mb-8">
              <div className="flex items-center gap-3 mb-1.5 sm:mb-2">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-900">
                  {filter === 'myAgency' ? t('agencies.yourAgency') :
                   filter === 'featured' ? t('agencies.featuredAgencies') :
                   t('agencies.topRealEstateAgencies')}
                </h2>
                <span className="text-xs sm:text-sm text-white bg-primary px-2.5 py-1 rounded-full font-semibold">
                  {agencies.length}
                </span>
              </div>
              <p className="text-neutral-500 text-xs sm:text-sm">
                {searchQuery
                  ? t('agencies.showingMatching', { count: agencies.length, query: searchQuery })
                  : t('agencies.browseAgencies')}
              </p>

              {/* Stats Row - Compact horizontal */}
              {agencies.length > 0 && (
                <div className="flex items-center gap-4 sm:gap-6 mt-4 sm:mt-6 py-3 sm:py-4 px-4 sm:px-6 bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <TrophyIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-lg sm:text-xl font-bold text-gray-900 leading-none">
                        {Math.max(...agencies.map(a => a.totalProperties || 0))}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500">{t('agencies.mostProperties')}</div>
                    </div>
                  </div>

                  <div className="w-px h-8 bg-gray-200" />

                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-lg sm:text-xl font-bold text-gray-900 leading-none">
                        {Math.max(...agencies.map(a => a.totalAgents || 0))}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500">{t('agencies.mostAgents')}</div>
                    </div>
                  </div>

                  <div className="w-px h-8 bg-gray-200" />

                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-lg sm:text-xl font-bold text-gray-900 leading-none">
                        {Math.max(...agencies.map(a => a.yearsInBusiness || 0))}+
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500">{t('agencies.mostExperience')}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            {error ? (
              <div className="bg-gradient-to-br from-red-50 to-white rounded-2xl sm:rounded-3xl border-2 border-red-100 p-8 sm:p-12 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-red-900 mb-2 sm:mb-3">{t('agencies.unableToLoad')}</h3>
                <p className="text-red-700 mb-4 sm:mb-6 max-w-md mx-auto text-sm sm:text-base">{error}</p>
                <button
                  onClick={fetchAgencies}
                  className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-semibold hover:shadow-lg transition-all text-sm sm:text-base"
                >
                  {t('agencies.tryAgain')}
                </button>
              </div>
            ) : loading ? (
              <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-gray-100 p-10 sm:p-16">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 sm:mb-6 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-dark rounded-full opacity-20 animate-ping"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-dark rounded-full flex items-center justify-center">
                      <MagnifyingGlassIcon className="w-12 h-12 sm:w-16 sm:h-16 text-white animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-2 sm:mb-3">
                    {t('agencies.findingAgencies')}
                  </h3>
                  <p className="text-center text-gray-600 text-sm sm:text-base">
                    {t('agencies.searchingNetwork')}
                  </p>
                  <div className="flex justify-center gap-2 mt-4">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                  </div>
                </div>
              </div>
            ) : agencies.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl sm:rounded-3xl border-2 border-gray-200 p-10 sm:p-16 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-4 sm:mb-6 relative">
                    <div className="absolute inset-0 bg-gray-200 rounded-2xl flex items-center justify-center transform rotate-6">
                      <BuildingOfficeIcon className="w-16 h-16 sm:w-20 sm:h-20 text-gray-400" />
                    </div>
                    <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 bg-amber-100 rounded-full flex items-center justify-center animate-bounce">
                      <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                    {searchQuery ? t('agencies.noAgenciesFound') :
                     filter === 'myAgency' ? t('agencies.noAgencyFound') : t('agencies.noAgenciesYet')}
                  </h3>
                  <p className="text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto text-sm sm:text-base">
                    {searchQuery
                      ? t('agencies.adjustCriteria')
                      : filter === 'myAgency'
                        ? t('agencies.noAgencyCreated')
                        : t('agencies.beFirstAgency')}
                  </p>
                  <button
                    onClick={handleCreateEnterprise}
                    className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-primary to-primary-dark text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold hover:shadow-xl hover:scale-105 transition-all text-sm sm:text-base"
                  >
                    <BuildingOfficeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    {t('agencies.createAgency')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                {/* Featured Top 3 Agencies - Showcase Section */}
                {agencies.length >= 3 && (
                  <div className="mb-6 sm:mb-10">
                    <div className="flex items-center gap-2 mb-4 sm:mb-6">
                      <TrophyIcon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">{t('agencies.topAgencies', 'Top Agencies')}</h3>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                      {agencies.slice(0, 3).map((agency, index) => (
                        <div
                          key={agency._id}
                          className={index === 0 ? 'lg:col-span-1' : ''}
                        >
                          {renderAgencyCard(agency, index)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Other Agencies */}
                {agencies.length > 3 && (
                  <>
                    <div className="my-6 sm:my-8">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center">
                          <span className="px-4 sm:px-6 py-1.5 sm:py-2 bg-white text-gray-600 text-xs sm:text-sm font-semibold rounded-full border border-gray-200 shadow-sm">
                            {t('agencies.moreAgencies', 'More Agencies')} ({agencies.length - 3})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                      {agencies.slice(3).map((agency, index) => (
                        <div key={agency._id}>
                          {renderAgencyCard(agency, index + 3, true)}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* If less than 3 agencies, show them in a grid */}
                {agencies.length > 0 && agencies.length < 3 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {agencies.map((agency, index) => (
                      <div key={agency._id}>
                        {renderAgencyCard(agency, index)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Create Your Agency CTA */}
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-white rounded-2xl sm:rounded-3xl border border-primary/20 sm:border-2 p-6 sm:p-8 md:p-12 mb-6 sm:mb-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-primary to-primary-dark rounded-xl sm:rounded-full mb-4 sm:mb-6">
                <BuildingOfficeIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-900 mb-2 sm:mb-4">
                {t('agencies.readyToGrow')}
              </h3>
              <p className="text-neutral-600 mb-4 sm:mb-8 max-w-2xl mx-auto text-sm sm:text-base">
                {t('agencies.joinNetwork')}
              </p>
              <button
                onClick={handleCreateEnterprise}
                className="inline-flex items-center gap-2 sm:gap-3 bg-primary hover:bg-primary-dark text-white px-5 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold transition-all active:scale-95 text-sm sm:text-base"
              >
                <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                {t('agencies.createAgencyToday')}
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AgenciesListPage;