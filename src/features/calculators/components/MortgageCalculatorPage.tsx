import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import MortgageCalculator from './MortgageCalculator';
import { SoftIcon } from '@/src/shared/illustrations';
import Footer from '@/components/shared/Footer';
import { SEO } from '@/src/components/seo';
import { MORTGAGE_COUNTRIES as COUNTRIES } from '../data/mortgageMarketData';
import { validatePrice } from '@/shared/utils/validation';

const MortgageCalculatorPage: React.FC = () => {
  const { t } = useTranslation(['calculators', 'common']);
  const [propertyPrice, setPropertyPrice] = useState<number>(100000);
  const [country, setCountry] = useState<string>('MK');
  const [showCalculator, setShowCalculator] = useState(false);
  const [priceError, setPriceError] = useState<string | undefined>();
  const [priceFocused, setPriceFocused] = useState(false); // blank the field only while editing

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
      <SEO
        title={t('calculators:seo.mortgageTitle', 'Mortgage Calculator')}
        description={t('calculators:seo.mortgageDescription', 'Estimate monthly mortgage repayments and total interest for a property purchase in the Balkans, and compare renting with buying.')}
      />
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SoftIcon name="calculator" className="inline-block w-16 h-16 mb-6" />
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
                    value={priceFocused && propertyPrice === 0 ? '' : propertyPrice}
                    onChange={(e) => handlePriceChange(e.target.valueAsNumber)}
                    onFocus={(e) => { setPriceFocused(true); e.target.select(); }}
                    onBlur={() => setPriceFocused(false)}
                    placeholder="100000"
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
              <SoftIcon name="cash" className="inline-block w-12 h-12 mb-4" />
              <h3 className="font-bold text-neutral-800 mb-2">{t('calculators:mortgage.features.accurate', 'Accurate Estimates')}</h3>
              <p className="text-sm text-neutral-600">{t('calculators:mortgage.features.accurateDesc', 'Get precise monthly payment calculations')}</p>
            </div>

            <div className="text-center p-6">
              <SoftIcon name="calculator" className="inline-block w-12 h-12 mb-4" />
              <h3 className="font-bold text-neutral-800 mb-2">{t('calculators:mortgage.features.flexible', 'Flexible Terms')}</h3>
              <p className="text-sm text-neutral-600">{t('calculators:mortgage.features.flexibleDesc', 'Compare different loan terms and rates')}</p>
            </div>

            <div className="text-center p-6">
              <SoftIcon name="globe" className="inline-block w-12 h-12 mb-4" />
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
