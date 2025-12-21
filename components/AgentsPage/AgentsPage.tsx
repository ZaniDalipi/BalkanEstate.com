import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Agent, Agency } from '../../types';
import { getAllAgents, getAgencies } from '../../services/apiService';
import AgentCard from './AgentCard';
import AgentProfilePage from './AgentProfilePage';
import AgencyBadge from '../shared/AgencyBadge'; // Added import
import { MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon, UserGroupIcon, PhoneIcon, BuildingOfficeIcon } from '../../constants';
import Footer from '../shared/Footer';
type SearchTab = 'location' | 'name' | 'specialization';
type SortOption = 'rating' | 'experience' | 'sales' | 'recent' | 'name';

const AgentsPage: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { selectedAgentId, activeView } = state;

  const [searchTab, setSearchTab] = useState<SearchTab>('location');
  const [searchQuery, setSearchQuery] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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

  useEffect(() => {
    if (activeView === 'agents') {
      fetchAgents();
      fetchAgencies();
    }
  }, [activeView]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await getAllAgents();
      setAgents(response.agents || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgencies = async () => {
    try {
      const response = await getAgencies({ limit: 12 });
      setAgencies(response.agencies || []);
    } catch (error) {
      console.error('Failed to fetch agencies:', error);
      setAgencies([]);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContact(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_URL}/agent-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactForm),
      });

      if (response.ok) {
        setContactSubmitSuccess(true);
        setContactForm({
          email: '',
          phone: '',
          location: '',
          propertyDescription: ''
        });
        setTimeout(() => setContactSubmitSuccess(false), 5000);
      } else {
        alert('Failed to submit request. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting contact form:', error);
      alert('An error occurred. Please try again later.');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const filteredAgents = useMemo(() => {
    let result = [...agents];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(agent => {
        if (searchTab === 'location') {
          // Search by city, country, address
          const city = (agent.city || '').toLowerCase();
          const country = (agent.country || '').toLowerCase();
          const address = (agent.address || '').toLowerCase();
          const fullLocation = `${address} ${city} ${country}`.trim();

          return city.includes(query) ||
                 country.includes(query) ||
                 address.includes(query) ||
                 fullLocation.includes(query);
        } else if (searchTab === 'name') {
          // Search by agent name
          return agent.name.toLowerCase().includes(query);
        } else if (searchTab === 'specialization') {
          // Search by specializations and bio
          const specializations = (agent.specializations || []).map(s => s.toLowerCase());
          const bio = (agent.bio || '').toLowerCase();
          return specializations.some(spec => spec.includes(query)) || bio.includes(query);
        }
        return true;
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
  }, [agents, searchQuery, searchTab, filters, sortBy]);

  const selectedAgent = useMemo(() => {
    if (!selectedAgentId) return null;
    return agents.find(a => a.agentId === selectedAgentId || a.id === selectedAgentId) || null;
  }, [selectedAgentId, agents]);

  const faqs = [
    {
      question: 'How to find a good real estate agent near me?',
      answer: 'Start by searching for agents in your area using our location search. Look for agents with high ratings, strong sales records, and testimonials from recent clients.'
    },
    {
      question: 'How to pick a real estate agent?',
      answer: 'Consider their experience, local market knowledge, sales track record, client reviews, and communication style. Schedule consultations with multiple agents before making your decision.'
    },
    {
      question: 'How to contact a real estate agent?',
      answer: 'You can view an agent\'s profile to find their contact information, including phone number and email. Many agents also offer convenient online booking for consultations.'
    },
    {
      question: 'How do I leave a review for a real estate agent?',
      answer: 'Visit the agent\'s profile page and click on the "Write a Review" button. Share your experience to help others make informed decisions.'
    },
    {
      question: 'What is the difference between an agent and a broker?',
      answer: 'A real estate agent is licensed to help clients buy and sell property, while a broker has additional training and certification. Brokers can work independently and manage their own agencies.'
    }
  ];

  if (selectedAgent) {
    return <AgentProfilePage agent={selectedAgent} />;
  }

  if (loading) {
    return (
      <div className="bg-neutral-50 min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-50 min-h-screen flex flex-col">
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
      `}</style>

      {/* Hero Section - Fixed height and proper positioning */}
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

        {/* Hero Content - Fixed layout without interfering with main content */}
        <div className="relative w-full pt-8 pb-16 lg:pt-12 lg:pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Main Title Section */}
            <div className="text-center max-w-4xl mx-auto mb-8 animate-fade-in-up">
              <div className="inline-flex items-center justify-center px-4 py-2 bg-primary/10 rounded-full mb-6">
                <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                  Connecting You with Experts
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-neutral-900 mb-4 sm:mb-6 leading-tight">
                Find Your Perfect
                <span className="block mt-2 sm:mt-3 animate-gradient-x">
                  Real Estate Partner
                </span>
              </h1>

              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
                Connect with top-rated agents in the Balkans who specialize in your local market
                and have the expertise to guide you home.
              </p>
            </div>

            {/* Search Section - Clean and Integrated */}
            <div className="max-w-3xl mx-auto bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-neutral-100 p-4 sm:p-6 md:p-8 animate-fade-in-up animation-delay-200 mt-6 sm:mt-8">
              <div className="text-center mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-900 mb-1.5 sm:mb-2">
                  Find Your Ideal Agent
                </h2>
                <p className="text-neutral-600 text-xs sm:text-sm md:text-base">
                  Search {agents.length}+ verified professionals across the Balkans
                </p>
              </div>

              {/* Search Tabs */}
              <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6 p-1 sm:p-1.5 bg-neutral-100 rounded-xl sm:rounded-2xl w-fit mx-auto">
                <button
                  onClick={() => setSearchTab('location')}
                  className={`px-2.5 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 relative min-w-[90px] sm:min-w-[100px] md:min-w-[120px] text-xs sm:text-sm md:text-base ${
                    searchTab === 'location'
                      ? 'text-white shadow-lg'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-white'
                  }`}
                  style={{
                    background: searchTab === 'location'
                      ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                      : 'transparent'
                  }}
                >
                  <span className="flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Location
                  </span>
                </button>
                <button
                  onClick={() => setSearchTab('name')}
                  className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-300 relative min-w-[100px] sm:min-w-[120px] ${
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
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Agent Name
                  </span>
                </button>
                <button
                  onClick={() => setSearchTab('specialization')}
                  className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-300 relative min-w-[100px] sm:min-w-[120px] ${
                    searchTab === 'specialization'
                      ? 'text-white shadow-lg'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-white'
                  }`}
                  style={{
                    background: searchTab === 'specialization'
                      ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                      : 'transparent'
                  }}
                >
                  <span className="flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Specialization
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
                  placeholder={
                    searchTab === 'location'
                      ? 'Search by city, neighborhood, or country...'
                      : searchTab === 'name'
                      ? "Search by agent's name..."
                      : 'Search by specialization (e.g., Luxury, Commercial)...'
                  }
                  className="w-full pl-10 sm:pl-12 pr-20 sm:pr-32 md:pr-40 py-3 sm:py-4 border-2 border-neutral-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-white text-base sm:text-lg placeholder:text-neutral-500"
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
                      // Trigger search
                    }}
                    className="px-2.5 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-primary to-primary-dark text-white font-bold rounded-lg hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm md:text-base whitespace-nowrap"
                    aria-label="Search agents"
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
                    {searchTab === 'location' ? (
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
                          onClick={() => setSearchQuery('Novi Sad')}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 hover:border-primary hover:bg-primary/5 hover:text-primary text-neutral-700 rounded-lg transition-all duration-300 font-medium"
                        >
                          Novi Sad
                        </button>
                      </>
                    ) : searchTab === 'name' ? (
                      <>
                        <button
                          onClick={() => setSearchQuery('John')}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 hover:border-primary hover:bg-primary/5 hover:text-primary text-neutral-700 rounded-lg transition-all duration-300 font-medium"
                        >
                          Popular Names
                        </button>
                        <button
                          onClick={() => setSearchQuery('Agent')}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 hover:border-primary hover:bg-primary/5 hover:text-primary text-neutral-700 rounded-lg transition-all duration-300 font-medium"
                        >
                          View All
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setSearchQuery('Residential')}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 hover:border-primary hover:bg-primary/5 hover:text-primary text-neutral-700 rounded-lg transition-all duration-300 font-medium"
                        >
                          Residential
                        </button>
                        <button
                          onClick={() => setSearchQuery('Luxury')}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 hover:border-primary hover:bg-primary/5 hover:text-primary text-neutral-700 rounded-lg transition-all duration-300 font-medium"
                        >
                          Luxury
                        </button>
                        <button
                          onClick={() => setSearchQuery('Commercial')}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 hover:border-primary hover:bg-primary/5 hover:text-primary text-neutral-700 rounded-lg transition-all duration-300 font-medium"
                        >
                          Commercial
                        </button>
                        <button
                          onClick={() => setSearchQuery('Investment')}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 hover:border-primary hover:bg-primary/5 hover:text-primary text-neutral-700 rounded-lg transition-all duration-300 font-medium"
                        >
                          Investment
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Live Stats */}
              <div className="pt-6 border-t border-neutral-200/50">
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm sm:text-base">
                  <div className="flex items-center gap-2 bg-white/90 px-4 py-3 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="text-center">
                      <div className="font-bold text-lg sm:text-2xl text-neutral-900">{agents.length}+</div>
                      <div className="text-neutral-600 text-xs sm:text-sm">Verified Agents</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/90 px-4 py-3 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <div className="text-center">
                      <div className="font-bold text-lg sm:text-2xl text-neutral-900">{agencies.length}+</div>
                      <div className="text-neutral-600 text-xs sm:text-sm">Professional Agencies</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/90 px-4 py-3 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-500 rounded-full animate-pulse"></div>
                    <div className="text-center">
                      <div className="font-bold text-lg sm:text-2xl text-neutral-900">5000+</div>
                      <div className="text-neutral-600 text-xs sm:text-sm">Successful Transactions</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Now this flows properly after the hero section */}
      <main className="w-full flex-grow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Filters and Sort Section */}
          <div className="mb-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
              {/* Top Row: Sort and Filters Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-gray-700">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="rating">Highest Rated</option>
                    <option value="experience">Most Experienced</option>
                    <option value="sales">Most Sales</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Specialization</label>
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Minimum Rating</label>
                      <select
                        value={filters.minRating}
                        onChange={(e) => setFilters(prev => ({ ...prev, minRating: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="0">Any Rating</option>
                        <option value="3">3+ Stars</option>
                        <option value="4">4+ Stars</option>
                        <option value="4.5">4.5+ Stars</option>
                      </select>
                    </div>

                    {/* Experience Filter */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Experience</label>
                      <select
                        value={filters.minExperience}
                        onChange={(e) => setFilters(prev => ({ ...prev, minExperience: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="0">Any Experience</option>
                        <option value="1">1+ Years</option>
                        <option value="3">3+ Years</option>
                        <option value="5">5+ Years</option>
                        <option value="10">10+ Years</option>
                      </select>
                    </div>

                    {/* Price Range Filter */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Price Range Focus</label>
                      <select
                        value={filters.priceRange}
                        onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="all">All Price Ranges</option>
                        <option value="affordable">Affordable ({"<"}€150K)</option>
                        <option value="mid">Mid-Range (€150K-€500K)</option>
                        <option value="luxury">Luxury ({">"}€500K)</option>
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
                        Clear all filters
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
              Real Estate Agents in the Balkans
            </h2>
            <p className="text-neutral-600 text-sm sm:text-base">
              {searchQuery ? (
                <>
                  Showing <span className="font-bold text-primary">{filteredAgents.length}</span> agent{filteredAgents.length !== 1 ? 's' : ''} matching "{searchQuery}"
                  {filteredAgents.length > 0 && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="ml-2 text-primary hover:underline font-semibold"
                    >
                      Clear search
                    </button>
                  )}
                </>
              ) : (
                <>
                  With over {agents.length} agents from all the top brokerages, a local agent knows your market and
                  can help you find the perfect home.
                </>
              )}
            </p>
          </div>

          {/* Agent Cards Grid */}
          {filteredAgents.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md border p-8 sm:p-12 text-center">
              <UserGroupIcon className="w-12 h-12 sm:w-16 sm:h-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-2">No agents found</h3>
              <p className="text-neutral-600 text-sm sm:text-base">
                Try adjusting your search criteria
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
              {filteredAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          )}

          {/* View More Button */}
          {filteredAgents.length > 0 && (
            <div className="text-center mb-12">
              <button
                onClick={() => {
                  // TODO: Implement pagination or load more functionality
                  window.scrollTo || window.scrollTo(0, 0);
                }}
                className="px-6 sm:px-8 py-2.5 sm:py-3 border-2 border-primary text-primary font-semibold rounded-md hover:bg-primary hover:text-white transition-colors text-sm sm:text-base"
              >
                View more
              </button>
            </div>
          )}

          {/* Agencies Section with AgencyBadge */}
          {agencies.length > 0 && (
            <div className="mb-12 sm:mb-16">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">Top Real Estate Agencies</h2>
                  <p className="text-neutral-600 text-sm sm:text-base">Browse agencies with experienced professionals</p>
                </div>
                <button
                  onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' })}
                  className="text-primary font-semibold hover:underline text-sm sm:text-base"
                >
                  View all agencies →
                </button>
              </div>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                {agencies.slice(0, 8).map((agency) => (
                  <AgencyBadge
                    key={agency._id}
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
                        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
                        const response = await fetch(`${API_URL}/agencies/${agency._id}`);
                        if (response.ok) {
                          const data = await response.json();
                          dispatch({ type: 'SET_SELECTED_AGENCY', payload: data.agency });
                          dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencyDetail' });
                          const urlSlug = data.agency.slug || data.agency._id;
                          window.history.pushState({}, '', `/agencies/${urlSlug}`);
                        }
                      } catch (error) {
                        console.error('Error fetching agency:', error);
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
            backgroundImage: 'url(https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&h=400&fit=crop)',
            backgroundPosition: 'center'
          }}>
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/80 to-neutral-900/70"></div>
            <div className="relative w-full px-4 sm:px-8 py-8 sm:py-12">
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">Get help finding an agent</h2>
                <p className="text-white/90 text-sm sm:text-lg">
                  We'll pair you with a BalkanEstate Premier Agent who has the inside scoop on your market.
                </p>
              </div>

              {contactSubmitSuccess ? (
                <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 sm:p-6 text-center max-w-2xl mx-auto">
                  <div className="text-green-600 text-4xl sm:text-5xl mb-2 sm:mb-3">✓</div>
                  <h3 className="text-xl sm:text-2xl font-bold text-green-900 mb-1 sm:mb-2">Request Submitted!</h3>
                  <p className="text-green-800 text-sm sm:text-base">
                    Thank you! We'll match you with local agents and they'll contact you soon.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8 max-w-2xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div>
                      <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-neutral-700 mb-1 sm:mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                        placeholder="your.email@example.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-xs sm:text-sm font-semibold text-neutral-700 mb-1 sm:mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        required
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                        placeholder="+381 11 234 5678"
                      />
                    </div>
                  </div>

                  <div className="mb-3 sm:mb-4">
                    <label htmlFor="location" className="block text-xs sm:text-sm font-semibold text-neutral-700 mb-1 sm:mb-2">
                      Location / Address *
                    </label>
                    <input
                      type="text"
                      id="location"
                      required
                      value={contactForm.location}
                      onChange={(e) => setContactForm({ ...contactForm, location: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                      placeholder="Belgrade, Serbia"
                    />
                  </div>

                  <div className="mb-4 sm:mb-6">
                    <label htmlFor="propertyDescription" className="block text-xs sm:text-sm font-semibold text-neutral-700 mb-1 sm:mb-2">
                      Property Description *
                    </label>
                    <textarea
                      id="propertyDescription"
                      required
                      rows={3}
                      value={contactForm.propertyDescription}
                      onChange={(e) => setContactForm({ ...contactForm, propertyDescription: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm sm:text-base"
                      placeholder="Describe the property you're looking for (type, size, budget, features, etc.)"
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
                        Submitting...
                      </>
                    ) : (
                      <>
                        <PhoneIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        Connect with a local agent
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-xl p-6 sm:p-8 md:p-12 text-white mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center">Frequently asked questions</h2>
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

          {/* Are you a real estate agent Section */}
          <div className="bg-white rounded-xl shadow-md border p-6 sm:p-8 mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-3 sm:mb-4 text-center">
              Are you a real estate agent?
            </h3>
            <p className="text-center text-neutral-600 mb-6 sm:mb-8 max-w-2xl mx-auto text-sm sm:text-base">
              Join BalkanEstate to showcase your expertise, connect with potential clients, and grow your business.
              Get access to premium tools and advertising opportunities to help you succeed in the Balkan real estate market.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <button
                onClick={() => {
                  dispatch({ type: 'SET_AUTH_MODAL', payload: { isOpen: true, mode: 'login' } });
                }}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-primary text-white rounded-md font-semibold hover:bg-primary-dark transition-colors text-sm sm:text-base"
              >
                Get Started
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' })}
                className="px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-primary text-primary rounded-md font-semibold hover:bg-primary hover:text-white transition-colors text-sm sm:text-base"
              >
                Browse Agencies
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AgentsPage;