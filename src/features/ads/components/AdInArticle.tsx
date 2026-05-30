import React from 'react';
import AdUnit from './AdUnit';
import { AD_SLOTS } from '../types';

interface AdInArticleProps {
  className?: string;
}

/**
 * In-article native ad — placed between content sections on property detail pages.
 */
const AdInArticle: React.FC<AdInArticleProps> = ({ className = '' }) => (
  <div className={`my-6 ${className}`}>
    <p className="text-[10px] text-center text-gray-400 mb-0.5 select-none">Advertisement</p>
    <AdUnit slot={AD_SLOTS.PROPERTY_DETAIL_IN_ARTICLE} />
  </div>
);

export default AdInArticle;
