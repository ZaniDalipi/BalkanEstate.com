import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { getCurrencySymbol } from '@/utils/currency';

interface MoveInCostBreakdownProps {
    property: Property;
}

const MoveInCostBreakdown: React.FC<MoveInCostBreakdownProps> = ({ property }) => {
    const { t } = useTranslation(['rental']);
    const [showDetails, setShowDetails] = useState(true);
    const currencySymbol = getCurrencySymbol(property.country);

    const period: 'monthly' | 'weekly' | 'daily' =
        property.rentPeriod === 'weekly' ? 'weekly'
            : property.rentPeriod === 'daily' ? 'daily'
                : 'monthly';

    // property.price is stored in the unit of the rent period (per day / week / month)
    const periodRent = property.price;

    // Per-period suffix and labels so the card reflects how rent is actually charged
    const periodSuffix = period === 'weekly' ? t('rental:perWeek', '/wk')
        : period === 'daily' ? t('rental:perDay', '/day')
            : t('rental:perMonth', '/mo');

    const firstRentLabel = period === 'weekly' ? t('rental:moveIn.firstWeekRent', 'First week rent')
        : period === 'daily' ? t('rental:moveIn.firstDayRent', 'First day rent')
            : t('rental:moveIn.firstMonthRent', 'First month rent');

    const utilitiesLabel = period === 'weekly' ? t('rental:moveIn.estimatedUtilitiesWeek', 'Est. utilities (1st week)')
        : period === 'daily' ? t('rental:moveIn.estimatedUtilitiesDay', 'Est. utilities (1st day)')
            : t('rental:moveIn.estimatedUtilities', 'Est. utilities (1st month)');

    const internetLabel = period === 'weekly' ? t('rental:moveIn.estimatedInternetWeek', 'Est. internet (1st week)')
        : period === 'daily' ? t('rental:moveIn.estimatedInternetDay', 'Est. internet (1st day)')
            : t('rental:moveIn.estimatedInternet', 'Est. internet (1st month)');

    const ongoingLabel = period === 'weekly' ? t('rental:moveIn.weeklyOngoing', 'Weekly ongoing cost')
        : period === 'daily' ? t('rental:moveIn.dailyOngoing', 'Daily ongoing cost')
            : t('rental:moveIn.monthlyOngoing', 'Monthly ongoing cost');

    const deposit = property.securityDeposit || 0;

    // Estimate utilities & internet for one billing period if not included.
    // Internet baseline is ~€25/month, scaled to the rent period.
    const internetBaseline = period === 'weekly' ? 6 : period === 'daily' ? 1 : 25;
    const estimatedUtilities = property.utilitiesIncluded ? 0 : Math.round(periodRent * 0.15);
    const estimatedInternet = property.internetIncluded ? 0 : internetBaseline;

    const totalMoveIn = periodRent + deposit + estimatedUtilities + estimatedInternet;

    const fmt = (n: number) => new Intl.NumberFormat('de-DE').format(Math.round(n));

    const costItems = [
        {
            label: firstRentLabel,
            amount: periodRent,
            color: 'bg-blue-500',
            icon: (
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
        },
        ...(deposit > 0 ? [{
            label: t('rental:moveIn.securityDeposit', 'Security deposit'),
            amount: deposit,
            color: 'bg-amber-500',
            icon: (
                <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            ),
        }] : []),
        ...(!property.utilitiesIncluded ? [{
            label: utilitiesLabel,
            amount: estimatedUtilities,
            color: 'bg-orange-400',
            icon: (
                <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
        }] : []),
        ...(!property.internetIncluded ? [{
            label: internetLabel,
            amount: estimatedInternet,
            color: 'bg-purple-400',
            icon: (
                <svg className="w-3.5 h-3.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
            ),
        }] : []),
    ];

    // Calculate segment widths for the bar
    const segments = costItems.map(item => ({
        ...item,
        percent: (item.amount / totalMoveIn) * 100,
    }));

    return (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100 flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="text-sm font-bold text-neutral-800">{t('rental:moveIn.title', 'Move-in Cost')}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-violet-700">{currencySymbol}{fmt(totalMoveIn)}</span>
                    <svg className={`w-4 h-4 text-neutral-400 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {showDetails && (
                <div className="p-4 space-y-3">
                    {/* Stacked bar visualization */}
                    <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
                        {segments.map((seg, i) => (
                            <div
                                key={i}
                                className={`${seg.color} rounded-full transition-all duration-500`}
                                style={{ width: `${Math.max(seg.percent, 3)}%` }}
                            />
                        ))}
                    </div>

                    {/* Cost items */}
                    <div className="space-y-2">
                        {costItems.map((item, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {item.icon}
                                    <span className="text-xs text-neutral-600">{item.label}</span>
                                </div>
                                <span className="text-xs font-semibold text-neutral-800">
                                    {currencySymbol}{fmt(item.amount)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Total line */}
                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-800">
                            {t('rental:moveIn.totalUpfront', 'Total upfront')}
                        </span>
                        <span className="text-sm font-bold text-violet-700">
                            {currencySymbol}{fmt(totalMoveIn)}
                        </span>
                    </div>

                    {/* Monthly ongoing */}
                    <div className="px-3 py-2 bg-neutral-50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-neutral-500">
                                {ongoingLabel}
                            </span>
                            <span className="text-xs font-bold text-neutral-700">
                                {currencySymbol}{fmt(periodRent + estimatedUtilities + estimatedInternet)}{periodSuffix}
                            </span>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    {(!property.utilitiesIncluded || !property.internetIncluded) && (
                        <p className="text-[10px] text-neutral-400 italic">
                            {t('rental:moveIn.disclaimer', '* Utility and internet costs are estimates based on averages. Actual costs may vary.')}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default MoveInCostBreakdown;
