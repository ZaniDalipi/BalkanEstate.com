// NeighborhoodInsights Component
// AI-powered neighborhood information for properties

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { useAppContext } from '../../../context/AppContext';
import { MapPinIcon } from '../../../constants';
import { parseMarkdown } from '../../utils/markdown';
import { createSanitizedMarkup } from '../../shared/utils/sanitize';

// Map language codes to full language names for AI prompt
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  sq: 'Albanian',
  mk: 'Macedonian',
  sr: 'Serbian',
  hr: 'Croatian',
  sl: 'Slovenian',
  bs: 'Bosnian',
  me: 'Montenegrin',
  bg: 'Bulgarian',
  ro: 'Romanian',
  el: 'Greek',
  tr: 'Turkish',
  de: 'German',
  it: 'Italian',
  fr: 'French',
};

interface NeighborhoodInsightsProps {
  lat: number;
  lng: number;
  address: string;
  city: string;
  country: string;
}

/**
 * NeighborhoodInsights Component
 *
 * Displays AI-generated insights about the property's neighborhood including:
 * - Nearby schools
 * - Parks and recreation
 * - Public transportation
 * - Local amenities
 *
 * Features:
 * - Requires authentication
 * - Usage limits (3/month free, 20/month premium)
 * - Powered by AI
 */
export const NeighborhoodInsights: React.FC<NeighborhoodInsightsProps> = ({
  lat,
  lng,
  address,
  city,
  country,
}) => {
  const { t } = useTranslation(['property']);
  const { state, dispatch } = useAppContext();
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRequested, setIsRequested] = useState(false);
  const [usage, setUsage] = useState<{
    used: number;
    limit: number;
    remaining: number;
  } | null>(null);

  const fetchInsights = async () => {
    // Check authentication
    if (!state.isAuthenticated || !state.currentUser) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
      return;
    }

    setIsRequested(true);
    setLoading(true);
    setError(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const token = localStorage.getItem('balkan_estate_token');

      // Get current language for AI response
      const currentLang = i18n.language?.split('-')[0] || 'en';
      const languageName = LANGUAGE_NAMES[currentLang] || 'English';

      const response = await fetch(`${API_URL}/neighborhood-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lat, lng, address, city, country, language: languageName }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError(data.message);
          setUsage({ used: data.used, limit: data.limit, remaining: 0 });
        } else {
          setError(data.message || 'Failed to fetch neighborhood insights');
        }
        return;
      }

      setInsights(data.insights);
      setUsage(data.usage);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!isRequested) {
      const isAuthenticated = state.isAuthenticated && state.currentUser;
      return (
        <div className="text-center">
          <p className="text-neutral-600 mb-4">
            {t('neighborhood.description')}
          </p>
          {!isAuthenticated && (
            <p className="text-sm text-amber-600 mb-4 font-semibold">
              🔒 {t('neighborhood.loginRequired')}
            </p>
          )}
          <button
            onClick={fetchInsights}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark transition-colors"
          >
            <MapPinIcon className="w-5 h-5" />
            {isAuthenticated ? t('neighborhood.generateInsights') : t('neighborhood.loginAndGenerate')}
          </button>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="p-6 bg-primary-light/50 rounded-lg animate-pulse">
          <div className="h-4 bg-primary/20 rounded w-3/4 mb-4"></div>
          <div className="h-3 bg-primary/20 rounded w-full mb-2"></div>
          <div className="h-3 bg-primary/20 rounded w-full mb-2"></div>
          <div className="h-3 bg-primary/20 rounded w-5/6"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <p className="text-center">
            <strong>{error}</strong>
          </p>
          {usage && (
            <p className="text-sm text-center mt-2">
              {t('neighborhood.usageInfo', { used: usage.used, limit: usage.limit })}
            </p>
          )}
          <div className="text-center">
            <button onClick={fetchInsights} className="mt-3 text-sm font-semibold underline">
              {t('neighborhood.tryAgain')}
            </button>
          </div>
        </div>
      );
    }

    if (insights) {
      return (
        <>
          <div
            className="prose prose-sm max-w-none text-neutral-700 space-y-3 animate-fade-in"
            dangerouslySetInnerHTML={createSanitizedMarkup(parseMarkdown(insights))}
          />
          {usage && usage.remaining !== undefined && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 text-center">
                {t('neighborhood.remainingInfo', { remaining: usage.remaining, limit: usage.limit })}
                {usage.remaining === 0 && !state.currentUser?.isSubscribed && (
                  <span className="block mt-1 text-xs">
                    {t('neighborhood.upgradePrompt')}
                  </span>
                )}
              </p>
            </div>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200">
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0 w-8 h-8 mr-3 text-primary bg-primary-light rounded-full flex items-center justify-center">
          <MapPinIcon className="w-5 h-5" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-neutral-800">{t('neighborhood.title')}</h3>
      </div>
      {renderContent()}
    </div>
  );
};
