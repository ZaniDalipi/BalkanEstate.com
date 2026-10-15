import React from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { getCurrencySymbol } from '@/utils/currency';
import { SoftIcon } from '@/src/shared/illustrations';

interface RentalTermsSectionProps {
    property: Property;
}

const RentalTermsSection: React.FC<RentalTermsSectionProps> = ({ property }) => {
    const { t } = useTranslation(['rental']);

    if (property.listingType !== 'rent') return null;

    const currencySymbol = getCurrencySymbol(property.country);

    const isDaily = property.rentPeriod === 'daily';
    const isWeekly = property.rentPeriod === 'weekly';

    const rentPeriodLabel = isWeekly
        ? t('rental:details.weekly')
        : isDaily
            ? t('rental:details.daily')
            : t('rental:details.monthly');

    // Lease duration is expressed in the same unit as the rent period. Daily
    // rentals read in nights, matching how the villa card and booking modal
    // present a stay.
    const leaseUnit = isWeekly ? 'Weeks' : isDaily ? 'Nights' : 'Months';
    const leaseUnitWord = leaseUnit.toLowerCase();
    const leaseDurationLabel = property.minimumLeaseDuration && property.maximumLeaseDuration
        ? t(`rental:details.minToMax${leaseUnit}`, {
            min: property.minimumLeaseDuration,
            max: property.maximumLeaseDuration,
            defaultValue: `{{min}} - {{max}} ${leaseUnitWord}`,
        })
        : property.minimumLeaseDuration
            ? t(`rental:details.min${leaseUnit}`, {
                min: property.minimumLeaseDuration,
                defaultValue: `{{min}} ${leaseUnitWord} min`,
            })
            : t(`rental:details.max${leaseUnit}`, {
                max: property.maximumLeaseDuration,
                defaultValue: `{{max}} ${leaseUnitWord} max`,
            });

    const availableDate = property.availableFrom
        ? new Date(property.availableFrom)
        : null;

    const isAvailableNow = !availableDate || availableDate <= new Date();

    const cancellationPolicyLabel: Record<string, string> = {
        flexible: t('rental:details.cancellation.flexible', 'Flexible — Full refund 24h before check-in'),
        moderate: t('rental:details.cancellation.moderate', 'Moderate — Full refund 5 days before'),
        strict: t('rental:details.cancellation.strict', 'Strict — 50% refund up to 1 week before'),
        'non-refundable': t('rental:details.cancellation.nonRefundable', 'Non-refundable'),
    };

    return (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 bg-blue-50 border-b border-blue-100">
                <div className="flex items-center gap-2">
                    <SoftIcon name="docCheck" className="w-7 h-7 flex-shrink-0" />
                    <h3 className="text-lg font-bold text-neutral-800">{t('rental:details.rentalTerms')}</h3>
                </div>
            </div>

            {/* Terms Grid */}
            <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Rent Period */}
                    <div className="flex items-start gap-3">
                        <SoftIcon name="calendar" className="w-8 h-8 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-neutral-500">{t('rental:details.rentPeriod')}</p>
                            <p className="text-sm font-semibold text-neutral-800">{rentPeriodLabel}</p>
                        </div>
                    </div>

                    {/* Security Deposit */}
                    {property.securityDeposit != null && property.securityDeposit > 0 && (
                        <div className="flex items-start gap-3">
                            <SoftIcon name="lock" className="w-8 h-8 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-neutral-500">{t('rental:details.securityDeposit')}</p>
                                <p className="text-sm font-semibold text-neutral-800">
                                    {currencySymbol}{new Intl.NumberFormat('de-DE').format(property.securityDeposit)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Stay / Lease Duration */}
                    {(property.minimumLeaseDuration || property.maximumLeaseDuration) && (
                        <div className="flex items-start gap-3">
                            <SoftIcon name="clock" className="w-8 h-8 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-neutral-500">
                                    {isDaily
                                        ? t('rental:details.stayDuration', 'Stay Duration')
                                        : isWeekly
                                            ? t('rental:details.stayDurationWeeks', 'Stay Duration')
                                            : t('rental:details.leaseDuration')}
                                </p>
                                <p className="text-sm font-semibold text-neutral-800">
                                    {leaseDurationLabel}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Check-in / Check-out times (daily only) */}
                    {isDaily && property.checkInTime && (
                        <div className="flex items-start gap-3">
                            <SoftIcon name="key" className="w-8 h-8 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-neutral-500">{t('rental:details.checkInOut', 'Check-in / Check-out')}</p>
                                <p className="text-sm font-semibold text-neutral-800">
                                    {property.checkInTime}{property.checkOutTime ? ` / ${property.checkOutTime}` : ''}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Cleaning Fee (daily only) */}
                    {isDaily && property.cleaningFee != null && property.cleaningFee > 0 && (
                        <div className="flex items-start gap-3">
                            <SoftIcon name="sparkles" className="w-8 h-8 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-neutral-500">{t('rental:details.cleaningFee', 'Cleaning Fee')}</p>
                                <p className="text-sm font-semibold text-neutral-800">
                                    {currencySymbol}{new Intl.NumberFormat('de-DE').format(property.cleaningFee)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Cancellation Policy (daily only) */}
                    {isDaily && property.cancellationPolicy && (
                        <div className="flex items-start gap-3 sm:col-span-2">
                            <SoftIcon name="warning" className="w-8 h-8 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-neutral-500">{t('rental:details.cancellationPolicy', 'Cancellation Policy')}</p>
                                <p className="text-sm font-semibold text-neutral-800">
                                    {cancellationPolicyLabel[property.cancellationPolicy] ?? property.cancellationPolicy}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Available From */}
                    <div className="flex items-start gap-3">
                        <SoftIcon name="calendar" className="w-8 h-8 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-neutral-500">{t('rental:details.availableFrom')}</p>
                            <p className="text-sm font-semibold text-neutral-800">
                                {isAvailableNow
                                    ? t('rental:details.immediately')
                                    : availableDate!.toLocaleDateString('en-GB')}
                            </p>
                        </div>
                    </div>

                    {/* Max Occupants */}
                    {property.maxOccupants && property.maxOccupants > 0 && (
                        <div className="flex items-start gap-3">
                            <SoftIcon name="users" className="w-8 h-8 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-neutral-500">{t('rental:details.maxOccupants')}</p>
                                <p className="text-sm font-semibold text-neutral-800">
                                    {t('rental:details.occupants', { count: property.maxOccupants })}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Utilities Included */}
                    <div className="flex items-start gap-3">
                        <SoftIcon name="bolt" className={`w-8 h-8 flex-shrink-0 ${property.utilitiesIncluded ? '' : 'opacity-40 grayscale'}`} />
                        <div>
                            <p className="text-xs text-neutral-500">{t('rental:details.utilitiesIncluded')}</p>
                            <p className={`text-sm font-semibold ${property.utilitiesIncluded ? 'text-green-700' : 'text-neutral-500'}`}>
                                {property.utilitiesIncluded ? t('rental:details.yes') : t('rental:details.no')}
                            </p>
                        </div>
                    </div>

                    {/* Internet Included */}
                    <div className="flex items-start gap-3">
                        <SoftIcon name="globe" className={`w-8 h-8 flex-shrink-0 ${property.internetIncluded ? '' : 'opacity-40 grayscale'}`} />
                        <div>
                            <p className="text-xs text-neutral-500">{t('rental:details.internetIncluded')}</p>
                            <p className={`text-sm font-semibold ${property.internetIncluded ? 'text-green-700' : 'text-neutral-500'}`}>
                                {property.internetIncluded ? t('rental:details.yes') : t('rental:details.no')}
                            </p>
                        </div>
                    </div>

                    {/* Breakfast (daily only) */}
                    {isDaily && (
                        <div className="flex items-start gap-3">
                            <SoftIcon name="kitchen" className={`w-8 h-8 flex-shrink-0 ${property.breakfastIncluded ? '' : 'opacity-40 grayscale'}`} />
                            <div>
                                <p className="text-xs text-neutral-500">{t('rental:details.breakfastIncluded', 'Breakfast')}</p>
                                <p className={`text-sm font-semibold ${property.breakfastIncluded ? 'text-green-700' : 'text-neutral-500'}`}>
                                    {property.breakfastIncluded ? t('rental:details.yes') : t('rental:details.no')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Towels & Linen (daily only) */}
                    {isDaily && (
                        <div className="flex items-start gap-3">
                            <SoftIcon name="bath" className={`w-8 h-8 flex-shrink-0 ${property.towelsIncluded ? '' : 'opacity-40 grayscale'}`} />
                            <div>
                                <p className="text-xs text-neutral-500">{t('rental:details.towelsIncluded', 'Towels & Linen')}</p>
                                <p className={`text-sm font-semibold ${property.towelsIncluded ? 'text-green-700' : 'text-neutral-500'}`}>
                                    {property.towelsIncluded ? t('rental:details.yes') : t('rental:details.no')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Parking (daily only) */}
                    {isDaily && (
                        <div className="flex items-start gap-3">
                            <SoftIcon name="car" className={`w-8 h-8 flex-shrink-0 ${property.parkingIncluded ? '' : 'opacity-40 grayscale'}`} />
                            <div>
                                <p className="text-xs text-neutral-500">{t('rental:details.parkingIncluded', 'Parking')}</p>
                                <p className={`text-sm font-semibold ${property.parkingIncluded ? 'text-green-700' : 'text-neutral-500'}`}>
                                    {property.parkingIncluded ? t('rental:details.yes') : t('rental:details.no')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tenant / Guest Requirements */}
                {property.tenantRequirements && property.tenantRequirements.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-neutral-100">
                        <p className="text-xs text-neutral-500 mb-2">
                            {isDaily
                                ? t('rental:details.guestRequirements', 'Guest Requirements')
                                : t('rental:details.tenantRequirements')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {property.tenantRequirements.map((req, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center text-xs bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-full border border-neutral-200"
                                >
                                    {req}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RentalTermsSection;
