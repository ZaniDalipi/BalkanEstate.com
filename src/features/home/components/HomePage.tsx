import React, { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import RecentlyViewedSection from './RecentlyViewedSection';
import { DeviceShowcase } from '@/src/components/ui/container-scroll';
import {
  SearchIcon,
  MapIcon,
  HeartIcon,
  SparklesIcon,
  ChartBarIcon,
  HomeIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  GlobeAltIcon,
  LogoIcon,
  BellIcon,
  KeyIcon,
  ArrowTopRightOnSquareIcon,
} from '@/constants';
import { API_CONFIG } from '@/src/shared/constants/app.constants';

const Footer = lazy(() => import('@/components/shared/Footer'));

// ── Feature cards data ──────────────────────────────────────────────
const features = [
  {
    icon: SearchIcon,
    title: 'Smart Search',
    description: 'AI-powered property search with natural language. Just describe what you want.',
    color: 'bg-blue-50 text-blue-600',
    route: '/search',
  },
  {
    icon: MapIcon,
    title: 'Interactive Map',
    description: 'Draw on the map to define your search area. Explore properties visually.',
    color: 'bg-emerald-50 text-emerald-600',
    route: '/search',
  },
  {
    icon: SparklesIcon,
    title: 'AI Assistant',
    description: 'Chat with our AI to find the perfect property. Personalized recommendations.',
    color: 'bg-purple-50 text-purple-600',
    route: '/search',
  },
  {
    icon: ChartBarIcon,
    title: 'Market Analytics',
    description: 'Track property trends, price changes, and market insights across the Balkans.',
    color: 'bg-amber-50 text-amber-600',
    route: '/analytics',
  },
  {
    icon: HeartIcon,
    title: 'Save & Compare',
    description: 'Save your favorite properties and compare them side by side.',
    color: 'bg-rose-50 text-rose-600',
    route: '/saved-properties',
  },
  {
    icon: BuildingOfficeIcon,
    title: 'Agency Hub',
    description: 'Connect with trusted real estate agencies across the Balkans.',
    color: 'bg-indigo-50 text-indigo-600',
    route: '/agencies',
  },
  {
    icon: UserGroupIcon,
    title: 'Expert Agents',
    description: 'Find verified agents with ratings, credentials, and local expertise.',
    color: 'bg-teal-50 text-teal-600',
    route: '/agents',
  },
  {
    icon: GlobeAltIcon,
    title: '25+ Languages',
    description: 'Browse in your language. Full localization across the platform.',
    color: 'bg-cyan-50 text-cyan-600',
    route: '/search',
  },
  {
    icon: BellIcon,
    title: 'Instant Alerts',
    description: 'Get notified when new properties match your saved search criteria.',
    color: 'bg-orange-50 text-orange-600',
    route: '/saved-searches',
  },
  {
    icon: KeyIcon,
    title: 'Rentals',
    description: 'Find monthly, weekly, or daily rentals with detailed terms and history.',
    color: 'bg-lime-50 text-lime-600',
    route: '/rentals',
  },
  {
    icon: HomeIcon,
    title: 'Property Valuation',
    description: 'Get instant AI-powered property value estimates based on market data.',
    color: 'bg-fuchsia-50 text-fuchsia-600',
    route: '/valuation',
  },
  {
    icon: ArrowTopRightOnSquareIcon,
    title: 'Virtual Tours',
    description: '360° tours and video walkthroughs. Explore properties from anywhere.',
    color: 'bg-sky-50 text-sky-600',
    route: '/search',
  },
];

// ── Stat counters ───────────────────────────────────────────────────
const stats = [
  { label: 'Properties', value: '10,000+' },
  { label: 'Countries', value: '8' },
  { label: 'Languages', value: '25+' },
  { label: 'Agents', value: '500+' },
];

// ── Device mockup content ───────────────────────────────────────────
const DesktopMockup: React.FC = () => (
  <div className="h-full w-full bg-white flex flex-col overflow-hidden">
    {/* Mock header */}
    <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center gap-1.5">
        <LogoIcon className="w-5 h-5 text-primary" />
        <span className="text-xs font-bold text-gray-800">Balkan Estate</span>
      </div>
      <div className="flex-1 mx-8 h-7 bg-gray-100 rounded-lg flex items-center px-3">
        <SearchIcon className="w-3 h-3 text-gray-400" />
        <span className="text-[10px] text-gray-400 ml-2">Search properties...</span>
      </div>
    </div>
    {/* Mock split view */}
    <div className="flex flex-1 min-h-0">
      <div className="w-1/2 p-3 overflow-hidden space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 rounded-lg p-2 flex gap-2 animate-pulse">
            <div className="w-16 h-12 bg-gray-200 rounded-md flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2 bg-gray-200 rounded w-3/4" />
              <div className="h-2 bg-gray-200 rounded w-1/2" />
              <div className="h-2 bg-primary/20 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
      <div className="w-1/2 bg-emerald-50 flex items-center justify-center border-l border-gray-200">
        <div className="text-center">
          <MapIcon className="w-8 h-8 text-emerald-400 mx-auto" />
          <p className="text-[10px] text-emerald-600 mt-1">Interactive Map</p>
        </div>
      </div>
    </div>
  </div>
);

const TabletMockup: React.FC = () => (
  <div className="h-full w-full bg-white flex flex-col overflow-hidden">
    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
      <LogoIcon className="w-4 h-4 text-primary" />
      <span className="text-[10px] font-bold text-gray-800">Balkan Estate</span>
      <div className="flex-1" />
      <HeartIcon className="w-3.5 h-3.5 text-gray-400" />
    </div>
    <div className="flex-1 p-3 space-y-2 overflow-hidden">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-gray-50 rounded-lg p-2 flex gap-2">
          <div className="w-20 h-14 bg-gray-200 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2 bg-gray-200 rounded w-2/3" />
            <div className="h-2 bg-gray-200 rounded w-1/2" />
            <div className="h-2 bg-primary/20 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MobileMockup: React.FC = () => (
  <div className="h-full w-full bg-white flex flex-col overflow-hidden">
    <div className="flex items-center px-3 py-2 border-b border-gray-200 bg-gray-50">
      <LogoIcon className="w-4 h-4 text-primary" />
      <span className="text-[9px] font-bold text-gray-800 ml-1">Balkan Estate</span>
    </div>
    <div className="flex-1 p-2 space-y-2 overflow-hidden">
      <div className="h-24 bg-gray-100 rounded-lg flex items-center justify-center">
        <MapIcon className="w-6 h-6 text-emerald-400" />
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="bg-gray-50 rounded-lg p-1.5 flex gap-1.5">
          <div className="w-14 h-10 bg-gray-200 rounded flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-1.5 bg-gray-200 rounded w-3/4" />
            <div className="h-1.5 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
    {/* Bottom nav */}
    <div className="flex items-center justify-around py-1.5 border-t border-gray-200 bg-gray-50">
      <SearchIcon className="w-3.5 h-3.5 text-primary" />
      <HeartIcon className="w-3.5 h-3.5 text-gray-400" />
      <HomeIcon className="w-3.5 h-3.5 text-gray-400" />
    </div>
  </div>
);

// ── Main HomePage ───────────────────────────────────────────────────
const HomePage: React.FC = () => {
  const { t } = useTranslation('common');
  const { state, dispatch } = useAppContext();
  const { navigate } = useLocalizedNavigation();
  const { recentlyViewed, clearHistory } = useRecentlyViewed(state.isAuthenticated);

  const handleNavigate = (route: string) => {
    navigate(route);
  };

  const handlePropertyClick = (propertyId: string) => {
    // Fetch property and open details
    fetch(`${API_CONFIG.BASE_URL}/properties/${propertyId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.property) {
          const property = {
            ...data.property,
            id: data.property._id || data.property.id,
            sellerId: data.property.sellerId?._id || data.property.sellerId,
          };
          dispatch({ type: 'SET_SELECTED_PROPERTY_OBJECT', payload: property });
        }
      })
      .catch(() => {
        // Navigate to property URL as fallback
        navigate(`/property/${propertyId}`);
      });
  };

  return (
    <div className="min-h-screen bg-white overflow-y-auto overflow-x-hidden">
      {/* ── Hero Section ─────────────────────────────────────── */}
      <section className="relative pt-12 pb-8 md:pt-20 md:pb-16 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 -z-10" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <LogoIcon className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
              Find Your Dream Home
              <br />
              <span className="text-primary">Across the Balkans</span>
            </h1>
            <p className="mt-4 text-lg md:text-xl text-gray-500 max-w-2xl mx-auto">
              AI-powered real estate platform covering 8+ countries. Search, compare,
              and connect with verified agents — all in one place.
            </p>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <button
              onClick={() => handleNavigate('/search')}
              className="px-8 py-3.5 bg-primary text-white rounded-xl font-semibold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
            >
              <SearchIcon className="w-5 h-5" />
              Start Searching
            </button>
            <button
              onClick={() => handleNavigate('/how-it-works/getting-started')}
              className="px-8 py-3.5 bg-white text-gray-700 rounded-xl font-semibold text-base border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              How It Works
            </button>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-12 flex items-center justify-center gap-8 md:gap-16"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-gray-900">
                  {stat.value}
                </p>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Recently Viewed (logged-in users) ────────────────── */}
      {state.isAuthenticated && recentlyViewed.length > 0 && (
        <section className="max-w-6xl mx-auto px-4">
          <RecentlyViewedSection
            items={recentlyViewed}
            onPropertyClick={handlePropertyClick}
            onClear={clearHistory}
          />
        </section>
      )}

      {/* ── Device Showcase (scroll animation) ───────────────── */}
      <DeviceShowcase
        titleComponent={
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-sm font-medium text-primary mb-2">
              Works everywhere
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Beautiful on Every Device
            </h2>
            <p className="text-gray-500 mt-2 max-w-lg mx-auto text-base">
              Scroll to see the experience across desktop, tablet, and mobile.
            </p>
          </motion.div>
        }
        desktopContent={<DesktopMockup />}
        tabletContent={<TabletMockup />}
        mobileContent={<MobileMockup />}
      />

      {/* ── Features Grid ────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-sm font-medium text-primary mb-2">
                Everything you need
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Powerful Features
              </h2>
              <p className="text-gray-500 mt-3 max-w-xl mx-auto">
                From AI search to market analytics — every tool you need to find,
                compare, and secure your perfect property.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                onClick={() => handleNavigate(feature.route)}
                className="group bg-white rounded-xl p-5 border border-gray-100 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${feature.color} mb-3`}
                >
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  {feature.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-8 md:p-12 text-center overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                Ready to Find Your Perfect Property?
              </h2>
              <p className="text-blue-100 mt-3 max-w-lg mx-auto">
                Join thousands of buyers and sellers across the Balkans.
                Start your search today.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => handleNavigate('/search')}
                  className="px-8 py-3 bg-white text-primary rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                >
                  Browse Properties
                </button>
                {!state.isAuthenticated && (
                  <button
                    onClick={() => dispatch({ type: 'OPEN_AUTH_MODAL' })}
                    className="px-8 py-3 bg-white/10 text-white rounded-xl font-semibold border border-white/20 hover:bg-white/20 transition-all duration-200"
                  >
                    Create Account
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default HomePage;
