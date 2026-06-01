import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArticleCategory } from '../types/article.types';
import { API_CONFIG } from '@/src/shared/constants/app.constants';

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
  selectedTag?: string;
  onCategoryChange: (category: ArticleCategory | undefined) => void;
  onCountryChange: (country: string | undefined) => void;
  onTagChange: (tag: string | undefined) => void;
}

const BlogFilters: React.FC<BlogFiltersProps> = ({
  categories,
  countries,
  selectedCategory,
  selectedCountry,
  selectedTag,
  onCategoryChange,
  onCountryChange,
  onTagChange,
}) => {
  const { t } = useTranslation('blog');
  const [showAllCountries, setShowAllCountries] = useState(false);

  // Fetch popular tags
  const { data: tagsData } = useQuery({
    queryKey: ['article-popular-tags'],
    queryFn: async () => {
      const res = await fetch(`${API_CONFIG.BASE_URL}/articles/tags`);
      if (!res.ok) return { tags: [] };
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const popularTags: string[] = tagsData?.tags?.slice(0, 20) || [];
  const visibleCountries = showAllCountries ? countries : countries.slice(0, 6);

  return (
    <div className="space-y-5 sm:space-y-6">

      {/* Category filters */}
      <div>
        <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-2 sm:mb-3">
          {t('filters.category', 'Category')}
        </h3>
        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
          <FilterPill
            active={!selectedCategory}
            onClick={() => onCategoryChange(undefined)}
          >
            {t('filters.all', 'All')}
          </FilterPill>
          {categories.map(cat => {
            const category = CATEGORIES.find(c => c === cat.name) as ArticleCategory | undefined;
            if (!category) return null;
            return (
              <FilterPill
                key={category}
                active={selectedCategory === category}
                onClick={() => onCategoryChange(category)}
              >
                {t(`category_${category}`, category)}
                <span className="ml-1 opacity-60">({cat.count})</span>
              </FilterPill>
            );
          })}
        </div>
      </div>

      {/* Country filters */}
      <div>
        <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-2 sm:mb-3">
          {t('filters.country', 'Country')}
        </h3>
        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
          <FilterPill active={!selectedCountry} onClick={() => onCountryChange(undefined)}>
            {COUNTRY_FLAGS['All'] && <span className="mr-1">{COUNTRY_FLAGS['All']}</span>}
            {t('filters.all', 'All')}
          </FilterPill>
          {visibleCountries.map(country => (
            <FilterPill
              key={country.name}
              active={selectedCountry === country.name}
              onClick={() => onCountryChange(country.name)}
            >
              {COUNTRY_FLAGS[country.name] && <span className="mr-1">{COUNTRY_FLAGS[country.name]}</span>}
              {country.name}
              <span className="ml-1 opacity-60">({country.count})</span>
            </FilterPill>
          ))}
          {countries.length > 6 && (
            <button
              onClick={() => setShowAllCountries(!showAllCountries)}
              className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-800 font-medium mt-0.5"
            >
              {showAllCountries ? 'Show less' : `+${countries.length - 6} more`}
            </button>
          )}
        </div>
      </div>

      {/* Popular Tags */}
      {popularTags.length > 0 && (
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-2 sm:mb-3">
            {t('filters.popularTags', 'Popular Tags')}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {selectedTag && (
              <button
                onClick={() => onTagChange(undefined)}
                className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-slate-900 text-white"
              >
                #{selectedTag} ×
              </button>
            )}
            {popularTags
              .filter(tag => tag !== selectedTag)
              .map(tag => (
                <motion.button
                  key={tag}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onTagChange(tag)}
                  className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all bg-white text-slate-600 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300"
                >
                  #{tag}
                </motion.button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

const FilterPill: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all inline-flex items-center flex-shrink-0 ${
      active
        ? 'bg-slate-900 text-white shadow-md'
        : 'bg-white text-slate-600 border border-neutral-200 hover:bg-neutral-50'
    }`}
  >
    {children}
  </motion.button>
);

export default BlogFilters;
