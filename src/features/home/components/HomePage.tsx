import React, { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import RecentlyViewedSection from './RecentlyViewedSection';
import {
  ContainerScroll,
  ContainerScrollTablet,
  ContainerScrollPhone,
  PhoneParade,
  VideoInTablet,
} from '@/src/components/ui/container-scroll-animation';
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
  BedIcon,
  BathIcon,
  SqftIcon,
  EyeIcon,
  StarIcon,
} from '@/constants';
import { API_CONFIG } from '@/src/shared/constants/app.constants';

const Footer = lazy(() => import('@/components/shared/Footer'));

// ── Intro video path ────────────────────────────────────────────
// Drop your intro.webm into public/videos/ and it will autoplay in the tablet frame
const INTRO_VIDEO_PATH = '/videos/intro.webm';

// ── Feature cards data ──────────────────────────────────────────
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

const stats = [
  { label: 'Properties', value: '10,000+' },
  { label: 'Countries', value: '8' },
  { label: 'Languages', value: '25+' },
  { label: 'Agents', value: '500+' },
];

// ── Device mockup screens ───────────────────────────────────────
// These are rich mock UIs that render inside each device frame

const DesktopSearchScreen: React.FC = () => (
  <div className="h-full w-full bg-white flex flex-col text-[11px]">
    {/* Header bar */}
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-1.5">
        <LogoIcon className="w-5 h-5 text-primary" />
        <span className="text-xs font-bold text-gray-800">
          Balkan<span className="text-primary">Estate</span>
        </span>
      </div>
      <div className="flex-1 mx-6 h-8 bg-gray-100 rounded-lg flex items-center px-3 gap-2">
        <SearchIcon className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-gray-400">3 bedroom apartment in Belgrade...</span>
      </div>
      <div className="flex items-center gap-3">
        <HeartIcon className="w-4 h-4 text-gray-400" />
        <BellIcon className="w-4 h-4 text-gray-400" />
      </div>
    </div>
    {/* Split view - list + map */}
    <div className="flex flex-1 min-h-0">
      {/* Property list */}
      <div className="w-[45%] p-3 overflow-hidden space-y-2.5 border-r border-gray-100">
        {[
          { price: '€185,000', beds: 3, city: 'Belgrade, Serbia', sqft: 92, img: 'bg-blue-100' },
          { price: '€120,000', beds: 2, city: 'Pristina, Kosovo', sqft: 68, img: 'bg-amber-100' },
          { price: '€245,000', beds: 4, city: 'Tirana, Albania', sqft: 140, img: 'bg-emerald-100' },
          { price: '€95,000', beds: 1, city: 'Skopje, N. Macedonia', sqft: 52, img: 'bg-rose-100' },
        ].map((p, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-100 p-2 flex gap-2.5 hover:shadow-sm transition-shadow">
            <div className={`w-20 h-14 ${p.img} rounded-md flex-shrink-0 flex items-center justify-center`}>
              <HomeIcon className="w-5 h-5 text-gray-400/60" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">{p.price}</span>
                <HeartIcon className="w-3 h-3 text-gray-300" />
              </div>
              <p className="text-gray-500 truncate">{p.city}</p>
              <div className="flex gap-2 text-gray-400 mt-0.5">
                <span className="flex items-center gap-0.5"><BedIcon className="w-3 h-3" />{p.beds}</span>
                <span className="flex items-center gap-0.5"><SqftIcon className="w-3 h-3" />{p.sqft}m²</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Map area */}
      <div className="flex-1 bg-[#e8f4e8] relative overflow-hidden">
        {/* Fake map grid */}
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="absolute border border-green-800/10" style={{
              top: `${(i * 13) % 100}%`, left: `${(i * 17 + 5) % 90}%`,
              width: `${30 + (i * 7) % 40}%`, height: `${20 + (i * 11) % 30}%`,
            }} />
          ))}
        </div>
        {/* Map pins */}
        {[
          { top: '25%', left: '30%', price: '€185K' },
          { top: '45%', left: '55%', price: '€120K' },
          { top: '65%', left: '25%', price: '€245K' },
          { top: '35%', left: '70%', price: '€95K' },
        ].map((pin, i) => (
          <div key={i} className="absolute" style={{ top: pin.top, left: pin.left }}>
            <div className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md whitespace-nowrap">
              {pin.price}
            </div>
          </div>
        ))}
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-[9px] text-gray-600 shadow-sm">
          <MapIcon className="w-3 h-3 inline mr-1 text-emerald-500" />
          Interactive Map
        </div>
      </div>
    </div>
  </div>
);

const TabletAgenciesScreen: React.FC = () => (
  <div className="h-full w-full bg-gray-50 flex flex-col text-[10px] overflow-hidden">
    <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200">
      <LogoIcon className="w-4 h-4 text-primary" />
      <span className="font-bold text-gray-800 text-xs">Agencies</span>
      <div className="flex-1" />
      <SearchIcon className="w-3.5 h-3.5 text-gray-400" />
    </div>
    <div className="flex-1 p-3 space-y-2.5 overflow-hidden">
      {[
        { name: 'Belgrade Premium Properties', agents: 12, rating: 4.9, color: 'bg-blue-500' },
        { name: 'Adriatic Coast Realty', agents: 8, rating: 4.7, color: 'bg-emerald-500' },
        { name: 'Balkan Luxury Homes', agents: 15, rating: 4.8, color: 'bg-purple-500' },
        { name: 'Sofia Living Group', agents: 6, rating: 4.6, color: 'bg-amber-500' },
        { name: 'Montenegro Bay Real Estate', agents: 9, rating: 4.8, color: 'bg-teal-500' },
      ].map((agency, i) => (
        <div key={i} className="bg-white rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm">
          <div className={`w-10 h-10 ${agency.color} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
            {agency.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{agency.name}</p>
            <div className="flex items-center gap-2 text-gray-500 mt-0.5">
              <span className="flex items-center gap-0.5">
                <UserGroupIcon className="w-3 h-3" />{agency.agents} agents
              </span>
              <span className="flex items-center gap-0.5">
                <StarIcon className="w-3 h-3 text-amber-400" />{agency.rating}
              </span>
            </div>
          </div>
          <div className="text-primary font-semibold text-[9px]">View</div>
        </div>
      ))}
    </div>
  </div>
);

const PhoneSearchScreen: React.FC = () => (
  <div className="h-full w-full bg-white flex flex-col text-[9px] pt-6">
    <div className="px-3 py-2">
      <div className="bg-gray-100 rounded-full px-3 py-2 flex items-center gap-2">
        <SearchIcon className="w-3 h-3 text-gray-400" />
        <span className="text-gray-400 text-[10px]">Search properties...</span>
      </div>
    </div>
    <div className="px-3 py-1 flex gap-1.5 overflow-hidden">
      {['Sale', 'Rent', 'Belgrade', '2+ beds'].map((tag) => (
        <span key={tag} className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[8px] font-medium whitespace-nowrap">
          {tag}
        </span>
      ))}
    </div>
    <div className="flex-1 px-3 py-2 space-y-2 overflow-hidden">
      {[
        { price: '€185K', beds: 3, area: '92m²', color: 'bg-blue-100' },
        { price: '€120K', beds: 2, area: '68m²', color: 'bg-amber-100' },
        { price: '€245K', beds: 4, area: '140m²', color: 'bg-emerald-100' },
      ].map((p, i) => (
        <div key={i} className="rounded-xl overflow-hidden border border-gray-100">
          <div className={`h-16 ${p.color} flex items-center justify-center`}>
            <HomeIcon className="w-5 h-5 text-gray-400/50" />
          </div>
          <div className="p-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900 text-[10px]">{p.price}</span>
              <HeartIcon className="w-3 h-3 text-gray-300" />
            </div>
            <div className="flex gap-2 text-gray-400 mt-0.5">
              <span><BedIcon className="w-2.5 h-2.5 inline" /> {p.beds}</span>
              <span><SqftIcon className="w-2.5 h-2.5 inline" /> {p.area}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PhoneSavedScreen: React.FC = () => (
  <div className="h-full w-full bg-gray-50 flex flex-col text-[9px] pt-6">
    <div className="px-3 py-2 flex items-center justify-between">
      <span className="font-bold text-gray-900 text-xs">Saved Properties</span>
      <span className="text-primary text-[10px] font-medium">4 saved</span>
    </div>
    <div className="flex-1 px-3 space-y-2 overflow-hidden">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-lg p-2 flex gap-2 shadow-sm">
          <div className="w-12 h-10 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
            <HomeIcon className="w-3 h-3 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="h-2 bg-gray-200 rounded w-3/4" />
            <div className="h-1.5 bg-gray-100 rounded w-1/2 mt-1" />
          </div>
          <HeartIcon className="w-3 h-3 text-rose-500 flex-shrink-0" />
        </div>
      ))}
    </div>
  </div>
);

const PhoneAIScreen: React.FC = () => (
  <div className="h-full w-full bg-white flex flex-col text-[9px] pt-6">
    <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
      <SparklesIcon className="w-4 h-4 text-primary" />
      <span className="font-bold text-gray-900 text-xs">AI Assistant</span>
    </div>
    <div className="flex-1 px-3 py-2 space-y-2 overflow-hidden">
      {/* User message */}
      <div className="flex justify-end">
        <div className="bg-primary text-white px-2.5 py-1.5 rounded-xl rounded-tr-sm max-w-[80%] text-[9px]">
          Find me a 2-bedroom apartment near the center of Belgrade under €150K
        </div>
      </div>
      {/* AI response */}
      <div className="flex justify-start">
        <div className="bg-gray-100 text-gray-800 px-2.5 py-1.5 rounded-xl rounded-tl-sm max-w-[85%] text-[9px]">
          I found 12 properties matching your criteria! Here are the top 3 picks based on value and location...
        </div>
      </div>
      {/* Mini property cards */}
      <div className="space-y-1.5 pl-1">
        {['€125,000 - 2BD, Vračar', '€138,000 - 2BD, Dorćol'].map((p, i) => (
          <div key={i} className="bg-blue-50 border border-blue-100 rounded-lg px-2 py-1.5 text-[8px] text-gray-700">
            {p}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const PhoneMapScreen: React.FC = () => (
  <div className="h-full w-full bg-[#e8f4e8] flex flex-col text-[9px] pt-6 relative">
    <div className="absolute top-6 left-0 right-0 z-10 px-3 py-2">
      <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm flex items-center gap-2">
        <MapIcon className="w-3 h-3 text-emerald-500" />
        <span className="text-gray-600 text-[10px]">Draw to search area</span>
      </div>
    </div>
    {/* Fake map */}
    <div className="flex-1 relative">
      {[
        { top: '30%', left: '25%', price: '€85K' },
        { top: '45%', left: '60%', price: '€195K' },
        { top: '60%', left: '35%', price: '€150K' },
      ].map((pin, i) => (
        <div key={i} className="absolute" style={{ top: pin.top, left: pin.left }}>
          <div className="bg-primary text-white text-[7px] font-bold px-1 py-0.5 rounded-full shadow">
            {pin.price}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── Main HomePage ───────────────────────────────────────────────
const HomePage: React.FC = () => {
  const { t } = useTranslation('common');
  const { state, dispatch } = useAppContext();
  const { navigate } = useLocalizedNavigation();
  const { recentlyViewed, clearHistory } = useRecentlyViewed(state.isAuthenticated);

  const handleNavigate = (route: string) => {
    navigate(route);
  };

  const handlePropertyClick = (propertyId: string) => {
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
        navigate(`/property/${propertyId}`);
      });
  };

  return (
    <div className="min-h-screen bg-white overflow-y-auto overflow-x-hidden">
      {/* ════════════════════════════════════════════════════════
          1. HERO SECTION
          ════════════════════════════════════════════════════════ */}
      <section className="relative pt-12 pb-8 md:pt-20 md:pb-16 overflow-hidden">
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

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-12 flex items-center justify-center gap-8 md:gap-16"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          2. RECENTLY VIEWED (logged-in users only)
          ════════════════════════════════════════════════════════ */}
      {state.isAuthenticated && recentlyViewed.length > 0 && (
        <section className="max-w-6xl mx-auto px-4">
          <RecentlyViewedSection
            items={recentlyViewed}
            onPropertyClick={handlePropertyClick}
            onClear={clearHistory}
          />
        </section>
      )}

      {/* ════════════════════════════════════════════════════════
          3. DESKTOP SCROLL — Property search (Aceternity animation)
          ════════════════════════════════════════════════════════ */}
      <ContainerScroll
        titleComponent={
          <>
            <h2 className="text-4xl font-semibold text-gray-900">
              Powerful Property Search <br />
              <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none text-primary">
                Right at Your Fingertips
              </span>
            </h2>
          </>
        }
      >
        <DesktopSearchScreen />
      </ContainerScroll>

      {/* ════════════════════════════════════════════════════════
          4. TABLET SCROLL — Intro video in tablet frame
          ════════════════════════════════════════════════════════ */}
      <ContainerScrollTablet
        titleComponent={
          <>
            <p className="text-sm font-medium text-primary mb-2">See it in action</p>
            <h2 className="text-4xl font-semibold text-gray-900">
              Experience the App <br />
              <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none text-primary">
                Live Demo
              </span>
            </h2>
          </>
        }
      >
        <VideoInTablet src={INTRO_VIDEO_PATH} />
      </ContainerScrollTablet>

      {/* ════════════════════════════════════════════════════════
          5. TABLET SCROLL — Agencies view
          ════════════════════════════════════════════════════════ */}
      <ContainerScrollTablet
        titleComponent={
          <>
            <p className="text-sm font-medium text-indigo-500 mb-2">Trusted partners</p>
            <h2 className="text-4xl font-semibold text-gray-900">
              Top Agencies & Agents <br />
              <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none text-indigo-500">
                Across the Balkans
              </span>
            </h2>
          </>
        }
      >
        <TabletAgenciesScreen />
      </ContainerScrollTablet>

      {/* ════════════════════════════════════════════════════════
          6. PHONE SCROLL — Single phone with Aceternity animation
          ════════════════════════════════════════════════════════ */}
      <ContainerScrollPhone
        titleComponent={
          <>
            <p className="text-sm font-medium text-primary mb-2">Mobile-first design</p>
            <h2 className="text-4xl font-semibold text-gray-900">
              Every Feature <br />
              <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none text-primary">
                In Your Pocket
              </span>
            </h2>
          </>
        }
      >
        <PhoneSearchScreen />
      </ContainerScrollPhone>

      {/* ════════════════════════════════════════════════════════
          6b. PHONE PARADE — Multiple phones appearing together
          ════════════════════════════════════════════════════════ */}
      <PhoneParade
        titleComponent={
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-sm font-medium text-primary mb-2">All your tools</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Search, Chat, Map, Save
            </h2>
          </motion.div>
        }
        phones={[
          { content: <PhoneSearchScreen />, label: 'Search' },
          { content: <PhoneAIScreen />, label: 'AI Chat' },
          { content: <PhoneMapScreen />, label: 'Map View' },
          { content: <PhoneSavedScreen />, label: 'Saved' },
        ]}
      />

      {/* ════════════════════════════════════════════════════════
          7. FEATURES GRID
          ════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-sm font-medium text-primary mb-2">Everything you need</p>
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
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${feature.color} mb-3`}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{feature.title}</h3>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          8. CTA BANNER
          ════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-8 md:p-12 text-center overflow-hidden"
          >
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

      {/* ════════════════════════════════════════════════════════
          9. FOOTER
          ════════════════════════════════════════════════════════ */}
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default HomePage;
