import React from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { getCurrencySymbol } from '@/utils/currency';
import { optimizeCloudinaryUrl, cloudinarySrcSet } from '@/config/cloudinaryConfig';

interface RentalPropertyCardProps {
    property: Property;
    onHover?: (id: string | null) => void;
}

const RentalPropertyCard: React.FC<RentalPropertyCardProps> = ({ property, onHover }) => {
    const { t } = useTranslation(['rental', 'common']);
    const { dispatch } = useAppContext();

    const handleClick = () => {
        dispatch({ type: 'SET_SELECTED_PROPERTY_OBJECT', payload: property });
    };

    const currencySymbol = getCurrencySymbol(property.country);
    const formattedPrice = new Intl.NumberFormat('de-DE').format(property.price);
    const rentPeriodLabel = property.rentPeriod === 'weekly' ? t('rental:perWeek') : property.rentPeriod === 'daily' ? t('rental:perDay') : t('rental:perMonth');

    const isRented = property.status === 'rented';

    return (
        <article
            className={`group bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${isRented ? 'opacity-75' : ''}`}
            onClick={handleClick}
            onMouseEnter={() => onHover?.(property.id)}
            onMouseLeave={() => onHover?.(null)}
        >
            {/* Image */}
            <div className="relative aspect-[16/10] overflow-hidden">
                <img
                    src={optimizeCloudinaryUrl(property.imageUrl, { width: 640, quality: 'auto' })}
                    srcSet={cloudinarySrcSet(property.imageUrl, [320, 480, 640])}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    alt={property.title || property.address}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                />
                {/* Status Badge */}
                {isRented && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        {t('rental:rented')}
                    </div>
                )}
                {/* Listing Type Badge */}
                <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    {t('rental:forRent')}
                </div>
                {/* Available From */}
                {property.availableFrom && !isRented && (
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg">
                        {t('rental:availableFrom')}: {new Date(property.availableFrom).toLocaleDateString()}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4">
                {/* Price */}
                <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-lg sm:text-xl font-bold text-neutral-900">
                        {currencySymbol}{formattedPrice}
                    </span>
                    <span className="text-sm text-neutral-500">{rentPeriodLabel}</span>
                </div>

                {/* Title / Address */}
                {property.title && (
                    <h3 className="text-sm font-semibold text-neutral-800 truncate mb-0.5">{property.title}</h3>
                )}
                <p className="text-sm text-neutral-500 truncate">{property.address}, {property.city}</p>

                {/* Key Details */}
                <div className="flex items-center gap-3 mt-2 text-sm text-neutral-600">
                    {property.propertyType !== 'land' && (
                        <>
                            <span>{property.beds} {t('common:beds')}</span>
                            <span className="text-neutral-300">|</span>
                            <span>{property.baths} {t('common:baths')}</span>
                            <span className="text-neutral-300">|</span>
                        </>
                    )}
                    <span>{property.sqft} m²</span>
                </div>

                {/* Rental-Specific Details */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                    {property.securityDeposit != null && property.securityDeposit > 0 && (
                        <span className="inline-flex items-center text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                            {t('rental:deposit')}: {currencySymbol}{new Intl.NumberFormat('de-DE').format(property.securityDeposit)}
                        </span>
                    )}
                    {property.minimumLeaseDuration && (
                        <span className="inline-flex items-center text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                            {t('rental:minLease')}: {property.minimumLeaseDuration} {t('rental:months')}
                        </span>
                    )}
                    {property.utilitiesIncluded && (
                        <span className="inline-flex items-center text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                            {t('rental:utilitiesIncluded')}
                        </span>
                    )}
                    {property.furnishing && property.furnishing !== 'any' && (
                        <span className="inline-flex items-center text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                            {t(`rental:furnishing.${property.furnishing}`)}
                        </span>
                    )}
                    {property.petsAllowed && (
                        <span className="inline-flex items-center text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">
                            {t('rental:petsAllowed')}
                        </span>
                    )}
                </div>

                {/* Seller Info */}
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-neutral-100">
                    {property.seller?.avatarUrl ? (
                        <img src={optimizeCloudinaryUrl(property.seller.avatarUrl, { width: 48, quality: 'auto', crop: 'fill' })} alt="" loading="lazy" decoding="async" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-xs text-neutral-500">
                            {property.seller?.name?.charAt(0) || '?'}
                        </div>
                    )}
                    <span className="text-xs text-neutral-500 truncate">
                        {property.seller?.name}
                        {property.seller?.agencyName && ` - ${property.seller.agencyName}`}
                    </span>
                </div>
            </div>
        </article>
    );
};

export default RentalPropertyCard;
