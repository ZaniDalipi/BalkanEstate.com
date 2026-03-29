import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArticleCategory } from '../types/article.types';

const COUNTRY_FLAGS: Record<string, string> = {
  'All': '🌍',
  'Albania': '🇦🇱',
  'Serbia': '🇷🇸',
  'Croatia': '🇭🇷',
  'Greece': '🇬🇷',
  'Montenegro': '🇲🇪',
  'North Macedonia': '🇲🇰',
  'Bulgaria': '🇧🇬',
  'Kosovo': '🇽🇰',
  'Slovenia': '🇸🇮',
  'Bosnia & Herzegovina': '🇧🇦',
  'Romania': '🇷🇴',
};

const CATEGORIES: ArticleCategory[] = ['market', 'investment', 'regulation', 'development', 'tourism', 'guide', 'lifestyle'];

interface BlogFiltersProps {
  categories: { name: string; count: number }[];
  countries: { name: string; count: number }[];
  selectedCategory?: ArticleCategory;
  selectedCountry?: string;
  onCategoryChange: (category: ArticleCategory | undefined) => void;
  onCountryChange: (country: string | undefined) => void;
}

const BlogFilters: React.FC<BlogFiltersProps> = ({
  categories,
  countries,
  selectedCategory,
  selectedCountry,
  onCategoryChange,
  onCountryChange,
}) => {
  const { t } = useTranslation('blog');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Category filters */}
      <div>
        <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-2 sm:mb-3">
          {t('filters.category', 'Category')}
        </h3>
        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onCategoryChange(undefined)}
            className={`px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all ${
              !selectedCategory
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            {t('filters.all', 'All')}
          </motion.button>
          {categories.map((cat) => {
            const category = CATEGORIES.find(c => c === cat.name) as ArticleCategory | undefined;
            if (!category) return null;
            return (
              <motion.button
                key={category}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onCategoryChange(category)}
                className={`px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                {t(`category_${category}`, category)} ({cat.count})
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Country filters */}
      <div>
        <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-2 sm:mb-3">
          {t('filters.country', 'Country')}
        </h3>
        <div className="flex gap-1.5 sm:gap-2 flex-wrap overflow-x-auto pb-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onCountryChange(undefined)}
            className={`px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              !selectedCountry
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            {COUNTRY_FLAGS['All'] && <span className="mr-1">{COUNTRY_FLAGS['All']}</span>}
            {t('filters.all', 'All')}
          </motion.button>
          {countries.map((country) => (
            <motion.button
              key={country.name}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onCountryChange(country.name)}
              className={`px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 inline-flex items-center gap-1 ${
                selectedCountry === country.name
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              {COUNTRY_FLAGS[country.name] && <span>{COUNTRY_FLAGS[country.name]}</span>}
              <span>{country.name}</span>
              <span className="text-[8px] opacity-70">({country.count})</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlogFilters;
