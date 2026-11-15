import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import ChipScroller from '@/src/components/ui/ChipScroller';
import { SoftIcon } from '@/src/shared/illustrations';
import { useBusinessCategories } from '../hooks/useBusinessCategories';
import { categoryChoices } from '../utils/categoryChoices';
import { categoryIcon } from '../utils/categoryStyle';

interface CategoryFilterChipsProps {
  /** '' (all), a built-in key, or `custom:<name>`. */
  selected: string;
  onSelect: (value: string) => void;
}

const chip = (on: boolean) =>
  `flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium min-h-[38px] sm:px-4 sm:py-2 sm:text-sm ${on ? 'liquid-tint' : 'liquid-control text-neutral-700'}`;

/**
 * The directory's category row: categories in use, including the names
 * owners gave "Other" (shown as written), so every listing can be found by
 * what it actually does.
 */
const CategoryFilterChips: React.FC<CategoryFilterChipsProps> = ({ selected, onSelect }) => {
  const { t } = useTranslation('businessDirectory');
  const summary = useBusinessCategories();
  const choices = useMemo(() => categoryChoices(summary), [summary]);

  return (
    <ChipScroller className="gap-1.5 sm:gap-2 pt-2 pb-8 -mb-5 -mx-4 px-4 sm:-mx-1 sm:px-1">
      <motion.button type="button" onClick={() => onSelect('')} aria-pressed={selected === ''} className={chip(selected === '')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        {t('filters.all')}
      </motion.button>
      {choices.map((c) => (
        <motion.button
          key={c.value}
          type="button"
          onClick={() => onSelect(c.value)}
          aria-pressed={selected === c.value}
          className={chip(selected === c.value)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <SoftIcon name={categoryIcon(c.kind === 'custom' ? 'other' : c.value)} className="inline-block w-5 h-5 mr-1 align-[-5px]" />
          {c.kind === 'custom' ? c.name : t(`categories.${c.value}`)}
        </motion.button>
      ))}
    </ChipScroller>
  );
};

export default CategoryFilterChips;
