import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '@/utils/currency';
import type { PropertyValuation } from '../types';
import { valuationKey } from '../data/valuationHistoryStore';
import { formatCityPlace } from '@/shared/geo';

interface ValuationHistoryProps {
  items: PropertyValuation[];
  onOpen: (valuation: PropertyValuation) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
}

const formatDate = (iso?: string, locale?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale || undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(d);
};

/**
 * Saved valuations list — lets a visitor revisit or remove past estimates.
 * Data comes from the merged local + server history maintained by the page.
 */
const ValuationHistory: React.FC<ValuationHistoryProps> = ({ items, onOpen, onRemove, onClear }) => {
  const { t, i18n } = useTranslation(['valuation', 'common']);
  const visible = useMemo(() => items.slice(0, 25), [items]);

  if (visible.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary/[0.07] to-transparent border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div>
            <h3 className="text-sm font-bold text-neutral-800 leading-tight">
              {t('valuation:history.title', 'Your saved valuations')}
            </h3>
            <p className="text-[11px] text-neutral-500">
              {t('valuation:history.count', '{{count}} saved on this device', { count: visible.length })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] font-semibold text-neutral-400 hover:text-red-500 transition-colors"
        >
          {t('valuation:history.clearAll', 'Clear all')}
        </button>
      </div>

      <ul className="divide-y divide-neutral-100">
        <AnimatePresence initial={false}>
          {visible.map((v) => {
            const key = valuationKey(v);
            return (
              <motion.li
                key={key}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="group"
              >
                <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-neutral-50 transition-colors">
                  <button
                    type="button"
                    onClick={() => onOpen(v)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-sm font-semibold text-neutral-800 truncate">
                      {v.address || formatCityPlace(v.city, v.country).full}
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate">
                      {[v.city, v.propertyType, v.sqft ? `${v.sqft} m²` : null]
                        .filter(Boolean)
                        .join(' · ')}
                      {v.createdAt ? ` · ${formatDate(v.createdAt, i18n.language)}` : ''}
                    </p>
                  </button>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-extrabold text-primary tabular-nums">
                      {formatPrice(v.estimatedValue, v.country)}
                    </p>
                    <p className="text-[10px] text-neutral-400 tabular-nums">
                      {formatPrice(v.pricePerSqm, v.country)}/m²
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(key)}
                    aria-label={t('valuation:history.remove', 'Remove')}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
};

export default ValuationHistory;
