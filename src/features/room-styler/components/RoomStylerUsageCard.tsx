import React from 'react';
import { useTranslation } from 'react-i18next';
import { UsageMeter } from '@/src/shared/components/ui';
import { useRoomStylerUsage } from '../hooks/useRoomStylerUsage';

interface RoomStylerUsageCardProps {
    /** Only fetch when the user is authenticated. */
    enabled?: boolean;
    className?: string;
}

const SparkleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
);

/**
 * Standalone card showing the user's AI Room Styler monthly usage.
 * Self-contained (own data hook) so it can drop into any account/subscription page.
 */
const RoomStylerUsageCard: React.FC<RoomStylerUsageCardProps> = ({ enabled = true, className = '' }) => {
    const { t } = useTranslation(['property']);
    const { usage, isLoading } = useRoomStylerUsage(enabled);

    // Nothing to show if the fetch failed and there's no data.
    if (!isLoading && !usage) return null;

    return (
        <div className={`bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm ${className}`}>
            <div className="mb-3 flex items-center gap-3">
                <div className="rounded-lg bg-violet-100 dark:bg-violet-900/40 p-2">
                    <SparkleIcon className="h-5 w-5 text-violet-600 dark:text-violet-300" />
                </div>
                <div>
                    <p className="font-semibold text-neutral-800 dark:text-neutral-100">
                        {t('property:roomStyler.meterLabel', 'AI Room Styler')}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {t('property:roomStyler.meterSubtitle', 'Reimagine rooms in different design styles')}
                    </p>
                </div>
            </div>
            <UsageMeter
                used={usage?.used ?? 0}
                limit={usage?.limit ?? 0}
                remaining={usage?.remaining ?? 0}
                resetDate={usage?.resetDate}
                isLoading={isLoading && !usage}
                label={t('property:roomStyler.meterUsageLabel', 'Restyles this month')}
            />
        </div>
    );
};

export default RoomStylerUsageCard;
