import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  UsersIcon,
  HomeIcon,
  SparklesIcon,
  StarIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CheckBadgeIcon,
  TrophyIcon
} from '@/constants';

type SearchTab = 'all' | 'name' | 'location' | 'specialization';

interface AgentsHeroBannerProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchTab: SearchTab;
  onSearchTabChange: (tab: SearchTab) => void;
  totalAgents: number;
  totalAgencies: number;
  totalProperties: number;
}

const AgentsHeroBanner: React.FC<AgentsHeroBannerProps> = ({
  searchQuery,
  onSearchChange,
  searchTab,
  onSearchTabChange,
  totalAgents,
  totalAgencies,
  totalProperties
}) => {
  const { t } = useTranslation(['agents']);

  const searchTabs = [
    { id: 'all' as SearchTab, label: t('search.tabs.all', 'All'), icon: MagnifyingGlassIcon },
    { id: 'name' as SearchTab, label: t('search.tabs.name', 'Name'), icon: UsersIcon },
    { id: 'location' as SearchTab, label: t('search.tabs.location', 'Location'), icon: BuildingOfficeIcon },
    { id: 'specialization' as SearchTab, label: t('search.tabs.specialization', 'Specialty'), icon: StarIcon },
  ];

  const getPlaceholder = () => {
    switch (searchTab) {
      case 'name': return t('search.placeholders.name', 'Search by agent name...');
      case 'location': return t('search.placeholders.location', 'Search by city, country...');
      case 'specialization': return t('search.placeholders.specialization', 'Search by specialty...');
      default: return t('search.placeholders.all', 'Search by name, city, or specialty...');
    }
  };

  const getQuickSearches = () => {
    switch (searchTab) {
      case 'name': return ['Top Rated', 'Verified', 'Expert'];
      case 'location': return ['Serbia', 'Croatia', 'Albania', 'Montenegro', 'Bosnia'];
      case 'specialization': return ['Luxury', 'Commercial', 'Residential', 'Investment'];
      default: return ['Belgrade', 'Zagreb', 'Luxury', 'Commercial'];
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Dramatic gradient background - Same as agencies */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900" />

      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-violet-600/20 animate-pulse" style={{ animationDuration: '4s' }} />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="agents-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#agents-grid)" />
        </svg>
      </div>

      {/* Floating orbs */}
      <div className="absolute top-10 left-[10%] w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-[10%] w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />

      {/* Floating icons - decorative */}
      <div className="absolute top-20 left-[5%] opacity-20 hidden lg:block animate-float">
        <UserGroupIcon className="w-16 h-16 text-white" />
      </div>
      <div className="absolute bottom-32 right-[8%] opacity-15 hidden lg:block animate-float" style={{ animationDelay: '1.5s' }}>
        <CheckBadgeIcon className="w-20 h-20 text-white" />
      </div>
      <div className="absolute top-40 right-[15%] opacity-10 hidden xl:block animate-float" style={{ animationDelay: '2s' }}>
        <StarIcon className="w-24 h-24 text-white" />
      </div>

      {/* Main content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <SparklesIcon className="w-4 h-4 text-amber-400" />
              <span className="text-white/90 font-semibold text-sm uppercase tracking-wider">
                {t('hero.badge', 'Connecting You with Experts')}
              </span>
              <SparklesIcon className="w-4 h-4 text-amber-400" />
            </div>
          </div>

          {/* Main heading */}
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 sm:mb-6 leading-tight">
              {t('hero.title', 'Find Your Perfect')}
              <span className="block mt-2 bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                {t('hero.titleHighlight', 'Real Estate Partner')}
              </span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
              {t('hero.subtitle', 'Connect with top-rated agents in the Balkans who specialize in your local market.')}
            </p>
          </div>

          {/* Stats row - Glass morphism cards */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6 max-w-3xl mx-auto mb-8 sm:mb-10">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl sm:rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-white/20 text-center hover:bg-white/15 transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1">{totalAgents}</div>
                <div className="text-[10px] sm:text-xs lg:text-sm text-white/60 font-medium uppercase tracking-wide">
                  {t('stats.verifiedAgents', 'Verified Agents')}
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-white/20 text-center hover:bg-white/15 transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <BuildingOfficeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1">{totalAgencies}</div>
                <div className="text-[10px] sm:text-xs lg:text-sm text-white/60 font-medium uppercase tracking-wide">
                  {t('stats.professionalAgencies', 'Agencies')}
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl sm:rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-white/20 text-center hover:bg-white/15 transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 bg-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <HomeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1">{totalProperties.toLocaleString()}</div>
                <div className="text-[10px] sm:text-xs lg:text-sm text-white/60 font-medium uppercase tracking-wide">
                  {t('agencies.listedProperties', 'Properties')}
                </div>
              </div>
            </div>
          </div>

          {/* Search box - Glass morphism */}
          <div className="max-w-2xl mx-auto">
            <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/20 shadow-2xl">
              <div className="text-center mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-1">
                  {t('search.title', 'Find Your Ideal Agent')}
                </h2>
                <p className="text-white/60 text-xs sm:text-sm">
                  {t('search.subtitle', { count: totalAgents, defaultValue: `Search ${totalAgents}+ verified professionals` })}
                </p>
              </div>

              {/* Search tabs */}
              <div className="flex justify-center gap-1.5 sm:gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                {searchTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        onSearchTabChange(tab.id);
                        onSearchChange('');
                      }}
                      className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                        searchTab === tab.id
                          ? 'bg-white text-primary shadow-lg'
                          : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Search input */}
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-3 sm:left-4 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className={`w-5 h-5 transition-colors ${searchQuery ? 'text-primary' : 'text-white/50'}`} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={getPlaceholder()}
                  className="w-full pl-10 sm:pl-12 pr-10 py-3 sm:py-4 bg-white/10 border border-white/20 rounded-xl sm:rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all text-sm sm:text-base"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <span className="text-white/50 hover:text-white text-sm">✕</span>
                  </button>
                )}
              </div>

              {/* Quick searches */}
              {!searchQuery && (
                <div className="text-center">
                  <p className="text-white/50 text-xs mb-2">{t('search.quickSearch.all', 'Popular searches:')}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {getQuickSearches().map((term) => (
                      <button
                        key={term}
                        onClick={() => onSearchChange(term)}
                        className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 text-white/70 hover:text-white rounded-lg transition-all"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-8 sm:mt-10">
            <div className="flex items-center gap-2 text-white/50">
              <ShieldCheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              <span className="text-xs sm:text-sm font-medium">{t('badges.verifiedAgents', 'Verified Agents')}</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-white/30 rounded-full" />
            <div className="flex items-center gap-2 text-white/50">
              <TrophyIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <span className="text-xs sm:text-sm font-medium">{t('badges.topRated', 'Top Rated')}</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-white/30 rounded-full" />
            <div className="flex items-center gap-2 text-white/50">
              <StarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
              <span className="text-xs sm:text-sm font-medium">{t('badges.premiumSupport', 'Premium Support')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg className="w-full h-12 sm:h-16 lg:h-20" viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 80L60 74.7C120 69 240 59 360 53.3C480 48 600 48 720 53.3C840 59 960 69 1080 69.3C1200 69 1320 59 1380 53.3L1440 48V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z" fill="white" fillOpacity="0.05"/>
          <path d="M0 80L60 77.3C120 75 240 69 360 64C480 59 600 53 720 53.3C840 53 960 59 1080 61.3C1200 64 1320 64 1380 64L1440 64V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z" fill="#f9fafb"/>
        </svg>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default AgentsHeroBanner;
