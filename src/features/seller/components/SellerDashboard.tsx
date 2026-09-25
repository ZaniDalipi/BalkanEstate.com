import React from 'react';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from '@/constants';
import GeminiDescriptionGenerator from './GeminiDescriptionGenerator';
import { useAppContext } from '@/context/AppContext';
import Footer from '@/components/shared/Footer';
import { useImportDraftPrefill } from '@/src/features/listing-sources/hooks/useDraftListingForm';

const CreateListingPage: React.FC = () => {
  const { t } = useTranslation(['seller', 'listingFeeds']);
  const { state } = useAppContext();
  // A listing fetched from an external feed, opened here to be edited like a new one.
  const importPrefill = useImportDraftPrefill();

  return (
    <div className="liquid-glass-bg min-h-full">
      <div className="glass-orb w-72 h-72 bg-blue-100/60 top-20 -left-20" />
      <div className="glass-orb w-96 h-96 bg-purple-50 top-1/3 right-0" style={{ animationDelay: '-5s' }} />
      <div className="glass-orb w-64 h-64 bg-cyan-50 bottom-40 left-1/4" style={{ animationDelay: '-10s' }} />

      <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 text-glow">
          {state.propertyToEdit
            ? t('seller:createListing.editTitle')
            : importPrefill
              ? t('listingFeeds:review.formTitle')
              : t('seller:createListing.title')}
        </h2>
        {importPrefill && (
          <p className="text-sm text-gray-600 mb-2">{t('listingFeeds:review.formHint')}</p>
        )}
        <div className="glass-divider mb-8" />

        <div className="glass-panel p-4 sm:p-6 lg:p-8 glass-shimmer-border overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-full bg-blue-50 border border-blue-200">
              <SparklesIcon className="w-6 h-6 text-blue-600"/>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{t('seller:createListing.aiPowered')}</h3>
          </div>
          <p className="text-gray-400 mb-6 text-sm">
            {t('seller:createListing.aiDescription')}
          </p>
          <GeminiDescriptionGenerator
            // A different draft is a different listing — start its form afresh.
            key={state.importDraftToPublish?.draftId ?? 'listing'}
            propertyToEdit={state.propertyToEdit}
            prefill={importPrefill}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateListingPage;
