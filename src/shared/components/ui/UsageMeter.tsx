import React from 'react';
import { useTranslation } from 'react-i18next';

export interface UsageMeterProps {
    used: number;
    /** -1 = unlimited */
    limit: number;
    /** -1 = unlimited */
    remaining: number;
    resetDate?: string;
    isLoading?: boolean;
    /** Optional label shown above the bar (e.g. "AI Room Styler"). */
    label?: string;
    className?: string;
}

/**
 * Reusable monthly-quota meter: "{used} / {limit} used" + a color-shifting
 * progress bar (green → amber → red) + an optional "Resets on {date}" line.
 * Shows "Unlimited" when limit is -1. Presentational only.
 */
const UsageMeter: React.FC<UsageMeterProps> = ({
    used,
    limit,
    remaining,
    resetDate,
    isLoading = false,
    label,
    className = '',
}) => {
    const { t } = useTranslation(['common']);

    if (isLoading) {
        return (
            <div className={`animate-pulse ${className}`} aria-hidden="true">
                {label && <div className="mb-1.5 h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />}
                <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-700" />
            </div>
        );
    }

    const unlimited = limit === -1;
    const pct = unlimited || limit <= 0 ? 0 : Math.min((used / limit) * 100, 100);
    const isEmpty = !unlimited && remaining <= 0;

    const barColor = unlimited
        ? 'bg-emerald-500'
        : isEmpty
            ? 'bg-red-500'
            : remaining <= 1
                ? 'bg-amber-500'
                : 'bg-emerald-500';

    const resetFormatted = resetDate
        ? new Date(resetDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
        : '';

    return (
        <div className={className}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-600 dark:text-neutral-300">
                    {label || t('common:usageMeter.label', 'Monthly usage')}
                </span>
                <span className="font-semibold tabular-nums text-neutral-800 dark:text-neutral-100">
                    {unlimited
                        ? t('common:usageMeter.unlimited', 'Unlimited')
                        : t('common:usageMeter.usedOfLimit', '{{used}} / {{limit}} used', { used, limit })}
                </span>
            </div>

            <div
                className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={unlimited ? 100 : limit}
                aria-valuenow={unlimited ? 0 : used}
            >
                <div
                    className={`h-2 rounded-full transition-[width] duration-500 ease-out ${barColor}`}
                    style={{ width: unlimited ? '100%' : `${pct}%` }}
                />
            </div>

            {!unlimited && resetFormatted && (
                <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                    {t('common:usageMeter.resetsOn', 'Resets on {{date}}', { date: resetFormatted })}
                </p>
            )}
        </div>
    );
};

export default UsageMeter;
