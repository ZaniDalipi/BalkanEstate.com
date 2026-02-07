import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { getCurrencySymbol } from '@/utils/currency';

interface RentAffordabilityCalculatorProps {
    property: Property;
}

const RentAffordabilityCalculator: React.FC<RentAffordabilityCalculatorProps> = ({ property }) => {
    const { t } = useTranslation(['rental']);
    const [monthlyIncome, setMonthlyIncome] = useState<string>('');
    const currencySymbol = getCurrencySymbol(property.country);

    // Convert rent to monthly equivalent
    const monthlyRent = useMemo(() => {
        if (property.rentPeriod === 'weekly') return property.price * 4.33;
        if (property.rentPeriod === 'daily') return property.price * 30;
        return property.price;
    }, [property.price, property.rentPeriod]);

    const income = parseFloat(monthlyIncome) || 0;
    const rentToIncomeRatio = income > 0 ? (monthlyRent / income) * 100 : 0;
    const isAffordable = rentToIncomeRatio > 0 && rentToIncomeRatio <= 30;
    const isStretched = rentToIncomeRatio > 30 && rentToIncomeRatio <= 50;

    // Recommended income for this rent (30% rule)
    const recommendedIncome = monthlyRent / 0.3;

    // Gauge position (0-100, clamped)
    const gaugePosition = Math.min(rentToIncomeRatio, 60);
    const gaugePercent = (gaugePosition / 60) * 100;

    return (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-sm font-bold text-neutral-800">{t('rental:affordability.title', 'Rent Affordability')}</h3>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Monthly Income Input */}
                <div>
                    <label className="block text-xs text-neutral-500 mb-1.5">
                        {t('rental:affordability.monthlyIncome', 'Your Monthly Income')}
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">{currencySymbol}</span>
                        <input
                            type="number"
                            value={monthlyIncome}
                            onChange={(e) => setMonthlyIncome(e.target.value)}
                            placeholder="0"
                            className="w-full pl-8 pr-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        />
                    </div>
                </div>

                {/* Monthly Rent Display */}
                <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 rounded-lg">
                    <span className="text-xs text-neutral-500">{t('rental:affordability.monthlyRent', 'Monthly Rent')}</span>
                    <span className="text-sm font-bold text-neutral-800">
                        {currencySymbol}{new Intl.NumberFormat('de-DE').format(Math.round(monthlyRent))}
                    </span>
                </div>

                {/* Affordability Gauge */}
                {income > 0 && (
                    <div className="space-y-2">
                        {/* Visual Gauge Bar */}
                        <div className="relative h-3 bg-neutral-100 rounded-full overflow-hidden">
                            {/* Zone backgrounds */}
                            <div className="absolute inset-y-0 left-0 w-1/2 bg-emerald-100 rounded-l-full" />
                            <div className="absolute inset-y-0 left-1/2 w-[33%] bg-amber-100" />
                            <div className="absolute inset-y-0 right-0 w-[17%] bg-red-100 rounded-r-full" />
                            {/* Indicator */}
                            <div
                                className="absolute top-0 h-full w-1 bg-neutral-800 rounded-full transition-all duration-500"
                                style={{ left: `${Math.min(gaugePercent, 98)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-neutral-400">
                            <span>0%</span>
                            <span>30%</span>
                            <span>50%</span>
                            <span>60%+</span>
                        </div>

                        {/* Result */}
                        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg ${
                            isAffordable ? 'bg-emerald-50 border border-emerald-200' :
                            isStretched ? 'bg-amber-50 border border-amber-200' :
                            'bg-red-50 border border-red-200'
                        }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isAffordable ? 'bg-emerald-100' :
                                isStretched ? 'bg-amber-100' :
                                'bg-red-100'
                            }`}>
                                {isAffordable ? (
                                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : isStretched ? (
                                    <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <p className={`text-xs font-bold ${
                                    isAffordable ? 'text-emerald-800' : isStretched ? 'text-amber-800' : 'text-red-800'
                                }`}>
                                    {rentToIncomeRatio.toFixed(0)}% {t('rental:affordability.ofIncome', 'of income')}
                                </p>
                                <p className={`text-[10px] ${
                                    isAffordable ? 'text-emerald-600' : isStretched ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                    {isAffordable
                                        ? t('rental:affordability.affordable', 'Within recommended 30% budget')
                                        : isStretched
                                        ? t('rental:affordability.stretched', 'Above 30% — budget may be tight')
                                        : t('rental:affordability.tooExpensive', 'Above 50% — not recommended')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recommended Income Hint */}
                {!income && (
                    <div className="text-center px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-[10px] text-blue-600">
                            {t('rental:affordability.recommended', 'Recommended income for this rent:')}
                        </p>
                        <p className="text-sm font-bold text-blue-800">
                            {currencySymbol}{new Intl.NumberFormat('de-DE').format(Math.round(recommendedIncome))}/mo
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RentAffordabilityCalculator;
