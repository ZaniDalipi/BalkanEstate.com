import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import { buildLocalizedPath } from '../../src/utils/languageRouting';
import { HowItWorksTab } from '../../types';
import Footer from './Footer';

interface SiteVideo {
  _id: string;
  key: string;
  url: string;
  title: string;
  description?: string;
  subsection?: string;
}

// Video placeholder component that shows video if available
const VideoPlaceholder: React.FC<{
  videoKey: string;
  videos: Record<string, SiteVideo[]>;
  fallbackIcon: React.ReactNode;
  fallbackTitle: string;
  fallbackSubtitle?: string;
  className?: string;
  onClick?: () => void;
}> = ({ videoKey, videos, fallbackIcon, fallbackTitle, fallbackSubtitle, className = '', onClick }) => {
  const subsection = videoKey.split('-')[0];
  const sectionVideos = videos[subsection] || [];
  const video = sectionVideos.find(v => v.key === videoKey);

  if (video) {
    return (
      <div className={`relative ${className}`} onClick={onClick}>
        <video
          src={video.url}
          className="w-full h-full object-cover rounded-lg"
          controls
          preload="metadata"
          poster={`${video.url.replace(/\.[^.]+$/, '.jpg')}`}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${className} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={onClick}
    >
      <div className="text-center">
        {fallbackIcon}
        <p className="font-medium">{fallbackTitle}</p>
        {fallbackSubtitle && <p className="text-sm opacity-70">{fallbackSubtitle}</p>}
      </div>
    </div>
  );
};
import {
  FloatingSphere,
  GlossyPill,
  AbstractBlob,
  WaveRibbon,
  GlassyDonut,
  Decorative3DStyles
} from './Decorative3D';

// Icons
const BuildingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const UserGroupIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const HomeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const HeartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const ChatIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const TicketIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
  </svg>
);

const StarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const MapIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const ChartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const RulerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6l.707.707M6 6l-.707.707M6 6v12m0-12h12m0 12v.707M18 18h-.707M18 18l.707-.707M18 18l-.707.707M18 18V6m0 12H6m12-12h.707M18 6l-.707.707M18 6l.707-.707M6 18l.707-.707M6 18l-.707.707M6 18v-.707" />
  </svg>
);

const LocationMarkerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LightBulbIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const CalculatorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const FireIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
  </svg>
);

const HowItWorksPage: React.FC = () => {
  const { t } = useTranslation(['howItWorks']);
  const { state, dispatch } = useAppContext();
  const activeTab = state.howItWorksTab;
  const [videos, setVideos] = useState<Record<string, SiteVideo[]>>({});

  // Fetch how-it-works videos
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_URL}/site-content/how-it-works`);
        if (response.ok) {
          const data = await response.json();
          setVideos(data);
        }
      } catch (err) {
        console.error('Failed to fetch how-it-works videos:', err);
      }
    };
    fetchVideos();
  }, []);

  // Navigation helper
  const navigateTo = (path: string) => {
    window.location.href = buildLocalizedPath(path);
  };

  const handleTabChange = (tabId: HowItWorksTab) => {
    dispatch({ type: 'SET_HOW_IT_WORKS_TAB', payload: tabId });
    window.history.pushState({}, '', buildLocalizedPath(`/how-it-works/${tabId}`));
  };

  const tabs = [
    { id: 'getting-started' as HowItWorksTab, label: t('howItWorks:tabs.gettingStarted'), icon: StarIcon, color: 'cyan' },
    { id: 'premium-features' as HowItWorksTab, label: t('howItWorks:tabs.premiumFeatures'), icon: SparklesIcon, color: 'amber' },
    { id: 'agencies' as HowItWorksTab, label: t('howItWorks:tabs.forAgencies'), icon: BuildingIcon, color: 'orange' },
    { id: 'agents' as HowItWorksTab, label: t('howItWorks:tabs.forAgents'), icon: UserGroupIcon, color: 'purple' },
    { id: 'buyers' as HowItWorksTab, label: t('howItWorks:tabs.forBuyers'), icon: SearchIcon, color: 'blue' },
    { id: 'sellers' as HowItWorksTab, label: t('howItWorks:tabs.forSellers'), icon: HomeIcon, color: 'green' },
  ];

  const getTabColor = (tab: HowItWorksTab) => {
    const colors: Record<HowItWorksTab, string> = {
      'getting-started': 'cyan',
      'premium-features': 'amber',
      agencies: 'orange',
      agents: 'purple',
      buyers: 'blue',
      sellers: 'green',
    };
    return colors[tab];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white relative">
      {/* Include 3D animation styles */}
      <Decorative3DStyles />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-primary-darker text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRoLTEydi0yaDEydjJ6bS0xMi0xMGgxMnYySDI0di0yem0xMiA2SDI0di0yaDEydjJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>

        {/* 3D Decorative Elements in Hero */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Floating sphere - top right */}
          <div className="absolute -top-8 right-[8%] opacity-20 hidden lg:block">
            <FloatingSphere size="lg" color="cyan" />
          </div>

          {/* Floating sphere - bottom left */}
          <div className="absolute bottom-[20%] left-[5%] opacity-15 hidden lg:block">
            <FloatingSphere size="md" color="pink" animate={false} />
          </div>

          {/* Abstract blob */}
          <div className="absolute top-[30%] -right-20 opacity-10 hidden xl:block">
            <AbstractBlob variant={3} color="blue" />
          </div>

          {/* Glossy pill */}
          <div className="absolute bottom-[25%] right-[10%] opacity-15 hidden lg:block rotate-[20deg]">
            <GlossyPill orientation="vertical" size="md" color="cyan" />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 relative">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {t('howItWorks:hero.title')}
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              {t('howItWorks:hero.subtitle')}
            </p>
          </div>
        </div>
        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 100V0C240 66 480 100 720 100C960 100 1200 66 1440 0V100H0Z" fill="#fafafa"/>
          </svg>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-wrap gap-2 justify-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  isActive
                    ? `bg-${tab.color}-500 text-white shadow-md`
                    : `text-neutral-600 hover:bg-neutral-100`
                }`}
                style={isActive ? { backgroundColor: tab.color === 'cyan' ? '#06b6d4' : tab.color === 'orange' ? '#f97316' : tab.color === 'purple' ? '#a855f7' : tab.color === 'blue' ? '#3b82f6' : '#22c55e' } : {}}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Getting Started */}
        {activeTab === 'getting-started' && (
          <div className="animate-fade-in">
            {/* Main Value Prop */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-100 rounded-full mb-4">
                <StarIcon className="w-8 h-8 text-cyan-600" />
              </div>
              <h2 className="text-3xl font-bold text-neutral-800 mb-3">{t('howItWorks:gettingStarted.welcome.title')}</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                {t('howItWorks:gettingStarted.welcome.subtitle')}
              </p>
            </div>

            {/* Quick Navigation Overview */}
            <div className="bg-gradient-to-br from-cyan-500 to-teal-600 rounded-3xl p-8 md:p-12 text-white mb-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative">
                <h3 className="text-2xl font-bold mb-6 text-center">{t('howItWorks:gettingStarted.mainNavigation.title')}</h3>
                <div className="grid md:grid-cols-5 gap-4">
                  {[
                    { name: t('howItWorks:gettingStarted.mainNavigation.home.name'), desc: t('howItWorks:gettingStarted.mainNavigation.home.desc'), icon: HomeIcon, path: '/' },
                    { name: t('howItWorks:gettingStarted.mainNavigation.search.name'), desc: t('howItWorks:gettingStarted.mainNavigation.search.desc'), icon: SearchIcon, path: '/search' },
                    { name: t('howItWorks:gettingStarted.mainNavigation.agents.name'), desc: t('howItWorks:gettingStarted.mainNavigation.agents.desc'), icon: UserGroupIcon, path: '/agents' },
                    { name: t('howItWorks:gettingStarted.mainNavigation.agencies.name'), desc: t('howItWorks:gettingStarted.mainNavigation.agencies.desc'), icon: BuildingIcon, path: '/agencies' },
                    { name: t('howItWorks:gettingStarted.mainNavigation.explore.name'), desc: t('howItWorks:gettingStarted.mainNavigation.explore.desc'), icon: MapIcon, path: '/explore' },
                  ].map((nav) => {
                    const NavIcon = nav.icon;
                    return (
                      <button
                        key={nav.name}
                        onClick={() => navigateTo(nav.path)}
                        className="bg-white/20 backdrop-blur rounded-xl p-4 text-center hover:bg-white/30 hover:scale-105 transition-all cursor-pointer"
                      >
                        <NavIcon className="w-8 h-8 mx-auto mb-2" />
                        <h4 className="font-semibold">{nav.name}</h4>
                        <p className="text-xs text-cyan-100 mt-1">{nav.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 1: Creating an Account */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold">1</div>
                <h3 className="text-2xl font-bold text-neutral-800">{t('howItWorks:gettingStarted.createAccount.title')}</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Video/Screenshot placeholder */}
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                  <VideoPlaceholder
                    videoKey="getting-started-create-account"
                    videos={videos}
                    fallbackIcon={<UserIcon className="w-16 h-16 text-cyan-300 mx-auto mb-2" />}
                    fallbackTitle={t('howItWorks:gettingStarted.createAccount.signUpModal')}
                    fallbackSubtitle={t('howItWorks:gettingStarted.createAccount.clickSignUp')}
                    className="aspect-video bg-gradient-to-br from-cyan-100 to-teal-50"
                  />
                </div>

                {/* Steps */}
                <div className="space-y-4">
                  <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-cyan-600 font-semibold text-sm">1</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-800 mb-1">{t('howItWorks:gettingStarted.createAccount.step1.title')}</h4>
                        <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.createAccount.step1.desc')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-cyan-600 font-semibold text-sm">2</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-800 mb-1">{t('howItWorks:gettingStarted.createAccount.step2.title')}</h4>
                        <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.createAccount.step2.desc')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-cyan-600 font-semibold text-sm">3</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-800 mb-1">{t('howItWorks:gettingStarted.createAccount.step3.title')}</h4>
                        <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.createAccount.step3.desc')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-cyan-600 font-semibold text-sm">4</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-800 mb-1">{t('howItWorks:gettingStarted.createAccount.step4.title')}</h4>
                        <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.createAccount.step4.desc')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Using the Map Search */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <h3 className="text-2xl font-bold text-neutral-800">{t('howItWorks:gettingStarted.interactiveMap.title')}</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Steps */}
                <div className="space-y-4">
                  <p className="text-neutral-600 mb-4">
                    {t('howItWorks:gettingStarted.interactiveMap.intro')}
                  </p>
                  <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <MapIcon className="w-6 h-6 text-blue-500 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-neutral-800 mb-1">{t('howItWorks:gettingStarted.interactiveMap.panZoom.title')}</h4>
                        <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.interactiveMap.panZoom.desc')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
                    <div className="flex items-start gap-3">
                      <SearchIcon className="w-6 h-6 text-purple-500 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-neutral-800 mb-1">{t('howItWorks:gettingStarted.interactiveMap.drawCustomAreas.title')}</h4>
                        <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.interactiveMap.drawCustomAreas.desc')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                    <div className="flex items-start gap-3">
                      <HomeIcon className="w-6 h-6 text-green-500 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-neutral-800 mb-1">{t('howItWorks:gettingStarted.interactiveMap.clickProperties.title')}</h4>
                        <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.interactiveMap.clickProperties.desc')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
                    <div className="flex items-start gap-3">
                      <StarIcon className="w-6 h-6 text-orange-500 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-neutral-800 mb-1">{t('howItWorks:gettingStarted.interactiveMap.filterResults.title')}</h4>
                        <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.interactiveMap.filterResults.desc')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Video/Screenshot placeholder - clickable to search */}
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigateTo('/search')}>
                  <VideoPlaceholder
                    videoKey="getting-started-map-search"
                    videos={videos}
                    fallbackIcon={<MapIcon className="w-16 h-16 text-blue-300 mx-auto mb-2" />}
                    fallbackTitle={t('howItWorks:gettingStarted.interactiveMap.mapView')}
                    fallbackSubtitle={t('howItWorks:gettingStarted.interactiveMap.mapViewDesc')}
                    className="aspect-video bg-gradient-to-br from-blue-100 to-indigo-50"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Saving Properties */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold">3</div>
                <h3 className="text-2xl font-bold text-neutral-800">{t('howItWorks:gettingStarted.savingProperties.title')}</h3>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <button
                  onClick={() => navigateTo('/account?tab=favorites')}
                  className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] text-left"
                >
                  <div className="aspect-square bg-gradient-to-br from-red-100 to-pink-50 flex items-center justify-center">
                    <div className="text-center p-4">
                      <HeartIcon className="w-12 h-12 text-red-400 mx-auto mb-2" />
                      <p className="text-red-500 font-semibold">{t('howItWorks:gettingStarted.savingProperties.saveToFavorites.title')}</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <h4 className="font-semibold text-neutral-800 mb-2">{t('howItWorks:gettingStarted.savingProperties.saveToFavorites.heading')}</h4>
                    <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.savingProperties.saveToFavorites.desc')}</p>
                  </div>
                </button>

                <button
                  onClick={() => navigateTo('/account?tab=saved-searches')}
                  className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] text-left"
                >
                  <div className="aspect-square bg-gradient-to-br from-purple-100 to-indigo-50 flex items-center justify-center">
                    <div className="text-center p-4">
                      <SearchIcon className="w-12 h-12 text-purple-400 mx-auto mb-2" />
                      <p className="text-purple-500 font-semibold">{t('howItWorks:gettingStarted.savingProperties.saveSearch.title')}</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <h4 className="font-semibold text-neutral-800 mb-2">{t('howItWorks:gettingStarted.savingProperties.saveSearch.heading')}</h4>
                    <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.savingProperties.saveSearch.desc')}</p>
                  </div>
                </button>

                <button
                  onClick={() => navigateTo('/account?tab=settings')}
                  className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] text-left"
                >
                  <div className="aspect-square bg-gradient-to-br from-amber-100 to-orange-50 flex items-center justify-center">
                    <div className="text-center p-4">
                      <BellIcon className="w-12 h-12 text-amber-400 mx-auto mb-2" />
                      <p className="text-amber-500 font-semibold">{t('howItWorks:gettingStarted.savingProperties.getNotified.title')}</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <h4 className="font-semibold text-neutral-800 mb-2">{t('howItWorks:gettingStarted.savingProperties.getNotified.heading')}</h4>
                    <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.savingProperties.getNotified.desc')}</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 4: Contacting Sellers/Agents */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold">4</div>
                <h3 className="text-2xl font-bold text-neutral-800">{t('howItWorks:gettingStarted.contactingSellers.title')}</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigateTo('/agents')}>
                  <VideoPlaceholder
                    videoKey="getting-started-contact-agents"
                    videos={videos}
                    fallbackIcon={<ChatIcon className="w-16 h-16 text-green-300 mx-auto mb-2" />}
                    fallbackTitle={t('howItWorks:gettingStarted.contactingSellers.contactForm')}
                    fallbackSubtitle={t('howItWorks:gettingStarted.contactingSellers.onEveryPage')}
                    className="aspect-video bg-gradient-to-br from-green-100 to-emerald-50"
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-neutral-800">{t('howItWorks:gettingStarted.contactingSellers.multipleWays')}</h4>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-3">
                      <ChatIcon className="w-5 h-5 text-green-600" />
                      <div>
                        <span className="font-medium text-neutral-800">{t('howItWorks:gettingStarted.contactingSellers.directMessage.title')}</span>
                        <p className="text-xs text-neutral-600">{t('howItWorks:gettingStarted.contactingSellers.directMessage.desc')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <div>
                        <span className="font-medium text-neutral-800">{t('howItWorks:gettingStarted.contactingSellers.phoneCall.title')}</span>
                        <p className="text-xs text-neutral-600">{t('howItWorks:gettingStarted.contactingSellers.phoneCall.desc')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <span className="font-medium text-neutral-800">{t('howItWorks:gettingStarted.contactingSellers.email.title')}</span>
                        <p className="text-xs text-neutral-600">{t('howItWorks:gettingStarted.contactingSellers.email.desc')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      <div>
                        <span className="font-medium text-neutral-800">{t('howItWorks:gettingStarted.contactingSellers.whatsapp.title')}</span>
                        <p className="text-xs text-neutral-600">{t('howItWorks:gettingStarted.contactingSellers.whatsapp.desc')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5: Creating a Listing */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold">5</div>
                <h3 className="text-2xl font-bold text-neutral-800">{t('howItWorks:gettingStarted.createListing.title')}</h3>
              </div>

              <div className="bg-neutral-50 rounded-2xl p-8 border border-neutral-200">
                <div className="grid md:grid-cols-5 gap-4 mb-8">
                  {[
                    { step: '1', title: t('howItWorks:gettingStarted.createListing.steps.step1.title'), desc: t('howItWorks:gettingStarted.createListing.steps.step1.desc') },
                    { step: '2', title: t('howItWorks:gettingStarted.createListing.steps.step2.title'), desc: t('howItWorks:gettingStarted.createListing.steps.step2.desc') },
                    { step: '3', title: t('howItWorks:gettingStarted.createListing.steps.step3.title'), desc: t('howItWorks:gettingStarted.createListing.steps.step3.desc') },
                    { step: '4', title: t('howItWorks:gettingStarted.createListing.steps.step4.title'), desc: t('howItWorks:gettingStarted.createListing.steps.step4.desc') },
                    { step: '5', title: t('howItWorks:gettingStarted.createListing.steps.step5.title'), desc: t('howItWorks:gettingStarted.createListing.steps.step5.desc') },
                  ].map((item, idx) => (
                    <React.Fragment key={item.step}>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-cyan-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
                          {item.step}
                        </div>
                        <h4 className="font-semibold text-neutral-800 text-sm">{item.title}</h4>
                        <p className="text-xs text-neutral-500">{item.desc}</p>
                      </div>
                      {idx < 4 && (
                        <div className="hidden md:flex items-center justify-center text-cyan-300 text-xl">→</div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl p-5 border border-neutral-200">
                    <h4 className="font-semibold text-neutral-800 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {t('howItWorks:gettingStarted.createListing.photoTips.title')}
                    </h4>
                    <ul className="text-sm text-neutral-600 space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{t('howItWorks:gettingStarted.createListing.photoTips.tip1')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{t('howItWorks:gettingStarted.createListing.photoTips.tip2')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{t('howItWorks:gettingStarted.createListing.photoTips.tip3')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{t('howItWorks:gettingStarted.createListing.photoTips.tip4')}</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white rounded-xl p-5 border border-neutral-200">
                    <h4 className="font-semibold text-neutral-800 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {t('howItWorks:gettingStarted.createListing.descriptionTips.title')}
                    </h4>
                    <ul className="text-sm text-neutral-600 space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{t('howItWorks:gettingStarted.createListing.descriptionTips.tip1')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{t('howItWorks:gettingStarted.createListing.descriptionTips.tip2')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{t('howItWorks:gettingStarted.createListing.descriptionTips.tip3')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{t('howItWorks:gettingStarted.createListing.descriptionTips.tip4')}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 6: Account Settings */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold">6</div>
                <h3 className="text-2xl font-bold text-neutral-800">{t('howItWorks:gettingStarted.managingAccount.title')}</h3>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <button
                  onClick={() => navigateTo('/account?tab=profile')}
                  className="bg-white rounded-2xl border border-neutral-200 p-6 hover:shadow-lg transition-all hover:scale-[1.02] text-left"
                >
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                    <UserIcon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h4 className="font-semibold text-neutral-800 mb-2">{t('howItWorks:gettingStarted.managingAccount.profileSettings.title')}</h4>
                  <p className="text-sm text-neutral-600 mb-3">{t('howItWorks:gettingStarted.managingAccount.profileSettings.desc')}</p>
                  <p className="text-xs text-neutral-400">{t('howItWorks:gettingStarted.managingAccount.profileSettings.access')}</p>
                </button>

                <button
                  onClick={() => navigateTo('/account?tab=subscription')}
                  className="bg-white rounded-2xl border border-neutral-200 p-6 hover:shadow-lg transition-all hover:scale-[1.02] text-left"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                    <TicketIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-neutral-800 mb-2">{t('howItWorks:gettingStarted.managingAccount.subscription.title')}</h4>
                  <p className="text-sm text-neutral-600 mb-3">{t('howItWorks:gettingStarted.managingAccount.subscription.desc')}</p>
                  <p className="text-xs text-neutral-400">{t('howItWorks:gettingStarted.managingAccount.subscription.access')}</p>
                </button>

                <button
                  onClick={() => navigateTo('/account?tab=settings')}
                  className="bg-white rounded-2xl border border-neutral-200 p-6 hover:shadow-lg transition-all hover:scale-[1.02] text-left"
                >
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                    <BellIcon className="w-6 h-6 text-amber-600" />
                  </div>
                  <h4 className="font-semibold text-neutral-800 mb-2">{t('howItWorks:gettingStarted.managingAccount.notifications.title')}</h4>
                  <p className="text-sm text-neutral-600 mb-3">{t('howItWorks:gettingStarted.managingAccount.notifications.desc')}</p>
                  <p className="text-xs text-neutral-400">{t('howItWorks:gettingStarted.managingAccount.notifications.access')}</p>
                </button>
              </div>
            </div>

            {/* Quick Tips Section */}
            <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl p-8 border border-cyan-100">
              <h3 className="text-xl font-bold text-neutral-800 mb-6 text-center">{t('howItWorks:gettingStarted.proTips.title')}</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-cyan-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-800 mb-1">{t('howItWorks:gettingStarted.proTips.completeProfile.title')}</h4>
                    <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.proTips.completeProfile.desc')}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-cyan-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-800 mb-1">{t('howItWorks:gettingStarted.proTips.useSavedSearches.title')}</h4>
                    <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.proTips.useSavedSearches.desc')}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-cyan-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-800 mb-1">{t('howItWorks:gettingStarted.proTips.exploreCities.title')}</h4>
                    <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.proTips.exploreCities.desc')}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-cyan-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-800 mb-1">{t('howItWorks:gettingStarted.proTips.enableNotifications.title')}</h4>
                    <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.proTips.enableNotifications.desc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Premium Features */}
        {activeTab === 'premium-features' && (
          <div className="animate-fade-in">
            {/* Main Value Prop */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                <SparklesIcon className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-3xl font-bold text-neutral-800 mb-3">{t('howItWorks:premiumFeatures.title')}</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                {t('howItWorks:premiumFeatures.subtitle')}
              </p>
            </div>

            {/* AI Search Section */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-8 md:p-12 text-white mb-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <SearchIcon className="w-10 h-10" />
                      <div>
                        <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full">{t('howItWorks:premiumFeatures.aiSearch.badge')}</span>
                        <h3 className="text-2xl font-bold mt-1">{t('howItWorks:premiumFeatures.aiSearch.title')}</h3>
                      </div>
                    </div>
                    <p className="text-amber-100 mb-4">{t('howItWorks:premiumFeatures.aiSearch.desc')}</p>
                    <div className="bg-white/10 rounded-xl p-4 mb-4">
                      <p className="text-sm text-amber-100 italic">{t('howItWorks:premiumFeatures.aiSearch.example')}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {['natural', 'smart', 'learn', 'instant'].map((key) => (
                        <div key={key} className="flex items-center gap-2">
                          <CheckIcon className="w-4 h-4 text-amber-200" />
                          <span className="text-sm">{t(`howItWorks:premiumFeatures.aiSearch.features.${key}`)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="w-full md:w-80 bg-white/20 rounded-2xl p-6">
                    <div className="bg-white rounded-xl p-4 text-neutral-800">
                      <div className="flex items-center gap-2 mb-3">
                        <SparklesIcon className="w-5 h-5 text-amber-500" />
                        <span className="font-medium text-sm">AI Search</span>
                      </div>
                      <div className="bg-neutral-100 rounded-lg p-3 mb-3">
                        <p className="text-xs text-neutral-500">Find me a...</p>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-neutral-200 rounded-full w-3/4"></div>
                        <div className="h-2 bg-neutral-200 rounded-full w-1/2"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Auto Description */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold">
                  <LightBulbIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">{t('howItWorks:premiumFeatures.aiDescription.badge')}</span>
                  <h3 className="text-2xl font-bold text-neutral-800">{t('howItWorks:premiumFeatures.aiDescription.title')}</h3>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="text-neutral-600 mb-6">{t('howItWorks:premiumFeatures.aiDescription.desc')}</p>
                  <div className="grid grid-cols-2 gap-4">
                    {['professional', 'seo', 'multilingual', 'customizable'].map((key) => (
                      <div key={key} className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-neutral-600">{t(`howItWorks:premiumFeatures.aiDescription.features.${key}`)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200">
                  <h4 className="font-semibold text-neutral-800 mb-4">{t('howItWorks:premiumFeatures.aiDescription.howItWorks')}</h4>
                  <div className="space-y-3">
                    {['step1', 'step2', 'step3', 'step4'].map((step, idx) => (
                      <div key={step} className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 text-xs font-bold">{idx + 1}</div>
                        <span className="text-sm text-neutral-600">{t(`howItWorks:premiumFeatures.aiDescription.${step}`)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3D Map with Sunlight */}
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl p-8 md:p-12 text-white mb-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <SunIcon className="w-10 h-10" />
                  <div>
                    <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full">{t('howItWorks:premiumFeatures.interactiveMap3D.badge')}</span>
                    <h3 className="text-2xl font-bold mt-1">{t('howItWorks:premiumFeatures.interactiveMap3D.title')}</h3>
                  </div>
                </div>
                <p className="text-yellow-100 mb-6 max-w-2xl">{t('howItWorks:premiumFeatures.interactiveMap3D.desc')}</p>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold mb-4">Features</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {['sunPosition', 'shadows', 'timeSlider', 'orientation'].map((key) => (
                        <div key={key} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                          <CheckIcon className="w-4 h-4 text-yellow-200" />
                          <span className="text-sm">{t(`howItWorks:premiumFeatures.interactiveMap3D.features.${key}`)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/20 rounded-2xl p-6">
                    <h4 className="font-semibold mb-3">{t('howItWorks:premiumFeatures.interactiveMap3D.benefits.title')}</h4>
                    <ul className="space-y-2 text-sm text-yellow-100">
                      {['light', 'morning', 'balcony', 'energy'].map((key) => (
                        <li key={key} className="flex items-start gap-2">
                          <CheckIcon className="w-4 h-4 text-yellow-200 flex-shrink-0 mt-0.5" />
                          {t(`howItWorks:premiumFeatures.interactiveMap3D.benefits.${key}`)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Measurements & POI Grid */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Measurements Tool */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-8 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <RulerIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{t('howItWorks:premiumFeatures.measurements.badge')}</span>
                    <h4 className="font-semibold text-neutral-800">{t('howItWorks:premiumFeatures.measurements.title')}</h4>
                  </div>
                </div>
                <p className="text-neutral-600 mb-4">{t('howItWorks:premiumFeatures.measurements.desc')}</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {['distance', 'area', 'perimeter', 'save'].map((key) => (
                    <div key={key} className="flex items-center gap-2 text-sm text-neutral-600">
                      <CheckIcon className="w-4 h-4 text-blue-500" />
                      {t(`howItWorks:premiumFeatures.measurements.features.${key}`)}
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <h5 className="font-medium text-neutral-700 mb-2 text-sm">{t('howItWorks:premiumFeatures.measurements.useCases.title')}</h5>
                  <ul className="text-xs text-neutral-600 space-y-1">
                    {['plot', 'distance', 'garden', 'compare'].map((key) => (
                      <li key={key}>• {t(`howItWorks:premiumFeatures.measurements.useCases.${key}`)}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* POI (Points of Interest) */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-8 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <LocationMarkerIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">{t('howItWorks:premiumFeatures.poi.badge')}</span>
                    <h4 className="font-semibold text-neutral-800">{t('howItWorks:premiumFeatures.poi.title')}</h4>
                  </div>
                </div>
                <p className="text-neutral-600 mb-4">{t('howItWorks:premiumFeatures.poi.desc')}</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {['education', 'health', 'shopping', 'transport', 'dining', 'parks'].map((key) => (
                    <div key={key} className="flex items-center gap-2 text-xs text-neutral-600 bg-neutral-50 rounded-lg px-2 py-1.5">
                      <span className="text-green-500">●</span>
                      {t(`howItWorks:premiumFeatures.poi.categories.${key}`)}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {['walkTime', 'driveTime', 'ratings', 'filter'].map((key) => (
                    <span key={key} className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full">
                      {t(`howItWorks:premiumFeatures.poi.features.${key}`)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center">
                  <LightBulbIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full">{t('howItWorks:premiumFeatures.insights.badge')}</span>
                  <h3 className="text-2xl font-bold text-neutral-800">{t('howItWorks:premiumFeatures.insights.title')}</h3>
                </div>
              </div>
              <p className="text-neutral-600 mb-6">{t('howItWorks:premiumFeatures.insights.desc')}</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['priceAnalysis', 'neighborhood', 'investment', 'marketTrends'].map((key) => (
                  <div key={key} className="bg-purple-50 border border-purple-100 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <h4 className="font-semibold text-neutral-800 mb-2">{t(`howItWorks:premiumFeatures.insights.types.${key}.title`)}</h4>
                    <p className="text-sm text-neutral-600">{t(`howItWorks:premiumFeatures.insights.types.${key}.desc`)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Calculators */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 md:p-12 text-white mb-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <CalculatorIcon className="w-8 h-8" />
                  <h3 className="text-2xl font-bold">{t('howItWorks:premiumFeatures.calculators.title')}</h3>
                </div>
                <p className="text-indigo-200 mb-8">{t('howItWorks:premiumFeatures.calculators.subtitle')}</p>
                <div className="grid md:grid-cols-3 gap-6">
                  {['mortgage', 'rentVsBuy', 'investment'].map((calc) => (
                    <div key={calc} className="bg-white/10 backdrop-blur rounded-2xl p-6">
                      <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full">{t(`howItWorks:premiumFeatures.calculators.${calc}.badge`)}</span>
                      <h4 className="font-semibold mt-3 mb-2">{t(`howItWorks:premiumFeatures.calculators.${calc}.title`)}</h4>
                      <p className="text-sm text-indigo-200 mb-4">{t(`howItWorks:premiumFeatures.calculators.${calc}.desc`)}</p>
                      <ul className="space-y-2">
                        {['monthly', 'comparison', calc === 'mortgage' ? 'total' : calc === 'rentVsBuy' ? 'breakeven' : 'roi', calc === 'mortgage' ? 'amortization' : calc === 'rentVsBuy' ? 'wealth' : 'cashflow'].map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-indigo-100">
                            <CheckIcon className="w-4 h-4 text-indigo-200" />
                            {t(`howItWorks:premiumFeatures.calculators.${calc}.features.${feature}`)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Analytics Dashboard */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-cyan-500 text-white rounded-full flex items-center justify-center">
                  <ChartIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="bg-cyan-100 text-cyan-700 text-xs font-bold px-2 py-1 rounded-full">{t('howItWorks:premiumFeatures.analytics.badge')}</span>
                  <h3 className="text-2xl font-bold text-neutral-800">{t('howItWorks:premiumFeatures.analytics.title')}</h3>
                </div>
              </div>
              <p className="text-neutral-600 mb-6">{t('howItWorks:premiumFeatures.analytics.desc')}</p>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="grid grid-cols-2 gap-4">
                  {['views', 'inquiries', 'favorites', 'shares', 'demographics', 'sources'].map((metric) => (
                    <div key={metric} className="bg-cyan-50 border border-cyan-100 rounded-xl p-4">
                      <p className="text-sm font-medium text-neutral-800">{t(`howItWorks:premiumFeatures.analytics.metrics.${metric}`)}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200">
                  <h4 className="font-semibold text-neutral-800 mb-4">{t('howItWorks:premiumFeatures.analytics.reports.title')}</h4>
                  <ul className="space-y-3">
                    {['weekly', 'comparison', 'recommendations'].map((report) => (
                      <li key={report} className="flex items-center gap-3 text-sm text-neutral-600">
                        <CheckIcon className="w-4 h-4 text-cyan-500" />
                        {t(`howItWorks:premiumFeatures.analytics.reports.${report}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Listing Promotions Comparison */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-neutral-800 mb-2">{t('howItWorks:listingPromotions.title')}</h3>
              <p className="text-neutral-600 mb-8">{t('howItWorks:listingPromotions.subtitle')}</p>
              <div className="grid md:grid-cols-4 gap-4">
                {/* Standard */}
                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-neutral-800 mb-4">{t('howItWorks:listingPromotions.comparison.standard.title')}</h4>
                  <ul className="space-y-2 text-sm text-neutral-600">
                    {['position', 'visibility', 'views'].map((feature) => (
                      <li key={feature}>• {t(`howItWorks:listingPromotions.comparison.standard.features.${feature}`)}</li>
                    ))}
                  </ul>
                </div>
                {/* Highlight */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-blue-800 mb-2">{t('howItWorks:listingPromotions.comparison.highlight.title')}</h4>
                  <p className="text-blue-600 text-sm font-medium mb-4">{t('howItWorks:listingPromotions.comparison.highlight.price')}</p>
                  <ul className="space-y-2 text-sm text-neutral-600">
                    {['border', 'position', 'views', 'badge'].map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-blue-500" />
                        {t(`howItWorks:listingPromotions.comparison.highlight.features.${feature}`)}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Featured */}
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 ring-2 ring-amber-200">
                  <h4 className="font-semibold text-amber-800 mb-2">{t('howItWorks:listingPromotions.comparison.featured.title')}</h4>
                  <p className="text-amber-600 text-sm font-medium mb-4">{t('howItWorks:listingPromotions.comparison.featured.price')}</p>
                  <ul className="space-y-2 text-sm text-neutral-600">
                    {['border', 'position', 'views', 'badge', 'homepage'].map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-amber-500" />
                        {t(`howItWorks:listingPromotions.comparison.featured.features.${feature}`)}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Premium */}
                <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white relative">
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">{t('howItWorks:listingPromotions.comparison.premium.popular')}</span>
                  <h4 className="font-semibold mb-2">{t('howItWorks:listingPromotions.comparison.premium.title')}</h4>
                  <p className="text-orange-100 text-sm font-medium mb-4">{t('howItWorks:listingPromotions.comparison.premium.price')}</p>
                  <ul className="space-y-2 text-sm">
                    {['border', 'position', 'views', 'badge', 'homepage', 'social'].map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-orange-200" />
                        {t(`howItWorks:listingPromotions.comparison.premium.features.${feature}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {/* Benefits */}
              <div className="mt-8 grid md:grid-cols-4 gap-6">
                {['faster', 'visibility', 'standOut', 'analytics'].map((benefit) => (
                  <div key={benefit} className="text-center">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      {benefit === 'faster' && <FireIcon className="w-6 h-6 text-amber-600" />}
                      {benefit === 'visibility' && <SearchIcon className="w-6 h-6 text-amber-600" />}
                      {benefit === 'standOut' && <StarIcon className="w-6 h-6 text-amber-600" />}
                      {benefit === 'analytics' && <ChartIcon className="w-6 h-6 text-amber-600" />}
                    </div>
                    <h4 className="font-semibold text-neutral-800 mb-1">{t(`howItWorks:listingPromotions.benefits.${benefit}.title`)}</h4>
                    <p className="text-sm text-neutral-600">{t(`howItWorks:listingPromotions.benefits.${benefit}.desc`)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Featured Agencies */}
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative">
                <h3 className="text-2xl font-bold mb-2">{t('howItWorks:featuredAgencies.title')}</h3>
                <p className="text-purple-200 mb-8">{t('howItWorks:featuredAgencies.subtitle')}</p>
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  {['visibility', 'badge', 'priority', 'leads', 'branding', 'analytics'].map((benefit) => (
                    <div key={benefit} className="bg-white/10 backdrop-blur rounded-xl p-5">
                      <h4 className="font-semibold mb-2">{t(`howItWorks:featuredAgencies.benefits.${benefit}.title`)}</h4>
                      <p className="text-sm text-purple-200">{t(`howItWorks:featuredAgencies.benefits.${benefit}.desc`)}</p>
                    </div>
                  ))}
                </div>
                {/* Stats */}
                <div className="bg-white/20 rounded-2xl p-6">
                  <h4 className="font-semibold mb-4">{t('howItWorks:featuredAgencies.stats.title')}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['views', 'inquiries', 'trust', 'retention'].map((stat) => (
                      <div key={stat} className="text-center">
                        <p className="text-2xl font-bold text-white">{t(`howItWorks:featuredAgencies.stats.${stat}`)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* For Agencies */}
        {activeTab === 'agencies' && (
          <div className="animate-fade-in">
            {/* Main Value Prop */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                <BuildingIcon className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-3xl font-bold text-neutral-800 mb-3">{t('howItWorks:agencies.title')}</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                {t('howItWorks:agencies.subtitle')}
              </p>
            </div>

            {/* Pricing Card */}
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl p-8 md:p-12 text-white mb-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div>
                    <span className="text-orange-200 font-medium">{t('howItWorks:agencies.pricing.planName')}</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-5xl font-bold">{t('howItWorks:agencies.pricing.price')}</span>
                      <span className="text-xl text-orange-200">{t('howItWorks:agencies.pricing.period')}</span>
                    </div>
                    <p className="text-orange-100 mt-2">{t('howItWorks:agencies.pricing.tagline')}</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-2xl p-6 w-full md:w-auto">
                    <h4 className="font-semibold mb-4 text-center">{t('howItWorks:agencies.pricing.whatsIncluded')}</h4>
                    <ul className="space-y-3">
                      {[
                        t('howItWorks:agencies.pricing.features.listings'),
                        t('howItWorks:agencies.pricing.features.teamMembers'),
                        t('howItWorks:agencies.pricing.features.promotions'),
                        t('howItWorks:agencies.pricing.features.branding'),
                        t('howItWorks:agencies.pricing.features.ai'),
                        t('howItWorks:agencies.pricing.features.accountManager'),
                        t('howItWorks:agencies.pricing.features.analytics'),
                      ].map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckIcon className="w-5 h-5 text-orange-200 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* How It Works Steps */}
            <h3 className="text-2xl font-bold text-neutral-800 mb-8 text-center">{t('howItWorks:agencies.howToGetStarted')}</h3>
            <div className="grid md:grid-cols-4 gap-6 mb-12">
              {[
                {
                  step: '1',
                  title: t('howItWorks:agencies.steps.subscribe.title'),
                  description: t('howItWorks:agencies.steps.subscribe.desc'),
                  icon: TicketIcon,
                },
                {
                  step: '2',
                  title: t('howItWorks:agencies.steps.createAgency.title'),
                  description: t('howItWorks:agencies.steps.createAgency.desc'),
                  icon: BuildingIcon,
                },
                {
                  step: '3',
                  title: t('howItWorks:agencies.steps.generateCoupons.title'),
                  description: t('howItWorks:agencies.steps.generateCoupons.desc'),
                  icon: UserGroupIcon,
                },
                {
                  step: '4',
                  title: t('howItWorks:agencies.steps.growTogether.title'),
                  description: t('howItWorks:agencies.steps.growTogether.desc'),
                  icon: ChartIcon,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.step} className="relative">
                    <div className="bg-white rounded-2xl border border-neutral-200 p-6 h-full hover:shadow-lg transition-shadow">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="text-orange-600 font-bold">{item.step}</span>
                        </div>
                        <Icon className="w-6 h-6 text-orange-500" />
                      </div>
                      <h4 className="font-semibold text-neutral-800 mb-2">{item.title}</h4>
                      <p className="text-sm text-neutral-600">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Agent Invitation System */}
            <div className="bg-neutral-50 rounded-2xl p-8 mb-8">
              <h3 className="text-xl font-bold text-neutral-800 mb-6">{t('howItWorks:agencies.agentInvitation.title')}</h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-neutral-700 mb-3">{t('howItWorks:agencies.agentInvitation.invitationCodes.title')}</h4>
                  <p className="text-neutral-600 mb-4">
                    {t('howItWorks:agencies.agentInvitation.invitationCodes.desc')}
                  </p>
                  <div className="bg-white rounded-lg border border-neutral-200 p-4">
                    <code className="text-sm text-orange-600">AGENCY-ABC123</code>
                    <p className="text-xs text-neutral-500 mt-1">{t('howItWorks:agencies.agentInvitation.invitationCodes.example')}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-700 mb-3">{t('howItWorks:agencies.agentInvitation.subscriptionCoupons.title')}</h4>
                  <p className="text-neutral-600 mb-4">
                    {t('howItWorks:agencies.agentInvitation.subscriptionCoupons.desc')}
                  </p>
                  <div className="flex gap-2">
                    {['AGENT-XYZ1', 'AGENT-XYZ2', 'AGENT-XYZ3'].map((code, idx) => (
                      <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-mono">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* For Agents */}
        {activeTab === 'agents' && (
          <div className="animate-fade-in">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <UserGroupIcon className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-3xl font-bold text-neutral-800 mb-3">{t('howItWorks:agents.title')}</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                {t('howItWorks:agents.subtitle')}
              </p>
            </div>

            {/* Two Paths */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Independent Agent */}
              <div className="bg-white rounded-2xl border-2 border-purple-200 p-8 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-800">{t('howItWorks:agents.independent.title')}</h3>
                    <span className="text-sm text-purple-600">{t('howItWorks:agents.independent.planType')}</span>
                  </div>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-neutral-800">{t('howItWorks:agents.independent.price')}</span>
                    <span className="text-neutral-500">{t('howItWorks:agents.independent.period')}</span>
                  </div>
                  <p className="text-sm text-purple-600 mt-1">{t('howItWorks:agents.independent.yearlyNote')}</p>
                </div>
                <ul className="space-y-3 mb-6">
                  {[
                    t('howItWorks:agents.independent.features.listings'),
                    t('howItWorks:agents.independent.features.promotions'),
                    t('howItWorks:agents.independent.features.profile'),
                    t('howItWorks:agents.independent.features.ai'),
                    t('howItWorks:agents.independent.features.analytics'),
                    t('howItWorks:agents.independent.features.support'),
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-neutral-600">
                      <CheckIcon className="w-5 h-5 text-purple-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Agency Agent */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                  {t('howItWorks:agents.agency.free')}
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <BuildingIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">{t('howItWorks:agents.agency.title')}</h3>
                    <span className="text-sm text-purple-200">{t('howItWorks:agents.agency.planType')}</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-bold">{t('howItWorks:agents.agency.price')}</span>
                  <span className="text-purple-200">{t('howItWorks:agents.agency.period')}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {[
                    t('howItWorks:agents.agency.features.listings'),
                    t('howItWorks:agents.agency.features.promotions'),
                    t('howItWorks:agents.agency.features.branding'),
                    t('howItWorks:agents.agency.features.collaboration'),
                    t('howItWorks:agents.agency.features.support'),
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-purple-100">
                      <CheckIcon className="w-5 h-5 text-purple-200" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-purple-200">
                  {t('howItWorks:agents.agency.note')}
                </p>
              </div>
            </div>

            {/* How to Join an Agency */}
            <div className="bg-purple-50 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-neutral-800 mb-6">{t('howItWorks:agents.howToJoin.title')}</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    step: '1',
                    title: t('howItWorks:agents.howToJoin.step1.title'),
                    description: t('howItWorks:agents.howToJoin.step1.desc'),
                  },
                  {
                    step: '2',
                    title: t('howItWorks:agents.howToJoin.step2.title'),
                    description: t('howItWorks:agents.howToJoin.step2.desc'),
                  },
                  {
                    step: '3',
                    title: t('howItWorks:agents.howToJoin.step3.title'),
                    description: t('howItWorks:agents.howToJoin.step3.desc'),
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-800 mb-1">{item.title}</h4>
                      <p className="text-sm text-neutral-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* For Buyers */}
        {activeTab === 'buyers' && (
          <div className="animate-fade-in">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <SearchIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-neutral-800 mb-3">{t('howItWorks:buyers.title')}</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                {t('howItWorks:buyers.subtitle')}
              </p>
            </div>

            {/* Buyer Plans */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Free Plan */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-8 hover:shadow-lg transition-shadow">
                <span className="text-blue-600 font-medium text-sm">{t('howItWorks:buyers.freePlan.title')}</span>
                <div className="flex items-baseline gap-2 mt-2 mb-6">
                  <span className="text-4xl font-bold text-neutral-800">{t('howItWorks:buyers.freePlan.price')}</span>
                  <span className="text-neutral-500">{t('howItWorks:buyers.freePlan.period')}</span>
                </div>
                <p className="text-neutral-600 mb-6">
                  {t('howItWorks:buyers.freePlan.tagline')}
                </p>
                <ul className="space-y-3 mb-6">
                  {[
                    t('howItWorks:buyers.freePlan.features.browse'),
                    t('howItWorks:buyers.freePlan.features.mapSearch'),
                    t('howItWorks:buyers.freePlan.features.favorites'),
                    t('howItWorks:buyers.freePlan.features.contact'),
                    t('howItWorks:buyers.freePlan.features.insights'),
                    t('howItWorks:buyers.freePlan.features.profiles'),
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-neutral-600">
                      <CheckIcon className="w-5 h-5 text-blue-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Buyer Pro Plan */}
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                  {t('howItWorks:buyers.proPlan.trial')}
                </div>
                <span className="text-blue-200 font-medium text-sm">{t('howItWorks:buyers.proPlan.title')}</span>
                <div className="flex items-baseline gap-2 mt-2 mb-6">
                  <span className="text-4xl font-bold">{t('howItWorks:buyers.proPlan.price')}</span>
                  <span className="text-blue-200">{t('howItWorks:buyers.proPlan.period')}</span>
                </div>
                <p className="text-blue-100 mb-6">
                  {t('howItWorks:buyers.proPlan.tagline')}
                </p>
                <ul className="space-y-3 mb-6">
                  {[
                    t('howItWorks:buyers.proPlan.features.notifications'),
                    t('howItWorks:buyers.proPlan.features.savedSearches'),
                    t('howItWorks:buyers.proPlan.features.earlyAccess'),
                    t('howItWorks:buyers.proPlan.features.insights'),
                    t('howItWorks:buyers.proPlan.features.priceDrops'),
                    t('howItWorks:buyers.proPlan.features.calculator'),
                    t('howItWorks:buyers.proPlan.features.mortgage'),
                    t('howItWorks:buyers.proPlan.features.adFree'),
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-blue-100">
                      <CheckIcon className="w-5 h-5 text-blue-200" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Features Grid */}
            <h3 className="text-2xl font-bold text-neutral-800 mb-6 text-center">{t('howItWorks:buyers.searchTools.title')}</h3>
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {[
                {
                  icon: MapIcon,
                  title: t('howItWorks:buyers.searchTools.interactiveMap.title'),
                  description: t('howItWorks:buyers.searchTools.interactiveMap.desc'),
                  color: 'blue',
                },
                {
                  icon: HeartIcon,
                  title: t('howItWorks:buyers.searchTools.saveFavorites.title'),
                  description: t('howItWorks:buyers.searchTools.saveFavorites.desc'),
                  color: 'red',
                },
                {
                  icon: BellIcon,
                  title: t('howItWorks:buyers.searchTools.savedSearches.title'),
                  description: t('howItWorks:buyers.searchTools.savedSearches.desc'),
                  color: 'purple',
                },
                {
                  icon: ChatIcon,
                  title: t('howItWorks:buyers.searchTools.directMessaging.title'),
                  description: t('howItWorks:buyers.searchTools.directMessaging.desc'),
                  color: 'green',
                },
                {
                  icon: ChartIcon,
                  title: t('howItWorks:buyers.searchTools.marketInsights.title'),
                  description: t('howItWorks:buyers.searchTools.marketInsights.desc'),
                  color: 'orange',
                },
                {
                  icon: UserIcon,
                  title: t('howItWorks:buyers.searchTools.agentProfiles.title'),
                  description: t('howItWorks:buyers.searchTools.agentProfiles.desc'),
                  color: 'indigo',
                },
              ].map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div key={idx} className="bg-white rounded-2xl border border-neutral-200 p-6 hover:shadow-lg transition-all hover:-translate-y-1">
                    <div className={`w-12 h-12 bg-${feature.color}-100 rounded-xl flex items-center justify-center mb-4`}
                         style={{ backgroundColor: feature.color === 'blue' ? '#dbeafe' : feature.color === 'red' ? '#fee2e2' : feature.color === 'purple' ? '#f3e8ff' : feature.color === 'green' ? '#dcfce7' : feature.color === 'orange' ? '#ffedd5' : '#e0e7ff' }}>
                      <Icon className={`w-6 h-6`} style={{ color: feature.color === 'blue' ? '#2563eb' : feature.color === 'red' ? '#dc2626' : feature.color === 'purple' ? '#9333ea' : feature.color === 'green' ? '#16a34a' : feature.color === 'orange' ? '#ea580c' : '#4f46e5' }} />
                    </div>
                    <h3 className="font-semibold text-neutral-800 mb-2">{feature.title}</h3>
                    <p className="text-sm text-neutral-600">{feature.description}</p>
                  </div>
                );
              })}
            </div>

            {/* Search Process */}
            <div className="bg-blue-50 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-neutral-800 mb-6 text-center">{t('howItWorks:buyers.journey.title')}</h3>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {[
                  { step: t('howItWorks:buyers.journey.search.step'), icon: SearchIcon, desc: t('howItWorks:buyers.journey.search.desc') },
                  { step: t('howItWorks:buyers.journey.save.step'), icon: HeartIcon, desc: t('howItWorks:buyers.journey.save.desc') },
                  { step: t('howItWorks:buyers.journey.compare.step'), icon: ChartIcon, desc: t('howItWorks:buyers.journey.compare.desc') },
                  { step: t('howItWorks:buyers.journey.contact.step'), icon: ChatIcon, desc: t('howItWorks:buyers.journey.contact.desc') },
                  { step: t('howItWorks:buyers.journey.visit.step'), icon: HomeIcon, desc: t('howItWorks:buyers.journey.visit.desc') },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <React.Fragment key={item.step}>
                      <div className="text-center">
                        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <p className="font-semibold text-neutral-800">{item.step}</p>
                        <p className="text-xs text-neutral-500">{item.desc}</p>
                      </div>
                      {idx < 4 && (
                        <div className="hidden md:block text-blue-300 text-2xl">→</div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* See It In Action - Buyers */}
            <div className="mt-12">
              <h3 className="text-2xl font-bold text-neutral-800 mb-8 text-center">{t('howItWorks:buyers.seeItInAction.title')}</h3>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Map Search Demo */}
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <MapIcon className="w-16 h-16 text-blue-300 mx-auto mb-2" />
                        <p className="text-blue-400 font-medium">{t('howItWorks:buyers.seeItInAction.mapDemo.title')}</p>
                        <p className="text-blue-300 text-sm">{t('howItWorks:buyers.seeItInAction.mapDemo.coming')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h4 className="font-semibold text-neutral-800 mb-2">{t('howItWorks:buyers.seeItInAction.mapDemo.heading')}</h4>
                    <p className="text-sm text-neutral-600">{t('howItWorks:buyers.seeItInAction.mapDemo.desc')}</p>
                  </div>
                </div>

                {/* Save & Compare Demo */}
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-gradient-to-br from-red-100 to-pink-50 flex items-center justify-center relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <HeartIcon className="w-16 h-16 text-red-300 mx-auto mb-2" />
                        <p className="text-red-400 font-medium">{t('howItWorks:buyers.seeItInAction.saveDemo.title')}</p>
                        <p className="text-red-300 text-sm">{t('howItWorks:buyers.seeItInAction.saveDemo.coming')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h4 className="font-semibold text-neutral-800 mb-2">{t('howItWorks:buyers.seeItInAction.saveDemo.heading')}</h4>
                    <p className="text-sm text-neutral-600">{t('howItWorks:buyers.seeItInAction.saveDemo.desc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* For Sellers */}
        {activeTab === 'sellers' && (
          <div className="animate-fade-in">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <HomeIcon className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-neutral-800 mb-3">{t('howItWorks:sellers.title')}</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                {t('howItWorks:sellers.subtitle')}
              </p>
            </div>

            {/* Seller Plans */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Free Plan */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-8 hover:shadow-lg transition-shadow">
                <span className="text-green-600 font-medium text-sm">{t('howItWorks:sellers.freePlan.title')}</span>
                <div className="flex items-baseline gap-2 mt-2 mb-6">
                  <span className="text-4xl font-bold text-neutral-800">{t('howItWorks:sellers.freePlan.price')}</span>
                  <span className="text-neutral-500">{t('howItWorks:sellers.freePlan.period')}</span>
                </div>
                <p className="text-neutral-600 mb-6">
                  {t('howItWorks:sellers.freePlan.tagline')}
                </p>
                <ul className="space-y-3 mb-6">
                  {[
                    t('howItWorks:sellers.freePlan.features.listings'),
                    t('howItWorks:sellers.freePlan.features.searches'),
                    t('howItWorks:sellers.freePlan.features.ai'),
                    t('howItWorks:sellers.freePlan.features.photos'),
                    t('howItWorks:sellers.freePlan.features.messaging'),
                    t('howItWorks:sellers.freePlan.features.analytics'),
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-neutral-600">
                      <CheckIcon className="w-5 h-5 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pro Plan */}
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                  {t('howItWorks:sellers.proPlan.popular')}
                </div>
                <span className="text-green-200 font-medium text-sm">{t('howItWorks:sellers.proPlan.title')}</span>
                <div className="mt-2 mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{t('howItWorks:sellers.proPlan.price')}</span>
                    <span className="text-green-200">{t('howItWorks:sellers.proPlan.period')}</span>
                  </div>
                  <p className="text-sm text-green-200 mt-1">{t('howItWorks:sellers.proPlan.yearlyNote')}</p>
                </div>
                <p className="text-green-100 mb-6">
                  {t('howItWorks:sellers.proPlan.tagline')}
                </p>
                <ul className="space-y-3 mb-6">
                  {[
                    t('howItWorks:sellers.proPlan.features.listings'),
                    t('howItWorks:sellers.proPlan.features.promotions'),
                    t('howItWorks:sellers.proPlan.features.ai'),
                    t('howItWorks:sellers.proPlan.features.searches'),
                    t('howItWorks:sellers.proPlan.features.analytics'),
                    t('howItWorks:sellers.proPlan.features.leads'),
                    t('howItWorks:sellers.proPlan.features.support'),
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-green-100">
                      <CheckIcon className="w-5 h-5 text-green-200" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Listing Process */}
            <div className="bg-green-50 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-neutral-800 mb-6 text-center">{t('howItWorks:sellers.howToList.title')}</h3>
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  {
                    step: '1',
                    title: t('howItWorks:sellers.howToList.step1.title'),
                    description: t('howItWorks:sellers.howToList.step1.desc'),
                  },
                  {
                    step: '2',
                    title: t('howItWorks:sellers.howToList.step2.title'),
                    description: t('howItWorks:sellers.howToList.step2.desc'),
                  },
                  {
                    step: '3',
                    title: t('howItWorks:sellers.howToList.step3.title'),
                    description: t('howItWorks:sellers.howToList.step3.desc'),
                  },
                  {
                    step: '4',
                    title: t('howItWorks:sellers.howToList.step4.title'),
                    description: t('howItWorks:sellers.howToList.step4.desc'),
                  },
                ].map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
                      {item.step}
                    </div>
                    <h4 className="font-semibold text-neutral-800 mb-1">{item.title}</h4>
                    <p className="text-sm text-neutral-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Promotion Options */}
            <div className="mt-8 bg-white rounded-2xl border border-neutral-200 p-8">
              <h3 className="text-xl font-bold text-neutral-800 mb-6">{t('howItWorks:sellers.promotions.title')}</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    title: t('howItWorks:sellers.promotions.featured.title'),
                    price: t('howItWorks:sellers.promotions.featured.price'),
                    duration: t('howItWorks:sellers.promotions.featured.duration'),
                    color: 'amber',
                    features: [
                      t('howItWorks:sellers.promotions.featured.features.border'),
                      t('howItWorks:sellers.promotions.featured.features.position'),
                      t('howItWorks:sellers.promotions.featured.features.views'),
                    ],
                  },
                  {
                    title: t('howItWorks:sellers.promotions.premium.title'),
                    price: t('howItWorks:sellers.promotions.premium.price'),
                    duration: t('howItWorks:sellers.promotions.premium.duration'),
                    color: 'orange',
                    features: [
                      t('howItWorks:sellers.promotions.premium.features.badge'),
                      t('howItWorks:sellers.promotions.premium.features.position'),
                      t('howItWorks:sellers.promotions.premium.features.views'),
                      t('howItWorks:sellers.promotions.premium.features.social'),
                    ],
                  },
                  {
                    title: t('howItWorks:sellers.promotions.highlight.title'),
                    price: t('howItWorks:sellers.promotions.highlight.price'),
                    duration: t('howItWorks:sellers.promotions.highlight.duration'),
                    color: 'blue',
                    features: [
                      t('howItWorks:sellers.promotions.highlight.features.highlight'),
                      t('howItWorks:sellers.promotions.highlight.features.position'),
                      t('howItWorks:sellers.promotions.highlight.features.views'),
                    ],
                  },
                ].map((promo) => (
                  <div key={promo.title} className="border border-neutral-200 rounded-xl p-5 hover:border-green-300 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-neutral-800">{promo.title}</h4>
                      <StarIcon className={`w-5 h-5`} style={{ color: promo.color === 'amber' ? '#f59e0b' : promo.color === 'orange' ? '#f97316' : '#3b82f6' }} />
                    </div>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-2xl font-bold text-neutral-800">{promo.price}</span>
                      <span className="text-sm text-neutral-500">/ {promo.duration}</span>
                    </div>
                    <ul className="space-y-2">
                      {promo.features.map((f, idx) => (
                        <li key={idx} className="text-sm text-neutral-600 flex items-center gap-2">
                          <CheckIcon className="w-4 h-4 text-green-500" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* See It In Action - Sellers */}
            <div className="mt-12">
              <h3 className="text-2xl font-bold text-neutral-800 mb-8 text-center">{t('howItWorks:sellers.seeItInAction.title')}</h3>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Create Listing Demo */}
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-gradient-to-br from-green-100 to-emerald-50 flex items-center justify-center relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <HomeIcon className="w-16 h-16 text-green-300 mx-auto mb-2" />
                        <p className="text-green-400 font-medium">{t('howItWorks:sellers.seeItInAction.listingDemo.title')}</p>
                        <p className="text-green-300 text-sm">{t('howItWorks:sellers.seeItInAction.listingDemo.coming')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h4 className="font-semibold text-neutral-800 mb-2">{t('howItWorks:sellers.seeItInAction.listingDemo.heading')}</h4>
                    <p className="text-sm text-neutral-600">{t('howItWorks:sellers.seeItInAction.listingDemo.desc')}</p>
                  </div>
                </div>

                {/* Analytics Dashboard Demo */}
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <ChartIcon className="w-16 h-16 text-emerald-300 mx-auto mb-2" />
                        <p className="text-emerald-400 font-medium">{t('howItWorks:sellers.seeItInAction.analyticsDemo.title')}</p>
                        <p className="text-emerald-300 text-sm">{t('howItWorks:sellers.seeItInAction.analyticsDemo.coming')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h4 className="font-semibold text-neutral-800 mb-2">{t('howItWorks:sellers.seeItInAction.analyticsDemo.heading')}</h4>
                    <p className="text-sm text-neutral-600">{t('howItWorks:sellers.seeItInAction.analyticsDemo.desc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary to-primary-dark py-16 relative overflow-hidden">
        {/* 3D Decorative Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-10 left-[10%] opacity-15 hidden md:block">
            <FloatingSphere size="lg" color="cyan" />
          </div>
          <div className="absolute bottom-[10%] right-[8%] opacity-10 hidden md:block">
            <FloatingSphere size="md" color="pink" animate={false} />
          </div>
          <div className="absolute top-1/2 -right-16 opacity-10 hidden lg:block">
            <GlassyDonut size="lg" color="blue" />
          </div>
          <div className="absolute bottom-0 left-[20%] opacity-15 hidden lg:block">
            <WaveRibbon color="purple-cyan" />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 text-center text-white relative z-10">
          <h2 className="text-3xl font-bold mb-4">{t('howItWorks:cta.title')}</h2>
          <p className="text-lg text-white/80 mb-8">
            {t('howItWorks:cta.subtitle')}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="/"
              className="px-8 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-neutral-100 transition-colors"
            >
              {t('howItWorks:cta.browseProperties')}
            </a>
            <a
              href="/create-listing"
              className="px-8 py-3 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-colors border border-white/30"
            >
              {t('howItWorks:cta.listProperty')}
            </a>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-neutral-800 mb-8 text-center">{t('howItWorks:faq.title')}</h2>
        <div className="space-y-4">
          {[
            {
              q: t('howItWorks:faq.q1.question'),
              a: t('howItWorks:faq.q1.answer'),
            },
            {
              q: t('howItWorks:faq.q2.question'),
              a: t('howItWorks:faq.q2.answer'),
            },
            {
              q: t('howItWorks:faq.q3.question'),
              a: t('howItWorks:faq.q3.answer'),
            },
            {
              q: t('howItWorks:faq.q4.question'),
              a: t('howItWorks:faq.q4.answer'),
            },
            {
              q: t('howItWorks:faq.q5.question'),
              a: t('howItWorks:faq.q5.answer'),
            },
          ].map((faq, idx) => (
            <details key={idx} className="bg-white rounded-xl border border-neutral-200 group">
              <summary className="flex items-center justify-between p-5 cursor-pointer font-medium text-neutral-800 hover:bg-neutral-50 rounded-xl">
                {faq.q}
                <span className="ml-4 flex-shrink-0 text-neutral-400 group-open:rotate-180 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="px-5 pb-5 text-neutral-600">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HowItWorksPage;
