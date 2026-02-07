import React from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { SparklesIcon, MapPinIcon } from '@/constants';
import MapLocationPicker from '@/src/features/seller/components/MapLocationPicker';
import RoleSelector from '@/src/features/seller/components/RoleSelector';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import { useListingForm } from '@/src/features/seller/components/useListingForm';
import ListingFormFields from '@/src/features/seller/components/ListingFormFields';
import ListingPropertyFeatures from '@/src/features/seller/components/ListingPropertyFeatures';
import ListingImageUpload from '@/src/features/seller/components/ListingImageUpload';
import NumberInputWithSteppers from '@/components/shared/NumberInputWithSteppers';
import { getCurrencySymbol } from '@/utils/currency';
import {
    LANGUAGES, CheckCircleIcon, UploadIcon,
    floatingInputClasses, floatingLabelClasses, floatingSelectLabelClasses, inputBaseClasses,
    TagListInput,
} from '@/src/features/seller/components/ListingFormHelpers';
import PromotionSelector from '@/src/features/promotions/components/PromotionSelector';
import MarketInsightsAnimation from '@/src/features/seller/components/MarketInsightsAnimation';
import Footer from '@/components/shared/Footer';
import { useAppContext } from '@/context/AppContext';

const RentalListingForm: React.FC = () => {
    const { t } = useTranslation(['rental', 'newListing', 'seller', 'common', 'validation']);
    const { state } = useAppContext();

    const {
        mode, setMode,
        step, setStep,
        images,
        floorplanImage, setFloorplanImage,
        listingData, setListingData,
        language, setLanguage,
        aiPropertyType, setAiPropertyType,
        isSubmitting,
        wantToPromote, setWantToPromote,
        pendingPropertyData,
        selectedRole, setSelectedRole,
        uploadProgress,
        isCompressing,
        isUploading,
        selectedCountry, selectedCity, availableCities,
        getZoomLevel, cityData,
        handleCountryChange, handleCityChange,
        handleMapLocationChange, handleMapAddressChange,
        handleImageChange, handleFloorplanImageChange,
        removeImage,
        handleDragStart, handleDragEnter, handleDragEnd, handleDrop,
        handleGenerate,
        handleInputChange, handlePriceChange, handleImageTagChange,
        handleSubmit,
        handlePromotionPaymentSuccess, handlePostWithoutPromotion,
        formContainerRef,
        currentUser, isAuthenticating, isLoadingUserData,
    } = useListingForm(state.propertyToEdit);

    // Force listingType to 'rent' on mount
    React.useEffect(() => {
        setListingData(prev => ({ ...prev, listingType: 'rent' }));
    }, [setListingData]);

    const currencySymbol = getCurrencySymbol(selectedCountry);

    if (step === 'payment' && pendingPropertyData) {
        return (
            <PromotionSelector
                pendingPropertyData={pendingPropertyData}
                onPaymentSuccess={handlePromotionPaymentSuccess}
                onSkip={handlePostWithoutPromotion}
                onBack={() => setStep('form')}
                isSubmitting={isSubmitting}
            />
        );
    }

    if (step === 'success') {
        return (
            <div className="text-center py-12 flex flex-col items-center">
                <CheckCircleIcon className="w-16 h-16 text-green-500 mb-4" />
                <h3 className="text-2xl font-bold text-neutral-800">
                    {state.propertyToEdit ? t('rental:form.updateSuccess') : t('rental:form.createSuccess')}
                </h3>
                <p className="text-neutral-600 mt-2">{t('rental:form.redirecting')}</p>
            </div>
        );
    }

    if (step === 'loading') {
        return (
            <div className="text-center py-12 flex flex-col items-center min-h-[70vh]">
                <MarketInsightsAnimation
                    city={selectedCity?.name}
                    country={selectedCountry || 'Serbia'}
                    propertyType={listingData.propertyType}
                />
            </div>
        );
    }

    return (
        <div className="min-h-full bg-neutral-50">
            <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-800 mb-2">
                    {state.propertyToEdit ? t('rental:form.editTitle') : t('rental:form.title')}
                </h2>
                <p className="text-neutral-500 mb-8">{t('rental:form.subtitle')}</p>

                <form onSubmit={handleSubmit}>
                    <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-lg border border-neutral-200 space-y-8" ref={formContainerRef}>

                        {/* Listing Type Badge */}
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="bg-blue-100 p-2 rounded-full">
                                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                                </svg>
                            </div>
                            <div>
                                <span className="text-sm font-semibold text-blue-800">{t('rental:form.rentalListing')}</span>
                                <p className="text-xs text-blue-600">{t('rental:form.rentalListingHint')}</p>
                            </div>
                        </div>

                        {/* Mode Toggle: AI or Manual */}
                        <div className="flex justify-center">
                            <div className="bg-neutral-100 p-1 rounded-full flex items-center space-x-1 border border-neutral-200 shadow-sm max-w-sm">
                                <button type="button" onClick={() => setMode('ai')} className={`w-1/2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${mode === 'ai' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}>
                                    <SparklesIcon className="w-4 h-4" /> {t('seller:createListing.mode.aiCreator')}
                                </button>
                                <button type="button" onClick={() => { setMode('manual'); setStep('form'); }} className={`w-1/2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap ${mode === 'manual' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}>
                                    {t('seller:createListing.mode.manual')}
                                </button>
                            </div>
                        </div>

                        {/* AI Mode: Image Upload + Generate */}
                        {mode === 'ai' && step === 'init' && (
                            <div className="space-y-4">
                                <ListingImageUpload
                                    images={images}
                                    onImageChange={handleImageChange}
                                    onRemove={removeImage}
                                    onDragStart={handleDragStart}
                                    onDragEnter={handleDragEnter}
                                    onDragEnd={handleDragEnd}
                                    onDrop={handleDrop}
                                    listingData={listingData}
                                    onImageTagChange={handleImageTagChange}
                                    uploadProgress={uploadProgress}
                                    isCompressing={isCompressing}
                                    isUploading={isUploading}
                                />
                                <div className="flex flex-col sm:flex-row gap-3 items-center">
                                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className={`${inputBaseClasses} sm:max-w-xs`}>
                                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={handleGenerate}
                                        disabled={images.filter(i => i.file).length === 0 || isSubmitting}
                                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 transition-all hover:shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <SparklesIcon className="w-5 h-5" />
                                        {t('seller:createListing.buttons.generateDescription')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Manual Mode or AI Generated -> Show Form */}
                        {(mode === 'manual' || step === 'form') && (
                            <div className="space-y-8">
                                {/* Image Upload (if manual mode) */}
                                {mode === 'manual' && (
                                    <ListingImageUpload
                                        images={images}
                                        onImageChange={handleImageChange}
                                        onRemove={removeImage}
                                        onDragStart={handleDragStart}
                                        onDragEnter={handleDragEnter}
                                        onDragEnd={handleDragEnd}
                                        onDrop={handleDrop}
                                        listingData={listingData}
                                        onImageTagChange={handleImageTagChange}
                                        uploadProgress={uploadProgress}
                                        isCompressing={isCompressing}
                                        isUploading={isUploading}
                                    />
                                )}

                                {/* Standard Listing Fields */}
                                <fieldset>
                                    <legend className="text-lg font-bold text-neutral-800 mb-4">{t('rental:form.propertyDetails')}</legend>
                                    <ListingFormFields
                                        listingData={listingData}
                                        setListingData={setListingData}
                                        selectedCountry={selectedCountry}
                                        selectedCity={selectedCity}
                                        availableCities={availableCities}
                                        handleCountryChange={handleCountryChange}
                                        handleCityChange={handleCityChange}
                                        handleInputChange={handleInputChange}
                                        handlePriceChange={handlePriceChange}
                                        handleMapLocationChange={handleMapLocationChange}
                                        handleMapAddressChange={handleMapAddressChange}
                                        getZoomLevel={getZoomLevel}
                                        cityData={cityData}
                                    />
                                </fieldset>

                                {/* ===== RENTAL-SPECIFIC FIELDS ===== */}
                                <fieldset className="border-t border-neutral-200 pt-6">
                                    <legend className="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                                        </svg>
                                        {t('rental:form.rentalDetails')}
                                    </legend>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Rent Period */}
                                        <div className="relative">
                                            <select
                                                name="rentPeriod"
                                                value={listingData.rentPeriod}
                                                onChange={(e) => setListingData(prev => ({ ...prev, rentPeriod: e.target.value as any }))}
                                                className={`${floatingInputClasses} border-neutral-300`}
                                            >
                                                <option value="monthly">{t('rental:form.rentPeriods.monthly')}</option>
                                                <option value="weekly">{t('rental:form.rentPeriods.weekly')}</option>
                                                <option value="daily">{t('rental:form.rentPeriods.daily')}</option>
                                            </select>
                                            <label className={floatingSelectLabelClasses}>{t('rental:form.rentPeriod')}</label>
                                        </div>

                                        {/* Security Deposit */}
                                        <div className="relative cursor-text" onClick={() => document.getElementById('securityDeposit')?.focus()}>
                                            <input
                                                type="number"
                                                id="securityDeposit"
                                                value={listingData.securityDeposit > 0 ? listingData.securityDeposit : ''}
                                                onChange={(e) => setListingData(prev => ({ ...prev, securityDeposit: Number(e.target.value) || 0 }))}
                                                className={`${floatingInputClasses} border-neutral-300 pl-8`}
                                                placeholder=" "
                                                min={0}
                                            />
                                            <label htmlFor="securityDeposit" className={floatingLabelClasses}>{t('rental:form.securityDeposit')}</label>
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">{currencySymbol}</span>
                                        </div>

                                        {/* Minimum Lease Duration */}
                                        <NumberInputWithSteppers
                                            label={t('rental:form.minLeaseDuration')}
                                            value={listingData.minimumLeaseDuration}
                                            min={1}
                                            max={60}
                                            onChange={(val) => setListingData(prev => ({ ...prev, minimumLeaseDuration: val }))}
                                        />

                                        {/* Maximum Lease Duration */}
                                        <NumberInputWithSteppers
                                            label={t('rental:form.maxLeaseDuration')}
                                            value={listingData.maximumLeaseDuration}
                                            min={1}
                                            max={120}
                                            onChange={(val) => setListingData(prev => ({ ...prev, maximumLeaseDuration: val }))}
                                        />

                                        {/* Available From */}
                                        <div className="relative cursor-text" onClick={() => document.getElementById('availableFrom')?.focus()}>
                                            <input
                                                type="date"
                                                id="availableFrom"
                                                value={listingData.availableFrom}
                                                onChange={(e) => setListingData(prev => ({ ...prev, availableFrom: e.target.value }))}
                                                className={`${floatingInputClasses} border-neutral-300`}
                                                min={new Date().toISOString().split('T')[0]}
                                            />
                                            <label htmlFor="availableFrom" className={floatingSelectLabelClasses}>{t('rental:form.availableFrom')}</label>
                                        </div>

                                        {/* Max Occupants */}
                                        <NumberInputWithSteppers
                                            label={t('rental:form.maxOccupants')}
                                            value={listingData.maxOccupants}
                                            min={1}
                                            max={20}
                                            onChange={(val) => setListingData(prev => ({ ...prev, maxOccupants: val }))}
                                        />
                                    </div>

                                    {/* Inclusions */}
                                    <div className="mt-6 space-y-3">
                                        <h4 className="text-sm font-semibold text-neutral-700">{t('rental:form.inclusions')}</h4>
                                        <div className="flex flex-wrap gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={listingData.utilitiesIncluded}
                                                    onChange={(e) => setListingData(prev => ({ ...prev, utilitiesIncluded: e.target.checked }))}
                                                    className="rounded text-primary focus:ring-primary w-4 h-4"
                                                />
                                                <span className="text-sm text-neutral-700">{t('rental:form.utilitiesIncluded')}</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={listingData.internetIncluded}
                                                    onChange={(e) => setListingData(prev => ({ ...prev, internetIncluded: e.target.checked }))}
                                                    className="rounded text-primary focus:ring-primary w-4 h-4"
                                                />
                                                <span className="text-sm text-neutral-700">{t('rental:form.internetIncluded')}</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Tenant Requirements */}
                                    <div className="mt-6">
                                        <TagListInput
                                            tags={listingData.tenantRequirements}
                                            setTags={(tags) => setListingData(prev => ({ ...prev, tenantRequirements: tags }))}
                                            label={t('rental:form.tenantRequirements')}
                                        />
                                        <p className="mt-1 text-xs text-neutral-500">{t('rental:form.tenantRequirementsHint')}</p>
                                    </div>
                                </fieldset>

                                {/* Property Features */}
                                <fieldset className="border-t border-neutral-200 pt-6">
                                    <legend className="text-lg font-bold text-neutral-800 mb-4">{t('rental:form.features')}</legend>
                                    <ListingPropertyFeatures
                                        listingData={listingData}
                                        setListingData={setListingData}
                                    />
                                </fieldset>

                                {/* Description */}
                                <fieldset className="border-t border-neutral-200 pt-6">
                                    <legend className="text-lg font-bold text-neutral-800 mb-4">{t('rental:form.description')}</legend>
                                    <textarea
                                        name="description"
                                        value={listingData.description}
                                        onChange={handleInputChange}
                                        className={`${inputBaseClasses} min-h-[150px] resize-y`}
                                        placeholder={t('rental:form.descriptionPlaceholder')}
                                        required
                                    />
                                </fieldset>

                                {/* Floorplan Upload */}
                                <fieldset className="border-t border-neutral-200 pt-6">
                                    <legend className="text-sm font-semibold text-neutral-700 mb-3">{t('seller:createListing.fields.floorplan')}</legend>
                                    <div className="flex items-center gap-4">
                                        {floorplanImage.previewUrl ? (
                                            <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-neutral-200">
                                                <img src={floorplanImage.previewUrl} alt="Floorplan" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFloorplanImage({ file: null, previewUrl: '' })}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-primary transition-colors">
                                                <UploadIcon className="w-6 h-6 text-neutral-400" />
                                                <span className="text-xs text-neutral-500 mt-1">{t('seller:createListing.fields.uploadFloorplan')}</span>
                                                <input type="file" accept="image/*" onChange={handleFloorplanImageChange} className="hidden" />
                                            </label>
                                        )}
                                    </div>
                                </fieldset>

                                {/* Role Selector */}
                                {currentUser && (
                                    <fieldset className="border-t border-neutral-200 pt-6">
                                        <RoleSelector
                                            selectedRole={selectedRole}
                                            onRoleChange={setSelectedRole}
                                        />
                                    </fieldset>
                                )}

                                {/* Submit */}
                                <div className="border-t border-neutral-200 pt-6 flex flex-col sm:flex-row gap-3">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || isUploading}
                                        className="flex-1 bg-gradient-to-r from-primary to-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                                {isUploading ? t('seller:createListing.buttons.uploading') : t('seller:createListing.buttons.publishing')}
                                            </>
                                        ) : (
                                            state.propertyToEdit ? t('rental:form.updateListing') : t('rental:form.publishListing')
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </main>

            <Footer />
        </div>
    );
};

export default RentalListingForm;
