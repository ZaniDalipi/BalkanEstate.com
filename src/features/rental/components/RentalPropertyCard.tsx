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
            className={`group glass-panel overflow-hidden hover:bg-gray-50 transition-all duration-300 cursor-pointer ${isRented ? 'opacity-75' : ''}`}
            onClick={handleClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
            tabIndex={0}
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
                    width={640}
                    height={400}
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
                <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-lg sm:text-xl font-bold text-gray-900">
                        {currencySymbol}{formattedPrice}
                    </span>
                    <span className="text-sm text-gray-400">{rentPeriodLabel}</span>
                    {property.sqft > 0 && property.propertyType !== 'land' && (
                        <span className="text-[10px] text-gray-400 ml-auto">
                            {currencySymbol}{new Intl.NumberFormat('de-DE').format(Math.round(property.price / property.sqft))}/m²
                        </span>
                    )}
                </div>

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
                        <img src={optimizeCloudinaryUrl(property.seller.avatarUrl, { width: 48, quality: 'auto', crop: 'fill' })} alt="" loading="lazy" decoding="async" width={24} height={24} className="w-6 h-6 rounded-full object-cover ring-1 ring-gray-200" />
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
