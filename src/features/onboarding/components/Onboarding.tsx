import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { LogoIcon, HomeIcon, BuildingOfficeIcon } from '@/constants';

/* ---------------- 3D HOUSE IMAGE ---------------- */
const HERO_IMAGE = {
  // Modern 3D isometric house - using a stunning architectural render
  src: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=800&fit=crop&q=90&fm=webp',
  alt: 'Modern luxury home',
};

/* ---------------- AVATAR STACK ---------------- */
const AVATARS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80&fm=webp',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&q=80&fm=webp',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&q=80&fm=webp',
];

/* ---------------- MAIN COMPONENT ---------------- */
const Onboarding: React.FC = () => {
  const { t } = useTranslation(['common', 'nav']);
  const { dispatch } = useAppContext();
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleBuyChoice = () => {
    dispatch({ type: 'COMPLETE_ONBOARDING' });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
  };

  const handleSellChoice = () => {
    dispatch({ type: 'COMPLETE_ONBOARDING' });
    dispatch({ type: 'SET_PENDING_REDIRECT', payload: 'create-listing' });
    dispatch({
      type: 'TOGGLE_AUTH_MODAL',
      payload: { isOpen: true, view: 'signup' },
    });
  };

  return (
    <>
      <Helmet>
        <link rel="preload" as="image" href={HERO_IMAGE.src} />
      </Helmet>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }

        .animate-float {
          animation: float 4s ease-in-out infinite;
        }

        .animate-scaleIn {
          animation: scaleIn 0.8s ease-out forwards;
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.6s ease-out forwards;
        }

        .animate-slideInRight {
          animation: slideInRight 0.6s ease-out forwards;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-stone-100 via-stone-50 to-white relative overflow-hidden flex flex-col">

        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-100/50 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-amber-100/50 to-transparent rounded-full blur-3xl" />
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex-1 flex flex-col px-6 pt-8 pb-6 max-w-lg mx-auto w-full">

          {/* Header with Logo */}
          <div className={`flex justify-center mb-6 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg">
                <LogoIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">
                BalkanEstate<span className="text-blue-600">AI</span>
              </span>
            </div>
          </div>

          {/* Avatar Stack */}
          <div className={`flex justify-center mb-6 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex items-center">
              <div className="flex -space-x-3">
                {AVATARS.map((avatar, index) => (
                  <div
                    key={index}
                    className="w-11 h-11 rounded-full border-3 border-white shadow-md overflow-hidden bg-gray-200"
                    style={{ zIndex: AVATARS.length - index }}
                  >
                    <img
                      src={avatar}
                      alt={`User ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
              <div className="ml-2 px-3 py-1.5 bg-white rounded-full shadow-md border border-gray-100">
                <span className="text-sm font-semibold text-gray-800">1k+</span>
              </div>
            </div>
          </div>

          {/* Headline */}
          <div className={`text-center mb-4 transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight">
              {t('nav:onboarding.headline', 'Perfect choice for')}
              <br />
              <span className="text-gray-900">{t('nav:onboarding.headlineHighlight', 'your future')}</span>
            </h1>
          </div>

          {/* Subtitle */}
          <div className={`text-center mb-6 transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <p className="text-gray-500 text-base leading-relaxed max-w-xs mx-auto">
              {t('nav:onboarding.tagline', 'Our properties the masterpiece for every client with lasting value.')}
            </p>
          </div>

          {/* 3D House Image */}
          <div className={`flex-1 flex items-center justify-center relative min-h-[280px] sm:min-h-[350px] transition-all duration-1000 delay-400 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            {/* Shadow beneath house */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-8 bg-black/10 rounded-full blur-xl" />

            {/* House Image */}
            <div className={`relative ${imageLoaded ? 'animate-float' : ''}`}>
              {!imageLoaded && (
                <div className="w-72 h-72 sm:w-80 sm:h-80 bg-gray-200 rounded-3xl animate-pulse" />
              )}
              <img
                src={HERO_IMAGE.src}
                alt={HERO_IMAGE.alt}
                className={`w-72 h-72 sm:w-80 sm:h-80 object-cover rounded-3xl shadow-2xl transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}
                onLoad={() => setImageLoaded(true)}
                loading="eager"
              />

              {/* Decorative elements */}
              <div className="absolute -top-3 -right-3 w-12 h-12 bg-blue-500 rounded-2xl shadow-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">NEW</span>
              </div>
              <div className="absolute -bottom-2 -left-2 px-3 py-1.5 bg-white rounded-full shadow-lg border border-gray-100">
                <span className="text-xs font-semibold text-gray-700">10K+ Properties</span>
              </div>
            </div>
          </div>

          {/* Bottom Buttons */}
          <div className={`mt-auto pt-6 transition-all duration-700 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex gap-4">
              {/* Buy Button */}
              <button
                onClick={handleBuyChoice}
                className="flex-1 group relative overflow-hidden bg-black text-white py-4 px-6 rounded-2xl font-semibold text-base transition-all duration-300 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex items-center justify-center gap-2">
                  <HomeIcon className="w-5 h-5" />
                  <span>{t('nav:onboarding.buyButton', 'Buying')}</span>
                </div>
              </button>

              {/* Sell Button */}
              <button
                onClick={handleSellChoice}
                className="flex-1 group bg-white text-gray-900 py-4 px-6 rounded-2xl font-semibold text-base border-2 border-gray-200 transition-all duration-300 hover:border-gray-900 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <div className="flex items-center justify-center gap-2">
                  <BuildingOfficeIcon className="w-5 h-5" />
                  <span>{t('nav:onboarding.sellButton', 'Selling')}</span>
                </div>
              </button>
            </div>
          </div>

          {/* Footer Text */}
          <div className={`text-center mt-4 transition-all duration-700 delay-600 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-xs text-gray-400">
              {t('common:footer.copyright', { year: new Date().getFullYear() })}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Onboarding;
