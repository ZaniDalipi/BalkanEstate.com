import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { RentalHistoryEntry } from '@/src/shared/types/property.types';
import { getCurrencySymbol } from '@/utils/currency';
import * as api from '@/services/apiService';

interface RentalHistorySectionProps {
  property: Property;
  isOwner: boolean;
  onPropertyUpdate?: (property: Property) => void;
}

const RentalHistorySection: React.FC<RentalHistorySectionProps> = ({ property, isOwner, onPropertyUpdate }) => {
  const { t, i18n } = useTranslation(['rental', 'common']);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ startDate: '', endDate: '', monthlyRent: '', tenantName: '', notes: '' });

  const currencySymbol = getCurrencySymbol(property.country);

  const locale = i18n.language === 'me' ? 'sr-Latn-ME' : i18n.language === 'sq' ? 'sq-AL' : i18n.language;

  // Build combined history: past entries + current rental if rented
  const allEntries = useMemo(() => {
    const entries: (RentalHistoryEntry & { isCurrent?: boolean })[] = [
      ...(property.rentalHistory || []),
    ];

    // Add current rental as an in-progress entry
    if (property.status === 'rented' && property.rentedAt) {
      entries.push({
        _id: 'current',
        startDate: property.rentedAt,
        endDate: property.rentedUntil || Date.now(),
        monthlyRent: property.rentPeriod === 'weekly' ? property.price * 4.33
          : property.rentPeriod === 'daily' ? property.price * 30
          : property.price,
        isCurrent: true,
      });
    }

    // Sort by start date descending
    return entries.sort((a, b) => b.startDate - a.startDate);
  }, [property]);

  // Group entries by year
  const entriesByYear = useMemo(() => {
    const grouped: Record<number, (RentalHistoryEntry & { isCurrent?: boolean })[]> = {};
    for (const entry of allEntries) {
      const year = new Date(entry.startDate).getFullYear();
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(entry);
    }
    return grouped;
  }, [allEntries]);

  const years = Object.keys(entriesByYear).map(Number).sort((a, b) => b - a);

  // Calculate income for a period
  const calcIncome = useCallback((entry: RentalHistoryEntry & { isCurrent?: boolean }) => {
    const start = new Date(entry.startDate);
    const end = entry.isCurrent && !property.rentedUntil ? new Date() : new Date(entry.endDate);
    const months = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + (end.getDate() >= start.getDate() ? 0 : -1)) || 1;
    return entry.monthlyRent * months;
  }, [property.rentedUntil]);

  // Calculate duration in months
  const calcDuration = useCallback((entry: RentalHistoryEntry & { isCurrent?: boolean }) => {
    const start = new Date(entry.startDate);
    const end = entry.isCurrent && !property.rentedUntil ? new Date() : new Date(entry.endDate);
    const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (totalDays < 31) return t('rental:history.days', { count: totalDays });
    const months = Math.round(totalDays / 30.44);
    return t('rental:history.months', { count: months });
  }, [property.rentedUntil, t]);

  // Total income
  const totalIncome = useMemo(() => allEntries.reduce((sum, e) => sum + calcIncome(e), 0), [allEntries, calcIncome]);

  // Year total
  const yearIncome = useCallback((year: number) => {
    return (entriesByYear[year] || []).reduce((sum, e) => sum + calcIncome(e), 0);
  }, [entriesByYear, calcIncome]);

  const handleAddEntry = async () => {
    if (!formData.startDate || !formData.endDate || !formData.monthlyRent) return;
    setIsSubmitting(true);
    try {
      const updated = await api.addRentalHistoryEntry(property.id, {
        startDate: formData.startDate,
        endDate: formData.endDate,
        monthlyRent: Number(formData.monthlyRent),
        tenantName: formData.tenantName || undefined,
        notes: formData.notes || undefined,
      });
      onPropertyUpdate?.(updated);
      setFormData({ startDate: '', endDate: '', monthlyRent: '', tenantName: '', notes: '' });
      setShowAddForm(false);
    } catch {
      // Error handled silently
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      const updated = await api.deleteRentalHistoryEntry(property.id, entryId);
      onPropertyUpdate?.(updated);
    } catch {
      // Error handled silently
    }
  };

  if (property.listingType !== 'rent') return null;
  if (!isOwner && allEntries.length === 0) return null;

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const formatCurrency = (n: number) => `${currencySymbol}${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(n)}`;

  const inputClasses = 'block w-full text-sm bg-white border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors';
  const labelClasses = 'block text-xs font-medium text-neutral-600 mb-1';

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 bg-emerald-50 border-b border-emerald-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-bold text-neutral-800">{t('rental:history.title')}</h3>
          </div>
          {isOwner && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t('rental:history.addEntry')}
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Summary Stats */}
        {allEntries.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-medium">{t('rental:history.totalIncome')}</p>
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-blue-600 font-medium">{t('rental:history.totalPeriods')}</p>
              <p className="text-lg font-bold text-blue-700">{allEntries.length}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center hidden sm:block">
              <p className="text-[10px] uppercase tracking-wide text-purple-600 font-medium">{t('rental:history.avgMonthlyRent')}</p>
              <p className="text-lg font-bold text-purple-700">
                {formatCurrency(allEntries.reduce((s, e) => s + e.monthlyRent, 0) / allEntries.length)}
              </p>
            </div>
          </div>
        )}

        {/* Add Form */}
        {showAddForm && isOwner && (
          <div className="mb-5 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <h4 className="text-sm font-semibold text-neutral-700 mb-3">{t('rental:history.addPastRental')}</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClasses}>{t('rental:history.startDate')}</label>
                <input type="date" value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))} className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>{t('rental:history.endDate')}</label>
                <input type="date" value={formData.endDate} onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))} className={inputClasses} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClasses}>{t('rental:history.monthlyRent')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">{currencySymbol}</span>
                  <input type="number" placeholder="0" value={formData.monthlyRent} onChange={e => setFormData(p => ({ ...p, monthlyRent: e.target.value }))} className={`${inputClasses} pl-7`} />
                </div>
              </div>
              <div>
                <label className={labelClasses}>{t('rental:history.tenantName')}</label>
                <input type="text" placeholder={t('rental:history.optional')} value={formData.tenantName} onChange={e => setFormData(p => ({ ...p, tenantName: e.target.value }))} className={inputClasses} />
              </div>
            </div>
            <div className="mb-3">
              <label className={labelClasses}>{t('rental:history.notes')}</label>
              <input type="text" placeholder={t('rental:history.optional')} value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} className={inputClasses} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAddForm(false)} className="text-sm text-neutral-500 hover:text-neutral-700 px-3 py-1.5 transition-colors">
                {t('common:cancel')}
              </button>
              <button
                onClick={handleAddEntry}
                disabled={isSubmitting || !formData.startDate || !formData.endDate || !formData.monthlyRent}
                className="text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 px-4 py-1.5 rounded-lg transition-colors"
              >
                {isSubmitting ? t('common:saving') : t('rental:history.save')}
              </button>
            </div>
          </div>
        )}

        {/* Timeline by Year */}
        {allEntries.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-10 h-10 text-neutral-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-sm text-neutral-400">{t('rental:history.noHistory')}</p>
            {isOwner && (
              <p className="text-xs text-neutral-400 mt-1">{t('rental:history.noHistoryHint')}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {years.map(year => (
              <div key={year}>
                {/* Year Header */}
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-neutral-700">{year}</h4>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {formatCurrency(yearIncome(year))}
                  </span>
                </div>

                {/* Entries */}
                <div className="space-y-2">
                  {entriesByYear[year].map((entry) => (
                    <div
                      key={entry._id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        entry.isCurrent
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-neutral-50 border-neutral-200'
                      }`}
                    >
                      {/* Status indicator */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${entry.isCurrent ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`} />

                      {/* Date range & details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-neutral-800">
                            {formatDate(entry.startDate)} — {entry.isCurrent && !property.rentedUntil ? t('rental:history.ongoing') : formatDate(entry.endDate)}
                          </span>
                          {entry.isCurrent && (
                            <span className="text-[10px] font-semibold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                              {t('rental:history.current')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-neutral-500">
                          <span>{calcDuration(entry)}</span>
                          {entry.tenantName && <span>· {entry.tenantName}</span>}
                          {entry.notes && <span className="truncate">· {entry.notes}</span>}
                        </div>
                      </div>

                      {/* Income */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-emerald-700">{formatCurrency(calcIncome(entry))}</p>
                        <p className="text-[10px] text-neutral-400">{formatCurrency(entry.monthlyRent)}/{t('rental:history.mo')}</p>
                      </div>

                      {/* Delete button (only for past entries, owner only) */}
                      {isOwner && !entry.isCurrent && (
                        <button
                          onClick={() => handleDeleteEntry(entry._id)}
                          className="text-neutral-300 hover:text-red-500 transition-colors flex-shrink-0"
                          title={t('common:delete')}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RentalHistorySection;
