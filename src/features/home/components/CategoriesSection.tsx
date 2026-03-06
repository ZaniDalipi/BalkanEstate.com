import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface CategoriesSectionProps {
  onCategoryClick: (propertyType: string, listingType?: string) => void;
}

const CategoriesSection: React.FC<CategoriesSectionProps> = ({ onCategoryClick }) => {
  const { t } = useTranslation(['home']);

  const categories = [
    {
      key: 'apartments',
      type: 'apartment',
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.3} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
        </svg>
      ),
      gradient: 'from-slate-600 to-slate-800',
    },
    {
      key: 'houses',
      type: 'house',
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.3} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      key: 'villas',
      type: 'villa',
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.3} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" />
        </svg>
      ),
      gradient: 'from-amber-500 to-orange-600',
    },
    {
      key: 'land',
      type: 'land',
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.3} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
        </svg>
      ),
      gradient: 'from-lime-500 to-green-600',
    },
    {
      key: 'forRent',
      type: 'any',
      listingType: 'rent',
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.3} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
        </svg>
      ),
      gradient: 'from-violet-500 to-purple-600',
    },
    {
      key: 'luxury',
      type: 'villa',
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.3} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
        </svg>
      ),
      gradient: 'from-rose-500 to-pink-600',
    },
  ];

  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
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

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((cat, i) => (
            <motion.button
              key={cat.key}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 30 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onCategoryClick(cat.type, cat.listingType)}
              className="group flex flex-col items-center gap-2.5 p-4 sm:p-5 rounded-xl border border-white/30 hover:border-white/50 hover:shadow-md bg-white/65 backdrop-blur-sm transition-all"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${cat.gradient} text-white flex items-center justify-center`}
              >
                {cat.icon}
              </motion.div>
              <span className="text-xs sm:text-sm font-medium text-slate-700">
                {t(`home:categories.${cat.key}`)}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
