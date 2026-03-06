import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Property } from '@/types';

interface FeaturedPropertiesSectionProps {
  properties: Property[];
  onPropertyClick: (property: Property) => void;
  onViewAll: () => void;
}

const PropertyCard: React.FC<{
  property: Property;
  onClick: () => void;
  index: number;
}> = ({ property, onClick, index }) => {
  const { t } = useTranslation(['home']);

  const formatPrice = (price: number, currency?: string) => {
    const symbol = currency === 'USD' ? '$' : '€';
    return `${symbol}${price.toLocaleString()}`;
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 30 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group text-left bg-white/70 backdrop-blur-sm rounded-xl border border-white/30 overflow-hidden hover:shadow-lg hover:border-white/50 transition-all duration-300 w-full"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
        <img
          src={property.imageUrl}
          alt={property.address}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
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
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent pt-8 pb-2.5 px-3">
          <span className="text-lg font-bold text-white">
            {formatPrice(property.price, property.currency)}
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
    </motion.button>
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
    <section className="py-12 sm:py-16 bg-white/60 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-8"
        >
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {t('home:featured.title')}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t('home:featured.subtitle')}
            </p>
          </div>
          <motion.button
            whileHover={{ x: 3 }}
            onClick={onViewAll}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            {t('home:featured.viewAll')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </motion.button>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {properties.slice(0, 6).map((property, i) => (
            <PropertyCard
              key={property.id}
              property={property}
              onClick={() => onPropertyClick(property)}
              index={i}
            />
          ))}
        </div>

        {/* Mobile view all */}
        <div className="mt-6 text-center sm:hidden">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onViewAll}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
          >
            {t('home:featured.viewAll')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </motion.button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedPropertiesSection;
