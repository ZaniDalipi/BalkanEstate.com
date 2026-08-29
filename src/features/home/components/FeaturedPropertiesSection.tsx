import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { BuildingOfficeIcon } from '@/constants';
import { optimizeCloudinaryUrl, cloudinarySrcSet, getPropertyImagePlaceholder } from '@/config/cloudinaryConfig';

interface FeaturedPropertiesSectionProps {
  properties: Property[];
  onPropertyClick: (property: Property) => void;
  onViewAll: () => void;
}

const PropertyCard: React.FC<{
  property: Property;
  onClick: () => void;
}> = ({ property, onClick }) => {
  const { t } = useTranslation(['home']);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [imageError, setImageError] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const allImages = useMemo(() => {
    const base = property.imageUrl ? [property.imageUrl] : [];
    const extras = ((property as any).images || []).map((img: any) =>
      typeof img === 'string' ? img : img.url
    ).filter(Boolean) as string[];
    return [...base, ...extras.filter((u: string) => !base.includes(u))].slice(0, 10);
  }, [property.imageUrl, (property as any).images]);

  const currentImageUrl = allImages[currentImageIndex] ?? property.imageUrl ?? '';
  const hasMultipleImages = allImages.length > 1;

  const handlePrevImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSlideDirection('left');
    setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length);
  }, [allImages.length]);

  const handleNextImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSlideDirection('right');
    setCurrentImageIndex(prev => (prev + 1) % allImages.length);
  }, [allImages.length]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        setSlideDirection('right');
        setCurrentImageIndex(prev => (prev + 1) % allImages.length);
      } else {
        setSlideDirection('left');
        setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length);
      }
    }
    touchStartXRef.current = null;
  }, [allImages.length]);

  const formatPrice = (price: number, currency?: string) => {
    const symbol = currency === 'USD' ? '$' : '€';
    return `${symbol}${price.toLocaleString()}`;
  };

  return (
    <button
      onClick={onClick}
      className="group text-left bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-lg hover:border-neutral-300 hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 w-full"
    >
      {/* Image */}
      <div
        className="relative aspect-[4/3] overflow-hidden bg-neutral-200"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {property.imageUrl && !imageError ? (
        <>
          {/* LQIP blur-up placeholder */}
          <img
            src={getPropertyImagePlaceholder(property.imageUrl) || optimizeCloudinaryUrl(property.imageUrl, { width: 40, quality: 'auto:eco', crop: 'fill' })}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            width={40}
            height={30}
            className="absolute inset-0 w-full h-full object-cover blur-2xl scale-150 opacity-80"
          />
          {/* Animation wrapper — key triggers remount+animation on image change */}
          <div
            key={currentImageIndex}
            className={`absolute inset-0 ${slideDirection === 'right' ? 'animate-gallery-right' : 'animate-gallery-left'}`}
          >
            <img
              src={optimizeCloudinaryUrl(currentImageUrl, { width: 400, quality: 'auto', format: 'auto', crop: 'fill', gravity: 'center' })}
              srcSet={cloudinarySrcSet(currentImageUrl, [300, 400, 600], { quality: 'auto', format: 'auto', crop: 'fill', gravity: 'center' })}
              sizes="(max-width: 640px) calc(50vw - 20px), (max-width: 1024px) calc(50vw - 32px), 33vw"
              alt={property.title || property.address || 'Property image'}
              width={400}
              height={300}
              style={{ transition: 'transform 600ms ease-in-out' }}
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-[1.02]"
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
            />
          </div>
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
          {/* Navigation arrows — always visible on touch, hover-revealed on pointer */}
          {hasMultipleImages && (
            <>
              <button
                className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center transition-opacity duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white opacity-60 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                onClick={handlePrevImage}
                aria-label={t('home:featured.prevImage', 'Previous image')}
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center transition-opacity duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white opacity-60 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                onClick={handleNextImage}
                aria-label={t('home:featured.nextImage', 'Next image')}
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
          {/* Image indicator — max 3 dots + count */}
          {hasMultipleImages && (
            <div className="absolute bottom-1 left-0 right-0 flex justify-center items-center z-30 pointer-events-none gap-1">
              {allImages.slice(0, 3).map((_, i) => (
                <button
                  key={i}
                  className="pointer-events-auto min-w-[28px] min-h-[28px] flex items-center justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-white"
                  onClick={(e) => { e.stopPropagation(); setSlideDirection(i > currentImageIndex ? 'right' : 'left'); setCurrentImageIndex(i); }}
                  aria-label={`Image ${i + 1} of ${allImages.length}`}
                  aria-current={i === currentImageIndex ? 'true' : undefined}
                >
                  <span className={`block rounded-full transition-all duration-200 ${
                    i === currentImageIndex ? 'w-3 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/60'
                  }`} />
                </button>
              ))}
              {allImages.length > 3 && (
                <span className="pointer-events-none bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                  +{allImages.length - 3}
                </span>
              )}
            </div>
          )}
        </>
        ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300">
          <BuildingOfficeIcon className="w-10 h-10 text-neutral-400" />
        </div>
        )}
        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 z-10">
          {property.isPromoted && property.promotionTier && property.promotionTier !== 'standard' && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-500 text-white">
              {t('home:featured.promoted')}
            </span>
          )}
          {property.createdAt && Date.now() - property.createdAt < 7 * 24 * 60 * 60 * 1000 && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500 text-white">
              {t('home:featured.new')}
            </span>
          )}
          {property.hasDiscount && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-500 text-white">
              {t('home:featured.priceReduced')}
            </span>
          )}
        </div>
        {/* Price overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent pt-8 pb-2 px-3">
          <span className="text-sm sm:text-base font-bold text-white leading-tight">
            {(property as any).isNegotiable ? t('home:featured.byNegotiation', 'By Negotiation') : formatPrice(property.price, property.currency)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5">
        <h3 className="text-sm font-semibold text-slate-900 truncate">
          {property.title || property.address}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          {property.city}, {property.country}
        </p>

        {/* Details */}
        <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            {property.beds}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {property.baths}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
            {property.sqft} m²
          </span>
        </div>
      </div>
    </button>
  );
};

const FeaturedPropertiesSection: React.FC<FeaturedPropertiesSectionProps> = ({
  properties,
  onPropertyClick,
  onViewAll,
}) => {
  const { t } = useTranslation(['home']);

  if (properties.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {t('home:featured.title')}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t('home:featured.subtitle')}
            </p>
          </div>
          <button
            onClick={onViewAll}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            {t('home:featured.viewAll')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {properties.slice(0, 6).map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onClick={() => onPropertyClick(property)}
            />
          ))}
        </div>

        {/* Mobile view all */}
        <div className="mt-6 text-center sm:hidden">
          <button
            onClick={onViewAll}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
          >
            {t('home:featured.viewAll')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedPropertiesSection;
