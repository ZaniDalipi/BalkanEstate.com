import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { usePropertyRequestForm } from '../hooks/use-property-request-form';
import {
  fetchPropertyRequests,
  createPropertyRequest,
  fetchPropertyRequestStats,
  fetchTelegramInfo,
} from '../api/propertyRequests';
import type { PropertyRequest, PropertyRequestStats, TelegramInfo } from '../api/propertyRequests';
import type { PropertyRequestData } from '../api/propertyRequests';
import PropertyRequestForm from './PropertyRequestForm';
import PropertyRequestCard from './PropertyRequestCard';
import LegalFooter from '@/src/features/legal/components/LegalFooter';
import type { AppView } from '@/types';

// Inline SVG icons
const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);

const TelegramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CommunityPage: React.FC = () => {
  const { dispatch } = useAppContext();
  const { t } = useTranslation('community');

  const [activeTab, setActiveTab] = useState<'browse' | 'submit'>('browse');
  const [requests, setRequests] = useState<PropertyRequest[]>([]);
  const [stats, setStats] = useState<PropertyRequestStats | null>(null);
  const [telegramInfo, setTelegramInfo] = useState<TelegramInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('any');
  const [filterListingType, setFilterListingType] = useState<string>('any');

  const form = usePropertyRequestForm();

  const handleNavigate = useCallback(
    (view: AppView | string) => {
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: view as AppView });
      window.history.pushState({}, '', `/${view}`);
    },
    [dispatch]
  );

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [requestsData, statsData, telegramData] = await Promise.all([
          fetchPropertyRequests({ limit: 20 }),
          fetchPropertyRequestStats(),
          fetchTelegramInfo().catch(() => null),
        ]);
        setRequests(requestsData.requests);
        setStats(statsData);
        if (telegramData) setTelegramInfo(telegramData);
      } catch {
        // Silent fail - show empty state
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    const loadFiltered = async () => {
      try {
        const params: any = { limit: 20 };
        if (filterType !== 'any') params.propertyType = filterType;
        if (filterListingType !== 'any') params.listingType = filterListingType;
        const data = await fetchPropertyRequests(params);
        setRequests(data.requests);
      } catch {
        // Silent fail
      }
    };
    loadFiltered();
  }, [filterType, filterListingType]);

  const onFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      form.handleSubmit(async (data: PropertyRequestData) => {
        await createPropertyRequest(data);
      });
    },
    [form]
  );

  const selectClasses =
    'px-3 py-2 text-sm glass-input rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-300';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Back button */}
        <button
          onClick={() => handleNavigate('search')}
          className="flex items-center gap-2 text-neutral-600 hover:text-primary mb-6 transition-colors group"
        >
          <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm">{t('backToSearch', 'Back to search')}</span>
        </button>

        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full mb-4">
            <UsersIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {t('badge', 'Community')}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-3">
            {t('title', 'Property Requests & Community')}
          </h1>
          <p className="text-neutral-600 max-w-2xl mx-auto text-base sm:text-lg">
            {t('subtitle', "Tell us what you're looking for and let agents and sellers find the perfect property for you. Join our Telegram community for instant updates.")}
          </p>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalActive}</div>
              <div className="text-xs text-neutral-500 mt-1">{t('stats.active', 'Active Requests')}</div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.recentCount}</div>
              <div className="text-xs text-neutral-500 mt-1">{t('stats.thisWeek', 'This Week')}</div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.topCountries?.[0]?.country || '-'}</div>
              <div className="text-xs text-neutral-500 mt-1">{t('stats.topCountry', 'Top Country')}</div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(stats.byType).length}
              </div>
              <div className="text-xs text-neutral-500 mt-1">{t('stats.categories', 'Categories')}</div>
            </div>
          </div>
        )}

        {/* Telegram CTA */}
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-6 sm:p-8 mb-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex-shrink-0 w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <TelegramIcon className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">
                {t('telegram.title', 'Join Our Telegram Community')}
              </h2>
              <p className="text-white/80 text-sm">
                {t('telegram.description', 'Get instant notifications about new listings, submit property requests via our bot, and connect with other buyers and sellers in the Balkans.')}
              </p>
              {telegramInfo && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {telegramInfo.features.slice(0, 3).map((feature, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/15 rounded-lg text-xs">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      {feature}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-shrink-0">
              <a
                href={telegramInfo?.groupLink || 'https://t.me/BalkanEstate'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-sky-600 font-semibold rounded-xl hover:bg-white/90 transition-all text-sm"
              >
                <TelegramIcon className="w-4 h-4" />
                {t('telegram.joinGroup', 'Join Group')}
              </a>
              {telegramInfo?.botUsername && (
                <a
                  href={`https://t.me/${telegramInfo.botUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 text-white font-medium rounded-xl hover:bg-white/30 transition-all text-sm text-center justify-center"
                >
                  {t('telegram.openBot', 'Open Bot')}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Main Content: Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'browse'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-white/60 text-neutral-600 hover:bg-white/80 border border-neutral-200/60'
            }`}
          >
            {t('tabs.browse', 'Browse Requests')}
            {stats ? ` (${stats.totalActive})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'submit'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-white/60 text-neutral-600 hover:bg-white/80 border border-neutral-200/60'
            }`}
          >
            {t('tabs.submit', 'Submit a Request')}
          </button>
        </div>

        {/* Browse Tab */}
        {activeTab === 'browse' && (
          <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <select
                value={filterListingType}
                onChange={(e) => setFilterListingType(e.target.value)}
                className={selectClasses}
              >
                <option value="any">{t('filter.allTypes', 'All - Buy & Rent')}</option>
                <option value="sale">{t('filter.buy', 'Buy')}</option>
                <option value="rent">{t('filter.rent', 'Rent')}</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className={selectClasses}
              >
                <option value="any">{t('filter.anyProperty', 'Any Property')}</option>
                <option value="apartment">{t('filter.apartment', 'Apartment')}</option>
                <option value="house">{t('filter.house', 'House')}</option>
                <option value="villa">{t('filter.villa', 'Villa')}</option>
                <option value="land">{t('filter.land', 'Land')}</option>
              </select>
            </div>

            {/* Requests Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16">
                <UsersIcon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500 text-lg mb-2">
                  {t('empty.title', 'No property requests yet')}
                </p>
                <p className="text-neutral-400 text-sm mb-6">
                  {t('empty.subtitle', 'Be the first to submit a property request!')}
                </p>
                <button
                  onClick={() => setActiveTab('submit')}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all text-sm font-medium"
                >
                  {t('empty.cta', 'Submit a Request')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {requests.map((request) => (
                  <PropertyRequestCard key={request._id} request={request} />
                ))}
              </div>
            )}

            {/* Call to Action for Agents */}
            <div className="mt-10 bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl p-6 sm:p-8 text-center">
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                {t('agentCta.title', 'Are you an agent or seller?')}
              </h3>
              <p className="text-neutral-600 text-sm mb-4 max-w-lg mx-auto">
                {t('agentCta.description', 'Browse what buyers are looking for and reach out to them with matching properties. List your properties on BalkanEstate to get discovered.')}
              </p>
              <button
                onClick={() => handleNavigate('create-listing')}
                className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md shadow-primary/20 transition-all text-sm font-medium"
              >
                {t('agentCta.button', 'List a Property')}
              </button>
            </div>
          </div>
        )}

        {/* Submit Tab */}
        {activeTab === 'submit' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/70 backdrop-blur-sm border border-white/40 rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/5">
              {form.isSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircleIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">
                    {t('success.title', 'Request Submitted!')}
                  </h3>
                  <p className="text-neutral-600 text-sm mb-6">
                    {t('success.description', 'Your property request is now visible to agents and sellers. They can contact you with matching properties.')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={form.reset}
                      className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all text-sm font-medium"
                    >
                      {t('success.newRequest', 'Submit Another Request')}
                    </button>
                    <button
                      onClick={() => setActiveTab('browse')}
                      className="px-5 py-2.5 bg-white text-neutral-700 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-all text-sm font-medium"
                    >
                      {t('success.browseRequests', 'Browse Requests')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-neutral-900 mb-1">
                      {t('form.title', "What are you looking for?")}
                    </h2>
                    <p className="text-neutral-500 text-sm">
                      {t('form.subtitle', "Describe your ideal property and agents will suggest matching listings.")}
                    </p>
                  </div>
                  <PropertyRequestForm
                    formData={form.formData}
                    errors={form.errors}
                    isSubmitting={form.isSubmitting}
                    submitError={form.submitError}
                    onChange={form.handleChange}
                    onSubmit={onFormSubmit}
                  />
                </>
              )}
            </div>

            {/* Telegram hint */}
            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-500">
                {t('form.telegramHint', 'You can also submit requests via our')}{' '}
                <a
                  href={`https://t.me/${telegramInfo?.botUsername || 'BalkanEstateBot'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 hover:text-sky-700 font-medium"
                >
                  Telegram Bot
                </a>
              </p>
            </div>
          </div>
        )}
      </div>

      <LegalFooter />
    </div>
  );
};

export default CommunityPage;
