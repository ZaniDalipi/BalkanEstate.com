import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useHotels } from '@/src/features/hotels/hooks';
import HotelCard from '@/src/features/hotels/components/HotelCard';
import { HomeIcon, ArrowRightIcon } from '@/constants';

interface HotelsTeaserSectionProps {
  onNavigate: (view: string, path: string) => void;
}

const HotelsTeaserSection: React.FC<HotelsTeaserSectionProps> = ({ onNavigate }) => {
  const { t } = useTranslation(['home']);
  const { hotels, isLoading } = useHotels({ sort: 'newest', limit: 6 });

  const handleCardClick = (hotel: { slug?: string; id: string }) => {
    onNavigate('hotels', `/hotels/${hotel.slug || hotel.id}`);
  };

  // Nothing to promote yet — skip the section entirely rather than showing an
  // empty shelf (keeps the homepage clean before the first hosts sign up).
  if (!isLoading && hotels.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 bg-neutral-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
              <HomeIcon className="w-3.5 h-3.5" /> {t('hotelsTeaser.badge', 'New')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">
              {t('hotelsTeaser.title', 'Hotels & rooms for your next stay')}
            </h2>
            <p className="mt-1.5 text-neutral-500">
              {t('hotelsTeaser.subtitle', 'Book direct with hosts across the Balkans — no booking fees.')}
            </p>
          </div>
          <button
            onClick={() => onNavigate('hotels', '/hotels')}
            className="flex items-center gap-1.5 text-primary font-semibold text-sm hover:underline shrink-0"
          >
            {t('hotelsTeaser.exploreAll', 'Explore all stays')}
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-neutral-200 overflow-hidden">
                <div className="h-52 bg-gradient-to-br from-neutral-200 to-neutral-100 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-neutral-200 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-neutral-200 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ staggerChildren: 0.06 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {hotels.slice(0, 6).map((hotel) => (
              <motion.div
                key={hotel.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35 }}
              >
                <HotelCard hotel={hotel} onClick={handleCardClick} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default HotelsTeaserSection;
