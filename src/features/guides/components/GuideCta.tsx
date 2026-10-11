import React from 'react';
import { useTranslation } from 'react-i18next';

interface GuideCtaProps {
  onSearch: () => void;
  /** Overrides the default title (a country page names the country). */
  title?: string;
  buttonLabel?: string;
}

/** Closing call to action shared by the index and the country pages. */
export const GuideCta: React.FC<GuideCtaProps> = ({ onSearch, title, buttonLabel }) => {
  const { t } = useTranslation('common');
  return (
    <section className="bg-gradient-to-br from-primary to-primary-dark py-14 sm:py-16 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold">
          {title ?? t('common:guides.ctaTitle', 'Ready to Find Your Property?')}
        </h2>
        <p className="mt-3 mb-8 text-base sm:text-lg text-white/80">
          {t('common:guides.ctaDescription', 'Search across all 11 Balkan countries with AI-powered matching. 10 languages, verified agents, instant valuations.')}
        </p>
        <button
          type="button"
          onClick={onSearch}
          className="rounded-xl bg-white px-8 py-3 text-base sm:text-lg font-semibold text-primary transition-colors hover:bg-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
        >
          {buttonLabel ?? t('common:guides.ctaButton', 'Start Searching')}
        </button>
      </div>
    </section>
  );
};
