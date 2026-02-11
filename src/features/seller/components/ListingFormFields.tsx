import React from 'react';
import { useTranslation } from 'react-i18next';
import { BALKAN_LOCATIONS, CityData } from '@/utils/balkanLocations';
import { getCurrencySymbol } from '@/utils/currency';
import MapLocationPicker from './MapLocationPicker';
import NumberInputWithSteppers from '@/components/shared/NumberInputWithSteppers';
import FloorInputCombined from '@/src/shared/components/ui/FloorInputCombined';
import { ListingData, ImageData, floatingInputClasses, floatingLabelClasses, floatingSelectLabelClasses, inputBaseClasses } from './ListingFormHelpers';

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

    return (
        <>
            <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Country Dropdown */}
                <div className="relative">
                    <select
                        id="country"
                        value={selectedCountry}
                        onChange={handleCountryChange}
                        className={`${floatingInputClasses}`}
                        required
                    >
                        <option value="">{t('seller:createListing.location.selectCountry')}</option>
                        {BALKAN_LOCATIONS.map(country => (
                            <option key={country.code} value={country.name}>
                                {country.name}
                            </option>
                        ))}
                    </select>
                    <label htmlFor="country" className={floatingSelectLabelClasses}>{t('seller:createListing.location.country')}</label>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                        </svg>
                    </div>
                </div>

                {/* City Dropdown */}
                <div className="relative">
                    <select
                        id="city"
                        value={selectedCity}
                        onChange={handleCityChange}
                        className={`${floatingInputClasses}`}
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
                    <label htmlFor="city" className={floatingSelectLabelClasses}>{t('seller:createListing.location.city')}</label>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                        </svg>
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

                <div className="relative md:col-span-2 cursor-text" onClick={() => document.getElementById('title')?.focus()}>
                    <input type="text" id="title" name="title" value={listingData.title} onChange={handleInputChange} className={`${floatingInputClasses}`} placeholder=" " required maxLength={50} aria-describedby="titleHint" />
                    <label htmlFor="title" className={floatingLabelClasses}>{t('seller:createListing.fields.listingTitle')}</label>
                    <div className="flex justify-between items-center mt-1">
                        <p id="titleHint" className="text-xs text-gray-400">
                            {t('seller:createListing.fields.titleHint')}
                        </p>
                        <span className={`text-xs ${listingData.title.length > 40 ? 'text-amber-600' : 'text-gray-300'}`}>
                            {listingData.title.length}/50
                        </span>
                    </div>
                </div>

                <div className="relative md:col-span-2 cursor-text" onClick={() => document.getElementById('streetAddress')?.focus()}>
                    <input type="text" id="streetAddress" name="streetAddress" value={listingData.streetAddress} onChange={handleInputChange} className={`${floatingInputClasses}`} placeholder=" " aria-describedby="addressHint" />
                    <label htmlFor="streetAddress" className={floatingLabelClasses}>{t('seller:createListing.location.address')}</label>
                    <p id="addressHint" className="mt-1 text-xs text-gray-400">
                        {t('seller:createListing.location.addressHint')}
                        <br />
                        <span className="text-gray-300">{t('seller:createListing.location.addressExamples')}</span>
                    </p>
                </div>

                <div className="relative md:col-span-2 cursor-text" onClick={() => document.getElementById('price')?.focus()}>
                    <input type="text" id="price" inputMode="numeric" name="price" value={listingData.price > 0 ? new Intl.NumberFormat('de-DE').format(listingData.price) : ''} onChange={handlePriceChange} className={`${floatingInputClasses} border-neutral-300 pl-8`} placeholder=" " required />
                    <label htmlFor="price" className={floatingLabelClasses}>{t('seller:createListing.fields.price')}</label>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{getCurrencySymbol(selectedCountry)}</span>
                </div>
            </fieldset>

            {/* Property Type Selection */}
            <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="relative">
                    <select name="propertyType" id="propertyType" value={listingData.propertyType} onChange={handleInputChange} className={`${floatingInputClasses}`}>
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
                        <FloorInputCombined
                            label={t('seller:createListing.fields.floorNumber')}
                            floorNumber={listingData.floorNumber}
                            totalFloors={listingData.totalFloors}
                            onFloorNumberChange={(val) => setListingData(p => ({ ...p, floorNumber: val }))}
                            onTotalFloorsChange={(val) => setListingData(p => ({ ...p, totalFloors: val }))}
                        />
                        <div className="relative">
                            <select
                                id="orientation"
                                name="orientation"
                                value={listingData.orientation}
                                onChange={handleInputChange}
                                className={`${floatingInputClasses}`}
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
                            <label htmlFor="orientation" className={floatingSelectLabelClasses}>{t('seller:createListing.advancedDetails.orientation.label')}</label>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    </>
                )}
                {(listingData.propertyType === 'house' || listingData.propertyType === 'villa') && (
                    <NumberInputWithSteppers label={t('seller:createListing.fields.totalFloors')} value={listingData.totalFloors} min={1} onChange={(val) => setListingData(p => ({ ...p, totalFloors: val }))} />
                )}
            </fieldset>

            {/* Property Details - hide some fields for land */}
            <fieldset className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
