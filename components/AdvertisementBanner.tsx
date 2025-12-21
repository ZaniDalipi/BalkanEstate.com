import React, { useState, useEffect } from 'react';
import { getFeaturedAgencies } from '../services/apiService';
import { XMarkIcon, BuildingOfficeIcon } from '../constants';
import { useAppContext } from '../context/AppContext';

const AD_VIEW_THRESHOLD = 3; // Trigger gamification after 3 ad views
const AD_VIEW_STORAGE_KEY = 'balkan_estate_ad_views';

interface FeaturedAgency {
  _id: string;
  slug?: string;
  name: string;
  description?: string;
  logo?: string;
  totalProperties: number;
  totalAgents: number;
  city?: string;
}

interface AdvertisementBannerProps {
  position?: 'top' | 'bottom' | 'sidebar';
  disableGameTrigger?: boolean;
}

const AdvertisementBanner: React.FC<AdvertisementBannerProps> = ({ position = 'top', disableGameTrigger = false }) => {
  const { dispatch } = useAppContext();
  const [currentAd, setCurrentAd] = useState<FeaturedAgency | null>(null);
  const [ads, setAds] = useState<FeaturedAgency[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adViewCount, setAdViewCount] = useState(0);

  useEffect(() => {
    fetchAds();
    // Load ad view count from localStorage
    const savedCount = localStorage.getItem(AD_VIEW_STORAGE_KEY);
    if (savedCount) {
      setAdViewCount(parseInt(savedCount, 10));
    }
  }, []);

  useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => {
          const nextIndex = (prev + 1) % ads.length;
          // Track ad view on rotation
          trackAdView();
          return nextIndex;
        });
      }, 10000); // Rotate every 10 seconds

      return () => clearInterval(interval);
    }
  }, [ads.length]);

  useEffect(() => {
    if (ads.length > 0) {
      setCurrentAd(ads[currentIndex]);
    }
  }, [currentIndex, ads]);

  const trackAdView = () => {
    const newCount = adViewCount + 1;
    setAdViewCount(newCount);
    localStorage.setItem(AD_VIEW_STORAGE_KEY, newCount.toString());

    // Trigger gamification after threshold reached (unless disabled for this banner)
    if (!disableGameTrigger && newCount === AD_VIEW_THRESHOLD) {
      console.log('🎮 Ad view threshold reached! Triggering gamification...');
      triggerGamification();
    }
  };

  const triggerGamification = () => {
    // Dispatch action to show gamification modal
    dispatch({ type: 'TOGGLE_DISCOUNT_GAME', payload: true });
  };

  const fetchAds = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getFeaturedAgencies(5);

      if (response.agencies && response.agencies.length > 0) {
        setAds(response.agencies);
        setCurrentAd(response.agencies[0]);
      } else {
        setError('No featured agencies available. Please run: npm run seed:agencies');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load agencies');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAgency = () => {
    if (currentAd) {
      // Use slug if available, otherwise fall back to _id
      let identifier = currentAd.slug || currentAd._id;

      // Convert old comma format to new forward slash format for backward compatibility
      // Handles old format: "serbia,belgrade-premium-properties" -> "serbia/belgrade-premium-properties"
      if (identifier.includes(',')) {
        identifier = identifier.replace(',', '/');
      }

      dispatch({ type: 'SET_SELECTED_AGENCY', payload: identifier });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' });

      // Update browser URL with normalized slug (consistent with /agencies route)
      window.history.pushState({}, '', `/agencies/${identifier}`);
    }
  };

  // Don't show anything if dismissed
  if (isDismissed) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg p-4 text-center">
        <div className="animate-pulse">Loading featured agencies...</div>
      </div>
    );
  }

  // Show error state (helpful for debugging)
  if (error) {
    return (
      <div className="bg-red-500 text-white shadow-lg p-4 text-center relative">
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-2 right-2 text-white/80 hover:text-white"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
        <div className="font-semibold">⚠️ Agency Banners Not Available</div>
        <div className="text-sm mt-1">{error}</div>
      </div>
    );
  }

  // Don't show if no current ad
  if (!currentAd) {
    return null;
  }

  const baseClasses = "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg relative overflow-hidden";

  if (position === 'sidebar') {
    return (
      <div className={`${baseClasses} rounded-lg p-4 mb-4`}>
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-2 right-2 text-white/80 hover:text-white z-10"
          aria-label="Dismiss advertisement"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          {currentAd.logo ? (
            <img
              src={currentAd.logo}
              alt={currentAd.name}
              className="w-16 h-16 rounded-full border-2 border-white mb-3 object-cover"
            />
          ) : (
            <BuildingOfficeIcon className="w-16 h-16 mb-3" />
          )}

          <div className="text-xs font-bold mb-1 opacity-80">FEATURED AGENCY</div>
          <h3 className="font-bold text-sm mb-2">{currentAd.name}</h3>

          {currentAd.description && (
            <p className="text-xs opacity-90 mb-3 line-clamp-2">{currentAd.description}</p>
          )}

          <button
            onClick={handleViewAgency}
            className="bg-white text-amber-600 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-amber-50 transition-colors w-full"
          >
            View Agency
          </button>

          {ads.length > 1 && (
            <div className="flex gap-1 mt-3">
              {ads.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 rounded-full transition-all ${
                    index === currentIndex ? 'w-4 bg-white' : 'w-1 bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${baseClasses} ${position === 'top' ? 'rounded-b-lg' : 'rounded-t-lg'}`}>
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-2 right-2 md:top-3 md:right-4 text-white/80 hover:text-white z-10"
        aria-label="Dismiss advertisement"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>

      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Logo */}
        {currentAd.logo && (
          <div className="hidden md:block flex-shrink-0">
            <img
              src={currentAd.logo}
              alt={currentAd.name}
              className="w-12 h-12 rounded-full border-2 border-white object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold opacity-80">FEATURED AGENCY</span>
            <span className="text-white/60">|</span>
            <span className="text-sm font-bold">{currentAd.name}</span>
          </div>

          {currentAd.description && (
            <p className="text-sm opacity-90 hidden sm:block truncate">
              {currentAd.description}
            </p>
          )}

          <div className="flex gap-3 mt-1 text-xs opacity-80">
            {currentAd.totalProperties > 0 && (
              <span>{currentAd.totalProperties} Properties</span>
            )}
            {currentAd.totalAgents > 0 && (
              <span>{currentAd.totalAgents} Agents</span>
            )}
            {currentAd.city && (
              <span>{currentAd.city}</span>
            )}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleViewAgency}
          className="flex-shrink-0 bg-white text-amber-600 px-4 md:px-6 py-2 rounded-full font-bold text-sm hover:bg-amber-50 transition-colors"
        >
          View Agency
        </button>

        {/* Indicators */}
        {ads.length > 1 && (
          <div className="hidden lg:flex gap-1.5">
            {ads.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvertisementBanner;
