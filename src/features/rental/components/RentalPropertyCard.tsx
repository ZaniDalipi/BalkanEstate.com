import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { getCurrencySymbol } from '@/utils/currency';
import { getPriceReductionInfo } from '@/utils/priceUtils';
import { generatePropertySlug } from '@/utils/slug';
import { buildLocalizedPath } from '@/src/utils/languageRouting';
import { optimizeImageUrl } from '@/config/imageConfig';
import PropertyImage from '@/src/components/ui/PropertyImage';
import { shouldOpenInNewTab } from '@/shared/utils/pwa';

interface RentalPropertyCardProps {
    property: Property;
    onHover?: (id: string | null) => void;
}

const RentalPropertyCard: React.FC<RentalPropertyCardProps> = ({ property, onHover }) => {
    const { t } = useTranslation(['rental', 'common', 'property']);
    const { dispatch } = useAppContext();
    const handleClick = () => {
        const url = buildLocalizedPath(`/property/${generatePropertySlug(property)}`);
        if (shouldOpenInNewTab()) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            dispatch({ type: 'SET_SELECTED_PROPERTY_OBJECT', payload: property });
            window.history.pushState({}, '', url);
        }
    };

    const currencySymbol = getCurrencySymbol(property.country);
    const formattedPrice = new Intl.NumberFormat('de-DE').format(property.price);
    const rentPeriodLabel = property.rentPeriod === 'weekly' ? t('rental:perWeek') : property.rentPeriod === 'daily' ? t('rental:perDay') : t('rental:perMonth');

    // Treat rental as expired (property available) if rentedUntil date has fully passed
    // e.g. rentedUntil = March 22 → stays rented on March 22, becomes active on March 23
    const isRentalExpired = (() => {
      if (property.status !== 'rented' || !property.rentedUntil) return false;
      const rentedEnd = new Date(property.rentedUntil);
      rentedEnd.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return rentedEnd < today;
    })();
    const isRented = property.status === 'rented' && !isRentalExpired;

    return (
        <article
            className={`group glass-panel overflow-hidden hover:bg-gray-50 transition-all duration-300 cursor-pointer ${isRented ? 'opacity-75' : ''}`}
            onClick={handleClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
            tabIndex={0}
            data-pressable
            onMouseEnter={() => onHover?.(property.id)}
            onMouseLeave={() => onHover?.(null)}
        >
            {/* Image */}
            <div className="relative aspect-[16/10] overflow-hidden bg-neutral-200">
                <PropertyImage
                    src={property.imageUrl}
                    alt={property.title || property.address}
                    widths={[320, 480, 640]}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    imgClassName="group-hover:scale-[1.02] transition-transform duration-[8000ms] ease-[cubic-bezier(0.05,0,0.2,1)]"
                />
                {/* Status Badge */}
                {isRented && (
                    <div className="absolute top-2 left-2 bg-red-500/80 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        {t('rental:rented')}
                    </div>
                )}
                {/* Listing Type Badge */}
                <div className="absolute top-2 right-2 glass-badge text-xs font-bold px-2.5 py-1 text-blue-600">
                    {t('rental:forRent')}
                </div>
                {/* Price Drop Badge */}
                {!isRented && property.originalPrice && property.originalPrice > property.price && (
                    <div className="absolute top-2 left-2 bg-red-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        {t('rental:priceDrop', 'PRICE DROP')}
                    </div>
                )}
                {/* Price Increase Badge */}
                {!isRented && property.originalPrice && property.originalPrice < property.price && (
                    <div className="absolute top-2 left-2 bg-amber-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        {t('rental:priceUp', 'PRICE UP')}
                    </div>
                )}
                {/* Available From */}
                {property.availableFrom && !isRented && (
                    <div className="absolute bottom-2 left-2 glass-badge text-xs px-2 py-1 text-gray-700">
                        {t('rental:availableFrom')}: {new Date(property.availableFrom).toLocaleDateString()}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4">
                {/* Price */}
                {(() => {
                    if (property.isNegotiable) {
                        return (
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-sm font-semibold px-2.5 py-1 rounded-full border border-amber-200">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    {t('property:byNegotiation', 'By Negotiation')}
                                </span>
                            </div>
                        );
                    }
                    const priceInfo = getPriceReductionInfo(property);
                    return (
                        <div className="flex items-baseline gap-1.5 mb-1 flex-wrap">
                            {(priceInfo.hasReduction || priceInfo.hasIncrease) && (
                                <span className="text-sm text-gray-400 line-through">
                                    {currencySymbol}{new Intl.NumberFormat('de-DE').format(priceInfo.originalPrice)}
                                </span>
                            )}
                            <span className="text-lg sm:text-xl font-bold text-gray-900">
                                {currencySymbol}{formattedPrice}
                            </span>
                            <span className="text-sm text-gray-400">{rentPeriodLabel}</span>
                            {priceInfo.hasReduction && (
                                <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                                    -{priceInfo.discountPercentage}%
                                </span>
                            )}
                            {priceInfo.hasIncrease && (
                                <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                                    +{priceInfo.increasePercentage}%
                                </span>
                            )}
                        </div>
                    );
                })()}

                {/* Title / Address */}
                {property.title && (
                    <h3 className="text-sm font-semibold text-gray-700 truncate mb-0.5">{property.title}</h3>
                )}
                <p className="text-sm text-gray-400 truncate">{property.address}, {property.city}</p>

                {/* Key Details */}
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                    {property.propertyType !== 'land' && (
                        <>
                            <span>{property.beds} {t('common:beds')}</span>
                            <span className="text-gray-300">|</span>
                            <span>{property.baths} {t('common:baths')}</span>
                            <span className="text-gray-300">|</span>
                        </>
                    )}
                    <span>{property.sqft} m²</span>
                </div>

                {/* Rental-Specific Details */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                    {property.securityDeposit != null && property.securityDeposit > 0 && (
                        <span className="glass-badge text-xs px-2 py-0.5 text-amber-600">
                            {t('rental:deposit')}: {currencySymbol}{new Intl.NumberFormat('de-DE').format(property.securityDeposit)}
                        </span>
                    )}
                    {property.minimumLeaseDuration && (
                        <span className="glass-badge text-xs px-2 py-0.5 text-blue-600">
                            {t('rental:minLease')}: {property.minimumLeaseDuration} {t('rental:months')}
                        </span>
                    )}
                    {property.utilitiesIncluded && (
                        <span className="glass-badge text-xs px-2 py-0.5 text-emerald-600">
                            {t('rental:utilitiesIncluded')}
                        </span>
                    )}
                    {property.furnishing && property.furnishing !== 'any' && (
                        <span className="glass-badge text-xs px-2 py-0.5 text-purple-600">
                            {t(`rental:furnishing.${property.furnishing}`)}
                        </span>
                    )}
                    {property.petsAllowed && (
                        <span className="glass-badge text-xs px-2 py-0.5 text-orange-600">
                            {t('rental:petsAllowed')}
                        </span>
                    )}
                </div>

                {/* Seller Info */}
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-200">
                    {property.seller?.avatarUrl ? (
                        <img src={optimizeImageUrl(property.seller.avatarUrl, { width: 48, quality: 'auto', crop: 'fill' })} alt="" loading="lazy" decoding="async" width={24} height={24} className="w-6 h-6 rounded-full object-cover ring-1 ring-gray-200" />
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                            {property.seller?.name?.charAt(0) || '?'}
                        </div>
                    )}
                    <span className="text-xs text-gray-400 truncate">
                        {property.seller?.name}
                        {property.seller?.agencyName && ` - ${property.seller.agencyName}`}
                    </span>
                </div>
            </div>
        </article>
    );
};

export default RentalPropertyCard;
