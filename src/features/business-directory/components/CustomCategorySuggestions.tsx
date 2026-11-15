import React from 'react';
import { useBusinessCategories } from '../hooks/useBusinessCategories';

export const CUSTOM_CATEGORY_SUGGESTIONS_ID = 'custom-category-suggestions';

/**
 * Names other owners already gave "Other", offered as the field is typed in
 * (native <datalist>), so the same trade lands under one name and one chip.
 */
const CustomCategorySuggestions: React.FC = () => {
  const { custom } = useBusinessCategories();
  return (
    <datalist id={CUSTOM_CATEGORY_SUGGESTIONS_ID}>
      {custom.map(({ name }) => <option key={name} value={name} />)}
    </datalist>
  );
};

export default CustomCategorySuggestions;
