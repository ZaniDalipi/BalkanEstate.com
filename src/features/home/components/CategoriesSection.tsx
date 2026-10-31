import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ScrollAssemble, ScrollAssembleItem } from '@/src/components/ui/scroll-assemble';
import { CategoryPicture } from '@/src/shared/illustrations';

interface CategoriesSectionProps {
  onCategoryClick: (propertyType: string, listingType?: string) => void;
  /**
   * Used by tiles that lead to a page of their own rather than to a filtered
   * search — currently just Luxury, which has a dedicated villas page.
   */
  onNavigate: (path: string) => void;
}

const CategoriesSection: React.FC<CategoriesSectionProps> = ({ onCategoryClick, onNavigate }) => {
  const { t } = useTranslation(['home']);

  // Each tile's picture lives in public/images/illustrations/categories/<picture>.webp. It is
  // drawn larger than its card and rises over the card's top edge, so the
  // building, keys or crown look like they are stepping out of the frame.
  // Hovering a card magnifies its picture Dock-style — `.category-dock` in
  // src/index.css.
  const categories = [
    { key: 'apartments', type: 'apartment', picture: 'apartments' as const },
    { key: 'houses', type: 'house', picture: 'houses' as const },
    { key: 'villas', type: 'villa', picture: 'villas' as const },
    { key: 'land', type: 'land', picture: 'land' as const },
    { key: 'forRent', type: 'any', listingType: 'rent', picture: 'rent' as const },
    {
      key: 'luxury',
      type: 'villa',
      picture: 'luxury' as const,
      isLuxury: true,
      // Luxury is the one tile that isn't a search filter. Without this it
      // ran the same `propertyType: 'villa'` search as the Villas tile two
      // places to its left, so the two tiles landed on the same page.
      view: 'villas',
      path: '/villas',
    },
  ];

  return (
    // overflow-x-clip: the ScrollAssemble tiles start scattered well outside
    // the content column, and this full-width section is where they get
    // clipped — see the note in scroll-assemble.tsx.
    <section className="py-12 sm:py-16 bg-white overflow-x-clip">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ y: 10 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            {t('home:categories.title')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {t('home:categories.subtitle')}
          </p>
        </motion.div>

        <ScrollAssemble count={categories.length} className="grid grid-cols-3 sm:grid-cols-6 gap-x-3 gap-y-14 sm:gap-4 pt-10 sm:pt-28">
          {categories.map((cat, i) => (
            <ScrollAssembleItem key={cat.key} index={i}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() =>
                (cat as any).path
                  ? onNavigate((cat as any).path)
                  : onCategoryClick(cat.type, (cat as any).listingType)
              }
              className={`category-dock group relative flex w-full flex-col items-center pt-12 sm:pt-14 pb-4 px-2 rounded-2xl transition-all hover:z-10 ${
                (cat as any).isLuxury
                  ? 'border-2 border-amber-400/60 hover:border-amber-500 hover:shadow-xl hover:shadow-amber-200/60 bg-gradient-to-b from-amber-50 to-white pb-6'
                  : 'border border-neutral-200 hover:border-neutral-300 hover:shadow-md bg-white'
              }`}
              style={(cat as any).isLuxury ? {
                boxShadow: '0 4px 16px rgba(217,119,6,0.15), inset 0 0 0 1px rgba(217,119,6,0.1)',
              } : undefined}
            >
              {(cat as any).isLuxury && (
                <div className="absolute top-0 left-3 right-3 h-0.5 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600" />
              )}
              <CategoryPicture
                name={cat.picture}
                className="category-dock__picture pointer-events-none absolute left-1/2 -top-10 sm:-top-12 w-20 h-20 sm:w-24 sm:h-24"
              />
              <span className={`text-xs sm:text-sm font-medium ${(cat as any).isLuxury ? 'text-amber-800 font-semibold' : 'text-slate-700'}`}>
                {t(`home:categories.${cat.key}`)}
              </span>
              {(cat as any).isLuxury && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-amber-600/70 tracking-widest uppercase whitespace-nowrap">
                  {t('home:ui.categoriesSection.exclusive', '✦ Exclusive')}
                </span>
              )}
            </motion.button>
            </ScrollAssembleItem>
          ))}
        </ScrollAssemble>
      </div>
    </section>
  );
};

export default CategoriesSection;
