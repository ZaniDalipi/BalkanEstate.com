import React from 'react';
import { MagnifyingGlassIcon, BuildingOfficeIcon, UsersIcon, HomeIcon } from '@/constants';

interface StatItem {
  icon: 'users' | 'building' | 'home';
  count: number | string;
  label: string;
  color: 'green' | 'blue' | 'purple';
}

interface HeroSearchSectionProps {
  // Hero content
  badge: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  // Search section
  searchTitle: string;
  searchSubtitle: string;
  searchPlaceholder: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  // Popular searches
  popularSearches: string[];
  popularSearchesLabel: string;
  // Stats
  stats: StatItem[];
  // Mouse position for parallax
  mousePosition: { x: number; y: number };
}

const iconMap = {
  users: UsersIcon,
  building: BuildingOfficeIcon,
  home: HomeIcon,
};

const colorMap = {
  green: {
    bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
    border: 'border-green-100',
    iconBg: 'bg-green-500',
    text: 'text-green-700',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    border: 'border-blue-100',
    iconBg: 'bg-blue-500',
    text: 'text-blue-700',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-violet-50',
    border: 'border-purple-100',
    iconBg: 'bg-purple-500',
    text: 'text-purple-700',
  },
};

const HeroSearchSection: React.FC<HeroSearchSectionProps> = ({
  badge,
  title,
  titleHighlight,
  subtitle,
  searchTitle,
  searchSubtitle,
  searchPlaceholder,
  searchQuery,
  onSearchChange,
  onSearch,
  popularSearches,
  popularSearchesLabel,
  stats,
  mousePosition,
}) => {
  return (
    <div className="relative bg-gradient-to-b from-neutral-100 via-neutral-50 to-white w-full overflow-hidden mesh-3d">
      {/* 3D Mesh Background with Parallax */}
      <div
        className="absolute inset-0 mesh-layer"
        style={{
          transform: `translate3d(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px, 0) rotateX(${mousePosition.y * 0.05}deg) rotateY(${mousePosition.x * 0.05}deg)`,
        }}
      >
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="heroMeshGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#d1d5db" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#e5e7eb" stopOpacity="0.4" />
            </linearGradient>
            <pattern id="heroMesh3d" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="url(#heroMeshGradient)" strokeWidth="1"/>
              <circle cx="0" cy="0" r="1.5" fill="#d1d5db" opacity="0.5"/>
              <circle cx="60" cy="0" r="1.5" fill="#d1d5db" opacity="0.5"/>
              <circle cx="0" cy="60" r="1.5" fill="#d1d5db" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#heroMesh3d)" />
        </svg>
      </div>

      {/* Secondary floating mesh layer */}
      <div
        className="absolute inset-0 mesh-layer opacity-30"
        style={{
          transform: `translate3d(${-mousePosition.x * 0.3}px, ${-mousePosition.y * 0.3}px, 50px)`,
        }}
      >
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <pattern id="heroMesh3d-secondary" width="120" height="120" patternUnits="userSpaceOnUse">
              <path d="M 120 0 L 0 0 0 120" fill="none" stroke="#d1d5db" strokeWidth="0.5" strokeDasharray="4 4"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#heroMesh3d-secondary)" />
        </svg>
      </div>

      {/* Gradient orbs for depth */}
      <div
        className="absolute top-20 left-1/4 w-96 h-96 bg-gradient-to-br from-neutral-200/30 to-transparent rounded-full blur-3xl mesh-layer"
        style={{
          transform: `translate3d(${mousePosition.x * 0.8}px, ${mousePosition.y * 0.8}px, 0)`,
        }}
      />
      <div
        className="absolute bottom-20 right-1/4 w-80 h-80 bg-gradient-to-tl from-neutral-200/20 to-transparent rounded-full blur-3xl mesh-layer"
        style={{
          transform: `translate3d(${-mousePosition.x * 0.6}px, ${-mousePosition.y * 0.6}px, 0)`,
        }}
      />

      {/* Hero Content */}
      <div className="relative w-full pt-8 pb-16 lg:pt-12 lg:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Title Section */}
          <div className="text-center max-w-4xl mx-auto mb-8 animate-fade-in-up">
            <div className="inline-flex items-center justify-center px-4 py-2 bg-primary/10 rounded-full mb-6">
              <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                {badge}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-neutral-900 mb-6 leading-tight">
              {title}
              <span className="block mt-3 animate-gradient-x">
                {titleHighlight}
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Search Section */}
          <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-neutral-200/60 p-6 sm:p-8 animate-fade-in-up animation-delay-200 mt-8">
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-2">
                {searchTitle}
              </h2>
              <p className="text-neutral-600 text-sm sm:text-base">
                {searchSubtitle}
              </p>
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
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                placeholder={searchPlaceholder}
                className="w-full pl-12 pr-32 sm:pl-14 sm:pr-40 py-3 sm:py-4 border-2 border-neutral-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-white text-base sm:text-lg placeholder:text-neutral-500"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="p-1 sm:p-2 hover:bg-neutral-100 rounded-lg transition-all duration-200"
                    title="Clear search"
                  >
                    <span className="text-neutral-400 hover:text-neutral-600 text-sm">✕</span>
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onSearch();
                  }}
                  className="px-2.5 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-primary to-primary-dark text-white font-bold rounded-lg hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm md:text-base whitespace-nowrap"
                >
                  <MagnifyingGlassIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                </button>
              </div>
            </div>

            {/* Popular Searches */}
            {!searchQuery && (
              <div className="mb-4">
                <p className="text-center text-xs sm:text-sm text-neutral-600 mb-3">
                  {popularSearchesLabel}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {popularSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => onSearchChange(term)}
                      className="px-3 py-1.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 hover:border-primary hover:bg-primary/5 hover:text-primary text-neutral-700 rounded-lg transition-all duration-300 font-medium"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="pt-6 border-t border-neutral-200/50">
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                {stats.map((stat, index) => {
                  const IconComponent = iconMap[stat.icon];
                  const colors = colorMap[stat.color];
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-3 ${colors.bg} px-5 py-4 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border ${colors.border}`}
                    >
                      <div className={`p-2.5 ${colors.iconBg} rounded-xl shadow-md`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-2xl sm:text-3xl text-neutral-900">{stat.count}</div>
                        <div className={`${colors.text} text-xs sm:text-sm font-medium`}>{stat.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSearchSection;
