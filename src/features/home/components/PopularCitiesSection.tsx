import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface PopularCitiesSectionProps {
  onNavigate: (view: string, path: string) => void;
}

const CITIES = [
  { name: 'Belgrade', country: 'Serbia', image: 'https://images.unsplash.com/photo-1590090533726-434cf2b4bca4?w=400&h=300&fit=crop', properties: 1200 },
  { name: 'Tirana', country: 'Albania', image: 'https://images.unsplash.com/photo-1597933536893-7cd98dbd3675?w=400&h=300&fit=crop', properties: 800 },
  { name: 'Skopje', country: 'North Macedonia', image: 'https://images.unsplash.com/photo-1580893246395-52aead8960dc?w=400&h=300&fit=crop', properties: 650 },
  { name: 'Zagreb', country: 'Croatia', image: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&h=300&fit=crop', properties: 950 },
  { name: 'Sarajevo', country: 'Bosnia', image: 'https://images.unsplash.com/photo-1586016413664-864c0dd76f53?w=400&h=300&fit=crop', properties: 500 },
  { name: 'Thessaloniki', country: 'Greece', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop', properties: 1100 },
];

const PopularCitiesSection: React.FC<PopularCitiesSectionProps> = ({ onNavigate }) => {
  const { t } = useTranslation(['home']);

  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-8"
        >
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {t('home:cities.title')}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t('home:cities.subtitle')}
            </p>
          </div>
          <motion.button
            whileHover={{ x: 3 }}
            onClick={() => onNavigate('explore-cities', '/explore-cities')}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            {t('home:cities.viewAll')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </motion.button>
        </motion.div>

        {/* Cities grid - 2 large + 4 small */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {CITIES.map((city, i) => (
            <motion.button
              key={city.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 30 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('explore-cities', `/explore-cities/${city.name.toLowerCase()}/${city.country.toLowerCase()}`)}
              className={`group relative overflow-hidden rounded-xl ${i < 2 ? 'sm:col-span-2 lg:col-span-2 aspect-[16/9]' : 'aspect-[4/3]'}`}
            >
              <img
                src={city.image}
                alt={city.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-bold text-white">{city.name}</h3>
                <p className="text-xs sm:text-sm text-white/70">{city.country}</p>
                <p className="text-xs text-white/60 mt-0.5">
                  {t('home:cities.propertiesCount', { count: city.properties })}
                </p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Mobile view all */}
        <div className="mt-6 text-center sm:hidden">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('explore-cities', '/explore-cities')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
          >
            {t('home:cities.viewAll')}
          </motion.button>
        </div>
      </div>
    </section>
  );
};

export default PopularCitiesSection;
