import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  HeartIcon,
  HomeIcon,
  UsersIcon,
  SparklesIcon,
  MapPinIcon,
  StarIcon,
  BuildingOfficeIcon
} from '@/constants';

type TabOption = 'properties' | 'agents' | 'agencies';

interface SavedItemsHeroBannerProps {
  savedPropertiesCount: number;
  savedAgentsCount: number;
  savedAgenciesCount?: number;
  activeTab: TabOption;
  onTabChange: (tab: TabOption) => void;
  groupedCountries?: number;
}

const SavedItemsHeroBanner: React.FC<SavedItemsHeroBannerProps> = ({
  savedPropertiesCount,
  savedAgentsCount,
  savedAgenciesCount = 0,
  activeTab,
  onTabChange,
  groupedCountries = 0
}) => {
  const { t } = useTranslation(['saved']);

  const totalSaved = savedPropertiesCount + savedAgentsCount + savedAgenciesCount;

  return (
    <div className="relative overflow-hidden">
      {/* Dramatic gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-rose-900 to-pink-900" />

      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-rose-500/20 via-transparent to-pink-500/20 animate-pulse" style={{ animationDuration: '4s' }} />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="saved-items-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#saved-items-grid)" />
        </svg>
      </div>

      {/* Floating orbs */}
      <div className="absolute top-10 left-[10%] w-72 h-72 bg-rose-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-[10%] w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Floating icons - decorative */}
      <div className="absolute top-20 left-[5%] opacity-20 hidden lg:block animate-float">
        <HeartIcon className="w-16 h-16 text-white" />
      </div>
      <div className="absolute bottom-20 right-[8%] opacity-15 hidden lg:block animate-float" style={{ animationDelay: '1.5s' }}>
        <HomeIcon className="w-20 h-20 text-white" />
      </div>
      <div className="absolute top-32 right-[15%] opacity-10 hidden xl:block animate-float" style={{ animationDelay: '2s' }}>
        <StarIcon className="w-16 h-16 text-white" />
      </div>

      {/* Main content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <HeartIcon className="w-4 h-4 text-rose-400" />
              <span className="text-white/90 font-semibold text-sm uppercase tracking-wider">
                {t('saved:favorites.badge')}
              </span>
              <HeartIcon className="w-4 h-4 text-rose-400" />
            </div>
          </div>

          {/* Main heading */}
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 sm:mb-6 leading-tight">
              {t('saved:favorites.heroTitle')}
              <span className="block mt-2 bg-gradient-to-r from-rose-400 via-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
                {t('saved:favorites.heroTitleHighlight')}
              </span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
              {t('saved:favorites.heroDescription')}
            </p>
          </div>

          {/* Stats row - Glass morphism cards */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6 max-w-3xl mx-auto mb-8 sm:mb-10">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl sm:rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-white/20 text-center hover:bg-white/15 transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 bg-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/30">
                  <HomeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1">{savedPropertiesCount}</div>
                <div className="text-[10px] sm:text-xs lg:text-sm text-white/60 font-medium uppercase tracking-wide">
                  {t('saved:favorites.stats.properties')}
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl sm:rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-white/20 text-center hover:bg-white/15 transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 bg-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/30">
                  <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1">{savedAgentsCount}</div>
                <div className="text-[10px] sm:text-xs lg:text-sm text-white/60 font-medium uppercase tracking-wide">
                  {t('saved:favorites.stats.agents')}
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 rounded-xl sm:rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-white/20 text-center hover:bg-white/15 transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 bg-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
                  <BuildingOfficeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1">{savedAgenciesCount}</div>
                <div className="text-[10px] sm:text-xs lg:text-sm text-white/60 font-medium uppercase tracking-wide">
                  {t('saved:favorites.stats.agencies', 'Agencies')}
                </div>
              </div>
            </div>
          </div>

          {/* Tab controls - Glass morphism */}
          <div className="max-w-xl mx-auto">
            <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-white/20 shadow-2xl">
              <div className="flex gap-1.5 sm:gap-2">
                <button
                  onClick={() => onTabChange('properties')}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-base font-bold transition-all duration-300 ${
                    activeTab === 'properties'
                      ? 'bg-white text-slate-900 shadow-lg'
                      : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
                  }`}
                >
                  <HomeIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span className="truncate">{t('saved:favorites.tabs.properties')}</span>
                  {savedPropertiesCount > 0 && (
                    <span className={`ml-0.5 sm:ml-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs shrink-0 ${
                      activeTab === 'properties' ? 'bg-rose-100 text-rose-600' : 'bg-white/20'
                    }`}>
                      {savedPropertiesCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => onTabChange('agents')}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-base font-bold transition-all duration-300 ${
                    activeTab === 'agents'
                      ? 'bg-white text-slate-900 shadow-lg'
                      : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
                  }`}
                >
                  <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span className="truncate">{t('saved:favorites.tabs.agents')}</span>
                  {savedAgentsCount > 0 && (
                    <span className={`ml-0.5 sm:ml-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs shrink-0 ${
                      activeTab === 'agents' ? 'bg-pink-100 text-pink-600' : 'bg-white/20'
                    }`}>
                      {savedAgentsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => onTabChange('agencies')}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-base font-bold transition-all duration-300 ${
                    activeTab === 'agencies'
                      ? 'bg-white text-slate-900 shadow-lg'
                      : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
                  }`}
                >
                  <BuildingOfficeIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span className="truncate">{t('saved:favorites.tabs.agencies', 'Agencies')}</span>
                  {savedAgenciesCount > 0 && (
                    <span className={`ml-0.5 sm:ml-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs shrink-0 ${
                      activeTab === 'agencies' ? 'bg-fuchsia-100 text-fuchsia-600' : 'bg-white/20'
                    }`}>
                      {savedAgenciesCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 mt-8 text-white/50 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <HeartIcon className="w-4 h-4 text-rose-400" />
              <span>{t('saved:favorites.badges.quickAccess')}</span>
            </div>
            <span className="hidden sm:inline">&bull;</span>
            <div className="flex items-center gap-2">
              <BuildingOfficeIcon className="w-4 h-4 text-pink-400" />
              <span>{t('saved:favorites.badges.organized')}</span>
            </div>
            <span className="hidden sm:inline">&bull;</span>
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-fuchsia-400" />
              <span>{t('saved:favorites.badges.compare')}</span>
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

export default SavedItemsHeroBanner;
