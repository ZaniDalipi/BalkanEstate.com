import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import ValuationForm from './ValuationForm';
import ValuationResult from './ValuationResult';
import { useCreateValuation } from '../hooks/useValuation';
import type { ValuationInput, PropertyValuation } from '../types';

const ValuationPage: React.FC = () => {
  const { t } = useTranslation(['valuation', 'common']);
  const [valuation, setValuation] = useState<PropertyValuation | null>(null);

  const { mutate: createValuation, isPending } = useCreateValuation();

  const handleSubmit = (data: ValuationInput) => {
    createValuation(data, {
      onSuccess: (result) => {
        setValuation(result);
        // Scroll to top to show results
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      onError: (error) => {
        console.error('Valuation error:', error);
      },
    });
  };

  const handleNewValuation = () => {
    setValuation(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-6">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 mb-4">
              {t('valuation:page.title')}
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              {t('valuation:page.subtitle')}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {valuation ? (
          <ValuationResult valuation={valuation} onNewValuation={handleNewValuation} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl border border-neutral-200 p-6 sm:p-8"
          >
            <ValuationForm onSubmit={handleSubmit} isLoading={isPending} />
          </motion.div>
        )}

        {/* Features Section */}
        {!valuation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6"
          >
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-800 mb-2">{t('valuation:features.instant.title')}</h3>
              <p className="text-sm text-neutral-600">{t('valuation:features.instant.description')}</p>
            </div>

            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-800 mb-2">{t('valuation:features.ai.title')}</h3>
              <p className="text-sm text-neutral-600">{t('valuation:features.ai.description')}</p>
            </div>

            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-800 mb-2">{t('valuation:features.market.title')}</h3>
              <p className="text-sm text-neutral-600">{t('valuation:features.market.description')}</p>
            </div>
          </motion.div>
        )}

        {/* How It Works Section */}
        {!valuation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
            className="mt-12 bg-neutral-50 rounded-2xl p-6 sm:p-8"
          >
            <h2 className="text-xl font-bold text-neutral-800 mb-6 text-center">
              {t('valuation:howItWorks.title')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-800 mb-1">{t('valuation:howItWorks.step1.title')}</h4>
                  <p className="text-sm text-neutral-600">{t('valuation:howItWorks.step1.description')}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-800 mb-1">{t('valuation:howItWorks.step2.title')}</h4>
                  <p className="text-sm text-neutral-600">{t('valuation:howItWorks.step2.description')}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-800 mb-1">{t('valuation:howItWorks.step3.title')}</h4>
                  <p className="text-sm text-neutral-600">{t('valuation:howItWorks.step3.description')}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ValuationPage;
