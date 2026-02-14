import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { RecentlyViewedItem } from '../hooks/useRecentlyViewed';
import { ClockIcon, ChevronLeftIcon, ChevronRightIcon, BedIcon, BathIcon, SqftIcon, XMarkIcon } from '@/constants';

interface RecentlyViewedSectionProps {
  items: RecentlyViewedItem[];
  onPropertyClick: (propertyId: string) => void;
  onClear: () => void;
}

const formatPrice = (price: number): string => {
  if (price >= 1_000_000) {
    return `€${(price / 1_000_000).toFixed(1)}M`;
  }
  if (price >= 1_000) {
    return `€${(price / 1_000).toFixed(0)}K`;
  }
  return `€${price}`;
};

const timeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
};

const RecentlyViewedSection: React.FC<RecentlyViewedSectionProps> = ({
  items,
  onPropertyClick,
  onClear,
}) => {
  const { t } = useTranslation('common');
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!items.length) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 320;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="w-full py-8">
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">
            Recently Viewed
          </h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRightIcon className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={onClear}
            className="ml-2 text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
          >
            <XMarkIcon className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            onClick={() => onPropertyClick(item.id)}
            className="flex-shrink-0 w-[280px] snap-start cursor-pointer group"
          >
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
              {/* Image */}
              <div className="relative h-40 bg-gray-200 overflow-hidden">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title || item.address}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
                {/* Price badge */}
                <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg text-sm font-bold text-gray-900">
                  {formatPrice(item.price)}
                  {item.listingType === 'rent' && (
                    <span className="text-xs font-normal text-gray-500">/mo</span>
                  )}
                </div>
                {/* Time badge */}
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md text-xs text-white">
                  {timeAgo(item.viewedAt)}
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.title || item.address}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {item.city}, {item.country}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <BedIcon className="w-3.5 h-3.5" />
                    {item.beds}
                  </span>
                  <span className="flex items-center gap-1">
                    <BathIcon className="w-3.5 h-3.5" />
                    {item.baths}
                  </span>
                  <span className="flex items-center gap-1">
                    <SqftIcon className="w-3.5 h-3.5" />
                    {item.sqft}m²
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default RecentlyViewedSection;
