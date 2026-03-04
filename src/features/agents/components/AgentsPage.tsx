import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';
import { Agent, Agency } from '@/types';
import { getAllAgents, getAgencies } from '@/services/apiService';
import { getAgent } from '../api/agentApi';
import AgentCard from './AgentCard';
import AgentProfilePage from './AgentProfilePage';
import AgencyBadge from '@/components/shared/AgencyBadge';
import { MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon, UserGroupIcon, PhoneIcon, BuildingOfficeIcon, HomeIcon, UsersIcon } from '@/constants';
import Footer from '@/components/shared/Footer';
import { SEO } from '@/src/components/seo';
import { BALKAN_COUNTRIES } from '@/constants/countries';
import { FloatingSphere, GlossyPill, AbstractBlob, RealEstateOrb, Decorative3DStyles } from '@/components/shared/Decorative3D';
import AgentsHeroBanner from '@/components/shared/AgentsHeroBanner';
import { HERO_IMAGES } from '@/config/cloudinaryConfig';
import { apiRequest } from '@/src/shared/api';

type SortOption = 'rating' | 'experience' | 'sales' | 'recent' | 'name';
type SearchTab = 'all' | 'name' | 'location' | 'specialization';

const AgentsPage: React.FC = () => {
  const { t } = useTranslation(['agents', 'common']);
  const { state, dispatch } = useAppContext();
  const { getLocalizedPath } = useLocalizedNavigation();
  const { selectedAgentId } = state;

  // Universal search state - searches across name, city, country, specializations, languages, bio
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTab, setSearchTab] = useState<SearchTab>('all');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [visibleAgentsCount, setVisibleAgentsCount] = useState(9);
  const [fetchedAgent, setFetchedAgent] = useState<Agent | null>(null);
  const [fetchingAgent, setFetchingAgent] = useState(false);

  // Advanced filters
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    propertyTypes: [] as string[],
    minRating: 0,
    minExperience: 0,
    languages: [] as string[],
    priceRange: 'all' as 'all' | 'luxury' | 'mid' | 'affordable',
  });

  // Contact form state
  const [contactForm, setContactForm] = useState({
    email: '',
    phone: '',
    location: '',
    propertyDescription: ''
  });
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSubmitSuccess, setContactSubmitSuccess] = useState(false);
  const contactSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    // Fetch data on mount - no need to check activeView since this component
    // is only rendered when activeView is 'agents'
    fetchAgents();
    fetchAgencies();
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (contactSuccessTimerRef.current) {
        clearTimeout(contactSuccessTimerRef.current);
      }
    };
  }, []);

  const fetchAgents = async (searchTerm?: string) => {
    try {
      setLoading(true);
      const response = await getAllAgents({
        search: searchTerm || undefined,
        limit: 100,
      });
      setAgents(response.agents || []);
    } catch (error) {
      // Error removed
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering is now used for immediate results
  // The filteredAgents useMemo handles all search filtering
  // No need for debounced server calls since filtering is instant

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleAgentsCount(9);
  }, [searchQuery, searchTab]);

  // Fetch specific agent if selectedAgentId is set but not found in the list
  useEffect(() => {
    const fetchSpecificAgent = async () => {
      if (!selectedAgentId || loading) return;

      // Check if agent exists in the current list (by agentId, id, or userId)
      const existsInList = agents.some(a => a.agentId === selectedAgentId || a.id === selectedAgentId || a.userId === selectedAgentId);
      if (existsInList) {
        setFetchedAgent(null);
        return;
      }

      // Agent not in list, fetch it directly
      // Clear stale data immediately so the previous agent's image isn't shown
      setFetchedAgent(null);
      setFetchingAgent(true);
      try {
        const agent = await getAgent(selectedAgentId);
        setFetchedAgent(agent);
      } catch (error) {
        // Error removed
        setFetchedAgent(null);
      } finally {
        setFetchingAgent(false);
      }
    };

    fetchSpecificAgent();
  }, [selectedAgentId, agents, loading]);

  const fetchAgencies = async () => {
    try {
      const response = await getAgencies({ limit: 12 });
      setAgencies(response.agencies || []);
    } catch (error) {
      // Error removed
      setAgencies([]);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContact(true);

    try {
      await apiRequest('/agent-requests', {
        method: 'POST',
        body: contactForm,
      });

      setContactSubmitSuccess(true);
      setContactForm({
        email: '',
        phone: '',
        location: '',
        propertyDescription: ''
      });
      // Clear any existing timer before setting a new one
      if (contactSuccessTimerRef.current) {
        clearTimeout(contactSuccessTimerRef.current);
      }
      contactSuccessTimerRef.current = setTimeout(() => setContactSubmitSuccess(false), 5000);
    } catch (error) {
      // Error removed
      dispatch({
        type: 'SHOW_ALERT',
        payload: {
          type: 'error',
          title: t('common:error', 'Error'),
          message: t('common:errors.genericError', 'An error occurred. Please try again later.'),
        },
      });
    } finally {
      setIsSubmittingContact(false);
    }
  };

  // Helper function to check if agent matches location query
  const matchesLocation = (agent: Agent, query: string): boolean => {
    const q = query.toLowerCase().trim();

    // Direct field matches
    const city = (agent.city || '').toLowerCase();
    const country = (agent.country || '').toLowerCase();
    const officeAddress = (agent.officeAddress || '').toLowerCase();
    const serviceAreas = (agent.serviceAreas || []).map(s => s.toLowerCase());

    // Check direct matches
    if (city.includes(q) || country.includes(q) || officeAddress.includes(q)) {
      return true;
    }

    // Check service areas
    if (serviceAreas.some(area => area.includes(q))) {
      return true;
    }

    // Check country name variations using BALKAN_COUNTRIES
    for (const [key, data] of Object.entries(BALKAN_COUNTRIES)) {
      const countryName = data.name.toLowerCase();
      const countryCode = data.code.toLowerCase();

      // If query matches any country identifier
      if (q === countryName || q === countryCode || q === key ||
          countryName.includes(q) || q.includes(key.replace(/-/g, ' '))) {
        // Check if agent is in this country
        if (country === countryName || country === countryCode || country === key ||
            country.includes(key) || key.includes(country) ||
            serviceAreas.some(area =>
              area.includes(countryName) || area.includes(key) || area.includes(countryCode)
            )) {
          return true;
        }
      }
    }

    return false;
  };

  const filteredAgents = useMemo(() => {
    let result = [...agents];

    // Apply client-side search filtering (in addition to server-side)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();

      result = result.filter(agent => {
        const name = (agent.name || '').toLowerCase();
        const bio = (agent.bio || '').toLowerCase();
        const specializations = (agent.specializations || []).map(s => s.toLowerCase()).join(' ');
        const languages = (agent.languages || []).map(l => l.toLowerCase()).join(' ');

        // Based on selected tab, filter accordingly
        switch (searchTab) {
          case 'name':
            return name.includes(query);
          case 'location':
            return matchesLocation(agent, query);
          case 'specialization':
            return specializations.includes(query);
          case 'all':
          default:
            // Search across all fields
            return name.includes(query) ||
                   matchesLocation(agent, query) ||
                   specializations.includes(query) ||
                   languages.includes(query) ||
                   bio.includes(query);
        }
      });
    }

    // Apply advanced filters
    result = result.filter(agent => {
      // Property type filter
      if (filters.propertyTypes.length > 0) {
        const agentSpecs = (agent.specializations || []).map(s => s.toLowerCase());
        const hasMatch = filters.propertyTypes.some(type =>
          agentSpecs.some(spec => spec.includes(type.toLowerCase()))
        );
        if (!hasMatch) return false;
      }

      // Rating filter
      if (filters.minRating > 0) {
        const rating = agent.rating || 0;
        if (rating < filters.minRating) return false;
      }

      // Experience filter
      if (filters.minExperience > 0) {
        const experience = agent.yearsOfExperience || 0;
        if (experience < filters.minExperience) return false;
      }

      // Language filter
      if (filters.languages.length > 0) {
        const agentLangs = (agent.languages || []).map(l => l.toLowerCase());
        const hasMatch = filters.languages.some(lang =>
          agentLangs.includes(lang.toLowerCase())
        );
        if (!hasMatch) return false;
      }

      // Price range filter (based on average sale price)
      if (filters.priceRange !== 'all') {
        const avgPrice = agent.averageprice || 0;
        if (filters.priceRange === 'luxury' && avgPrice < 500000) return false;
        if (filters.priceRange === 'mid' && (avgPrice < 150000 || avgPrice > 500000)) return false;
        if (filters.priceRange === 'affordable' && avgPrice > 150000) return false;
      }

      return true;
    });

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'experience':
          return (b.yearsOfExperience || 0) - (a.yearsOfExperience || 0);
        case 'sales':
          return (b.propertiesSold || 0) - (a.propertiesSold || 0);
        case 'recent':
          // Sort by most recent activity (use a timestamp if available, otherwise keep order)
          return 0;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [agents, filters, sortBy, searchQuery, searchTab]);

  const selectedAgent = useMemo(() => {
    if (!selectedAgentId) return null;
    // First check the agents list (by agentId, id, or userId), then fall back to the fetched agent
    const fromList = agents.find(a => a.agentId === selectedAgentId || a.id === selectedAgentId || a.userId === selectedAgentId);
    return fromList || fetchedAgent;
  }, [selectedAgentId, agents, fetchedAgent]);

  // Calculate total active listings from all agents
  const totalActiveListings = useMemo(() => {
    return agents.reduce((sum, agent) => sum + (agent.activeListings || 0), 0);
  }, [agents]);

  const faqs = [
    {
      question: t('agents:faq.questions.findAgent.question'),
      answer: t('agents:faq.questions.findAgent.answer')
    },
    {
      question: t('agents:faq.questions.pickAgent.question'),
      answer: t('agents:faq.questions.pickAgent.answer')
    },
    {
      question: t('agents:faq.questions.contactAgent.question'),
      answer: t('agents:faq.questions.contactAgent.answer')
    },
    {
      question: t('agents:faq.questions.leaveReview.question'),
      answer: t('agents:faq.questions.leaveReview.answer')
    },
    {
      question: t('agents:faq.questions.agentVsBroker.question'),
      answer: t('agents:faq.questions.agentVsBroker.answer')
    }
  ];

  // Show agent profile if we have a selected agent
  if (selectedAgent) {
    return <AgentProfilePage key={selectedAgent.agentId || selectedAgent.id} agent={selectedAgent} />;
  }

  // Show loading if we're fetching a specific agent
  if (selectedAgentId && fetchingAgent) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-50 flex flex-col relative">
      {/* SEO Meta Tags */}
      <SEO
        title={t('agents:page.title')}
        description={t('agents:page.description', { count: agents.length })}
        canonical={`${typeof window !== 'undefined' ? window.location.origin : ''}/agents`}
        type="website"
      />

      {/* Include 3D animation styles */}
      <Decorative3DStyles />

      {/* 3D Decorative Background Elements with Real Estate Icons */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Top right - House icon */}
        <div className="absolute -top-10 right-[8%] opacity-30 hidden lg:block">
          <RealEstateOrb size="xl" color="cyan" icon="house" />
        </div>
        {/* Left side - Key icon */}
        <div className="absolute bottom-[35%] -left-10 opacity-25 hidden lg:block">
          <RealEstateOrb size="lg" color="blue" icon="key" animate={false} />
        </div>
        {/* Abstract blob */}
        <div className="absolute top-[30%] left-[5%] opacity-15 hidden xl:block">
          <AbstractBlob variant={2} color="pink" />
        </div>
        {/* Right side pill */}
        <div className="absolute top-[45%] -right-6 opacity-25 hidden lg:block rotate-[-10deg]">
          <GlossyPill orientation="vertical" size="lg" color="purple" />
        </div>
        {/* Building icon */}
        <div className="absolute bottom-[25%] right-[12%] opacity-30 hidden md:block">
          <RealEstateOrb size="md" color="purple" icon="building" />
        </div>
        {/* Map pin */}
        <div className="absolute top-[70%] left-[15%] opacity-25 hidden lg:block">
          <RealEstateOrb size="md" color="peach" icon="pin" />
        </div>
        {/* Heart home */}
        <div className="absolute bottom-[50%] right-[3%] opacity-20 hidden xl:block">
          <RealEstateOrb size="sm" color="pink" icon="heart" />
        </div>
        {/* Door icon */}
        <div className="absolute top-[15%] left-[12%] opacity-25 hidden lg:block">
          <RealEstateOrb size="sm" color="green" icon="door" />
        </div>
        {/* Gradient overlays */}
        <div className="absolute top-0 left-1/3 w-[450px] h-[450px] bg-gradient-to-br from-cyan-200/15 via-blue-200/10 to-transparent rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-0 right-1/3 w-[350px] h-[350px] bg-gradient-to-tl from-purple-200/15 via-pink-200/10 to-transparent rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Add CSS animations */}
      <style>{`
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
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.5);
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 1;
        }
        
        .animate-gradient-x {
          background-size: 200% auto;
          background-image: linear-gradient(to right, #3b82f6, #8b5cf6, #3b82f6);
          animation: gradientX 3s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-pulse-glow {
          animation: pulseGlow 2s ease-in-out infinite;
        }
        
        .animation-delay-100 {
          animation-delay: 100ms;
        }
        
        .animation-delay-200 {
          animation-delay: 200ms;
        }
        
        .animation-delay-300 {
          animation-delay: 300ms;
        }
        
        .animation-delay-500 {
          animation-delay: 500ms;
        }
        
        .glass-morphism {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .text-gradient {
          background: linear-gradient(to right, #ffffff, #f3f4f6);
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

        /* Hide scrollbar for search tabs */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Hero Section - Special Agents Banner */}
      <AgentsHeroBanner
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchTab={searchTab}
        onSearchTabChange={setSearchTab}
        totalAgents={agents.length}
        totalAgencies={agencies.length}
        totalProperties={totalActiveListings}
      />

      {/* Main Content */}
      <main className="w-full flex-grow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Filters and Sort Section */}
          <div className="mb-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
              {/* Top Row: Sort and Filters Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-gray-700">{t('agents:filters.sortBy')}</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="rating">{t('agents:filters.highestRated')}</option>
                    <option value="experience">{t('agents:filters.mostExperienced')}</option>
                    <option value="sales">{t('agents:filters.mostSales')}</option>
                    <option value="name">{t('agents:filters.nameAZ')}</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  {showFilters ? t('agents:filters.hideFilters') : t('agents:filters.showFilters')}
                  {(filters.propertyTypes.length > 0 || filters.minRating > 0 || filters.minExperience > 0 || filters.languages.length > 0 || filters.priceRange !== 'all') && (
                    <span className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {[filters.propertyTypes.length, filters.minRating > 0 ? 1 : 0, filters.minExperience > 0 ? 1 : 0, filters.languages.length, filters.priceRange !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)}
                    </span>
                  )}
                </button>
              </div>

              {/* Advanced Filters Panel */}
              {showFilters && (
                <div className="border-t border-gray-200 pt-4 space-y-4 animate-fade-in-up">
                  {/* Property Types */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t('agents:filters.specialization')}</label>
                    <div className="flex flex-wrap gap-2">
                      {['Luxury', 'Commercial', 'Residential', 'Investment', 'New Construction', 'Foreclosures'].map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            setFilters(prev => ({
                              ...prev,
                              propertyTypes: prev.propertyTypes.includes(type)
                                ? prev.propertyTypes.filter(t => t !== type)
                                : [...prev.propertyTypes, type]
                            }));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            filters.propertyTypes.includes(type)
                              ? 'bg-primary text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Rating Filter */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{t('agents:filters.minimumRating')}</label>
                      <select
                        value={filters.minRating}
                        onChange={(e) => setFilters(prev => ({ ...prev, minRating: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="0">{t('agents:filters.anyRating')}</option>
                        <option value="3">{t('agents:filters.stars', { count: 3 })}</option>
                        <option value="4">{t('agents:filters.stars', { count: 4 })}</option>
                        <option value="4.5">{t('agents:filters.stars', { count: 4.5 })}</option>
                      </select>
                    </div>

                    {/* Experience Filter */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{t('agents:filters.experience')}</label>
                      <select
                        value={filters.minExperience}
                        onChange={(e) => setFilters(prev => ({ ...prev, minExperience: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="0">{t('agents:filters.anyExperience')}</option>
                        <option value="1">{t('agents:filters.yearsPlus', { count: 1 })}</option>
                        <option value="3">{t('agents:filters.yearsPlus', { count: 3 })}</option>
                        <option value="5">{t('agents:filters.yearsPlus', { count: 5 })}</option>
                        <option value="10">{t('agents:filters.yearsPlus', { count: 10 })}</option>
                      </select>
                    </div>

                    {/* Price Range Filter */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{t('agents:filters.priceRangeFocus')}</label>
                      <select
                        value={filters.priceRange}
                        onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="all">{t('agents:filters.allPriceRanges')}</option>
                        <option value="affordable">{t('agents:filters.affordable')}</option>
                        <option value="mid">{t('agents:filters.midRange')}</option>
                        <option value="luxury">{t('agents:filters.luxury')}</option>
                      </select>
                    </div>
                  </div>

                  {/* Clear Filters Button */}
                  {(filters.propertyTypes.length > 0 || filters.minRating > 0 || filters.minExperience > 0 || filters.priceRange !== 'all') && (
                    <div className="pt-2">
                      <button
                        onClick={() => setFilters({
                          propertyTypes: [],
                          minRating: 0,
                          minExperience: 0,
                          languages: [],
                          priceRange: 'all'
                        })}
                        className="text-sm text-primary hover:text-primary-dark font-medium"
                      >
                        {t('agents:filters.clearAllFilters')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section Header */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
              {t('agents:results.title')}
            </h2>
            <p className="text-neutral-600 text-sm sm:text-base">
              {searchQuery ? (
                <>
                  {filteredAgents.length !== 1
                    ? t('agents:results.showingMatchingPlural', { count: filteredAgents.length, query: searchQuery })
                    : t('agents:results.showingMatching', { count: filteredAgents.length, query: searchQuery })}
                  {filteredAgents.length > 0 && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="ml-2 text-primary hover:underline font-semibold"
                    >
                      {t('agents:search.clearSearch')}
                    </button>
                  )}
                </>
              ) : (
                <>
                  {t('agents:results.description', { count: agents.length })}
                </>
              )}
            </p>
          </div>

          {/* Agent Cards Grid */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-md border p-8 sm:p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-neutral-600">{t('agents:loading')}</p>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md border p-8 sm:p-12 text-center">
              <UserGroupIcon className="w-12 h-12 sm:w-16 sm:h-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-2">{t('agents:results.noAgentsFound')}</h3>
              <p className="text-neutral-600 text-sm sm:text-base">
                {t('agents:results.tryAdjusting')}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7 mb-8 sm:mb-12">
                {filteredAgents.slice(0, visibleAgentsCount).map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>

              {/* Show More Button - only if there are more agents to show */}
              {filteredAgents.length > visibleAgentsCount && (
                <div className="text-center mb-12">
                  <p className="text-sm text-neutral-500 mb-3">
                    {t('agents:results.showing', {
                      shown: visibleAgentsCount,
                      total: filteredAgents.length,
                      defaultValue: `Showing ${visibleAgentsCount} of ${filteredAgents.length} agents`
                    })}
                  </p>
                  <button
                    onClick={() => setVisibleAgentsCount(prev => prev + 9)}
                    className="px-6 sm:px-8 py-2.5 sm:py-3 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-white transition-colors text-sm sm:text-base"
                  >
                    {t('agents:results.showMore', 'Show More Agents')}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Agencies Section with AgencyBadge */}
          {agencies.length > 0 && (
            <div className="mb-12 sm:mb-16">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">{t('agents:agencies.title')}</h2>
                  <p className="text-neutral-600 text-sm sm:text-base">{t('agents:agencies.subtitle')}</p>
                </div>
                <button
                  onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' })}
                  className="text-primary font-semibold hover:underline text-sm sm:text-base"
                >
                  {t('agents:agencies.viewAll')}
                </button>
              </div>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                {agencies.slice(0, 8).map((agency) => (
                  <AgencyBadge
                    key={agency.id || agency._id}
                    agencyName={agency.name}
                    agencyLogo={agency.logo}
                    type={agency.type as any || 'standard'}
                    variant="minimal"
                    size="md"
                    showIcon={true}
                    showText={true}
                    clickable={true}
                    asLink={false}
                    onClick={async () => {
                      try {
                        const agencyId = agency.id || agency._id;
                        const data = await apiRequest<any>(`/agencies/${agencyId}`);
                        if (data) {
                          dispatch({ type: 'SET_SELECTED_AGENCY', payload: data.agency });
                          dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencyDetail' });
                          const urlSlug = data.agency.slug || data.agency.id || data.agency._id;
                          window.history.pushState({}, '', getLocalizedPath(`/agencies/${urlSlug}`));
                        }
                      } catch (error) {
                        // Error removed
                      }
                    }}
                    className="bg-white border border-neutral-200 hover:border-primary hover:shadow-md transition-all"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Contact Form Section */}
          <div className="relative rounded-xl overflow-hidden mb-12 sm:mb-16 shadow-lg" style={{
            backgroundImage: `url(${HERO_IMAGES.agentsHero.src})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover'
          }}>
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/80 to-neutral-900/70"></div>
            <div className="relative w-full px-4 sm:px-8 py-8 sm:py-12">
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">{t('agents:contact.title')}</h2>
                <p className="text-white/90 text-sm sm:text-lg">
                  {t('agents:contact.subtitle')}
                </p>
              </div>

              {contactSubmitSuccess ? (
                <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 sm:p-6 text-center max-w-2xl mx-auto">
                  <div className="text-green-600 text-4xl sm:text-5xl mb-2 sm:mb-3">✓</div>
                  <h3 className="text-xl sm:text-2xl font-bold text-green-900 mb-1 sm:mb-2">{t('agents:contact.successTitle')}</h3>
                  <p className="text-green-800 text-sm sm:text-base">
                    {t('agents:contact.successMessage')}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8 max-w-2xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div>
                      <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-neutral-700 mb-1 sm:mb-2">
                        {t('agents:contact.emailLabel')}
                      </label>
                      <input
                        type="email"
                        id="email"
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                        placeholder={t('agents:contact.emailPlaceholder')}
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-xs sm:text-sm font-semibold text-neutral-700 mb-1 sm:mb-2">
                        {t('agents:contact.phoneLabel')}
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        required
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                        placeholder={t('agents:contact.phonePlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="mb-3 sm:mb-4">
                    <label htmlFor="location" className="block text-xs sm:text-sm font-semibold text-neutral-700 mb-1 sm:mb-2">
                      {t('agents:contact.locationLabel')}
                    </label>
                    <input
                      type="text"
                      id="location"
                      required
                      value={contactForm.location}
                      onChange={(e) => setContactForm({ ...contactForm, location: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                      placeholder={t('agents:contact.locationPlaceholder')}
                    />
                  </div>

                  <div className="mb-4 sm:mb-6">
                    <label htmlFor="propertyDescription" className="block text-xs sm:text-sm font-semibold text-neutral-700 mb-1 sm:mb-2">
                      {t('agents:contact.propertyDescriptionLabel')}
                    </label>
                    <textarea
                      id="propertyDescription"
                      required
                      rows={3}
                      value={contactForm.propertyDescription}
                      onChange={(e) => setContactForm({ ...contactForm, propertyDescription: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm sm:text-base"
                      placeholder={t('agents:contact.propertyDescriptionPlaceholder')}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingContact}
                    className="w-full bg-primary text-white px-6 sm:px-8 py-3 sm:py-4 rounded-md font-bold text-sm sm:text-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingContact ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                        {t('agents:contact.submitting')}
                      </>
                    ) : (
                      <>
                        <PhoneIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        {t('agents:contact.submitButton')}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-xl p-6 sm:p-8 md:p-12 text-white mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center">{t('agents:faq.title')}</h2>
            <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden hover:bg-white/15 transition-colors"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between text-left"
                  >
                    <span className="font-medium text-sm sm:text-lg">{faq.question}</span>
                    {expandedFaq === index ? (
                      <ChevronUpIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    )}
                  </button>
                  {expandedFaq === index && (
                    <div className="px-4 sm:px-6 pb-3 sm:pb-4 text-white/80 text-xs sm:text-sm">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Are you a real estate agent Section - Liquid Glass */}
          <div
            className="rounded-2xl p-8 sm:p-10 mb-8 relative overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15), inset 0 0 80px rgba(255, 255, 255, 0.3), -8px 0 24px rgba(31, 38, 135, 0.08), 8px 0 24px rgba(31, 38, 135, 0.08)',
            }}
          >
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-blue-50/30 pointer-events-none" />

            <div className="relative z-10">
              <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-3 sm:mb-4 text-center">
                {t('agents:cta.title')}
              </h3>
              <p className="text-center text-neutral-600 mb-6 sm:mb-8 max-w-2xl mx-auto text-sm sm:text-base">
                {t('agents:cta.description')}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                <button
                  onClick={() => {
                    dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
                  }}
                  className="px-6 sm:px-8 py-3 sm:py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all text-sm sm:text-base shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5"
                >
                  {t('agents:cta.getStarted')}
                </button>
                <button
                  onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' })}
                  className="px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-semibold transition-all text-sm sm:text-base text-primary hover:-translate-y-0.5"
                  style={{
                    background: 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 16px rgba(31, 38, 135, 0.1), inset 0 0 20px rgba(255, 255, 255, 0.5)',
                  }}
                >
                  {t('agents:cta.browseAgencies')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AgentsPage;