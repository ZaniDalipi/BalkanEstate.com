import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import MortgageCalculator from './MortgageCalculator';
import { CalculatorIcon } from '@/constants';
import Footer from '@/components/shared/Footer';
import { MORTGAGE_COUNTRIES as COUNTRIES } from '../data/mortgageMarketData';
import { validatePrice } from '@/shared/utils/validation';

const MortgageCalculatorPage: React.FC = () => {
  const { t } = useTranslation(['calculators', 'common']);
  const [propertyPrice, setPropertyPrice] = useState<number>(100000);
  const [country, setCountry] = useState<string>('MK');
  const [showCalculator, setShowCalculator] = useState(false);
  const [priceError, setPriceError] = useState<string | undefined>();

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate at the form boundary (CLAUDE.md validation pattern).
    const result = validatePrice(propertyPrice, { min: 1000, max: 1_000_000_000 });
    if (!result.isValid) {
      setPriceError(result.error);
      return;
    }
    setPriceError(undefined);
    setShowCalculator(true);
  };

  const handleReset = () => {
    setShowCalculator(false);
  };

  const handlePriceChange = (value: number) => {
    const next = Math.max(0, value || 0);
    setPropertyPrice(next);
    if (priceError) setPriceError(undefined); // clear error as the user corrects it
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
              <CalculatorIcon className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 mb-4">
              {t('calculators:mortgage.title')}
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              {t('calculators:mortgage.description')}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {showCalculator ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <MortgageCalculator propertyPrice={propertyPrice} country={country} />
            <div className="mt-6 text-center">
              <button
                onClick={handleReset}
                className="px-6 py-2.5 text-sm font-semibold text-primary border-2 border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
              >
                {t('calculators:common.reset')}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl border border-neutral-200 p-6 sm:p-8"
          >
            <form onSubmit={handleCalculate} className="space-y-6">
              {/* Country Selection */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  {t('calculators:mortgage.fields.country', 'Country')}
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Price — always in EUR */}
              <div>
                <label htmlFor="mortgage-price" className="block text-sm font-semibold text-neutral-700 mb-2">
                  {t('calculators:mortgage.fields.propertyPrice')}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-medium">
                    €
                  </span>
                  <input
                    id="mortgage-price"
                    type="number"
                    value={propertyPrice}
                    onChange={(e) => handlePriceChange(e.target.valueAsNumber)}
                    aria-invalid={!!priceError}
                    aria-describedby={priceError ? 'mortgage-price-error' : undefined}
                    className={`w-full pl-9 pr-4 py-3 bg-neutral-50 border rounded-xl text-neutral-800 font-medium focus:outline-none focus:ring-2 transition-colors ${
                      priceError
                        ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                        : 'border-neutral-200 focus:ring-primary/20 focus:border-primary'
                    }`}
                    min="0"
                    step="1000"
                    required
                  />
                </div>
                {priceError && (
                  <p id="mortgage-price-error" role="alert" className="mt-1.5 text-xs font-medium text-red-600">
                    {priceError}
                  </p>
                )}
              </div>

              {/* Quick Price Buttons */}
              <div>
                <p className="text-xs text-neutral-500 mb-2">{t('calculators:mortgage.fields.quickSelect', 'Quick select:')}</p>
                <div className="flex flex-wrap gap-2">
                  {[50000, 100000, 150000, 200000, 300000, 500000].map((price) => (
                    <button
                      key={price}
                      type="button"
                      onClick={() => setPropertyPrice(price)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                        propertyPrice === price
                          ? 'bg-primary text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {price.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
              >
                {t('calculators:common.calculate')}
              </button>
            </form>
          </motion.div>
        )}

        {/* Features Section */}
        {!showCalculator && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6"
          >
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-800 mb-2">{t('calculators:mortgage.features.accurate', 'Accurate Estimates')}</h3>
              <p className="text-sm text-neutral-600">{t('calculators:mortgage.features.accurateDesc', 'Get precise monthly payment calculations')}</p>
            </div>

            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-800 mb-2">{t('calculators:mortgage.features.flexible', 'Flexible Terms')}</h3>
              <p className="text-sm text-neutral-600">{t('calculators:mortgage.features.flexibleDesc', 'Compare different loan terms and rates')}</p>
            </div>

            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-800 mb-2">{t('calculators:mortgage.features.local', 'Local Currencies')}</h3>
              <p className="text-sm text-neutral-600">{t('calculators:mortgage.features.localDesc', 'Support for all Balkan currencies')}</p>
            </div>
          </motion.div>
        )}

        {/* How It Works Section */}
        {!showCalculator && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
            className="mt-12 bg-neutral-50 rounded-2xl p-6 sm:p-8"
          >
            <h2 className="text-xl font-bold text-neutral-800 mb-6 text-center">
              {t('calculators:mortgage.howItWorks', 'How It Works')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-800 mb-1">{t('calculators:mortgage.step1Title', 'Enter Property Price')}</h4>
                  <p className="text-sm text-neutral-600">{t('calculators:mortgage.step1Desc', 'Input the price of the property you want to buy')}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-800 mb-1">{t('calculators:mortgage.step2Title', 'Adjust Parameters')}</h4>
                  <p className="text-sm text-neutral-600">{t('calculators:mortgage.step2Desc', 'Set your down payment, loan term, and interest rate')}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-800 mb-1">{t('calculators:mortgage.step3Title', 'See Your Payment')}</h4>
                  <p className="text-sm text-neutral-600">{t('calculators:mortgage.step3Desc', 'Get your estimated monthly mortgage payment instantly')}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default MortgageCalculatorPage;
