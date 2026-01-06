import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import ValuationForm from './ValuationForm';
import ValuationResult from './ValuationResult';
import { useCreateValuation } from '../hooks/useValuation';
import type { ValuationInput, PropertyValuation } from '../types';
import { SparklesIcon } from '@/constants';

const ValuationPage: React.FC = () => {
  const { t } = useTranslation(['valuation', 'common']);
  const [valuation, setValuation] = useState<PropertyValuation | null>(null);

  const { mutate: createValuation, isPending } = useCreateValuation();

  const handleSubmit = (data: ValuationInput) => {
    createValuation(data, {
      onSuccess: (result) => {
        setValuation(result);
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
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 via-white to-neutral-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-primary/20 shadow-sm mb-6"
            >
              <SparklesIcon className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">{t('valuation:page.badge', 'AI-Powered')}</span>
            </motion.div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-neutral-900 mb-6 leading-tight">
              {t('valuation:page.title', 'What\'s Your Property Worth?')}
            </h1>

            <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto mb-8">
              {t('valuation:page.subtitle', 'Get an instant AI-powered estimate based on real market data and comparable sales in your area.')}
            </p>

            {/* Trust Indicators */}
            {!valuation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center justify-center gap-6 text-sm text-neutral-500"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{t('valuation:page.trust1', 'Free & Instant')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{t('valuation:page.trust2', 'No Login Required')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{t('valuation:page.trust3', 'Based on Real Data')}</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 -mt-6">
        {valuation ? (
          <ValuationResult valuation={valuation} onNewValuation={handleNewValuation} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white rounded-3xl shadow-2xl shadow-neutral-200/50 border border-neutral-200/80 p-6 sm:p-8 relative overflow-hidden"
          >
            {/* Decorative corner */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full" />

            <ValuationForm onSubmit={handleSubmit} isLoading={isPending} />
          </motion.div>
        )}

        {/* Features Section */}
        {!valuation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8"
          >
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-100 to-green-50 rounded-2xl mb-5 group-hover:scale-110 transition-transform shadow-lg shadow-green-100/50">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-800 mb-2 text-lg">{t('valuation:features.instant.title')}</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">{t('valuation:features.instant.description')}</p>
            </div>

            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl mb-5 group-hover:scale-110 transition-transform shadow-lg shadow-blue-100/50">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-800 mb-2 text-lg">{t('valuation:features.ai.title')}</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">{t('valuation:features.ai.description')}</p>
            </div>

            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl mb-5 group-hover:scale-110 transition-transform shadow-lg shadow-purple-100/50">
                <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-800 mb-2 text-lg">{t('valuation:features.market.title')}</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">{t('valuation:features.market.description')}</p>
            </div>
          </motion.div>
        )}

        {/* How It Works Section */}
        {!valuation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
            className="mt-16 bg-gradient-to-br from-neutral-50 to-neutral-100/50 rounded-3xl p-8 sm:p-10 border border-neutral-200/50"
          >
            <h2 className="text-2xl font-bold text-neutral-800 mb-8 text-center">
              {t('valuation:howItWorks.title')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {[
                { num: 1, title: t('valuation:howItWorks.step1.title'), desc: t('valuation:howItWorks.step1.description'), color: 'from-primary to-primary/80' },
                { num: 2, title: t('valuation:howItWorks.step2.title'), desc: t('valuation:howItWorks.step2.description'), color: 'from-blue-500 to-blue-600' },
                { num: 3, title: t('valuation:howItWorks.step3.title'), desc: t('valuation:howItWorks.step3.description'), color: 'from-green-500 to-green-600' },
              ].map((step, index) => (
                <div key={step.num} className="relative">
                  {/* Connector line */}
                  {index < 2 && (
                    <div className="hidden sm:block absolute top-6 left-1/2 w-full h-0.5 bg-gradient-to-r from-neutral-300 to-neutral-200" />
                  )}
                  <div className="relative flex flex-col items-center text-center">
                    <div className={`w-12 h-12 bg-gradient-to-br ${step.color} text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg mb-4 relative z-10`}>
                      {step.num}
                    </div>
                    <h4 className="font-semibold text-neutral-800 mb-2">{step.title}</h4>
                    <p className="text-sm text-neutral-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Stats Section */}
        {!valuation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.8 }}
            className="mt-16 grid grid-cols-3 gap-4 sm:gap-8"
          >
            {[
              { value: '50K+', label: t('valuation:stats.valuations', 'Valuations') },
              { value: '95%', label: t('valuation:stats.accuracy', 'Accuracy') },
              { value: '11', label: t('valuation:stats.countries', 'Balkan Countries') },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-primary mb-1">{stat.value}</p>
                <p className="text-xs sm:text-sm text-neutral-500">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ValuationPage;
