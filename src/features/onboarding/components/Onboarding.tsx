import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { LogoIcon, SearchIcon, HomeIcon } from '@/constants';
import { ONBOARDING_IMAGES } from '@/config/imageConfig';
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
        className={`fixed inset-0 z-[9999] overflow-y-auto transition-opacity duration-1000 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'linear-gradient(135deg, #f8f9fc 0%, #eef1f8 30%, #f0f4ff 60%, #f7f8fc 100%)',
        }}
      >
        {/* Soft ambient blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-30 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />
          <div className="absolute top-1/3 -left-24 w-80 h-80 rounded-full opacity-25 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
          {/* Logo and title */}
          <div
            className={`text-center mb-10 transform transition-all duration-1000 delay-300 ${
              isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'
            }`}
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <div
                className="p-3.5 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-sm"
                style={{
                  boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 2px rgba(255,255,255,0.8)',
                }}
              >
                <LogoIcon className="w-10 h-10 sm:w-12 sm:h-12 text-neutral-800" />
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-neutral-900 tracking-tight mb-3">
              Balkan<span className="text-primary">Estate</span><span className="text-neutral-400 font-medium">.AI</span>
            </h1>

            <p className="text-base sm:text-lg text-neutral-500 max-w-md mx-auto font-light">
              {t('common:heroTagline', 'AI-powered property search across 11 Balkan countries')}
            </p>
          </div>

          {/* Main question */}
          <h2
            className={`text-xl sm:text-2xl md:text-3xl font-semibold text-neutral-800 text-center mb-8 transform transition-all duration-1000 delay-500 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}
          >
            {t('nav:onboarding.question', 'How can we help you today?')}
          </h2>

          {/* Choice cards */}
          <div
            className={`grid md:grid-cols-2 gap-5 md:gap-6 w-full max-w-3xl transform transition-all duration-1000 delay-700 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
            }`}
          >
            {/* Buy Card */}
            <button
              onClick={handleBuyChoice}
              className={`group relative overflow-hidden rounded-2xl transition-all duration-500 text-left ${
                activeCard === 'buy'
                  ? 'scale-[1.03] ring-2 ring-primary/40'
                  : activeCard === 'sell'
                    ? 'scale-95 opacity-50'
                    : 'hover:scale-[1.02] hover:-translate-y-0.5'
              }`}
            >
              <div
                className="relative bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-5 sm:p-6 transition-all duration-500 group-hover:bg-white/80 group-hover:shadow-lg"
                style={{
                  boxShadow: '0 2px 16px rgba(0,0,0,0.04), inset 0 1px 2px rgba(255,255,255,0.6)',
                }}
              >
                <div className="relative h-44 sm:h-52 rounded-xl overflow-hidden mb-5">
                  <img
                    src={ONBOARDING_IMAGES.buyCard.src}
                    srcSet={ONBOARDING_IMAGES.buyCard.srcSet}
                    sizes="(max-width: 768px) calc(100vw - 80px), 400px"
                    alt={ONBOARDING_IMAGES.buyCard.alt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  <div
                    className="absolute top-3 left-3 p-2.5 bg-white/70 backdrop-blur-md rounded-xl border border-white/40 transition-transform group-hover:scale-105"
                    style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
                  >
                    <SearchIcon className="w-5 h-5 text-primary" />
                  </div>
                </div>

                <h3 className="text-xl sm:text-2xl font-semibold text-neutral-900 mb-2 group-hover:text-primary transition-colors">
                  {t('nav:onboarding.lookingToBuy', "I'm looking to buy")}
                </h3>
                <p className="text-sm text-neutral-500 mb-5 leading-relaxed">
                  {t('nav:onboarding.buyDescription', 'Find your dream home with our AI-powered search tools and real-time alerts.')}
                </p>

                <div
                  className="flex items-center justify-center gap-2 py-3 px-5 bg-primary text-white rounded-xl font-medium text-sm transition-all group-hover:shadow-md"
                  style={{ boxShadow: '0 2px 12px rgba(2,82,205,0.2)' }}
                >
                  <SearchIcon className="w-4 h-4" />
                  <span>{t('nav:onboarding.startSearching', 'Start Searching')}</span>
                  <svg className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Sell Card */}
            <button
              onClick={handleSellChoice}
              className={`group relative overflow-hidden rounded-2xl transition-all duration-500 text-left ${
                activeCard === 'sell'
                  ? 'scale-[1.03] ring-2 ring-neutral-400/40'
                  : activeCard === 'buy'
                    ? 'scale-95 opacity-50'
                    : 'hover:scale-[1.02] hover:-translate-y-0.5'
              }`}
            >
              <div
                className="relative bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-5 sm:p-6 transition-all duration-500 group-hover:bg-white/80 group-hover:shadow-lg"
                style={{
                  boxShadow: '0 2px 16px rgba(0,0,0,0.04), inset 0 1px 2px rgba(255,255,255,0.6)',
                }}
              >
                <div className="relative h-44 sm:h-52 rounded-xl overflow-hidden mb-5">
                  <img
                    src={ONBOARDING_IMAGES.sellCard.src}
                    srcSet={ONBOARDING_IMAGES.sellCard.srcSet}
                    sizes="(max-width: 768px) calc(100vw - 80px), 400px"
                    alt={ONBOARDING_IMAGES.sellCard.alt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  <div
                    className="absolute top-3 left-3 p-2.5 bg-white/70 backdrop-blur-md rounded-xl border border-white/40 transition-transform group-hover:scale-105"
                    style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
                  >
                    <HomeIcon className="w-5 h-5 text-neutral-700" />
                  </div>
                </div>

                <h3 className="text-xl sm:text-2xl font-semibold text-neutral-900 mb-2 group-hover:text-neutral-600 transition-colors">
                  {t('nav:onboarding.wantToSell', 'I want to sell')}
                </h3>
                <p className="text-sm text-neutral-500 mb-5 leading-relaxed">
                  {t('nav:onboarding.sellDescription', 'List your property, reach thousands of potential buyers, and use our smart tools.')}
                </p>

                <div
                  className="flex items-center justify-center gap-2 py-3 px-5 bg-neutral-900 text-white rounded-xl font-medium text-sm transition-all group-hover:shadow-md"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
                >
                  <HomeIcon className="w-4 h-4" />
                  <span>{t('nav:onboarding.listProperty', 'List my Property')}</span>
                  <svg className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </button>
          </div>

          {/* Trusted Agencies Section */}
          {agencies.length > 0 && (
            <div
              className={`mt-14 w-full max-w-3xl transform transition-all duration-1000 delay-900 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}
            >
              <p className="text-center text-neutral-400 text-xs uppercase tracking-widest mb-5 font-medium">
                Trusted by leading agencies across the Balkans
              </p>
              <div className="flex flex-wrap justify-center items-center gap-3 md:gap-4">
                {agencies.map((agency) => (
                  <div
                    key={agency.id}
                    className="flex items-center gap-2.5 px-3.5 py-2 bg-white/50 backdrop-blur-md rounded-xl border border-white/40 hover:bg-white/70 hover:shadow-sm transition-all"
                    style={{
                      boxShadow: '0 1px 8px rgba(0,0,0,0.03)',
                    }}
                  >
                    {agency.logo ? (
                      <img
                        src={agency.logo}
                        alt={agency.name}
                        loading="lazy"
                        decoding="async"
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 font-semibold text-xs">
                        {agency.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="font-medium text-neutral-700 text-sm leading-tight">{agency.name}</p>
                      {agency.city && agency.country && (
                        <p className="text-[11px] text-neutral-400">{agency.city}, {agency.country}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom tagline */}
          <p
            className={`text-neutral-400 text-xs mt-10 text-center tracking-wide transform transition-all duration-1000 delay-1000 ${
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
