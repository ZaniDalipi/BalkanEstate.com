import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { getCurrencySymbol } from '@/utils/currency';
import { SoftIcon } from '@/src/shared/illustrations';

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
            icon: <SoftIcon name="home" className="w-5 h-5 flex-shrink-0" />,
        },
        ...(deposit > 0 ? [{
            label: t('rental:moveIn.securityDeposit', 'Security deposit'),
            amount: deposit,
            color: 'bg-amber-500',
            icon: <SoftIcon name="lock" className="w-5 h-5 flex-shrink-0" />,
        }] : []),
        ...(!property.utilitiesIncluded ? [{
            label: utilitiesLabel,
            amount: estimatedUtilities,
            color: 'bg-orange-400',
            icon: <SoftIcon name="bolt" className="w-5 h-5 flex-shrink-0" />,
        }] : []),
        ...(!property.internetIncluded ? [{
            label: internetLabel,
            amount: estimatedInternet,
            color: 'bg-purple-400',
            icon: <SoftIcon name="globe" className="w-5 h-5 flex-shrink-0" />,
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
                    <SoftIcon name="cash" className="w-7 h-7 flex-shrink-0" />
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
