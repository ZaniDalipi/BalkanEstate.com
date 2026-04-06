import React from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { getCurrencySymbol } from '@/utils/currency';

interface RentalTermsSectionProps {
    property: Property;
}

const RentalTermsSection: React.FC<RentalTermsSectionProps> = ({ property }) => {
    const { t } = useTranslation(['rental']);

    if (property.listingType !== 'rent') return null;

    const currencySymbol = getCurrencySymbol(property.country);

    const rentPeriodLabel = property.rentPeriod === 'weekly'
        ? t('rental:details.weekly')
        : property.rentPeriod === 'daily'
            ? t('rental:details.daily')
            : t('rental:details.monthly');

    const availableDate = property.availableFrom
        ? new Date(property.availableFrom)
        : null;

    const isAvailableNow = !availableDate || availableDate <= new Date();

    return (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 bg-blue-50 border-b border-blue-100">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                    <h3 className="text-lg font-bold text-neutral-800">{t('rental:details.rentalTerms')}</h3>
                </div>
            </div>

            {/* Terms Grid */}
            <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Rent Period */}
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500">{t('rental:details.rentPeriod')}</p>
                            <p className="text-sm font-semibold text-neutral-800">{rentPeriodLabel}</p>
                        </div>
                    </div>

                    {/* Security Deposit */}
                    {property.securityDeposit != null && property.securityDeposit > 0 && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-neutral-500">{t('rental:details.securityDeposit')}</p>
                                <p className="text-sm font-semibold text-neutral-800">
                                    {currencySymbol}{new Intl.NumberFormat('de-DE').format(property.securityDeposit)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Lease Duration */}
                    {(property.minimumLeaseDuration || property.maximumLeaseDuration) && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-neutral-500">{t('rental:details.leaseDuration')}</p>
                                <p className="text-sm font-semibold text-neutral-800">
                                    {property.minimumLeaseDuration && property.maximumLeaseDuration
                                        ? t('rental:details.minToMaxMonths', { min: property.minimumLeaseDuration, max: property.maximumLeaseDuration })
                                        : property.minimumLeaseDuration
                                            ? t('rental:details.minMonths', { min: property.minimumLeaseDuration })
                                            : t('rental:details.maxMonths', { max: property.maximumLeaseDuration })}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Available From */}
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
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
                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
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
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${property.utilitiesIncluded ? 'bg-green-50' : 'bg-neutral-50'}`}>
                            <svg className={`w-4 h-4 ${property.utilitiesIncluded ? 'text-green-600' : 'text-neutral-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500">{t('rental:details.utilitiesIncluded')}</p>
                            <p className={`text-sm font-semibold ${property.utilitiesIncluded ? 'text-green-700' : 'text-neutral-500'}`}>
                                {property.utilitiesIncluded ? t('rental:details.yes') : t('rental:details.no')}
                            </p>
                        </div>
                    </div>

                    {/* Internet Included */}
                    <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${property.internetIncluded ? 'bg-green-50' : 'bg-neutral-50'}`}>
                            <svg className={`w-4 h-4 ${property.internetIncluded ? 'text-green-600' : 'text-neutral-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500">{t('rental:details.internetIncluded')}</p>
                            <p className={`text-sm font-semibold ${property.internetIncluded ? 'text-green-700' : 'text-neutral-500'}`}>
                                {property.internetIncluded ? t('rental:details.yes') : t('rental:details.no')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tenant Requirements */}
                {property.tenantRequirements && property.tenantRequirements.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-neutral-100">
                        <p className="text-xs text-neutral-500 mb-2">{t('rental:details.tenantRequirements')}</p>
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
