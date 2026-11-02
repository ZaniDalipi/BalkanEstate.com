// InsightSkeleton — placeholder while the report is being generated.

import React from 'react';
import { useTranslation } from 'react-i18next';

export const InsightSkeleton: React.FC = () => {
  const { t } = useTranslation(['property']);
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t('neighborhood.title')}
      className="p-6 bg-primary-light/50 rounded-lg animate-pulse motion-reduce:animate-none"
    >
      <div className="h-4 bg-primary/20 rounded w-3/4 mb-4" />
      <div className="h-3 bg-primary/20 rounded w-full mb-2" />
      <div className="h-3 bg-primary/20 rounded w-full mb-2" />
      <div className="h-3 bg-primary/20 rounded w-5/6" />
    </div>
  );
};
