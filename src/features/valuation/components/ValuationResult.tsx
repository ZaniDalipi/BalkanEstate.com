import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { formatPrice } from '@/utils/currency';
import type { PropertyValuation } from '../types';
import MarketReferencePanel from './MarketReferencePanel';

interface ValuationResultProps {
  valuation: PropertyValuation;
  onNewValuation: () => void;
}

const ValuationResult: React.FC<ValuationResultProps> = ({ valuation, onNewValuation }) => {
  const { t } = useTranslation(['valuation', 'common']);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showComparables, setShowComparables] = useState(false);

  const formatValue = (value: number) => formatPrice(value, valuation.country);

  const getConfidenceColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 75) return t('valuation:confidence.high');
    if (score >= 50) return t('valuation:confidence.medium');
    return t('valuation:confidence.low');
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'declining':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        );
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'rising':
        return t('valuation:marketTrend.rising');
      case 'declining':
        return t('valuation:marketTrend.declining');
      default:
        return t('valuation:marketTrend.stable');
    }
  };

  // Calculate breakdown percentages for the bar chart
  const { breakdown } = valuation;
  const totalAdjustments =
    Math.abs(breakdown.locationAdjustment) +
    Math.abs(breakdown.conditionAdjustment) +
    Math.abs(breakdown.amenitiesAdjustment) +
    Math.abs(breakdown.ageAdjustment);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Main Value Card */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20">
        <div className="text-center">
          <p className="text-sm font-medium text-neutral-600 mb-2">
            {t('valuation:result.estimatedValue')}
          </p>
          <p className="text-4xl sm:text-5xl font-extrabold text-primary mb-3">
            {formatValue(valuation.estimatedValue)}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-neutral-600">
            <span>{formatValue(valuation.valueLow)}</span>
            <span>-</span>
            <span>{formatValue(valuation.valueHigh)}</span>
          </div>
        </div>

        {/* Confidence Score */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-600">
              {t('valuation:result.confidence')}:
            </span>
            <span className={`text-sm font-bold ${getConfidenceColor(valuation.confidenceScore)}`}>
              {valuation.confidenceScore}% - {getConfidenceLabel(valuation.confidenceScore)}
            </span>
          </div>
        </div>

        {/* Confidence Bar */}
        <div className="mt-3 h-2 bg-neutral-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${valuation.confidenceScore}%` }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className={`h-full rounded-full ${
              valuation.confidenceScore >= 75
                ? 'bg-green-500'
                : valuation.confidenceScore >= 50
                ? 'bg-yellow-500'
                : 'bg-orange-500'
            }`}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-neutral-200 text-center">
          <p className="text-xs font-medium text-neutral-500 mb-1">
            {t('valuation:result.pricePerSqm')}
          </p>
          <p className="text-lg font-bold text-neutral-800">
            {formatValue(valuation.pricePerSqm)}/m²
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-neutral-200 text-center">
          <p className="text-xs font-medium text-neutral-500 mb-1">
            {t('valuation:result.marketTrend')}
          </p>
          <div className="flex items-center justify-center gap-1.5">
            {getTrendIcon(valuation.marketTrend)}
            <span className="text-lg font-bold text-neutral-800">
              {getTrendLabel(valuation.marketTrend)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-neutral-200 text-center">
          <p className="text-xs font-medium text-neutral-500 mb-1">
            {t('valuation:result.demandScore')}
          </p>
          <p className="text-lg font-bold text-neutral-800">
            {valuation.demandScore}/100
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-neutral-200 text-center">
          <p className="text-xs font-medium text-neutral-500 mb-1">
            {t('valuation:result.avgDaysOnMarket')}
          </p>
          <p className="text-lg font-bold text-neutral-800">
            {valuation.avgDaysOnMarket || '—'} {valuation.avgDaysOnMarket ? t('valuation:result.days') : ''}
          </p>
        </div>
      </div>

      {/* Market Reference — official vs. our listings */}
      <MarketReferencePanel
        countryName={valuation.country}
        city={valuation.city}
        comparePricePerSqm={valuation.pricePerSqm}
        embedded
      />

      {/* AI Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">
              {t('valuation:result.aiInsights')}
            </h4>
            <p className="text-sm text-blue-800 leading-relaxed">
              {valuation.aiInsights}
            </p>
          </div>
        </div>
      </div>

      {/* Value Breakdown Toggle */}
      <button
        type="button"
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-neutral-200 hover:border-primary/50 transition-colors"
      >
        <span className="font-semibold text-neutral-800">
          {t('valuation:result.valueBreakdown')}
        </span>
        <svg
          className={`w-5 h-5 text-neutral-500 transition-transform ${showBreakdown ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Value Breakdown Content */}
      {showBreakdown && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4"
        >
          {/* Base Value */}
          <div className="flex justify-between items-center pb-3 border-b border-neutral-100">
            <span className="text-sm font-medium text-neutral-700">
              {t('valuation:breakdown.baseValue')}
            </span>
            <span className="text-sm font-bold text-neutral-900">
              {formatValue(breakdown.baseValue)}
            </span>
          </div>

          {/* Adjustments */}
          {[
            { key: 'locationAdjustment', label: t('valuation:breakdown.location'), value: breakdown.locationAdjustment },
            { key: 'conditionAdjustment', label: t('valuation:breakdown.condition'), value: breakdown.conditionAdjustment },
            { key: 'amenitiesAdjustment', label: t('valuation:breakdown.amenities'), value: breakdown.amenitiesAdjustment },
            { key: 'ageAdjustment', label: t('valuation:breakdown.age'), value: breakdown.ageAdjustment },
          ].filter(adj => adj.value !== 0).map((adjustment) => (
            <div key={adjustment.key} className="flex justify-between items-center">
              <span className="text-sm text-neutral-600">{adjustment.label}</span>
              <span className={`text-sm font-semibold ${adjustment.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {adjustment.value >= 0 ? '+' : ''}{formatValue(adjustment.value)}
              </span>
            </div>
          ))}

          {/* Total */}
          <div className="flex justify-between items-center pt-3 border-t border-neutral-200">
            <span className="text-sm font-bold text-neutral-900">
              {t('valuation:breakdown.total')}
            </span>
            <span className="text-lg font-extrabold text-primary">
              {formatValue(valuation.estimatedValue)}
            </span>
          </div>
        </motion.div>
      )}

      {/* Comparable Properties Toggle */}
      {valuation.comparables && valuation.comparables.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowComparables(!showComparables)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-neutral-200 hover:border-primary/50 transition-colors"
          >
            <span className="font-semibold text-neutral-800">
              {t('valuation:result.comparableProperties')} ({valuation.comparables.length})
            </span>
            <svg
              className={`w-5 h-5 text-neutral-500 transition-transform ${showComparables ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Comparable Properties Content */}
          {showComparables && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3"
            >
              {valuation.comparables.map((comp, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-neutral-200 p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-medium text-neutral-800 line-clamp-1 flex-1">
                      {comp.address}
                    </p>
                    <span className="text-sm font-bold text-primary ml-2">
                      {formatValue(comp.price)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-neutral-500">
                    <span>{comp.sqft} m²</span>
                    <span>{comp.beds} {t('valuation:result.beds')}</span>
                    <span>{comp.baths} {t('valuation:result.baths')}</span>
                    <span>{formatValue(comp.pricePerSqm)}/m²</span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </>
      )}

      {/* Property Summary */}
      <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
        <h4 className="text-sm font-semibold text-neutral-700 mb-3">
          {t('valuation:result.propertySummary')}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-neutral-500">{t('valuation:result.location')}:</span>
            <p className="font-medium text-neutral-800">{valuation.city}, {valuation.country}</p>
          </div>
          <div>
            <span className="text-neutral-500">{t('valuation:result.type')}:</span>
            <p className="font-medium text-neutral-800 capitalize">{valuation.propertyType}</p>
          </div>
          <div>
            <span className="text-neutral-500">{t('valuation:result.size')}:</span>
            <p className="font-medium text-neutral-800">{valuation.sqft} m²</p>
          </div>
          <div>
            <span className="text-neutral-500">{t('valuation:result.bedrooms')}:</span>
            <p className="font-medium text-neutral-800">{valuation.beds}</p>
          </div>
          <div>
            <span className="text-neutral-500">{t('valuation:result.bathrooms')}:</span>
            <p className="font-medium text-neutral-800">{valuation.baths}</p>
          </div>
          {valuation.condition && (
            <div>
              <span className="text-neutral-500">{t('valuation:result.condition')}:</span>
              <p className="font-medium text-neutral-800 capitalize">{valuation.condition}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onNewValuation}
          className="flex-1 py-3 px-6 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('valuation:result.newValuation')}
        </button>
      </div>

      {/* CTA to List Property */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-5 border border-primary/20 text-center">
        <h4 className="text-lg font-bold text-neutral-800 mb-2">
          {t('valuation:result.readyToSell')}
        </h4>
        <p className="text-sm text-neutral-600 mb-4">
          {t('valuation:result.listPropertyCTA')}
        </p>
        <a
          href="/sell"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
        >
          {t('valuation:result.listPropertyButton')}
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>
      </div>
    </motion.div>
  );
};

export default ValuationResult;
