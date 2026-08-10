import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { HotelAmenity } from '@/src/shared/types/hotel.types';
import { CheckIcon, XMarkIcon } from '@/constants';

interface AmenitiesSectionProps {
  amenities: HotelAmenity[];
  customAmenities?: string[];
}

// Airbnb-style grouping so a long amenity list scans as tidy categories.
const AMENITY_CATEGORY: Record<string, string> = {
  wifi: 'general', tv: 'general', air_conditioning: 'general', heating: 'general',
  elevator: 'general', safe: 'general', workspace: 'general', non_smoking: 'general', reception_24h: 'general',
  kitchen: 'kitchen', kitchenette: 'kitchen', breakfast: 'kitchen', coffee_machine: 'kitchen',
  minibar: 'kitchen', restaurant: 'kitchen', bar: 'kitchen', room_service: 'kitchen',
  private_bathroom: 'bathroom', jacuzzi: 'bathroom',
  balcony: 'outdoor', terrace: 'outdoor', sea_view: 'outdoor', mountain_view: 'outdoor',
  beach_access: 'outdoor', pool: 'outdoor', private_pool: 'outdoor',
  spa: 'wellness', gym: 'wellness',
  parking: 'services', laundry: 'services', airport_shuttle: 'services',
  pet_friendly: 'suitability', family_friendly: 'suitability', wheelchair_accessible: 'suitability',
};

const CATEGORY_ORDER = ['general', 'kitchen', 'bathroom', 'outdoor', 'wellness', 'services', 'suitability', 'more'];
const PREVIEW_COUNT = 8;

interface AmenityItem { key: string; label: string; custom?: boolean; }

const AmenitiesSection: React.FC<AmenitiesSectionProps> = ({ amenities, customAmenities = [] }) => {
  const { t } = useTranslation('hotels');
  const [showAll, setShowAll] = useState(false);

  const items: AmenityItem[] = useMemo(() => [
    ...amenities.map((a) => ({ key: a, label: t(`amenities.${a}`) })),
    ...customAmenities.map((c) => ({ key: `custom-${c}`, label: c, custom: true })),
  ], [amenities, customAmenities, t]);

  const total = items.length;
  if (total === 0) return null;

  const preview = items.slice(0, PREVIEW_COUNT);

  // Group for the modal.
  const grouped = useMemo(() => {
    const map = new Map<string, AmenityItem[]>();
    for (const item of items) {
      const cat = item.custom ? 'more' : (AMENITY_CATEGORY[item.key] || 'more');
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({ category: c, items: map.get(c)! }));
  }, [items]);

  const Row: React.FC<{ item: AmenityItem }> = ({ item }) => (
    <div className="flex items-center gap-3 py-1.5 text-[15px] text-neutral-700">
      <span className="w-6 h-6 rounded-lg bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0">
        <CheckIcon className="w-3.5 h-3.5" />
      </span>
      <span className="min-w-0 break-words">{item.label}</span>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-3">{t('detail.amenitiesTitle')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
        {preview.map((item) => <Row key={item.key} item={item} />)}
      </div>
      {total > PREVIEW_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-4 px-5 py-2.5 rounded-xl border border-neutral-800 text-neutral-800 text-sm font-semibold hover:bg-neutral-50 transition-colors"
        >
          {t('detail.showAllAmenities', { count: total })}
        </button>
      )}

      {/* Full list modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showAll && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
              onClick={() => setShowAll(false)}
            >
              <motion.div
                initial={{ y: '100%', opacity: 0.6 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0.6 }}
                transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white/95 backdrop-blur px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-neutral-900">{t('detail.amenitiesTitle')}</h3>
                  <button onClick={() => setShowAll(false)} className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500" aria-label={t('detail.backToList')}>
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="px-6 py-4">
                  {grouped.map(({ category, items: catItems }) => (
                    <div key={category} className="mb-5 last:mb-0">
                      <h4 className="text-sm font-bold text-neutral-900 mb-1">{t(`amenityCategories.${category}`)}</h4>
                      <div className="divide-y divide-neutral-100">
                        {catItems.map((item) => <Row key={item.key} item={item} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default AmenitiesSection;
