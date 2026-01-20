import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassPlusIcon,
  DocumentTextIcon,
  HeartIcon,
  ClockIcon,
  SparklesIcon,
  MapPinIcon,
  BellIcon,
  FunnelIcon
} from '@/constants';

type SortOption = 'createdAt' | 'name' | 'lastAccessed';

interface SavedSearchesHeroBannerProps {
  totalSearches: number;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onClearAll?: () => void;
  isClearing?: boolean;
}

const SavedSearchesHeroBanner: React.FC<SavedSearchesHeroBannerProps> = ({
  totalSearches,
  sortBy,
  onSortChange,
  onClearAll,
  isClearing
}) => {
  const { t } = useTranslation(['saved']);

  const sortOptions: { key: SortOption; label: string; icon: React.ReactNode }[] = [
    { key: 'createdAt', label: t('sort.newest', 'Newest'), icon: <SparklesIcon className="w-4 h-4" /> },
    { key: 'name', label: t('sort.name', 'Name'), icon: <DocumentTextIcon className="w-4 h-4" /> },
    { key: 'lastAccessed', label: t('sort.lastActive', 'Recently Used'), icon: <ClockIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Dramatic gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-cyan-900 to-teal-900" />

      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-transparent to-teal-500/20 animate-pulse" style={{ animationDuration: '4s' }} />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="saved-searches-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#saved-searches-grid)" />
        </svg>
      </div>

      {/* Floating orbs */}
      <div className="absolute top-10 left-[10%] w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-[10%] w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Floating icons - decorative */}
      <div className="absolute top-20 left-[5%] opacity-20 hidden lg:block animate-float">
        <MagnifyingGlassPlusIcon className="w-16 h-16 text-white" />
      </div>
      <div className="absolute bottom-20 right-[8%] opacity-15 hidden lg:block animate-float" style={{ animationDelay: '1.5s' }}>
        <MapPinIcon className="w-20 h-20 text-white" />
      </div>
      <div className="absolute top-32 right-[15%] opacity-10 hidden xl:block animate-float" style={{ animationDelay: '2s' }}>
        <BellIcon className="w-16 h-16 text-white" />
      </div>

      {/* Main content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <BellIcon className="w-4 h-4 text-cyan-400" />
              <span className="text-white/90 font-semibold text-sm uppercase tracking-wider">
                {t('hero.badge', 'Smart Property Alerts')}
              </span>
              <BellIcon className="w-4 h-4 text-cyan-400" />
            </div>
          </div>

          {/* Main heading */}
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 sm:mb-6 leading-tight">
              {t('hero.title', 'Your Saved')}
              <span className="block mt-2 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
                {t('hero.titleHighlight', 'Property Searches')}
              </span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
              {t('hero.description', 'Track your favorite search criteria and get notified when new properties match')}
            </p>
          </div>

          {/* Stats row - Glass morphism cards */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6 max-w-3xl mx-auto mb-8 sm:mb-10">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl sm:rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-white/20 text-center hover:bg-white/15 transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <HeartIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1">{totalSearches}</div>
                <div className="text-[10px] sm:text-xs lg:text-sm text-white/60 font-medium uppercase tracking-wide">
                  {t('stats.savedSearches', 'Saved Searches')}
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl sm:rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-white/20 text-center hover:bg-white/15 transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30">
                  <BellIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1">
                  {totalSearches > 0 ? 'ON' : 'OFF'}
                </div>
                <div className="text-[10px] sm:text-xs lg:text-sm text-white/60 font-medium uppercase tracking-wide">
                  {t('stats.alerts', 'Email Alerts')}
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl sm:rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-white/20 text-center hover:bg-white/15 transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <MapPinIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1">11</div>
                <div className="text-[10px] sm:text-xs lg:text-sm text-white/60 font-medium uppercase tracking-wide">
                  {t('stats.countries', 'Countries')}
                </div>
              </div>
            </div>
          </div>

          {/* Sort/Filter controls - Glass morphism */}
          {totalSearches > 0 && (
            <div className="max-w-2xl mx-auto">
              <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/20 shadow-2xl">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-white/70">
                    <FunnelIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">{t('sortBy', 'Sort by')}:</span>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                    {sortOptions.map((option) => (
                      <button
                        key={option.key}
                        onClick={() => onSortChange(option.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                          sortBy === option.key
                            ? 'bg-white text-slate-900 shadow-lg'
                            : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
                        }`}
                      >
                        {option.icon}
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {onClearAll && totalSearches > 1 && (
                    <button
                      onClick={onClearAll}
                      disabled={isClearing}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-semibold rounded-xl transition-all border border-red-500/30 disabled:opacity-50"
                    >
                      {isClearing ? t('clearAll.clearing', 'Clearing...') : t('clearAll.button', 'Clear All')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 mt-8 text-white/50 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <BellIcon className="w-4 h-4 text-cyan-400" />
              <span>{t('badges.instantAlerts', 'Instant Alerts')}</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-4 h-4 text-teal-400" />
              <span>{t('badges.customAreas', 'Custom Areas')}</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-emerald-400" />
              <span>{t('badges.smartMatching', 'Smart Matching')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for floating animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default SavedSearchesHeroBanner;
