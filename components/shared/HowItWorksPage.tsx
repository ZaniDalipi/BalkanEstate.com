import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { navigate } from '../../src/app/router/navigation';
import { paths } from '../../src/app/router/paths';
import { HOW_IT_WORKS_TABS } from '../../src/shared/constants/app.constants';
import { HowItWorksTab } from '../../types';
import Footer from './Footer';
import { API_URL } from '../../src/shared/api/config';
import { useHowItWorksPrices } from '../../src/shared/query/hooks';
import { SoftIcon, type SoftIconName } from '../../src/shared/illustrations';

// Helper function to replace placeholders in feature strings with actual product values
const replacePlaceholdersInFeature = (feature: any, product: any): string => {
  if (typeof feature !== 'string') {
    return typeof feature === 'object' ? feature.name || feature : String(feature);
  }

  if (!product) return feature;

  let result = feature;
  if (result.includes('{listingsLimit}') && product.listingsLimit) {
    result = result.replace('{listingsLimit}', product.listingsLimit);
  }
  if (result.includes('{promotionCoupons}') && product.promotionCoupons) {
    result = result.replace('{promotionCoupons}', product.promotionCoupons);
  }
  if (result.includes('{teamMembersLimit}') && product.teamMembersLimit) {
    result = result.replace('{teamMembersLimit}', product.teamMembersLimit);
  }

  return result;
};

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
  // Extract subsection from videoKey - handles both formats like "getting-started-xxx" and "agencies-xxx"
  const KNOWN_SUBSECTIONS = ['getting-started', 'premium-features', 'agencies', 'agents', 'buyers', 'sellers'];
  let subsection = 'general';
  for (const sub of KNOWN_SUBSECTIONS) {
    if (videoKey.startsWith(sub + '-') || videoKey === sub) {
      subsection = sub;
      break;
    }
  }
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
const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const HowItWorksPage: React.FC = () => {
  const { t } = useTranslation(['howItWorks']);
  const { tab } = useParams();
  const activeTab: HowItWorksTab = HOW_IT_WORKS_TABS.includes(tab as typeof HOW_IT_WORKS_TABS[number])
    ? (tab as HowItWorksTab)
    : 'getting-started';
  const [videos, setVideos] = useState<Record<string, SiteVideo[]>>({});
  const { prices, isLoading: pricesLoading } = useHowItWorksPrices();

  // Fetch how-it-works videos from database (admin-managed)
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch(`${API_URL}/site-content/how-it-works`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setVideos(data);
        }
      } catch {
        // Failed to fetch videos
      }
    };
    fetchVideos();
  }, []);

  // Helper to find a video by key across all subsections
  const findVideoByKey = (key: string): SiteVideo | undefined => {
    for (const subsectionVideos of Object.values(videos)) {
      const found = subsectionVideos.find(v => v.key === key);
      if (found) return found;
    }
    return undefined;
  };

  // Get all videos as a flat array for dynamic rendering
  const allVideos: SiteVideo[] = Object.values(videos).flat();

  // Navigation helper
  const navigateTo = (path: string) => navigate(path);

  const handleTabChange = (tabId: HowItWorksTab) => navigate(paths.howItWorks(tabId));

  const tabs = [
    { id: 'getting-started' as HowItWorksTab, label: t('howItWorks:tabs.gettingStarted'), icon: 'star' as SoftIconName, color: 'cyan' },
    { id: 'premium-features' as HowItWorksTab, label: t('howItWorks:tabs.premiumFeatures'), icon: 'sparkles' as SoftIconName, color: 'amber' },
    { id: 'agencies' as HowItWorksTab, label: t('howItWorks:tabs.forAgencies'), icon: 'building' as SoftIconName, color: 'orange' },
    { id: 'agents' as HowItWorksTab, label: t('howItWorks:tabs.forAgents'), icon: 'users' as SoftIconName, color: 'purple' },
    { id: 'buyers' as HowItWorksTab, label: t('howItWorks:tabs.forBuyers'), icon: 'search' as SoftIconName, color: 'blue' },
    { id: 'sellers' as HowItWorksTab, label: t('howItWorks:tabs.forSellers'), icon: 'home' as SoftIconName, color: 'green' },
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

        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 landscape:py-8 relative">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 landscape:text-2xl">
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

      {/* Video Tutorials Section */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Main Overview Video */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-neutral-800 mb-3">
            {t('howItWorks:videoTutorials.title')}
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            {t('howItWorks:videoTutorials.subtitle')}
          </p>
        </div>

        {/* Main Video Embed - uses first DB video or fallback */}
        <div className="max-w-4xl mx-auto mb-12">
          {(() => {
            // Use first database video as the main/hero video
            const dbVideo = allVideos[0];
            const dbEmbedUrl = dbVideo?.url;
            const i18nEmbedUrl = t('howItWorks:videoTutorials.mainVideo.embedUrl');
            const embedUrl = dbEmbedUrl || (i18nEmbedUrl && !i18nEmbedUrl.includes('videoTutorials.mainVideo') ? i18nEmbedUrl : '');
            const isYouTubeEmbed = embedUrl && (embedUrl.includes('youtube.com/embed') || embedUrl.includes('youtu.be'));
            const isDirectVideo = embedUrl && !isYouTubeEmbed;
            const videoTitle = dbVideo?.title || t('howItWorks:videoTutorials.mainVideo.title');

            if (isYouTubeEmbed) {
              return (
                <div className="relative w-full rounded-2xl overflow-hidden shadow-xl" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src={embedUrl}
                    title={videoTitle}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              );
            }

            if (isDirectVideo) {
              return (
                <video
                  src={embedUrl}
                  className="w-full rounded-2xl shadow-xl"
                  controls
                  preload="metadata"
                />
              );
            }

            return (
              <div className="relative w-full rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-primary/5 to-primary/10" style={{ paddingBottom: '56.25%' }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400">
                  <SoftIcon name="video" className="w-16 h-16 mb-3" />
                  <span className="text-lg font-medium">{t('howItWorks:videoTutorials.comingSoon')}</span>
                </div>
              </div>
            );
          })()}
          <p className="text-center text-neutral-500 mt-3 text-sm">
            {allVideos[0]?.description || t('howItWorks:videoTutorials.mainVideo.description')}
          </p>
        </div>

        {/* Additional Tutorial Videos Grid - dynamically from database */}
        {allVideos.length > 1 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-neutral-800 mb-6 text-center">
              {t('howItWorks:videoTutorials.shortVideos.title')}
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allVideos.slice(1).map((dbVideo) => {
                const embedUrl = dbVideo.url;
                const isYouTubeEmbed = embedUrl && (embedUrl.includes('youtube.com/embed') || embedUrl.includes('youtu.be'));
                const isDirectVideo = embedUrl && !isYouTubeEmbed;

                return (
                  <div key={dbVideo._id} className="bg-white rounded-xl shadow-md overflow-hidden border border-neutral-100 hover:shadow-lg transition-shadow">
                    {isYouTubeEmbed ? (
                      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                          className="absolute top-0 left-0 w-full h-full"
                          src={embedUrl}
                          title={dbVideo.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    ) : isDirectVideo ? (
                      <video
                        src={embedUrl}
                        className="w-full aspect-video object-cover"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <div className="relative w-full bg-gradient-to-br from-neutral-100 to-neutral-50 flex items-center justify-center" style={{ paddingBottom: '56.25%' }}>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400">
                          <SoftIcon name="video" className="w-12 h-12 mb-2" />
                          <span className="text-sm">{t('howItWorks:videoTutorials.comingSoon')}</span>
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <SoftIcon name="video" className="w-6 h-6 flex-shrink-0" />
                        <h4 className="font-semibold text-neutral-800">
                          {dbVideo.title}
                        </h4>
                      </div>
                      {dbVideo.description && (
                        <p className="text-sm text-neutral-500">
                          {dbVideo.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-wrap gap-2 justify-center">
          {tabs.map((tab) => {
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
                <SoftIcon name={tab.icon} className="w-6 h-6" />
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
              <SoftIcon name="star" className="inline-block w-16 h-16 mb-4" />
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
                    { name: t('howItWorks:gettingStarted.mainNavigation.home.name'), desc: t('howItWorks:gettingStarted.mainNavigation.home.desc'), icon: 'home' as SoftIconName, path: '/' },
                    { name: t('howItWorks:gettingStarted.mainNavigation.search.name'), desc: t('howItWorks:gettingStarted.mainNavigation.search.desc'), icon: 'search' as SoftIconName, path: '/search' },
                    { name: t('howItWorks:gettingStarted.mainNavigation.agents.name'), desc: t('howItWorks:gettingStarted.mainNavigation.agents.desc'), icon: 'users' as SoftIconName, path: '/agents' },
                    { name: t('howItWorks:gettingStarted.mainNavigation.agencies.name'), desc: t('howItWorks:gettingStarted.mainNavigation.agencies.desc'), icon: 'building' as SoftIconName, path: '/agencies' },
                    { name: t('howItWorks:gettingStarted.mainNavigation.explore.name'), desc: t('howItWorks:gettingStarted.mainNavigation.explore.desc'), icon: 'mapGrid' as SoftIconName, path: '/explore' },
                  ].map((nav) => {
                    return (
                      <button
                        key={nav.name}
                        onClick={() => navigateTo(nav.path)}
                        className="bg-white/20 backdrop-blur rounded-xl p-4 text-center hover:bg-white/30 hover:scale-105 transition-all cursor-pointer"
                      >
                        <SoftIcon name={nav.icon} className="block w-9 h-9 mx-auto mb-2" />
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
                    fallbackIcon={<SoftIcon name="user" className="block w-16 h-16 mx-auto mb-2" />}
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
                      <SoftIcon name="mapGrid" className="w-7 h-7 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-neutral-800 mb-1">{t('howItWorks:gettingStarted.interactiveMap.panZoom.title')}</h4>
                        <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.interactiveMap.panZoom.desc')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
                    <div className="flex items-start gap-3">
                      <SoftIcon name="search" className="w-7 h-7 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-neutral-800 mb-1">{t('howItWorks:gettingStarted.interactiveMap.drawCustomAreas.title')}</h4>
                        <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.interactiveMap.drawCustomAreas.desc')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                    <div className="flex items-start gap-3">
                      <SoftIcon name="home" className="w-7 h-7 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-neutral-800 mb-1">{t('howItWorks:gettingStarted.interactiveMap.clickProperties.title')}</h4>
                        <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.interactiveMap.clickProperties.desc')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
                    <div className="flex items-start gap-3">
                      <SoftIcon name="star" className="w-7 h-7 flex-shrink-0" />
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
                    fallbackIcon={<SoftIcon name="mapGrid" className="block w-16 h-16 mx-auto mb-2" />}
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
                      <SoftIcon name="heart" className="block w-12 h-12 mx-auto mb-2" />
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
                      <SoftIcon name="search" className="block w-12 h-12 mx-auto mb-2" />
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
                      <SoftIcon name="bell" className="block w-12 h-12 mx-auto mb-2" />
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
                    fallbackIcon={<SoftIcon name="chat" className="block w-16 h-16 mx-auto mb-2" />}
                    fallbackTitle={t('howItWorks:gettingStarted.contactingSellers.contactForm')}
                    fallbackSubtitle={t('howItWorks:gettingStarted.contactingSellers.onEveryPage')}
                    className="aspect-video bg-gradient-to-br from-green-100 to-emerald-50"
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-neutral-800">{t('howItWorks:gettingStarted.contactingSellers.multipleWays')}</h4>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-3">
                      <SoftIcon name="chat" className="w-6 h-6" />
                      <div>
                        <span className="font-medium text-neutral-800">{t('howItWorks:gettingStarted.contactingSellers.directMessage.title')}</span>
                        <p className="text-xs text-neutral-600">{t('howItWorks:gettingStarted.contactingSellers.directMessage.desc')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-3">
                      <SoftIcon name="phone" className="w-6 h-6 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-neutral-800">{t('howItWorks:gettingStarted.contactingSellers.phoneCall.title')}</span>
                        <p className="text-xs text-neutral-600">{t('howItWorks:gettingStarted.contactingSellers.phoneCall.desc')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center gap-3">
                      <SoftIcon name="envelope" className="w-6 h-6 flex-shrink-0" />
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
                      <SoftIcon name="camera" className="w-6 h-6" />
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
                      <SoftIcon name="clipboard" className="w-6 h-6" />
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
                  <SoftIcon name="user" className="w-12 h-12 mb-4" />
                  <h4 className="font-semibold text-neutral-800 mb-2">{t('howItWorks:gettingStarted.managingAccount.profileSettings.title')}</h4>
                  <p className="text-sm text-neutral-600 mb-3">{t('howItWorks:gettingStarted.managingAccount.profileSettings.desc')}</p>
                  <p className="text-xs text-neutral-400">{t('howItWorks:gettingStarted.managingAccount.profileSettings.access')}</p>
                </button>

                <button
                  onClick={() => navigateTo('/account?tab=subscription')}
                  className="bg-white rounded-2xl border border-neutral-200 p-6 hover:shadow-lg transition-all hover:scale-[1.02] text-left"
                >
                  <SoftIcon name="ticket" className="w-12 h-12 mb-4" />
                  <h4 className="font-semibold text-neutral-800 mb-2">{t('howItWorks:gettingStarted.managingAccount.subscription.title')}</h4>
                  <p className="text-sm text-neutral-600 mb-3">{t('howItWorks:gettingStarted.managingAccount.subscription.desc')}</p>
                  <p className="text-xs text-neutral-400">{t('howItWorks:gettingStarted.managingAccount.subscription.access')}</p>
                </button>

                <button
                  onClick={() => navigateTo('/account?tab=settings')}
                  className="bg-white rounded-2xl border border-neutral-200 p-6 hover:shadow-lg transition-all hover:scale-[1.02] text-left"
                >
                  <SoftIcon name="bell" className="w-12 h-12 mb-4" />
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
                  <SoftIcon name="check" className="w-10 h-10 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-neutral-800 mb-1">{t('howItWorks:gettingStarted.proTips.completeProfile.title')}</h4>
                    <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.proTips.completeProfile.desc')}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <SoftIcon name="check" className="w-10 h-10 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-neutral-800 mb-1">{t('howItWorks:gettingStarted.proTips.useSavedSearches.title')}</h4>
                    <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.proTips.useSavedSearches.desc')}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <SoftIcon name="check" className="w-10 h-10 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-neutral-800 mb-1">{t('howItWorks:gettingStarted.proTips.exploreCities.title')}</h4>
                    <p className="text-sm text-neutral-600">{t('howItWorks:gettingStarted.proTips.exploreCities.desc')}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <SoftIcon name="check" className="w-10 h-10 flex-shrink-0" />
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
              <SoftIcon name="sparkles" className="inline-block w-16 h-16 mb-4" />
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
                      <SoftIcon name="search" className="w-10 h-10 flex-shrink-0" />
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
                        <SoftIcon name="sparkles" className="w-6 h-6" />
                        <span className="font-medium text-sm">{t('howItWorks:ui.howItWorksPage.aiSearch', 'AI Search')}</span>
                      </div>
                      <div className="bg-neutral-100 rounded-lg p-3 mb-3">
                        <p className="text-xs text-neutral-500">{t('howItWorks:ui.howItWorksPage.findMeA', 'Find me a...')}</p>
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
                <SoftIcon name="lightbulb" className="w-10 h-10 flex-shrink-0" />
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
                  <SoftIcon name="sun" className="w-10 h-10 flex-shrink-0" />
                  <div>
                    <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full">{t('howItWorks:premiumFeatures.interactiveMap3D.badge')}</span>
                    <h3 className="text-2xl font-bold mt-1">{t('howItWorks:premiumFeatures.interactiveMap3D.title')}</h3>
                  </div>
                </div>
                <p className="text-yellow-100 mb-6 max-w-2xl">{t('howItWorks:premiumFeatures.interactiveMap3D.desc')}</p>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold mb-4">{t('howItWorks:ui.howItWorksPage.features', 'Features')}</h4>
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
                  <SoftIcon name="ruler" className="w-12 h-12 flex-shrink-0" />
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
                  <SoftIcon name="pin" className="w-12 h-12 flex-shrink-0" />
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
                <SoftIcon name="lightbulb" className="w-10 h-10 flex-shrink-0" />
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
                  <SoftIcon name="calculator" className="w-8 h-8 flex-shrink-0" />
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
                <SoftIcon name="chart" className="w-10 h-10 flex-shrink-0" />
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
                {([
                  ['faster', 'flame'],
                  ['visibility', 'search'],
                  ['standOut', 'star'],
                  ['analytics', 'chart'],
                ] as [string, SoftIconName][]).map(([benefit, icon]) => (
                  <div key={benefit} className="text-center">
                    <SoftIcon name={icon} className="block w-12 h-12 mx-auto mb-3" />
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
              <SoftIcon name="building" className="inline-block w-16 h-16 mb-4" />
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
                    <span className="text-orange-200 font-medium">{prices.enterprise.name || t('howItWorks:agencies.pricing.planName')}</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-5xl font-bold">€{prices.enterprise.price ?? t('howItWorks:agencies.pricing.price').replace('€', '')}</span>
                      <span className="text-xl text-orange-200">/{prices.enterprise.billingPeriod || 'year'}</span>
                    </div>
                    <p className="text-orange-100 mt-2">{t('howItWorks:agencies.pricing.tagline')}</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-2xl p-6 w-full md:w-auto">
                    <h4 className="font-semibold mb-4 text-center">{t('howItWorks:agencies.pricing.whatsIncluded')}</h4>
                    <ul className="space-y-3">
                      {(prices.enterprise.features || [
                        t('howItWorks:agencies.pricing.features.listings'),
                        t('howItWorks:agencies.pricing.features.teamMembers'),
                        t('howItWorks:agencies.pricing.features.promotions'),
                        t('howItWorks:agencies.pricing.features.branding'),
                        t('howItWorks:agencies.pricing.features.ai'),
                        t('howItWorks:agencies.pricing.features.accountManager'),
                        t('howItWorks:agencies.pricing.features.analytics'),
                      ]).map((feature: any, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckIcon className="w-5 h-5 text-orange-200 flex-shrink-0" />
                          <span className="text-sm">{replacePlaceholdersInFeature(feature, prices.enterprise.product)}</span>
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
                  icon: 'ticket' as SoftIconName,
                },
                {
                  step: '2',
                  title: t('howItWorks:agencies.steps.createAgency.title'),
                  description: t('howItWorks:agencies.steps.createAgency.desc'),
                  icon: 'building' as SoftIconName,
                },
                {
                  step: '3',
                  title: t('howItWorks:agencies.steps.generateCoupons.title'),
                  description: t('howItWorks:agencies.steps.generateCoupons.desc'),
                  icon: 'users' as SoftIconName,
                },
                {
                  step: '4',
                  title: t('howItWorks:agencies.steps.growTogether.title'),
                  description: t('howItWorks:agencies.steps.growTogether.desc'),
                  icon: 'chart' as SoftIconName,
                },
              ].map((item) => {
                return (
                  <div key={item.step} className="relative">
                    <div className="bg-white rounded-2xl border border-neutral-200 p-6 h-full hover:shadow-lg transition-shadow">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="text-orange-600 font-bold">{item.step}</span>
                        </div>
                        <SoftIcon name={item.icon} className="w-7 h-7" />
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
              <SoftIcon name="users" className="inline-block w-16 h-16 mb-4" />
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
                  <SoftIcon name="user" className="w-12 h-12 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-neutral-800">{t('howItWorks:agents.independent.title')}</h3>
                    <span className="text-sm text-purple-600">{t('howItWorks:agents.independent.planType')}</span>
                  </div>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-neutral-800">€{prices.agentPro.monthlyPrice ?? t('howItWorks:agents.independent.price').replace('€', '')}</span>
                    <span className="text-neutral-500">/{prices.agentPro.monthlyBillingPeriod || 'month'}</span>
                  </div>
                  <p className="text-sm text-purple-600 mt-1">
                    {prices.agentPro.yearlyPrice
                      ? `or €${prices.agentPro.yearlyPrice}/year (save 33%)`
                      : t('howItWorks:agents.independent.yearlyNote')}
                  </p>
                </div>
                <ul className="space-y-3 mb-6">
                  {(prices.agentPro.monthlyFeatures || [
                    t('howItWorks:agents.independent.features.listings'),
                    t('howItWorks:agents.independent.features.promotions'),
                    t('howItWorks:agents.independent.features.profile'),
                    t('howItWorks:agents.independent.features.ai'),
                    t('howItWorks:agents.independent.features.analytics'),
                    t('howItWorks:agents.independent.features.support'),
                  ]).map((feature: any, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-neutral-600">
                      <CheckIcon className="w-5 h-5 text-purple-500" />
                      {replacePlaceholdersInFeature(feature, prices.agentPro.productMonthly)}
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
                  <div className="w-12 h-12 bg-white/95 rounded-full flex items-center justify-center">
                    <SoftIcon name="building" className="w-9 h-9" />
                  </div>
                  <div>
                    <h3 className="font-bold">{t('howItWorks:agents.agency.title')}</h3>
                    <span className="text-sm text-purple-200">{t('howItWorks:agents.agency.planType')}</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-bold">€{prices.agencyAgent.price ?? 0}</span>
                  <span className="text-purple-200">/year</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {(prices.agencyAgent.features || [
                    t('howItWorks:agents.agency.features.listings'),
                    t('howItWorks:agents.agency.features.promotions'),
                    t('howItWorks:agents.agency.features.branding'),
                    t('howItWorks:agents.agency.features.collaboration'),
                    t('howItWorks:agents.agency.features.support'),
                  ]).map((feature: any, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-purple-100">
                      <CheckIcon className="w-5 h-5 text-purple-200" />
                      {replacePlaceholdersInFeature(feature, prices.agencyAgent.product)}
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
              <SoftIcon name="search" className="inline-block w-16 h-16 mb-4" />
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
                  <span className="text-4xl font-bold text-neutral-800">€{prices.buyerFree.price ?? 0}</span>
                  <span className="text-neutral-500">{t('howItWorks:ui.howItWorksPage.forever', 'forever')}</span>
                </div>
                <p className="text-neutral-600 mb-6">
                  {t('howItWorks:buyers.freePlan.tagline')}
                </p>
                <ul className="space-y-3 mb-6">
                  {(prices.buyerFree.features || [
                    t('howItWorks:buyers.freePlan.features.browse'),
                    t('howItWorks:buyers.freePlan.features.mapSearch'),
                    t('howItWorks:buyers.freePlan.features.favorites'),
                    t('howItWorks:buyers.freePlan.features.contact'),
                    t('howItWorks:buyers.freePlan.features.insights'),
                    t('howItWorks:buyers.freePlan.features.profiles'),
                  ]).map((feature: any, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-neutral-600">
                      <CheckIcon className="w-5 h-5 text-blue-500" />
                      {replacePlaceholdersInFeature(feature, prices.buyerFree.product)}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Buyer Pro Plan */}
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                  {prices.buyerPro.trialPeriodDays ? `${prices.buyerPro.trialPeriodDays}-DAY FREE TRIAL` : t('howItWorks:buyers.proPlan.trial')}
                </div>
                <span className="text-blue-200 font-medium text-sm">{t('howItWorks:buyers.proPlan.title')}</span>
                <div className="flex items-baseline gap-2 mt-2 mb-6">
                  <span className="text-4xl font-bold">€{prices.buyerPro.price ?? t('howItWorks:buyers.proPlan.price').replace('€', '')}</span>
                  <span className="text-blue-200">/{prices.buyerPro.billingPeriod || 'month'}</span>
                </div>
                <p className="text-blue-100 mb-6">
                  {t('howItWorks:buyers.proPlan.tagline')}
                </p>
                <ul className="space-y-3 mb-6">
                  {(prices.buyerPro.features || [
                    t('howItWorks:buyers.proPlan.features.notifications'),
                    t('howItWorks:buyers.proPlan.features.savedSearches'),
                    t('howItWorks:buyers.proPlan.features.earlyAccess'),
                    t('howItWorks:buyers.proPlan.features.insights'),
                    t('howItWorks:buyers.proPlan.features.priceDrops'),
                    t('howItWorks:buyers.proPlan.features.calculator'),
                    t('howItWorks:buyers.proPlan.features.mortgage'),
                    t('howItWorks:buyers.proPlan.features.adFree'),
                  ]).map((feature: any, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-blue-100">
                      <CheckIcon className="w-5 h-5 text-blue-200" />
                      {replacePlaceholdersInFeature(feature, prices.buyerPro.product)}
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
                  icon: 'mapGrid' as SoftIconName,
                  title: t('howItWorks:buyers.searchTools.interactiveMap.title'),
                  description: t('howItWorks:buyers.searchTools.interactiveMap.desc'),
                  color: 'blue',
                },
                {
                  icon: 'heart' as SoftIconName,
                  title: t('howItWorks:buyers.searchTools.saveFavorites.title'),
                  description: t('howItWorks:buyers.searchTools.saveFavorites.desc'),
                  color: 'red',
                },
                {
                  icon: 'bell' as SoftIconName,
                  title: t('howItWorks:buyers.searchTools.savedSearches.title'),
                  description: t('howItWorks:buyers.searchTools.savedSearches.desc'),
                  color: 'purple',
                },
                {
                  icon: 'chat' as SoftIconName,
                  title: t('howItWorks:buyers.searchTools.directMessaging.title'),
                  description: t('howItWorks:buyers.searchTools.directMessaging.desc'),
                  color: 'green',
                },
                {
                  icon: 'chart' as SoftIconName,
                  title: t('howItWorks:buyers.searchTools.marketInsights.title'),
                  description: t('howItWorks:buyers.searchTools.marketInsights.desc'),
                  color: 'orange',
                },
                {
                  icon: 'user' as SoftIconName,
                  title: t('howItWorks:buyers.searchTools.agentProfiles.title'),
                  description: t('howItWorks:buyers.searchTools.agentProfiles.desc'),
                  color: 'indigo',
                },
              ].map((feature, idx) => {
                return (
                  <div key={idx} className="bg-white rounded-2xl border border-neutral-200 p-6 hover:shadow-lg transition-all hover:-translate-y-1">
                    <SoftIcon name={feature.icon} className="block w-12 h-12 mb-4" />
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
                  { step: t('howItWorks:buyers.journey.search.step'), icon: 'search' as SoftIconName, desc: t('howItWorks:buyers.journey.search.desc') },
                  { step: t('howItWorks:buyers.journey.save.step'), icon: 'heart' as SoftIconName, desc: t('howItWorks:buyers.journey.save.desc') },
                  { step: t('howItWorks:buyers.journey.compare.step'), icon: 'chart' as SoftIconName, desc: t('howItWorks:buyers.journey.compare.desc') },
                  { step: t('howItWorks:buyers.journey.contact.step'), icon: 'chat' as SoftIconName, desc: t('howItWorks:buyers.journey.contact.desc') },
                  { step: t('howItWorks:buyers.journey.visit.step'), icon: 'home' as SoftIconName, desc: t('howItWorks:buyers.journey.visit.desc') },
                ].map((item, idx) => {
                  return (
                    <React.Fragment key={item.step}>
                      <div className="text-center">
                        <SoftIcon name={item.icon} className="block w-16 h-16 mx-auto mb-2" />
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
                        <SoftIcon name="mapGrid" className="block w-16 h-16 mx-auto mb-2" />
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
                        <SoftIcon name="heart" className="block w-16 h-16 mx-auto mb-2" />
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
              <SoftIcon name="home" className="inline-block w-16 h-16 mb-4" />
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
                  <span className="text-4xl font-bold text-neutral-800">€{prices.sellerFree.price ?? 0}</span>
                  <span className="text-neutral-500">/month</span>
                </div>
                <p className="text-neutral-600 mb-6">
                  {t('howItWorks:sellers.freePlan.tagline')}
                </p>
                <ul className="space-y-3 mb-6">
                  {(prices.sellerFree.features || [
                    t('howItWorks:sellers.freePlan.features.listings'),
                    t('howItWorks:sellers.freePlan.features.searches'),
                    t('howItWorks:sellers.freePlan.features.ai'),
                    t('howItWorks:sellers.freePlan.features.photos'),
                    t('howItWorks:sellers.freePlan.features.messaging'),
                    t('howItWorks:sellers.freePlan.features.analytics'),
                  ]).map((feature: any, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-neutral-600">
                      <CheckIcon className="w-5 h-5 text-green-500" />
                      {replacePlaceholdersInFeature(feature, prices.sellerFree.product)}
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
                    <span className="text-4xl font-bold">€{prices.sellerPro.monthlyPrice ?? t('howItWorks:sellers.proPlan.price').replace('€', '')}</span>
                    <span className="text-green-200">/{prices.sellerPro.monthlyBillingPeriod || 'month'}</span>
                  </div>
                  <p className="text-sm text-green-200 mt-1">
                    {prices.sellerPro.yearlyPrice
                      ? `or €${prices.sellerPro.yearlyPrice}/year (save 33%)`
                      : t('howItWorks:sellers.proPlan.yearlyNote')}
                  </p>
                </div>
                <p className="text-green-100 mb-6">
                  {t('howItWorks:sellers.proPlan.tagline')}
                </p>
                <ul className="space-y-3 mb-6">
                  {(prices.sellerPro.monthlyFeatures || [
                    t('howItWorks:sellers.proPlan.features.listings'),
                    t('howItWorks:sellers.proPlan.features.promotions'),
                    t('howItWorks:sellers.proPlan.features.ai'),
                    t('howItWorks:sellers.proPlan.features.searches'),
                    t('howItWorks:sellers.proPlan.features.analytics'),
                    t('howItWorks:sellers.proPlan.features.leads'),
                    t('howItWorks:sellers.proPlan.features.support'),
                  ]).map((feature: any, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-green-100">
                      <CheckIcon className="w-5 h-5 text-green-200" />
                      {replacePlaceholdersInFeature(feature, prices.sellerPro.productMonthly)}
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
                      <SoftIcon name="star" className="w-6 h-6" />
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
                        <SoftIcon name="home" className="block w-16 h-16 mx-auto mb-2" />
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
                        <SoftIcon name="chart" className="block w-16 h-16 mx-auto mb-2" />
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
