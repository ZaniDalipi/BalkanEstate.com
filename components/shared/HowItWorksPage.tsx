import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import { buildLocalizedPath } from '../../src/utils/languageRouting';
import { HowItWorksTab } from '../../types';
import Footer from './Footer';

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

const HowItWorksPage: React.FC = () => {
  const { t } = useTranslation();
  const { state, dispatch } = useAppContext();
  const activeTab = state.howItWorksTab;

  const handleTabChange = (tabId: HowItWorksTab) => {
    dispatch({ type: 'SET_HOW_IT_WORKS_TAB', payload: tabId });
    window.history.pushState({}, '', buildLocalizedPath(`/how-it-works/${tabId}`));
  };

  const tabs = [
    { id: 'agencies' as HowItWorksTab, label: 'For Agencies', icon: BuildingIcon, color: 'orange' },
    { id: 'agents' as HowItWorksTab, label: 'For Agents', icon: UserGroupIcon, color: 'purple' },
    { id: 'buyers' as HowItWorksTab, label: 'For Buyers', icon: SearchIcon, color: 'blue' },
    { id: 'sellers' as HowItWorksTab, label: 'For Sellers', icon: HomeIcon, color: 'green' },
  ];

  const getTabColor = (tab: HowItWorksTab) => {
    const colors = {
      agencies: 'orange',
      agents: 'purple',
      buyers: 'blue',
      sellers: 'green',
    };
    return colors[tab];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-primary-darker text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRoLTEydi0yaDEydjJ6bS0xMi0xMGgxMnYySDI0di0yem0xMiA2SDI0di0yaDEydjJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 relative">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              How Balkan Estate Works
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              The premier real estate platform connecting buyers, sellers, agents, and agencies across the Balkans
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
                style={isActive ? { backgroundColor: tab.color === 'orange' ? '#f97316' : tab.color === 'purple' ? '#a855f7' : tab.color === 'blue' ? '#3b82f6' : '#22c55e' } : {}}
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
        {/* For Agencies */}
        {activeTab === 'agencies' && (
          <div className="animate-fade-in">
            {/* Main Value Prop */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                <BuildingIcon className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-3xl font-bold text-neutral-800 mb-3">Build Your Real Estate Empire</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                Create your agency, invite agents, and manage your entire team from one powerful platform
              </p>
            </div>

            {/* Pricing Card */}
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl p-8 md:p-12 text-white mb-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div>
                    <span className="text-orange-200 font-medium">Enterprise Plan</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-5xl font-bold">€1,000</span>
                      <span className="text-xl text-orange-200">/year</span>
                    </div>
                    <p className="text-orange-100 mt-2">Everything you need to run a successful agency</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-2xl p-6 w-full md:w-auto">
                    <h4 className="font-semibold mb-4 text-center">What's Included</h4>
                    <ul className="space-y-3">
                      {[
                        '100 active property listings',
                        '5 agent slots included FREE',
                        '15 monthly promotion credits',
                        'Priority support & visibility',
                        'Agency profile & branding',
                        'Team analytics dashboard',
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
            <h3 className="text-2xl font-bold text-neutral-800 mb-8 text-center">How to Get Started</h3>
            <div className="grid md:grid-cols-4 gap-6 mb-12">
              {[
                {
                  step: '1',
                  title: 'Subscribe',
                  description: 'Choose the Enterprise plan and complete your subscription',
                  icon: TicketIcon,
                },
                {
                  step: '2',
                  title: 'Create Agency',
                  description: 'Set up your agency profile with logo, description, and location',
                  icon: BuildingIcon,
                },
                {
                  step: '3',
                  title: 'Generate Coupons',
                  description: 'Create up to 5 coupon codes to invite agents to your team',
                  icon: UserGroupIcon,
                },
                {
                  step: '4',
                  title: 'Grow Together',
                  description: 'Your agents start listing properties and your agency thrives',
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
              <h3 className="text-xl font-bold text-neutral-800 mb-6">Agent Invitation System</h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-neutral-700 mb-3">Invitation Codes</h4>
                  <p className="text-neutral-600 mb-4">
                    Share your unique agency invitation code with agents who want to join. They can use it
                    to request membership to your agency.
                  </p>
                  <div className="bg-white rounded-lg border border-neutral-200 p-4">
                    <code className="text-sm text-orange-600">AGENCY-ABC123</code>
                    <p className="text-xs text-neutral-500 mt-1">Example invitation code</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-700 mb-3">Agent Subscription Coupons</h4>
                  <p className="text-neutral-600 mb-4">
                    Generate coupon codes that give agents a FREE yearly Pro subscription when they join
                    your agency. Each agent gets 20 listings/month.
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
              <h2 className="text-3xl font-bold text-neutral-800 mb-3">Join an Agency or Go Solo</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                Choose your path: work independently with Pro subscription or join an agency for free
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
                    <h3 className="font-bold text-neutral-800">Independent Agent</h3>
                    <span className="text-sm text-purple-600">Pro Subscription</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-bold text-neutral-800">€240</span>
                  <span className="text-neutral-500">/year</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {[
                    '20 active listings per month',
                    '3 monthly promotion credits',
                    'Personal agent profile',
                    'Direct client messaging',
                    'Analytics dashboard',
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
                  FREE
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <BuildingIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">Agency Agent</h3>
                    <span className="text-sm text-purple-200">Join with Coupon</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-bold">€0</span>
                  <span className="text-purple-200">/year</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {[
                    '20 active listings per month',
                    'Share agency promotion pool',
                    'Agency branding on listings',
                    'Team collaboration',
                    'Agency support network',
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-purple-100">
                      <CheckIcon className="w-5 h-5 text-purple-200" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-purple-200">
                  * Get a coupon code from your agency owner to join for free
                </p>
              </div>
            </div>

            {/* How to Join an Agency */}
            <div className="bg-purple-50 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-neutral-800 mb-6">How to Join an Agency</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    step: '1',
                    title: 'Get a Coupon Code',
                    description: 'Ask an agency owner for their agent subscription coupon code',
                  },
                  {
                    step: '2',
                    title: 'Redeem the Code',
                    description: 'Enter the coupon code in your account settings to activate your free subscription',
                  },
                  {
                    step: '3',
                    title: 'Start Listing',
                    description: 'Begin posting properties under your agency\'s brand and collaborate with your team',
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
              <h2 className="text-3xl font-bold text-neutral-800 mb-3">Find Your Dream Property</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                Search, save, and connect with sellers across the Balkans - all for free
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {[
                {
                  icon: MapIcon,
                  title: 'Interactive Map Search',
                  description: 'Draw custom areas on the map to find properties exactly where you want them',
                  color: 'blue',
                },
                {
                  icon: HeartIcon,
                  title: 'Save Favorites',
                  description: 'Keep track of properties you love and get notified when prices change',
                  color: 'red',
                },
                {
                  icon: BellIcon,
                  title: 'Saved Searches',
                  description: 'Create saved searches and get alerts when new matching properties are listed',
                  color: 'purple',
                },
                {
                  icon: ChatIcon,
                  title: 'Direct Messaging',
                  description: 'Contact sellers and agents directly through our secure messaging system',
                  color: 'green',
                },
                {
                  icon: ChartIcon,
                  title: 'Market Insights',
                  description: 'View neighborhood statistics, price trends, and area information',
                  color: 'orange',
                },
                {
                  icon: UserIcon,
                  title: 'Agent Profiles',
                  description: 'Browse verified agents and agencies to find trusted professionals',
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
              <h3 className="text-xl font-bold text-neutral-800 mb-6 text-center">Your Home-Finding Journey</h3>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {[
                  { step: 'Search', icon: SearchIcon, desc: 'Use filters & map' },
                  { step: 'Save', icon: HeartIcon, desc: 'Bookmark favorites' },
                  { step: 'Compare', icon: ChartIcon, desc: 'Analyze options' },
                  { step: 'Contact', icon: ChatIcon, desc: 'Message sellers' },
                  { step: 'Visit', icon: HomeIcon, desc: 'Schedule viewings' },
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
              <h3 className="text-2xl font-bold text-neutral-800 mb-8 text-center">See It In Action</h3>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Map Search Demo */}
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <MapIcon className="w-16 h-16 text-blue-300 mx-auto mb-2" />
                        <p className="text-blue-400 font-medium">Interactive Map Demo</p>
                        <p className="text-blue-300 text-sm">Screenshot coming soon</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h4 className="font-semibold text-neutral-800 mb-2">Draw & Search</h4>
                    <p className="text-sm text-neutral-600">Draw custom areas on the map to find properties in your preferred neighborhoods. Filter by price, size, and amenities in real-time.</p>
                  </div>
                </div>

                {/* Save & Compare Demo */}
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-gradient-to-br from-red-100 to-pink-50 flex items-center justify-center relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <HeartIcon className="w-16 h-16 text-red-300 mx-auto mb-2" />
                        <p className="text-red-400 font-medium">Saved Properties View</p>
                        <p className="text-red-300 text-sm">Screenshot coming soon</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h4 className="font-semibold text-neutral-800 mb-2">Save & Compare</h4>
                    <p className="text-sm text-neutral-600">Save properties you love and compare them side by side. Get instant notifications when prices change or similar properties become available.</p>
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
              <h2 className="text-3xl font-bold text-neutral-800 mb-3">Sell Your Property</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                List your property and reach thousands of potential buyers across the region
              </p>
            </div>

            {/* Seller Plans */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Free Plan */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-8 hover:shadow-lg transition-shadow">
                <span className="text-green-600 font-medium text-sm">Free Plan</span>
                <div className="flex items-baseline gap-2 mt-2 mb-6">
                  <span className="text-4xl font-bold text-neutral-800">€0</span>
                  <span className="text-neutral-500">/month</span>
                </div>
                <p className="text-neutral-600 mb-6">
                  Perfect for private sellers with just a few properties
                </p>
                <ul className="space-y-3 mb-6">
                  {[
                    '3 active listings',
                    'Basic property photos',
                    'Direct messaging',
                    'Basic analytics',
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
                  POPULAR
                </div>
                <span className="text-green-200 font-medium text-sm">Pro Plan</span>
                <div className="flex items-baseline gap-2 mt-2 mb-6">
                  <span className="text-4xl font-bold">€20</span>
                  <span className="text-green-200">/month</span>
                </div>
                <p className="text-green-100 mb-6">
                  For serious sellers who want maximum exposure
                </p>
                <ul className="space-y-3 mb-6">
                  {[
                    '20 active listings',
                    'HD photos & virtual tours',
                    '3 monthly promotion credits',
                    'Featured placement',
                    'Advanced analytics',
                    'Priority support',
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
              <h3 className="text-xl font-bold text-neutral-800 mb-6 text-center">How to List Your Property</h3>
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  {
                    step: '1',
                    title: 'Create Account',
                    description: 'Sign up as a private seller or agent',
                  },
                  {
                    step: '2',
                    title: 'Add Details',
                    description: 'Enter property info, photos, and set your price',
                  },
                  {
                    step: '3',
                    title: 'Go Live',
                    description: 'Publish and your listing appears on the map',
                  },
                  {
                    step: '4',
                    title: 'Connect',
                    description: 'Receive inquiries and respond to interested buyers',
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
              <h3 className="text-xl font-bold text-neutral-800 mb-6">Boost Your Listing Visibility</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    title: 'Featured',
                    price: '€15',
                    duration: '7 days',
                    color: 'amber',
                    features: ['Golden border', 'Top of search results', '3x more views'],
                  },
                  {
                    title: 'Premium',
                    price: '€25',
                    duration: '7 days',
                    color: 'orange',
                    features: ['Fire badge', 'Premium positioning', '5x more views', 'Social media feature'],
                  },
                  {
                    title: 'Highlight',
                    price: '€10',
                    duration: '7 days',
                    color: 'blue',
                    features: ['Blue highlight', 'Stand out in lists', '2x more views'],
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
              <h3 className="text-2xl font-bold text-neutral-800 mb-8 text-center">See It In Action</h3>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Create Listing Demo */}
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-gradient-to-br from-green-100 to-emerald-50 flex items-center justify-center relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <HomeIcon className="w-16 h-16 text-green-300 mx-auto mb-2" />
                        <p className="text-green-400 font-medium">Listing Creator</p>
                        <p className="text-green-300 text-sm">Screenshot coming soon</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h4 className="font-semibold text-neutral-800 mb-2">Easy Listing Creation</h4>
                    <p className="text-sm text-neutral-600">Create beautiful property listings in minutes with our intuitive form. Add photos, set your price, and describe your property's best features.</p>
                  </div>
                </div>

                {/* Analytics Dashboard Demo */}
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <ChartIcon className="w-16 h-16 text-emerald-300 mx-auto mb-2" />
                        <p className="text-emerald-400 font-medium">Analytics Dashboard</p>
                        <p className="text-emerald-300 text-sm">Screenshot coming soon</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h4 className="font-semibold text-neutral-800 mb-2">Track Your Performance</h4>
                    <p className="text-sm text-neutral-600">Monitor views, inquiries, and engagement for all your listings. See which properties perform best and optimize your strategy.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary to-primary-dark py-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-white/80 mb-8">
            Join thousands of users already finding and listing properties on Balkan Estate
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="/"
              className="px-8 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-neutral-100 transition-colors"
            >
              Browse Properties
            </a>
            <a
              href="/create-listing"
              className="px-8 py-3 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-colors border border-white/30"
            >
              List Your Property
            </a>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-neutral-800 mb-8 text-center">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            {
              q: 'Is it free to browse properties?',
              a: 'Yes! Browsing, searching, saving favorites, and contacting sellers is completely free for buyers.',
            },
            {
              q: 'How do agency coupon codes work?',
              a: 'Agency owners can generate up to 5 coupon codes. When an agent redeems a code, they get a free yearly Pro subscription (20 listings/month) and join that agency.',
            },
            {
              q: 'Can I switch from independent agent to agency agent?',
              a: 'Yes! If you receive a coupon code from an agency, you can redeem it to join their team. Your listings will then be associated with that agency.',
            },
            {
              q: 'What happens when my subscription expires?',
              a: 'Your existing listings remain active, but you won\'t be able to create new ones until you renew. You\'ll receive reminders before expiration.',
            },
            {
              q: 'How do promotion credits work?',
              a: 'Promotion credits let you boost your listings to appear higher in search results. Pro users get 3 credits/month, agencies get 15 to share among their team.',
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
