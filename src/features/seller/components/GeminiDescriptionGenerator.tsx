import React from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { SparklesIcon, MapPinIcon } from '@/constants';
import MarketInsightsAnimation from './MarketInsightsAnimation';
import MapLocationPicker from './MapLocationPicker';
import PromotionSelector from '@/src/features/promotions/components/PromotionSelector';
import RoleSelector from './RoleSelector';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import { useListingForm } from './useListingForm';
import ListingFormFields from './ListingFormFields';
import ListingPropertyFeatures from './ListingPropertyFeatures';
import ListingImageUpload from './ListingImageUpload';
import NumberInputWithSteppers from '@/components/shared/NumberInputWithSteppers';
import { getCurrencySymbol } from '@/utils/currency';
import {
    LANGUAGES, CheckCircleIcon, UploadIcon, TagListInput,
    floatingInputClasses, floatingLabelClasses, floatingSelectLabelClasses, inputBaseClasses,
} from './ListingFormHelpers';

// --- Main Component ---
const GeminiDescriptionGenerator: React.FC<{ propertyToEdit: Property | null }> = ({ propertyToEdit }) => {
    const { t } = useTranslation(['newListing', 'seller', 'rental', 'common', 'validation']);

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
    } = useListingForm(propertyToEdit);

    // --- Step-based rendering ---

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
                <h3 className="text-2xl font-bold text-neutral-800">Listing {propertyToEdit ? 'Updated' : 'Published'} Successfully!</h3>
                <p className="text-neutral-600 mt-2">Redirecting you to your dashboard...</p>
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

    const isRental = listingData.listingType === 'rent';
    const currencySymbol = getCurrencySymbol(selectedCountry);

    return (
        <>
        <form onSubmit={handleSubmit}>
            {/* Listing Type Toggle: Sale / Rent */}
            <div className="flex justify-center mb-6">
                <div className="bg-neutral-100 p-1 rounded-full flex items-center space-x-1 border border-neutral-200 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setListingData(prev => ({ ...prev, listingType: 'sale' }))}
                        className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                            !isRental ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t('seller:createListing.listingType.sale', 'For Sale')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setListingData(prev => ({ ...prev, listingType: 'rent' }))}
                        className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                            isRental ? 'bg-white text-blue-600 shadow' : 'text-neutral-600 hover:bg-neutral-200'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        {t('seller:createListing.listingType.rent', 'For Rent')}
                    </button>
                </div>
            </div>

            {/* Rental indicator */}
            {isRental && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 mb-6">
                    <div className="bg-blue-100 p-2 rounded-full">
                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <div>
                        <span className="text-sm font-semibold text-blue-800">{t('rental:form.rentalListing')}</span>
                        <p className="text-xs text-blue-600">{t('rental:form.rentalListingHint')}</p>
                    </div>
                </div>
            )}

            {/* Photo Tips */}
            <div className="bg-primary-light text-primary-dark/90 text-sm p-4 rounded-lg mb-6 border border-primary/20">
                <p><strong>{t('seller:createListing.photoTips.title')}:</strong> {t('seller:createListing.photoTips.description')}</p>
            </div>

            {/* Mode Toggle */}
            <div className="flex justify-center mb-6">
                 <div className="bg-neutral-100 p-1 rounded-full flex items-center space-x-1 border border-neutral-200 shadow-sm max-w-sm">
                    <button type="button" onClick={() => setMode('ai')} className={`w-1/2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${mode === 'ai' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}><SparklesIcon className="w-4 h-4" /> {t('seller:createListing.mode.aiCreator')}</button>
                    <button type="button" onClick={() => setMode('manual')} className={`w-1/2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${mode === 'manual' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}>{t('seller:createListing.mode.manualEntry')}</button>
                </div>
            </div>

            {/* Role Selector - only show when user data is fully loaded */}
            {!propertyToEdit && (
                isAuthenticating || isLoadingUserData ? (
                    <div className="bg-white border-2 border-primary/20 rounded-lg p-6 mb-6 animate-pulse">
                        <div className="h-6 bg-neutral-200 rounded w-1/3 mb-4"></div>
                        <div className="h-4 bg-neutral-100 rounded w-2/3 mb-4"></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="h-32 bg-neutral-100 rounded-lg"></div>
                            <div className="h-32 bg-neutral-100 rounded-lg"></div>
                        </div>
                    </div>
                ) : currentUser ? (
                    <RoleSelector
                        currentUser={currentUser}
                        selectedRole={selectedRole}
                        onRoleSelect={setSelectedRole}
                    />
                ) : null
            )}

            {/* AI Init Step */}
            {mode === 'ai' && step === 'init' && (
                <div className="animate-fade-in">
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div className="relative">
                                <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)} className={`${floatingInputClasses} border-neutral-300`}>
                                    {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                                </select>
                                <label htmlFor="language" className={floatingSelectLabelClasses}>{t('seller:createListing.language.label')}</label>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                            </div>
                            <div className="relative">
                                <select id="aiPropertyType" value={aiPropertyType} onChange={(e) => setAiPropertyType(e.target.value as any)} className={`${floatingInputClasses} border-neutral-300`}>
                                    <option value="house">{t('seller:propertyTypes.house')}</option>
                                    <option value="apartment">{t('seller:propertyTypes.apartment')}</option>
                                    <option value="villa">{t('seller:propertyTypes.villa')}</option>
                                    <option value="land">{t('seller:propertyTypes.land')}</option>
                                    <option value="other">{t('seller:propertyTypes.other')}</option>
                                </select>
                                <label htmlFor="aiPropertyType" className={floatingSelectLabelClasses}>{t('seller:form.propertyType')}</label>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                            </div>
                        </div>

                        {/* Location Section for AI context */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div className="relative">
                                <select
                                    id="ai-country"
                                    value={selectedCountry}
                                    onChange={handleCountryChange}
                                    className={`${floatingInputClasses} border-neutral-300`}
                                >
                                    <option value="">{t('seller:createListing.location.selectCountry')}</option>
                                    {BALKAN_LOCATIONS.map(country => (
                                        <option key={country.code} value={country.name}>
                                            {country.name}
                                        </option>
                                    ))}
                                </select>
                                <label htmlFor="ai-country" className={floatingSelectLabelClasses}>{t('seller:createListing.location.country')}</label>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                                    </svg>
                                </div>
                            </div>

                            <div className="relative">
                                <select
                                    id="ai-city"
                                    value={selectedCity}
                                    onChange={handleCityChange}
                                    className={`${floatingInputClasses} border-neutral-300`}
                                    disabled={!selectedCountry}
                                >
                                    <option value="">{t('seller:createListing.location.selectCity')}</option>
                                    {availableCities.map(city => (
                                        <option key={city.name} value={city.name}>
                                            {city.name}
                                        </option>
                                    ))}
                                </select>
                                <label htmlFor="ai-city" className={floatingSelectLabelClasses}>{t('seller:createListing.location.city')}</label>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                                    </svg>
                                </div>
                            </div>

                            {/* Show interactive map when city is selected */}
                            {selectedCity && listingData.lat !== 0 && listingData.lng !== 0 && (
                                <div className="md:col-span-2">
                                    <p className="mb-2 text-xs text-neutral-500">
                                        <MapPinIcon className="w-3 h-3 inline-block mr-1" />
                                        {t('seller:createListing.ai.locationHint', 'Adding location helps AI generate more accurate, location-specific descriptions')}
                                    </p>
                                    <MapLocationPicker
                                        lat={listingData.lat}
                                        lng={listingData.lng}
                                        address={listingData.streetAddress || `${selectedCity}, ${selectedCountry}`}
                                        zoom={getZoomLevel}
                                        country={selectedCountry}
                                        city={selectedCity}
                                        cityLat={cityData?.lat}
                                        cityLng={cityData?.lng}
                                        onLocationChange={handleMapLocationChange}
                                        onAddressChange={handleMapAddressChange}
                                    />
                                </div>
                            )}
                        </div>

                        <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-neutral-300 border-dashed rounded-lg cursor-pointer bg-neutral-50 hover:bg-neutral-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6"><UploadIcon className="w-10 h-10 mb-3 text-neutral-400" /><p className="mb-2 text-sm text-neutral-500"><span className="font-semibold">{t('seller:createListing.upload.clickToUpload')}</span></p><p className="text-xs text-neutral-500">{t('seller:createListing.upload.fileTypes')}</p></div>
                            <input id="image-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                        </label>
                        {images.length > 0 && (
                            <div className="mt-4"><p className="font-semibold text-sm mb-2">{t('seller:createListing.upload.imagesSelected', { count: images.length })}</p><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">{images.map((img, index) => (<div key={index} className="relative group"><img src={img.previewUrl} alt={`preview ${index}`} className="w-full h-24 object-cover rounded-md" /><button type="button" onClick={() => removeImage(index)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">&times;</button></div>))}</div></div>
                        )}
                         <button type="button" onClick={handleGenerate} className="w-full mt-6 py-3 text-lg font-bold text-white bg-primary rounded-lg shadow-md hover:bg-primary-dark transition-colors flex items-center justify-center gap-2" disabled={images.length === 0}><SparklesIcon className="w-6 h-6"/>{t('seller:createListing.generate')}</button>
                    </div>
                </div>
            )}

            {/* Form Step (manual entry or AI-generated form) */}
            {(mode === 'manual' || (mode === 'ai' && step === 'form')) && (
                 <div className="space-y-8 animate-fade-in">
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

                    <ListingPropertyFeatures
                        listingData={listingData}
                        setListingData={setListingData}
                        handleInputChange={handleInputChange}
                    />

                    {/* ===== Rental-Specific Fields (only shown when listingType is 'rent') ===== */}
                    {isRental && (
                        <fieldset className="space-y-6 p-4 sm:p-6 bg-blue-50/50 rounded-xl border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                <h3 className="text-base font-bold text-neutral-800">{t('rental:form.rentalDetails')}</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Rent Period */}
                                <div className="relative">
                                    <select
                                        name="rentPeriod"
                                        value={listingData.rentPeriod}
                                        onChange={(e) => setListingData(prev => ({ ...prev, rentPeriod: e.target.value as any }))}
                                        className={`${floatingInputClasses} border-blue-200 focus:border-blue-500 focus:ring-blue-500`}
                                    >
                                        <option value="monthly">{t('rental:form.rentPeriods.monthly')}</option>
                                        <option value="weekly">{t('rental:form.rentPeriods.weekly')}</option>
                                        <option value="daily">{t('rental:form.rentPeriods.daily')}</option>
                                    </select>
                                    <label className={`${floatingSelectLabelClasses} text-blue-700`}>{t('rental:form.rentPeriod')}</label>
                                </div>

                                {/* Security Deposit */}
                                <div className="relative cursor-text" onClick={() => document.getElementById('securityDeposit')?.focus()}>
                                    <input
                                        type="number"
                                        id="securityDeposit"
                                        value={listingData.securityDeposit > 0 ? listingData.securityDeposit : ''}
                                        onChange={(e) => setListingData(prev => ({ ...prev, securityDeposit: Number(e.target.value) || 0 }))}
                                        className={`${floatingInputClasses} border-blue-200 pl-8 focus:border-blue-500 focus:ring-blue-500`}
                                        placeholder=" "
                                        min={0}
                                    />
                                    <label htmlFor="securityDeposit" className={`${floatingLabelClasses} text-blue-700`}>{t('rental:form.securityDeposit')}</label>
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">{currencySymbol}</span>
                                </div>

                                {/* Min Lease */}
                                <NumberInputWithSteppers
                                    label={t('rental:form.minLeaseDuration')}
                                    value={listingData.minimumLeaseDuration}
                                    min={1}
                                    max={60}
                                    onChange={(val) => setListingData(prev => ({ ...prev, minimumLeaseDuration: val }))}
                                />

                                {/* Max Lease */}
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
                                        className={`${floatingInputClasses} border-blue-200 focus:border-blue-500 focus:ring-blue-500`}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    <label htmlFor="availableFrom" className={`${floatingSelectLabelClasses} text-blue-700`}>{t('rental:form.availableFrom')}</label>
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
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-neutral-700">{t('rental:form.inclusions')}</h4>
                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={listingData.utilitiesIncluded}
                                            onChange={(e) => setListingData(prev => ({ ...prev, utilitiesIncluded: e.target.checked }))}
                                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                        />
                                        <span className="text-sm text-neutral-700">{t('rental:form.utilitiesIncluded')}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={listingData.internetIncluded}
                                            onChange={(e) => setListingData(prev => ({ ...prev, internetIncluded: e.target.checked }))}
                                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                        />
                                        <span className="text-sm text-neutral-700">{t('rental:form.internetIncluded')}</span>
                                    </label>
                                </div>
                            </div>

                            {/* Tenant Requirements */}
                            <div>
                                <TagListInput
                                    tags={listingData.tenantRequirements}
                                    setTags={(tags) => setListingData(prev => ({ ...prev, tenantRequirements: tags }))}
                                    label={t('rental:form.tenantRequirements')}
                                />
                                <p className="mt-1 text-xs text-neutral-500">{t('rental:form.tenantRequirementsHint')}</p>
                            </div>
                        </fieldset>
                    )}

                    {/* ===== Visit Availability (for all listing types) ===== */}
                    <fieldset className="space-y-4 p-4 sm:p-6 bg-amber-50/50 rounded-xl border border-amber-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <h3 className="text-base font-bold text-neutral-800">{t('seller:createListing.visitAvailability.title', 'Visit Availability')}</h3>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={listingData.visitAvailability.enabled}
                                    onChange={(e) => setListingData(prev => ({
                                        ...prev,
                                        visitAvailability: { ...prev.visitAvailability, enabled: e.target.checked }
                                    }))}
                                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                                />
                                <span className="text-sm font-medium text-neutral-700">{t('seller:createListing.visitAvailability.enable', 'Enable scheduling')}</span>
                            </label>
                        </div>
                        <p className="text-xs text-neutral-500">{t('seller:createListing.visitAvailability.description', 'Allow visitors to schedule viewings online. Define your available days and hours.')}</p>

                        {listingData.visitAvailability.enabled && (
                            <div className="space-y-4">
                                {/* Available Days */}
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-700 mb-2">{t('seller:createListing.visitAvailability.availableDays', 'Available Days')}</label>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { day: 1, label: t('common:days.mon', 'Mon') },
                                            { day: 2, label: t('common:days.tue', 'Tue') },
                                            { day: 3, label: t('common:days.wed', 'Wed') },
                                            { day: 4, label: t('common:days.thu', 'Thu') },
                                            { day: 5, label: t('common:days.fri', 'Fri') },
                                            { day: 6, label: t('common:days.sat', 'Sat') },
                                            { day: 0, label: t('common:days.sun', 'Sun') },
                                        ].map(({ day, label }) => (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => {
                                                    const days = listingData.visitAvailability.days.includes(day)
                                                        ? listingData.visitAvailability.days.filter(d => d !== day)
                                                        : [...listingData.visitAvailability.days, day];
                                                    setListingData(prev => ({
                                                        ...prev,
                                                        visitAvailability: { ...prev.visitAvailability, days }
                                                    }));
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                                    listingData.visitAvailability.days.includes(day)
                                                        ? 'bg-amber-500 text-white border-amber-500'
                                                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-amber-300'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Time Range */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-600 mb-1">{t('seller:createListing.visitAvailability.startTime', 'Start Time')}</label>
                                        <input
                                            type="time"
                                            value={listingData.visitAvailability.startTime}
                                            onChange={(e) => setListingData(prev => ({
                                                ...prev,
                                                visitAvailability: { ...prev.visitAvailability, startTime: e.target.value }
                                            }))}
                                            className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-600 mb-1">{t('seller:createListing.visitAvailability.endTime', 'End Time')}</label>
                                        <input
                                            type="time"
                                            value={listingData.visitAvailability.endTime}
                                            onChange={(e) => setListingData(prev => ({
                                                ...prev,
                                                visitAvailability: { ...prev.visitAvailability, endTime: e.target.value }
                                            }))}
                                            className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-600 mb-1">{t('seller:createListing.visitAvailability.slotDuration', 'Slot Duration')}</label>
                                        <select
                                            value={listingData.visitAvailability.slotDurationMinutes}
                                            onChange={(e) => setListingData(prev => ({
                                                ...prev,
                                                visitAvailability: { ...prev.visitAvailability, slotDurationMinutes: Number(e.target.value) }
                                            }))}
                                            className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                        >
                                            <option value={15}>15 min</option>
                                            <option value={30}>30 min</option>
                                            <option value={45}>45 min</option>
                                            <option value={60}>60 min</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-xs font-medium text-neutral-600 mb-1">{t('seller:createListing.visitAvailability.notes', 'Notes for visitors')}</label>
                                    <input
                                        type="text"
                                        value={listingData.visitAvailability.notes || ''}
                                        onChange={(e) => setListingData(prev => ({
                                            ...prev,
                                            visitAvailability: { ...prev.visitAvailability, notes: e.target.value }
                                        }))}
                                        className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                        placeholder={t('seller:createListing.visitAvailability.notesPlaceholder', 'e.g., Ring bell at gate, parking available...')}
                                    />
                                </div>
                            </div>
                        )}
                    </fieldset>

                    {/* Description */}
                    <fieldset><label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-1">{t('seller:createListing.fields.description')}</label><textarea id="description" name="description" value={listingData.description} onChange={handleInputChange} className={`${inputBaseClasses} h-48`} required /></fieldset>

                    <ListingImageUpload
                        images={images}
                        listingData={listingData}
                        floorplanImage={floorplanImage}
                        isCompressing={isCompressing}
                        isUploading={isUploading}
                        isSubmitting={isSubmitting}
                        uploadProgress={uploadProgress}
                        handleImageChange={handleImageChange}
                        handleFloorplanImageChange={handleFloorplanImageChange}
                        removeImage={removeImage}
                        handleDragStart={handleDragStart}
                        handleDragEnter={handleDragEnter}
                        handleDragEnd={handleDragEnd}
                        handleDrop={handleDrop}
                        handleImageTagChange={handleImageTagChange}
                        setFloorplanImage={setFloorplanImage}
                    />

                    {/* 360 Virtual Tour URL */}
                    <fieldset className="space-y-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                <path d="M2 12h20" />
                            </svg>
                            <h3 className="text-base font-semibold text-purple-900">{t('seller:createListing.virtualTour.title')}</h3>
                        </div>
                        <p className="text-sm text-purple-700 mb-3">
                            {t('seller:createListing.virtualTour.description')}
                        </p>
                        <div className="relative">
                            <input
                                type="url"
                                id="virtualTour360Url"
                                name="virtualTour360Url"
                                value={listingData.virtualTour360Url}
                                onChange={handleInputChange}
                                placeholder={t('seller:createListing.virtualTour.placeholder')}
                                className={`${floatingInputClasses} border-purple-300 focus:border-purple-500 focus:ring-purple-500`}
                            />
                            <label htmlFor="virtualTour360Url" className={`${floatingLabelClasses} text-purple-700 peer-focus:text-purple-600`}>
                                {t('seller:createListing.virtualTour.label')}
                            </label>
                        </div>
                        <p className="text-xs text-purple-600">
                            {t('seller:createListing.virtualTour.hint')}
                        </p>
                    </fieldset>

                    {/* Property Video URL */}
                    <fieldset className="space-y-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                            <h3 className="text-base font-semibold text-red-900">{t('seller:createListing.video.title', 'Property Video')}</h3>
                        </div>
                        <p className="text-sm text-red-700 mb-3">
                            {t('seller:createListing.video.description', 'Add a video to showcase your property! Videos auto-play when visitors view your listing.')}
                        </p>
                        <div className="relative">
                            <input
                                type="url"
                                id="tourUrl"
                                name="tourUrl"
                                value={listingData.tourUrl}
                                onChange={handleInputChange}
                                placeholder={t('seller:createListing.video.placeholder', 'https://youtube.com/watch?v=... or https://tiktok.com/...')}
                                className={`${floatingInputClasses} border-red-300 focus:border-red-500 focus:ring-red-500`}
                            />
                            <label htmlFor="tourUrl" className={`${floatingLabelClasses} text-red-700 peer-focus:text-red-600`}>
                                {t('seller:createListing.video.label', 'Video URL')}
                            </label>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-red-600">
                            <span className="flex items-center gap-1 bg-red-100 px-2 py-1 rounded">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                                YouTube
                            </span>
                            <span className="flex items-center gap-1 bg-red-100 px-2 py-1 rounded">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
                                TikTok
                            </span>
                            <span className="flex items-center gap-1 bg-red-100 px-2 py-1 rounded">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                                Instagram
                            </span>
                            <span className="flex items-center gap-1 bg-red-100 px-2 py-1 rounded">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                Facebook
                            </span>
                            <span className="flex items-center gap-1 bg-red-100 px-2 py-1 rounded">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.084 3.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.493 4.797l-.013.01z" /></svg>
                                Vimeo
                            </span>
                        </div>
                        <p className="text-xs text-red-600">
                            {t('seller:createListing.video.hint', 'Paste a link from YouTube, TikTok, Instagram, Facebook, or Vimeo. The video will auto-play when visitors view your listing!')}
                        </p>
                    </fieldset>

                    {/* Promotion Option */}
                    {!propertyToEdit && (
                        <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">🚀</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-base font-bold text-gray-900 mb-1">
                                        {t('seller:createListing.promotion.title')}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        {t('seller:createListing.promotion.description')}
                                    </p>
                                </div>
                            </div>

                            <label htmlFor="wantToPromote" className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="wantToPromote"
                                    checked={wantToPromote}
                                    onChange={(e) => setWantToPromote(e.target.checked)}
                                    className="mt-0.5 w-5 h-5 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                                />
                                <div className="flex-1">
                                    <span className="text-sm font-semibold text-gray-900">
                                        {t('seller:createListing.promotion.checkbox')}
                                    </span>
                                    <p className="text-xs text-gray-600 mt-1">
                                        {t('seller:createListing.promotion.hint')}
                                    </p>
                                </div>
                            </label>

                            {wantToPromote && (
                                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <span className="text-lg">✓</span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-green-900 mb-1">
                                                {t('seller:createListing.promotion.selected')}
                                            </p>
                                            <p className="text-xs text-green-700">
                                                {t('seller:createListing.promotion.selectedHint')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting || isCompressing || isUploading}
                            className="px-8 py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? t('seller:createListing.buttons.saving') : (
                                propertyToEdit ? t('seller:createListing.buttons.updateListing') : (
                                    wantToPromote ? t('seller:createListing.buttons.continueToPayment') : t('seller:createListing.buttons.publishListing')
                                )
                            )}
                        </button>
                    </div>
                 </div>
            )}
        </form>
        </>
    );
};

export default GeminiDescriptionGenerator;
