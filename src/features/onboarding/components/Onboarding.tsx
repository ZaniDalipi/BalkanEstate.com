import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { LogoIcon, SearchIcon, HomeIcon } from '@/constants';
import { ONBOARDING_IMAGES } from '@/config/cloudinaryConfig';
import { getAgencies } from '@/services/apiService';

/* ---------------- CONSTANTS ---------------- */

const STORAGE_KEY = 'balkanestate_onboarding_complete';

interface Agency {
  id: string;
  name: string;
  logo?: string;
  city?: string;
  country?: string;
}

/* ---------------- COMPONENT ---------------- */

const Onboarding: React.FC = () => {
  const { t } = useTranslation(['common', 'nav']);
  const { dispatch } = useAppContext();

  const [isVisible, setIsVisible] = useState(false);
  const [activeCard, setActiveCard] = useState<'buy' | 'sell' | null>(null);
  const [agencies, setAgencies] = useState<Agency[]>([]);

  /* ----------- CHECK IF SHOULD SHOW ----------- */
  useEffect(() => {
    const hasCompleted = localStorage.getItem(STORAGE_KEY);
    if (hasCompleted === 'true') {
      dispatch({ type: 'COMPLETE_ONBOARDING' });
      return;
    }

    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, [dispatch]);

  /* ----------- FETCH AGENCIES ----------- */
  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const response = await getAgencies({ limit: 6 });
        if (response?.agencies) {
          setAgencies(response.agencies.slice(0, 6));
        }
      } catch (error) {
        // Silently fail - agencies section will just not show
        console.log('Could not fetch agencies for onboarding');
      }
    };

    fetchAgencies();
  }, []);

  /* ---------------- ACTIONS ---------------- */

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    dispatch({ type: 'COMPLETE_ONBOARDING' });
  }, [dispatch]);

  const handleBuyChoice = () => {
    setActiveCard('buy');
    setTimeout(() => {
      completeOnboarding();
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
    }, 300);
  };

  const handleSellChoice = () => {
    setActiveCard('sell');
    setTimeout(() => {
      completeOnboarding();
      dispatch({ type: 'SET_PENDING_REDIRECT', payload: 'create-listing' });
      dispatch({
        type: 'TOGGLE_AUTH_MODAL',
        payload: { isOpen: true, view: 'signup' },
      });
    }, 300);
  };

  /* ---------------- RENDER ---------------- */

  return (
    <>
      <Helmet>
        <link
          rel="preload"
          as="image"
          href={ONBOARDING_IMAGES.buyCard.preload}
          imageSrcSet={ONBOARDING_IMAGES.buyCard.srcSet}
          imageSizes="(max-width: 768px) calc(100vw - 80px), 400px"
        />
      </Helmet>

      <div
        className={`fixed inset-0 z-[9999] overflow-y-auto bg-white transition-opacity duration-1000 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Content */}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
          {/* Logo and title */}
          <div
            className={`text-center mb-8 transform transition-all duration-1000 delay-300 ${
              isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'
            }`}
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-violet-500 rounded-2xl blur-xl opacity-40 animate-pulse" />
                <div className="relative p-4 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl shadow-xl shadow-blue-500/20">
                  <LogoIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                </div>
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight mb-2">
              Balkan<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600">Estate</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">.AI</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 max-w-lg mx-auto">
              {t('common:heroTagline', 'AI-powered property search across 11 Balkan countries')}
            </p>
          </div>

          {/* Main question */}
          <h2
            className={`text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 text-center mb-8 transform transition-all duration-1000 delay-500 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}
          >
            {t('nav:onboarding.question', 'How can we help you today?')}
          </h2>

          {/* Choice cards */}
          <div
            className={`grid md:grid-cols-2 gap-6 md:gap-8 w-full max-w-4xl transform transition-all duration-1000 delay-700 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
            }`}
          >
            {/* Buy Card */}
            <button
              onClick={handleBuyChoice}
              className={`group relative overflow-hidden rounded-3xl transition-all duration-500 text-left ${
                activeCard === 'buy'
                  ? 'scale-105 ring-4 ring-blue-400'
                  : activeCard === 'sell'
                    ? 'scale-95 opacity-50'
                    : 'hover:scale-[1.02] hover:-translate-y-1'
              }`}
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 rounded-3xl opacity-0 group-hover:opacity-50 blur-xl transition-all duration-500" />

              <div className="relative bg-gray-50 border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-lg group-hover:shadow-2xl group-hover:shadow-blue-200/50 transition-all duration-500">
                <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden mb-6">
                  <img
                    src={ONBOARDING_IMAGES.buyCard.src}
                    srcSet={ONBOARDING_IMAGES.buyCard.srcSet}
                    sizes="(max-width: 768px) calc(100vw - 80px), 400px"
                    alt={ONBOARDING_IMAGES.buyCard.alt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="eager"
                    decoding="async"
                    fetchpriority="high"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                  <div className="absolute top-4 left-4 p-3 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                    <SearchIcon className="w-6 h-6 text-white" />
                  </div>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {t('nav:onboarding.lookingToBuy', "I'm looking to buy")}
                </h3>
                <p className="text-gray-600 mb-6 group-hover:text-gray-700 transition-colors">
                  {t('nav:onboarding.buyDescription', 'Find your dream home with our AI-powered search tools and real-time alerts.')}
                </p>

                <div className="flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl font-bold text-white shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 group-hover:from-blue-600 group-hover:to-blue-700 transition-all">
                  <SearchIcon className="w-5 h-5" />
                  <span>{t('nav:onboarding.startSearching', 'Start Searching')}</span>
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Sell Card */}
            <button
              onClick={handleSellChoice}
              className={`group relative overflow-hidden rounded-3xl transition-all duration-500 text-left ${
                activeCard === 'sell'
                  ? 'scale-105 ring-4 ring-violet-400'
                  : activeCard === 'buy'
                    ? 'scale-95 opacity-50'
                    : 'hover:scale-[1.02] hover:-translate-y-1'
              }`}
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-500 rounded-3xl opacity-0 group-hover:opacity-50 blur-xl transition-all duration-500" />

              <div className="relative bg-gray-50 border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-lg group-hover:shadow-2xl group-hover:shadow-violet-200/50 transition-all duration-500">
                <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden mb-6">
                  <img
                    src={ONBOARDING_IMAGES.sellCard.src}
                    srcSet={ONBOARDING_IMAGES.sellCard.srcSet}
                    sizes="(max-width: 768px) calc(100vw - 80px), 400px"
                    alt={ONBOARDING_IMAGES.sellCard.alt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                  <div className="absolute top-4 left-4 p-3 bg-violet-500 rounded-xl shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform">
                    <HomeIcon className="w-6 h-6 text-white" />
                  </div>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 group-hover:text-violet-600 transition-colors">
                  {t('nav:onboarding.wantToSell', 'I want to sell')}
                </h3>
                <p className="text-gray-600 mb-6 group-hover:text-gray-700 transition-colors">
                  {t('nav:onboarding.sellDescription', 'List your property, reach thousands of potential buyers, and use our smart tools.')}
                </p>

                <div className="flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-violet-500 to-violet-600 rounded-xl font-bold text-white shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 group-hover:from-violet-600 group-hover:to-violet-700 transition-all">
                  <HomeIcon className="w-5 h-5" />
                  <span>{t('nav:onboarding.listProperty', 'List my Property')}</span>
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </button>
          </div>

          {/* Trusted Agencies Section */}
          {agencies.length > 0 && (
            <div
              className={`mt-12 w-full max-w-4xl transform transition-all duration-1000 delay-900 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}
            >
              <p className="text-center text-gray-500 text-sm mb-6">Trusted by leading agencies across the Balkans</p>
              <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
                {agencies.map((agency) => (
                  <div
                    key={agency.id}
                    className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all"
                  >
                    {agency.logo ? (
                      <img
                        src={agency.logo}
                        alt={agency.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                        {agency.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="font-semibold text-gray-800 text-sm">{agency.name}</p>
                      {agency.city && agency.country && (
                        <p className="text-xs text-gray-500">{agency.city}, {agency.country}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom tagline */}
          <p
            className={`text-gray-500 text-sm mt-10 text-center transform transition-all duration-1000 delay-1000 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}
          >
            11 countries &bull; 50+ cities &bull; AI-powered search &bull; Thousands of properties
          </p>
        </div>
      </div>
    </>
  );
};

export default Onboarding;
