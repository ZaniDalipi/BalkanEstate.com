import React from 'react';
import { useTranslation } from 'react-i18next';
import { BALKAN_LOCATIONS, CityData } from '@/utils/balkanLocations';
import { getCurrencySymbol } from '@/utils/currency';
import MapLocationPicker from './MapLocationPicker';
import NumberInputWithSteppers from '@/components/shared/NumberInputWithSteppers';
import type { ListingData, ImageData } from './ListingFormHelpers';
import { floatingInputClasses, floatingSelectLabelClasses, inputBaseClasses, labelClasses, selectClasses } from './ListingFormHelpers';

interface ListingFormFieldsProps {
    listingData: ListingData;
    setListingData: React.Dispatch<React.SetStateAction<ListingData>>;
    selectedCountry: string;
    selectedCity: string;
    availableCities: CityData[];
    handleCountryChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    handleCityChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    handlePriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleMapLocationChange: (lat: number, lng: number) => void;
    handleMapAddressChange: (address: string) => void;
    getZoomLevel: number;
    cityData: CityData | null;
}

const ListingFormFields: React.FC<ListingFormFieldsProps> = ({
    listingData,
    setListingData,
    selectedCountry,
    selectedCity,
    availableCities,
    handleCountryChange,
    handleCityChange,
    handleInputChange,
    handlePriceChange,
    handleMapLocationChange,
    handleMapAddressChange,
    getZoomLevel,
    cityData,
}) => {
    const { t } = useTranslation(['newListing', 'seller', 'common', 'validation']);

    const chevronIcon = (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
        </div>
    );

    return (
        <>
            <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-5 min-w-0">
                {/* Country Dropdown */}
                <div>
                    <label htmlFor="country" className={labelClasses}>{t('seller:createListing.location.country')}</label>
                    <div className="relative">
                        <select
                            id="country"
                            value={selectedCountry}
                            onChange={handleCountryChange}
                            className={selectClasses}
                            required
                        >
                            <option value="">{t('seller:createListing.location.selectCountry')}</option>
                            {BALKAN_LOCATIONS.map(country => (
                                <option key={country.code} value={country.name}>
                                    {country.name}
                                </option>
                            ))}
                        </select>
                        {chevronIcon}
                    </div>
                </div>

                {/* City Dropdown */}
                <div>
                    <label htmlFor="city" className={labelClasses}>{t('seller:createListing.location.city')}</label>
                    <div className="relative">
                        <select
                            id="city"
                            value={selectedCity}
                            onChange={handleCityChange}
                            className={selectClasses}
                            required
                            disabled={!selectedCountry}
                        >
                            <option value="">{t('seller:createListing.location.selectCity')}</option>
                            {availableCities.map(city => (
                                <option key={city.name} value={city.name}>
                                    {city.name}
                                </option>
                            ))}
                        </select>
                        {chevronIcon}
                    </div>
                </div>

                {/* Show interactive map when city is selected */}
                {selectedCity && listingData.lat !== 0 && listingData.lng !== 0 && (
                    <div className="md:col-span-2">
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

                {/* Listing Title */}
                <div className="md:col-span-2">
                    <label htmlFor="title" className={labelClasses}>{t('seller:createListing.fields.listingTitle')}</label>
                    <input type="text" id="title" name="title" value={listingData.title} onChange={handleInputChange} className={inputBaseClasses} placeholder={t('seller:createListing.fields.titleHint')} required maxLength={50} aria-describedby="titleHint" />
                    <div className="flex justify-between items-center mt-1">
                        <p id="titleHint" className="text-xs text-gray-400">
                            {t('seller:createListing.fields.titleHint')}
                        </p>
                        <span className={`text-xs ${listingData.title.length > 40 ? 'text-amber-600' : 'text-gray-300'}`}>
                            {listingData.title.length}/50
                        </span>
                    </div>
                </div>

                {/* Property ID (optional, for agency/agent internal tracking) */}
                <div className="md:col-span-2">
                    <label htmlFor="propertyId" className={labelClasses}>{t('seller:createListing.fields.propertyId')}</label>
                    <input type="text" id="propertyId" name="propertyId" value={listingData.propertyId} onChange={handleInputChange} className={inputBaseClasses} placeholder={t('seller:createListing.fields.propertyIdPlaceholder')} maxLength={50} aria-describedby="propertyIdHint" />
                    <p id="propertyIdHint" className="mt-1 text-xs text-gray-400">
                        {t('seller:createListing.fields.propertyIdHint')}
                    </p>
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                    <label htmlFor="streetAddress" className={labelClasses}>{t('seller:createListing.location.address')}</label>
                    <input type="text" id="streetAddress" name="streetAddress" value={listingData.streetAddress} onChange={handleInputChange} className={inputBaseClasses} placeholder={t('seller:createListing.location.addressHint')} aria-describedby="addressHint" />
                    <p id="addressHint" className="mt-1 text-xs text-gray-400">
                        {t('seller:createListing.location.addressHint')}
                        <br />
                        <span className="text-gray-300">{t('seller:createListing.location.addressExamples')}</span>
                    </p>
                </div>

                {/* Price */}
                <div className="md:col-span-2">
                    <label className={labelClasses}>{t('seller:createListing.fields.price')}</label>

                    {/* Pricing mode segmented control */}
                    <div className="flex gap-2 mb-3">
                        {(['fixed', 'negotiable', ...(listingData.listingType === 'sale' ? ['per_sqm'] : [])] as const).map((mode) => {
                            const labels: Record<string, string> = {
                                fixed: t('seller:createListing.fields.priceFixed', 'Fixed Price'),
                                negotiable: t('seller:form.negotiable', 'By Negotiation'),
                                per_sqm: t('seller:createListing.fields.pricePerSqm', 'Per m²'),
                            };
                            const isActive = listingData.priceType === mode;
                            return (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => {
                                        setListingData(prev => ({
                                            ...prev,
                                            priceType: mode,
                                            isNegotiable: mode === 'negotiable',
                                            ...(mode === 'negotiable' ? { price: 0, pricePerSqm: 0 } : {}),
                                            ...(mode === 'fixed' ? { pricePerSqm: 0 } : {}),
                                            ...(mode === 'per_sqm' ? { price: 0 } : {}),
                                        }));
                                    }}
                                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                                        isActive
                                            ? 'bg-primary text-white border-primary shadow-sm'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    {labels[mode]}
                                </button>
                            );
                        })}
                    </div>

                    {/* Fixed price input */}
                    {listingData.priceType === 'fixed' && (
                        <div className="relative">
                            <input type="text" id="price" inputMode="numeric" name="price" value={listingData.price > 0 ? new Intl.NumberFormat('de-DE').format(listingData.price) : ''} onChange={handlePriceChange} className={`${inputBaseClasses} pl-10`} placeholder="0" required />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{getCurrencySymbol(selectedCountry)}</span>
                        </div>
                    )}

                    {/* Negotiable info box */}
                    {listingData.priceType === 'negotiable' && (
                        <div className="flex items-center gap-2 h-12 px-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-medium text-sm">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {t('seller:createListing.fields.priceByNegotiation', 'Price will be shown as "By Negotiation"')}
                        </div>
                    )}

                    {/* Per m² input */}
                    {listingData.priceType === 'per_sqm' && (
                        <div>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="pricePerSqm"
                                    inputMode="numeric"
                                    value={listingData.pricePerSqm > 0 ? new Intl.NumberFormat('de-DE').format(listingData.pricePerSqm) : ''}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\./g, '').replace(/,/g, '.');
                                        const parsed = parseFloat(raw);
                                        setListingData(prev => ({ ...prev, pricePerSqm: isNaN(parsed) ? 0 : parsed }));
                                    }}
                                    className={`${inputBaseClasses} pl-10 pr-14`}
                                    placeholder="0"
                                    required
                                />
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{getCurrencySymbol(selectedCountry)}</span>
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">/m²</span>
                            </div>
                            {listingData.pricePerSqm > 0 && listingData.sq_meters > 0 && (
                                <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    {t('seller:createListing.fields.totalCalculated', 'Total')}: {getCurrencySymbol(selectedCountry)}{new Intl.NumberFormat('de-DE').format(Math.round(listingData.pricePerSqm * listingData.sq_meters))}
                                    <span className="text-emerald-500 font-normal">({t('seller:createListing.fields.fromArea', 'from')} {listingData.sq_meters} m²)</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </fieldset>

            {/* Property Type Selection */}
            <fieldset className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                <div className="relative">
                    <select name="propertyType" id="propertyType" value={listingData.propertyType} onChange={handleInputChange} className={`${floatingInputClasses} border-neutral-300`}>
                        <option value="house">{t('seller:propertyTypes.house')}</option>
                        <option value="apartment">{t('seller:propertyTypes.apartment')}</option>
                        <option value="villa">{t('seller:propertyTypes.villa')}</option>
                        <option value="land">{t('seller:propertyTypes.land')}</option>
                        <option value="other">{t('seller:propertyTypes.other')}</option>
                    </select>
                    <label htmlFor="propertyType" className={floatingSelectLabelClasses}>{t('seller:form.propertyType')}</label>
                </div>
                {listingData.propertyType === 'apartment' && (
                    <>
                        <NumberInputWithSteppers
                            label={t('seller:createListing.fields.totalFloors')}
                            value={listingData.totalFloors}
                            min={1}
                            onChange={(val) => setListingData(p => ({ ...p, totalFloors: val }))}
                        />
                        <NumberInputWithSteppers
                            label={t('seller:createListing.fields.floorNumber')}
                            value={listingData.floorNumber}
                            min={0}
                            max={listingData.totalFloors || 999}
                            onChange={(val) => setListingData(p => ({ ...p, floorNumber: val }))}
                        />
                        <div>
                            <label htmlFor="orientation" className={labelClasses}>{t('seller:createListing.advancedDetails.orientation.label')}</label>
                            <div className="relative">
                                <select
                                    id="orientation"
                                    name="orientation"
                                    value={listingData.orientation}
                                    onChange={handleInputChange}
                                    className={selectClasses}
                                >
                                    <option value="any">{t('seller:createListing.advancedDetails.orientation.notSpecified')}</option>
                                    <option value="north">{t('seller:createListing.advancedDetails.orientation.north')}</option>
                                    <option value="northEast">{t('seller:createListing.advancedDetails.orientation.northEast')}</option>
                                    <option value="east">{t('seller:createListing.advancedDetails.orientation.east')}</option>
                                    <option value="southEast">{t('seller:createListing.advancedDetails.orientation.southEast')}</option>
                                    <option value="south">{t('seller:createListing.advancedDetails.orientation.south')}</option>
                                    <option value="southWest">{t('seller:createListing.advancedDetails.orientation.southWest')}</option>
                                    <option value="west">{t('seller:createListing.advancedDetails.orientation.west')}</option>
                                    <option value="northWest">{t('seller:createListing.advancedDetails.orientation.northWest')}</option>
                                </select>
                                {chevronIcon}
                            </div>
                        </div>
                    </>
                )}
                {(listingData.propertyType === 'house' || listingData.propertyType === 'villa') && (
                    <div className="md:col-span-2 flex justify-center">
                        <div className="w-full max-w-xs">
                            <NumberInputWithSteppers label={t('seller:createListing.fields.totalFloors')} value={listingData.totalFloors} min={1} onChange={(val) => setListingData(p => ({ ...p, totalFloors: val }))} />
                        </div>
                    </div>
                )}
            </fieldset>

            {/* Property Details - hide some fields for land */}
            <fieldset className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 min-w-0">
                {listingData.propertyType !== 'land' && (
                    <>
                        <NumberInputWithSteppers label={t('seller:createListing.fields.bedrooms')} value={listingData.bedrooms} onChange={(val) => setListingData(p => ({ ...p, bedrooms: val }))} />
                        <NumberInputWithSteppers label={t('seller:createListing.fields.bathrooms')} value={listingData.bathrooms} onChange={(val) => setListingData(p => ({ ...p, bathrooms: val }))} />
                        <NumberInputWithSteppers label={t('seller:createListing.fields.livingRooms')} value={listingData.livingRooms} onChange={(val) => setListingData(p => ({ ...p, livingRooms: val }))} />
                    </>
                )}
                <NumberInputWithSteppers label={t('seller:createListing.fields.area')} value={listingData.sq_meters} step={5} onChange={(val) => setListingData(p => ({ ...p, sq_meters: val }))} />
                {listingData.propertyType !== 'land' && (
                    <NumberInputWithSteppers label={t('seller:createListing.fields.yearBuilt')} value={listingData.year_built} max={new Date().getFullYear()} onChange={(val) => setListingData(p => ({ ...p, year_built: val }))} />
                )}
                <NumberInputWithSteppers label={t('seller:createListing.fields.parkingSpots')} value={listingData.parking_spots} onChange={(val) => setListingData(p => ({ ...p, parking_spots: val }))} />
            </fieldset>
        </>
    );
};

export default ListingFormFields;
