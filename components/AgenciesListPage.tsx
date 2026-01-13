import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Agency } from '../types';
import { Agent } from '../types';
import { Property } from '../types';
import { getAgencies } from '../services/apiService';
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
  AcademicCapIcon
} from '../constants';
import { useAppContext } from '../context/AppContext';
import Footer from './shared/Footer';
import { SEO } from '../src/components/seo';
import HeroSearchSection from './shared/HeroSearchSection';

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
    dispatch({ type: 'TOGGLE_ENTERPRISE_MODAL', payload: true });
  };

  const handleViewAgency = (agency: Agency) => {
    dispatch({ type: 'SET_SELECTED_AGENCY', payload: agency._id });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencyDetail' });
    let urlSlug = agency.slug || agency._id;
    urlSlug = urlSlug.replace(',', '/');
    window.history.pushState({}, '', `/agencies/${urlSlug}`);
  };

  const getRankColor = (index: number) => {
    if (index === 0) return 'bg-gradient-to-br from-yellow-500 via-yellow-400 to-yellow-600';
    if (index === 1) return 'bg-gradient-to-br from-gray-400 via-gray-300 to-gray-500';
    if (index === 2) return 'bg-gradient-to-br from-orange-500 via-orange-400 to-orange-600';
    return 'bg-gradient-to-br from-primary via-primary-light to-primary-dark';
  };

  const renderAgencyCard = (agency: Agency, index: number, isCompact: boolean = false) => (
    <div
      key={agency._id}
      onClick={() => handleViewAgency(agency)}
      className="group relative bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-primary/30 active:scale-[0.99]"
    >
      {/* Cover Image or Gradient */}
      <div className={`relative ${isCompact ? 'h-24' : 'h-28 sm:h-32'}`}>
        {(agency as any).coverImage ? (
          <img
            src={(agency as any).coverImage}
            alt={`${agency.name} cover`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (agency as any).coverGradient ? (
          <div className={`w-full h-full bg-gradient-to-br ${(agency as any).coverGradient}`} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/80 via-primary to-primary-dark" />
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex items-center gap-1.5">
          {agency.isFeatured && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-500 text-white rounded-full text-[10px] sm:text-xs font-semibold shadow-lg">
              <SparklesIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden xs:inline">{t('agencies.featured')}</span>
            </span>
          )}
        </div>

        {/* Rank badge */}
        {index < 10 && (
          <div className={`absolute -bottom-3 sm:-bottom-4 left-3 sm:left-4 w-8 h-8 sm:w-10 sm:h-10 ${getRankColor(index)} rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-lg ring-2 sm:ring-4 ring-white`}>
            {index + 1}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`p-3 sm:p-4 ${isCompact ? 'pt-4' : 'pt-5 sm:pt-6'}`}>
        {/* Logo and Name row */}
        <div className="flex items-start gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
          {/* Logo */}
          <div className={`${isCompact ? 'w-10 h-10' : 'w-11 h-11 sm:w-14 sm:h-14'} rounded-lg sm:rounded-xl bg-white flex items-center justify-center overflow-hidden border-2 border-gray-100 shadow-sm flex-shrink-0`}>
            {agency.logo ? (
              <img src={agency.logo} alt={agency.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <BuildingOfficeIcon className={`${isCompact ? 'w-5 h-5' : 'w-5 h-5 sm:w-7 sm:h-7'} text-primary`} />
            )}
          </div>

          {/* Name and Location */}
          <div className="flex-1 min-w-0">
            <h3 className={`${isCompact ? 'text-sm' : 'text-base sm:text-lg'} font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-1 mb-0.5 sm:mb-1`}>
              {agency.name}
            </h3>
            <div className="flex items-center gap-1 sm:gap-1.5 text-gray-500">
              <MapPinIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
              <span className={`${isCompact ? 'text-xs' : 'text-xs sm:text-sm'} truncate`}>
                {agency.city}, {agency.country}
              </span>
            </div>
          </div>

          {/* Arrow - hidden on very small screens */}
          <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5 sm:mt-1 hidden xs:block" />
        </div>

        {/* Stats Row - Responsive */}
        <div className={`flex items-center justify-between py-2 sm:py-3 px-0.5 sm:px-1 mb-2.5 sm:mb-3 border-y border-gray-100 ${isCompact ? 'gap-2' : ''}`}>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
            <div className={`${isCompact ? 'w-6 h-6' : 'w-7 h-7 sm:w-8 sm:h-8'} bg-blue-50 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0`}>
              <HomeIcon className={`${isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5 sm:w-4 sm:h-4'} text-blue-600`} />
            </div>
            <div className="min-w-0">
              <div className={`font-bold text-gray-900 ${isCompact ? 'text-xs' : 'text-sm sm:text-base'}`}>{agency.totalProperties || 0}</div>
              <div className={`${isCompact ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'} text-gray-500 uppercase tracking-wide truncate`}>{t('agencies.properties')}</div>
            </div>
          </div>

          <div className="w-px h-6 sm:h-8 bg-gray-200 flex-shrink-0" />

          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 justify-center">
            <div className={`${isCompact ? 'w-6 h-6' : 'w-7 h-7 sm:w-8 sm:h-8'} bg-green-50 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0`}>
              <UsersIcon className={`${isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5 sm:w-4 sm:h-4'} text-green-600`} />
            </div>
            <div className="min-w-0">
              <div className={`font-bold text-gray-900 ${isCompact ? 'text-xs' : 'text-sm sm:text-base'}`}>{agency.totalAgents || 0}</div>
              <div className={`${isCompact ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'} text-gray-500 uppercase tracking-wide truncate`}>{t('agencies.agents')}</div>
            </div>
          </div>

          <div className="w-px h-6 sm:h-8 bg-gray-200 flex-shrink-0" />

          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 justify-end">
            <div className={`${isCompact ? 'w-6 h-6' : 'w-7 h-7 sm:w-8 sm:h-8'} bg-purple-50 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0`}>
              <CalendarIcon className={`${isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5 sm:w-4 sm:h-4'} text-purple-600`} />
            </div>
            <div className="min-w-0">
              <div className={`font-bold text-gray-900 ${isCompact ? 'text-xs' : 'text-sm sm:text-base'}`}>{agency.yearsInBusiness || 0}+</div>
              <div className={`${isCompact ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'} text-gray-500 uppercase tracking-wide truncate`}>{t('agencies.years')}</div>
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {agency.phone && (
              <a
                href={`tel:${agency.phone}`}
                onClick={(e) => e.stopPropagation()}
                className={`${isCompact ? 'w-8 h-8' : 'w-9 h-9 sm:w-10 sm:h-10'} flex items-center justify-center bg-gray-50 hover:bg-blue-50 active:bg-blue-100 text-gray-600 hover:text-blue-600 rounded-lg sm:rounded-xl transition-colors border border-gray-200 hover:border-blue-200`}
                aria-label={t('agencies.call')}
              >
                <PhoneIcon className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              </a>
            )}
            {agency.email && (
              <a
                href={`mailto:${agency.email}`}
                onClick={(e) => e.stopPropagation()}
                className={`${isCompact ? 'w-8 h-8' : 'w-9 h-9 sm:w-10 sm:h-10'} flex items-center justify-center bg-gray-50 hover:bg-green-50 active:bg-green-100 text-gray-600 hover:text-green-600 rounded-lg sm:rounded-xl transition-colors border border-gray-200 hover:border-green-200`}
                aria-label={t('agencies.email')}
              >
                <EnvelopeIcon className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              </a>
            )}
            {(agency as any).website && (
              <a
                href={(agency as any).website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`${isCompact ? 'w-8 h-8' : 'w-9 h-9 sm:w-10 sm:h-10'} flex items-center justify-center bg-gray-50 hover:bg-purple-50 active:bg-purple-100 text-gray-600 hover:text-purple-600 rounded-lg sm:rounded-xl transition-colors border border-gray-200 hover:border-purple-200 hidden xs:flex`}
                aria-label={t('agencies.website')}
              >
                <GlobeAltIcon className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              </a>
            )}
          </div>

          <button className={`${isCompact ? 'px-3 py-2 text-xs' : 'px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm'} bg-primary hover:bg-primary-dark active:bg-primary-dark text-white rounded-lg sm:rounded-xl font-semibold transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md`}>
            {t('agencies.view')}
            <ChevronRightIcon className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
          </button>
        </div>
      </div>
    </div>
  );

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* SEO Meta Tags */}
      <SEO
        title="Real Estate Agencies in the Balkans"
        description={`Discover ${agencies.length}+ trusted real estate agencies across Serbia, Montenegro, Croatia, Bosnia, and the Balkans. Find professional agencies to help with your property needs.`}
        canonical={`${typeof window !== 'undefined' ? window.location.origin : ''}/agencies`}
        type="website"
      />

      {/* Add CSS animations */}
      <style>{cssAnimations}</style>

      {/* Hero Section with Integrated Search */}
      <HeroSearchSection
        badge={t('agencies.badge')}
        title={t('agencies.heroTitle')}
        titleHighlight={t('agencies.heroTitleHighlight')}
        subtitle={t('agencies.heroSubtitle')}
        searchTitle={t('agencies.findIdealAgency')}
        searchSubtitle={t('agencies.searchAgencies', { count: agencies.length })}
        searchPlaceholder={t('agencies.universalSearchPlaceholder', 'Search by name, city, country, or specialty...')}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearch={fetchAgencies}
        popularSearches={['Belgrade', 'Zagreb', 'Luxury', 'Tirana', 'Commercial', 'Residential']}
        popularSearchesLabel={t('agencies.popularSearches')}
        stats={[
          { icon: 'building', count: agencies.length, label: t('agencies.professionalAgencies'), color: 'green' },
          { icon: 'users', count: totalStats.totalAgents, label: t('agencies.expertAgents'), color: 'blue' },
          { icon: 'home', count: totalStats.totalProperties.toLocaleString(), label: t('agencies.listedProperties'), color: 'purple' }
        ]}
        mousePosition={mousePosition}
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
              <div className="bg-gradient-to-br from-red-50 to-white rounded-3xl border-2 border-red-100 p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center">
                  <span className="text-4xl">⚠️</span>
                </div>
                <h3 className="text-2xl font-bold text-red-900 mb-3">{t('agencies.unableToLoad')}</h3>
                <p className="text-red-700 mb-6 max-w-md mx-auto">{error}</p>
                <button
                  onClick={fetchAgencies}
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-3 rounded-2xl font-semibold hover:shadow-lg transition-all"
                >
                  {t('agencies.tryAgain')}
                </button>
              </div>
            ) : loading ? (
              <div className="bg-white rounded-3xl border-2 border-gray-100 p-16">
                <div className="max-w-md mx-auto">
                  <div className="w-32 h-32 mx-auto mb-6 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-dark rounded-full opacity-20 animate-ping"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-dark rounded-full flex items-center justify-center">
                      <MagnifyingGlassIcon className="w-16 h-16 text-white animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-center text-gray-900 mb-3">
                    {t('agencies.findingAgencies')}
                  </h3>
                  <p className="text-center text-gray-600">
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
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl border-2 border-gray-200 p-16 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-40 h-40 mx-auto mb-6 relative">
                    <div className="absolute inset-0 bg-gray-200 rounded-2xl flex items-center justify-center transform rotate-6 transition-transform group-hover:rotate-12">
                      <BuildingOfficeIcon className="w-20 h-20 text-gray-400" />
                    </div>
                    <div className="absolute top-0 right-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center animate-bounce">
                      <SparklesIcon className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {searchQuery ? t('agencies.noAgenciesFound') :
                     filter === 'myAgency' ? t('agencies.noAgencyFound') : t('agencies.noAgenciesYet')}
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    {searchQuery
                      ? t('agencies.adjustCriteria')
                      : filter === 'myAgency'
                        ? t('agencies.noAgencyCreated')
                        : t('agencies.beFirstAgency')}
                  </p>
                  <button
                    onClick={handleCreateEnterprise}
                    className="inline-flex items-center gap-3 bg-gradient-to-r from-primary to-primary-dark text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-xl hover:scale-105 transition-all"
                  >
                    <BuildingOfficeIcon className="w-5 h-5" />
                    {t('agencies.createAgency')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {/* Top Agencies - Full width cards */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6">
                  {agencies.slice(0, 3).map((agency, index) => (
                    <div key={agency._id}>
                      {renderAgencyCard(agency, index)}
                    </div>
                  ))}
                </div>

                {/* Remaining Agencies - Responsive Grid */}
                {agencies.length > 3 && (
                  <>
                    <div className="my-6 sm:my-10">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center">
                          <span className="px-4 sm:px-6 bg-gray-50 text-gray-500 text-xs sm:text-sm font-medium rounded-full">
                            {t('agencies.moreAgencies')}
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