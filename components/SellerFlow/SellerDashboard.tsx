import React from 'react';
import { useTranslation } from 'react-i18next';
import { CurrencyDollarIcon, SparklesIcon } from '../../constants';
import PropertyCalculator from './PropertyCalculator';
import GeminiDescriptionGenerator from './GeminiDescriptionGenerator';
import { useAppContext } from '../../context/AppContext';
import Footer from '../shared/Footer';

const CreateListingPage: React.FC = () => {
  const { t } = useTranslation(['seller']);
  const { state } = useAppContext();

  return (
    <div className="min-h-full bg-neutral-50">
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-800 mb-8">
          {state.propertyToEdit ? t('seller:createListing.editTitle') : t('seller:createListing.title')}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                 <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-lg border border-neutral-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-primary-light p-3 rounded-full">
                            <SparklesIcon className="w-6 h-6 text-primary"/>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-neutral-800">{t('seller:createListing.aiPowered')}</h3>
                    </div>
                    <p className="text-neutral-600 mb-6">
                        {t('seller:createListing.aiDescription')}
                    </p>
                    <GeminiDescriptionGenerator propertyToEdit={state.propertyToEdit} />
                </div>
            </div>
            <div className="lg:col-span-1">
                 <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-lg border border-neutral-200 h-full">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-secondary/20 p-3 rounded-full">
                            <CurrencyDollarIcon className="w-6 h-6 text-secondary"/>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-neutral-800">{t('seller:createListing.valueCalculator')}</h3>
                    </div>
                    <p className="text-neutral-600 mb-6">
                        {t('seller:createListing.valueDescription')}
                    </p>
                    <PropertyCalculator />
                </div>
            </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default CreateListingPage;
