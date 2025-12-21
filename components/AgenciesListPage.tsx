import React, { useState, useEffect, useMemo } from 'react';
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

type SearchTab = 'city' | 'name';

const AgenciesListPage: React.FC = () => {
  const { dispatch, state } = useAppContext();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'featured' | 'myAgency'>('all');
  const [sortBy, setSortBy] = useState<'properties' | 'agents' | 'years' | 'name'>('properties');
  
  // New search state
  const [searchTab, setSearchTab] = useState<SearchTab>('city');
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
          city: searchTab === 'city' && searchQuery ? searchQuery : undefined,
          name: searchTab === 'name' && searchQuery ? searchQuery : undefined,
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
      setError('Unable to load agencies. Please try again later.');
      setAgencies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEnterprise = () => {
    dispatch({ type: 'TOGGLE_ENTERPRISE_MODAL', payload: true });
  };

  const handleViewAgency = (agency: Agency) => {
    dispatch({ type: 'SET_SELECTED_AGENCY', payload: agency });
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

  const renderAgencyCard = (agency: Agency, index: number) => (
    <div
      key={agency._id}
      onClick={() => handleViewAgency(agency)}
      className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer overflow-hidden border border-gray-100"
    >
      {/* Gradient Accent */}
      <div className={`absolute top-0 left-0 w-2 h-full ${getRankColor(index)}`} />

      {/* Cover Image or Gradient - Optional */}
      {(agency as any).coverImage ? (
        <div className="h-32 overflow-hidden">
          <img
            src={(agency as any).coverImage}
            alt={`${agency.name} cover`}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>
      ) : (agency as any).coverGradient ? (
        <div className={`h-32 bg-gradient-to-br ${(agency as any).coverGradient}`} />
      ) : null}

      <div className="pl-2.5 pr-3 sm:pl-4 sm:pr-6 py-3 sm:py-4 md:py-6">
        <div className="flex items-start gap-2 sm:gap-3 md:gap-4 lg:gap-6">
          {/* Logo Container */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg group-hover:scale-105 transition-transform duration-300">
              {agency.logo ? (
                <img
                  src={agency.logo}
                  alt={agency.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <BuildingOfficeIcon className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-primary" />
              )}
            </div>

            {/* Rank Badge */}
            {index < 3 && (
              <div className={`absolute -top-2 -left-2 w-10 h-10 ${getRankColor(index)} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ring-4 ring-white`}>
                {index + 1}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 flex-wrap">
                  <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-2">
                    {agency.name}
                  </h3>
                  {agency.isFeatured && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 rounded-full text-xs font-semibold border border-amber-200">
                      <SparklesIcon className="w-3 h-3" />
                      Featured
                    </span>
                  )}
                  {(agency as any).certifications?.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-green-50 to-green-100 text-green-800 rounded-full text-xs font-semibold border border-green-200">
                      <CheckBadgeIcon className="w-3 h-3" />
                      Certified
                    </span>
                  )}
                </div>

                {/* Location */}
                <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 mb-2 sm:mb-3 min-w-0">
                  <MapPinIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">
                    {agency.address && `${agency.address}, `}
                    {agency.city}, {agency.country}
                    {(agency as any).zipCode && ` ${(agency as any).zipCode}`}
                  </span>
                </div>

                {/* Specialties */}
                {(agency as any).specialties?.length > 0 && (
                  <div className="flex items-start gap-2 mb-3">
                    <AcademicCapIcon className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      {(agency as any).specialties.slice(0, 3).map((spec: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
                          {spec}
                        </span>
                      ))}
                      {(agency as any).specialties.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                          +{(agency as any).specialties.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <ChevronRightIcon className="w-6 h-6 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
            </div>

            {/* Description */}
            {agency.description && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                {agency.description}
              </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 sm:p-2.5 bg-blue-50 rounded-lg sm:rounded-xl ring-2 ring-blue-100 flex-shrink-0">
                  <HomeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm sm:text-base md:text-lg text-gray-900">{agency.totalProperties || 0}</div>
                  <div className="text-xs text-gray-500">Properties</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-2 sm:p-2.5 bg-green-50 rounded-lg sm:rounded-xl ring-2 ring-green-100 flex-shrink-0">
                  <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm sm:text-base md:text-lg text-gray-900">{agency.totalAgents || 0}</div>
                  <div className="text-xs text-gray-500">Agents</div>
                </div>
              </div>

              {agency.yearsInBusiness ? (
                <div className="flex items-center gap-2">
                  <div className="p-2 sm:p-2.5 bg-purple-50 rounded-lg sm:rounded-xl ring-2 ring-purple-100 flex-shrink-0">
                    <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm sm:text-base md:text-lg text-gray-900">{agency.yearsInBusiness}+</div>
                    <div className="text-xs text-gray-500">Years</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="p-2 sm:p-2.5 bg-amber-50 rounded-lg sm:rounded-xl ring-2 ring-amber-100 flex-shrink-0">
                    <ShieldCheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm sm:text-base md:text-lg text-gray-900">{(agency as any).certifications?.length || 0}</div>
                    <div className="text-xs text-gray-500">Certs</div>
                  </div>
                </div>
              )}
            </div>

            {/* Contact & Social Links */}
            <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {agency.phone && (
                  <a
                    href={`tel:${agency.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded-lg text-xs sm:text-sm transition-all border border-gray-200 hover:border-blue-300"
                  >
                    <PhoneIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline font-medium">Call</span>
                  </a>
                )}
                {agency.email && (
                  <a
                    href={`mailto:${agency.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 bg-gray-50 hover:bg-green-50 text-gray-700 hover:text-green-600 rounded-lg text-xs sm:text-sm transition-all border border-gray-200 hover:border-green-300"
                  >
                    <EnvelopeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline font-medium">Email</span>
                  </a>
                )}
                {(agency as any).website && (
                  <a
                    href={(agency as any).website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 bg-gray-50 hover:bg-purple-50 text-gray-700 hover:text-purple-600 rounded-lg text-xs sm:text-sm transition-all border border-gray-200 hover:border-purple-300"
                  >
                    <GlobeAltIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline font-medium">Website</span>
                  </a>
                )}
              </div>

              <button className="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold hover:shadow-xl hover:scale-105 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0">
                <span className="hidden xs:inline">View Profile</span>
                <span className="xs:hidden">View</span>
                <ChevronRightIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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
  `;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Add CSS animations */}
      <style>{cssAnimations}</style>

      {/* Hero Section with Integrated Search */}
      <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-white w-full">
        {/* Subtle geometric pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Hero Content */}
        <div className="relative w-full pt-8 pb-16 lg:pt-12 lg:pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Main Title Section */}
            <div className="text-center max-w-4xl mx-auto mb-8 animate-fade-in-up">
              <div className="inline-flex items-center justify-center px-4 py-2 bg-primary/10 rounded-full mb-6">
                <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                  Premier Real Estate Networks
                </span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-neutral-900 mb-6 leading-tight">
                Top Real Estate
                <span className="block mt-3 animate-gradient-x">
                  Agencies in Balkans
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
                Connect with professional agencies that bring expertise, trust, and results to your property journey.
              </p>
            </div>

            {/* Search Section - Integrated into Hero */}
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl border border-neutral-100 p-6 sm:p-8 animate-fade-in-up animation-delay-200 mt-8">
              <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-2">
                  Find Your Ideal Agency
                </h2>
                <p className="text-neutral-600 text-sm sm:text-base">
                  Search {agencies.length} + professional agencies across the Balkans
                </p>
              </div>

              {/* Search Tabs */}
              <div className="flex gap-2 mb-6 p-1.5 bg-neutral-100 rounded-2xl w-fit mx-auto">
                <button
                  onClick={() => setSearchTab('city')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-300 relative min-w-[120px] sm:min-w-[140px] ${
                    searchTab === 'city'
                      ? 'text-white shadow-lg'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-white'
                  }`}
                  style={{
                    background: searchTab === 'city' 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' 
                      : 'transparent'
                  }}
                >
                  <span className="flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base">
                    <MapPinIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    City
                  </span>
                </button>
                <button
                  onClick={() => setSearchTab('name')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-300 relative min-w-[120px] sm:min-w-[140px] ${
                    searchTab === 'name'
                      ? 'text-white shadow-lg'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-white'
                  }`}
                  style={{
                    background: searchTab === 'name' 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' 
                      : 'transparent'
                  }}
                >
                  <span className="flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base">
                    <BuildingOfficeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    Agency Name
                  </span>
                </button>
              </div>

              {/* Search Input */}
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">
                  <MagnifyingGlassIcon className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${
                    searchQuery ? 'text-primary scale-110' : 'text-neutral-400'
                  }`} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchTab === 'city' 
                    ? 'Search by city or location...' 
                    : "Search by agency name..."}
                  className="w-full pl-12 pr-32 sm:pl-14 sm:pr-40 py-3 sm:py-4 border-2 border-neutral-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-white text-base sm:text-lg placeholder:text-neutral-500"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-1 sm:p-2 hover:bg-neutral-100 rounded-lg transition-all duration-200"
                      title="Clear search"
                    >
                      <span className="text-neutral-400 hover:text-neutral-600 text-sm">
                        ✕
                      </span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      fetchAgencies();
                    }}
                    className="px-2.5 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-primary to-primary-dark text-white font-bold rounded-lg hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm md:text-base whitespace-nowrap"
                    aria-label="Search agencies"
                  >
                    <MagnifyingGlassIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 flex-shrink-0" />
                    <span className="hidden xs:inline">Search</span>
                  </button>
                </div>
              </div>

              {/* Quick Search Suggestions */}
              {!searchQuery && (
                <div className="mb-4">
                  <p className="text-center text-xs sm:text-sm text-neutral-600 mb-3">
                    Popular searches:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {searchTab === 'city' ? (
                      <>
                        <button
                          onClick={() => setSearchQuery('Belgrade')}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 hover:border-primary hover:bg-primary/5 hover:text-primary text-neutral-700 rounded-lg transition-all duration-300 font-medium"
                        >
                          Belgrade
                        </button>
                        <button
                          onClick={() => setSearchQuery('Zagreb')}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 hover:border-primary hover:bg-primary/5 hover:text-primary text-neutral-700 rounded-lg transition-all duration-300 font-medium"
                        >
                          Zagreb
                        </button>
                        <button
                          onClick={() => setSearchQuery('Sarajevo')}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 hover:border-primary hover:bg-primary/5 hover:text-primary text-neutral-700 rounded-lg transition-all duration-300 font-medium"
                        >
                          Sarajevo
                        </button>
                        <button
                          onClick={() => setSearchQuery('Tirana')}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 hover:border-primary hover:bg-primary/5 hover:text-primary text-neutral-700 rounded-lg transition-all duration-300 font-medium"
                        >
                         Tirana
                        </button>
                        <button
                          onClick={() => setSearchQuery('Athina')}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 hover:border-primary hover:bg-primary/5 hover:text-primary text-neutral-700 rounded-lg transition-all duration-300 font-medium"
                        >
                         Athina
                        </button>
                        <button
                          onClick={() => setSearchQuery('Sofia')}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 hover:border-primary hover:bg-primary/5 hover:text-primary text-neutral-700 rounded-lg transition-all duration-300 font-medium"
                        >
                         Sofia
                        </button>
                        <button
                          onClick={() => setSearchQuery('Skopje')}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 hover:border-primary hover:bg-primary/5 hover:text-primary text-neutral-700 rounded-lg transition-all duration-300 font-medium"
                        >
                         Skopje
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setSearchQuery('Top Rated')}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 hover:border-primary hover:bg-primary/5 hover:text-primary text-neutral-700 rounded-lg transition-all duration-300 font-medium"
                        >
                          Top Rated
                        </button>
                        <button
                          onClick={() => setSearchQuery('Luxury')}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 hover:border-primary hover:bg-primary/5 hover:text-primary text-neutral-700 rounded-lg transition-all duration-300 font-medium"
                        >
                          Luxury Specialists
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Live Stats */}
              <div className="pt-6 border-t border-neutral-200/50">
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm sm:text-base">
                  <div className="flex items-center gap-3 bg-gradient-to-br from-green-50 to-emerald-50 px-5 py-4 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-green-100">
                    <div className="p-2.5 bg-green-500 rounded-xl shadow-md">
                      <BuildingOfficeIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-2xl sm:text-3xl text-neutral-900">{agencies.length}</div>
                      <div className="text-green-700 text-xs sm:text-sm font-medium">Professional Agencies</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-gradient-to-br from-blue-50 to-indigo-50 px-5 py-4 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-blue-100">
                    <div className="p-2.5 bg-blue-500 rounded-xl shadow-md">
                      <UsersIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-2xl sm:text-3xl text-neutral-900">{totalStats.totalAgents}</div>
                      <div className="text-blue-700 text-xs sm:text-sm font-medium">Expert Agents</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-gradient-to-br from-purple-50 to-violet-50 px-5 py-4 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-purple-100">
                    <div className="p-2.5 bg-purple-500 rounded-xl shadow-md">
                      <HomeIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-2xl sm:text-3xl text-neutral-900">{totalStats.totalProperties.toLocaleString()}</div>
                      <div className="text-purple-700 text-xs sm:text-sm font-medium">Listed Properties</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full flex-grow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Filters Section - Simplified */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6 md:p-8 mb-8">
            <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-6 py-3 rounded-2xl font-medium transition-all flex items-center gap-2 ${
                    filter === 'all'
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FilterIcon className="w-4 h-4" />
                  All Agencies
                </button>
                <button
                  onClick={() => setFilter('featured')}
                  className={`px-6 py-3 rounded-2xl font-medium transition-all flex items-center gap-2 ${
                    filter === 'featured'
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <StarIcon className="w-4 h-4" />
                  Featured
                </button>
                {hasAgency && (
                  <button
                    onClick={() => setFilter('myAgency')}
                    className={`px-6 py-3 rounded-2xl font-medium transition-all flex items-center gap-2 ${
                      filter === 'myAgency'
                        ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <BuildingOfficeIcon className="w-4 h-4" />
                    My Agency
                  </button>
                )}
              </div>

              {/* Sort Options */}
              <div className="w-full lg:w-auto">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full lg:w-auto bg-gray-50 border-0 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                >
                  <option value="properties">Most Properties</option>
                  <option value="agents">Most Agents</option>
                  <option value="years">Most Experienced</option>
                  <option value="name">Alphabetical</option>
                </select>
              </div>
            </div>
          </div>

          {/* Agencies Grid */}
          <div className="mb-12">
            {/* Stats Header */}
            <div className="mb-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
                    {filter === 'myAgency' ? 'Your Agency' : 
                     filter === 'featured' ? 'Featured Agencies' : 
                     'Top Real Estate Agencies'}
                  </h2>
                  <p className="text-neutral-600 text-sm sm:text-base">
                    {searchQuery 
                      ? `Showing ${agencies.length} agencies matching "${searchQuery}"`
                      : `Browse professional agencies with experienced teams`}
                  </p>
                </div>
                <div className="text-sm text-neutral-600">
                  <span className="font-bold text-primary">{agencies.length}</span> agencies found
                </div>
              </div>
              
              {agencies.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                      <TrophyIcon className="w-8 h-8 text-blue-600" />
                      <div>
                        <div className="text-3xl font-bold text-gray-900">
                          {Math.max(...agencies.map(a => a.totalProperties || 0))}
                        </div>
                        <div className="text-sm text-gray-600">Most Properties</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                      <UsersIcon className="w-8 h-8 text-green-600" />
                      <div>
                        <div className="text-3xl font-bold text-gray-900">
                          {Math.max(...agencies.map(a => a.totalAgents || 0))}
                        </div>
                        <div className="text-sm text-gray-600">Most Agents</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                      <CalendarIcon className="w-8 h-8 text-purple-600" />
                      <div>
                        <div className="text-3xl font-bold text-gray-900">
                          {Math.max(...agencies.map(a => a.yearsInBusiness || 0))}
                        </div>
                        <div className="text-sm text-gray-600">Most Experience</div>
                      </div>
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
                <h3 className="text-2xl font-bold text-red-900 mb-3">Unable to Load Agencies</h3>
                <p className="text-red-700 mb-6 max-w-md mx-auto">{error}</p>
                <button
                  onClick={fetchAgencies}
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-3 rounded-2xl font-semibold hover:shadow-lg transition-all"
                >
                  Try Again
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
                    Finding Agencies...
                  </h3>
                  <p className="text-center text-gray-600">
                    Searching through our network of professional real estate agencies
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
                    {searchQuery ? 'No Agencies Found' :
                     filter === 'myAgency' ? 'No Agency Found' : 'No Agencies Yet'}
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    {searchQuery
                      ? "Try adjusting your search criteria or browse all agencies."
                      : filter === 'myAgency'
                        ? "You haven't created an agency yet. Start your journey today!"
                        : "Be the first to create an agency and showcase your properties!"}
                  </p>
                  <button
                    onClick={handleCreateEnterprise}
                    className="inline-flex items-center gap-3 bg-gradient-to-r from-primary to-primary-dark text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-xl hover:scale-105 transition-all"
                  >
                    <BuildingOfficeIcon className="w-5 h-5" />
                    Create Agency
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Top 3 Agencies Highlight */}
                {agencies.slice(0, 3).map((agency, index) => (
                  <div key={agency._id} className="transform hover:scale-[1.01] transition-transform">
                    {renderAgencyCard(agency, index)}
                  </div>
                ))}
                
                {/* Remaining Agencies Grid */}
                {agencies.length > 3 && (
                  <>
                    <div className="my-10">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center">
                          <span className="px-6 bg-white text-gray-500 text-sm font-medium">
                            More Agencies
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {agencies.slice(3).map((agency, index) => (
                        renderAgencyCard(agency, index + 3)
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Create Your Agency CTA */}
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-white rounded-3xl border-2 border-primary/20 p-8 md:p-12 mb-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-primary-dark rounded-full mb-6">
                <BuildingOfficeIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-4">
                Ready to Grow Your Agency?
              </h3>
              <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
                Join our network of premier real estate agencies and get featured to thousands of potential clients.
                Showcase your properties, connect with buyers, and expand your reach.
              </p>
              <button
                onClick={handleCreateEnterprise}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-primary to-primary-dark text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-xl transition-all hover:scale-105"
              >
                <SparklesIcon className="w-5 h-5" />
                Create Your Agency Today
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