import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ListingData, TagListInput, TriStateCheckbox, labelClasses, selectClasses } from './ListingFormHelpers';

interface ListingPropertyFeaturesProps {
    listingData: ListingData;
    setListingData: React.Dispatch<React.SetStateAction<ListingData>>;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const chevronIcon = (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
    </div>
);

const ListingPropertyFeatures: React.FC<ListingPropertyFeaturesProps> = memo(({
    listingData,
    setListingData,
    handleInputChange,
}) => {
    const { t } = useTranslation(['newListing', 'seller', 'common']);

    // Quick-pick amenities. The `tag` strings are exactly what the villa/rental
    // filters match on (e.g. 'sauna', 'wine cellar', 'panoramic view'), so a
    // one-tap choice here makes the listing discoverable by those filters —
    // no need for the seller to type the precise wording.
    const QUICK_AMENITIES: { tag: string; labelKey: string; fallback: string; emoji: string }[] = [
        { tag: 'sauna',          labelKey: 'seller:createListing.quickAmenities.sauna',       fallback: 'Sauna',        emoji: '🧖' },
        { tag: 'wine cellar',    labelKey: 'seller:createListing.quickAmenities.wineCellar',  fallback: 'Wine Cellar',  emoji: '🍷' },
        { tag: 'panoramic view', labelKey: 'seller:createListing.quickAmenities.panoramic',   fallback: 'Panoramic',    emoji: '🏔️' },
        { tag: 'jacuzzi',        labelKey: 'seller:createListing.quickAmenities.jacuzzi',     fallback: 'Jacuzzi',      emoji: '🛁' },
        { tag: 'hot tub',        labelKey: 'seller:createListing.quickAmenities.hotTub',      fallback: 'Hot Tub',      emoji: '♨️' },
        { tag: 'gym',            labelKey: 'seller:createListing.quickAmenities.gym',         fallback: 'Gym',          emoji: '🏋️' },
        { tag: 'fireplace',      labelKey: 'seller:createListing.quickAmenities.fireplace',   fallback: 'Fireplace',    emoji: '🔥' },
        { tag: 'bbq',            labelKey: 'seller:createListing.quickAmenities.bbq',         fallback: 'BBQ',          emoji: '🍖' },
        { tag: 'home cinema',    labelKey: 'seller:createListing.quickAmenities.homeCinema',  fallback: 'Home Cinema',  emoji: '🎬' },
        { tag: 'beach access',   labelKey: 'seller:createListing.quickAmenities.beachAccess', fallback: 'Beach Access', emoji: '🏖️' },
    ];

    const amenityActive = (tag: string): boolean =>
        (listingData.amenities || []).some(a => a.trim().toLowerCase() === tag);

    const toggleAmenity = (tag: string) => {
        setListingData(p => {
            const current = p.amenities || [];
            const has = current.some(a => a.trim().toLowerCase() === tag);
            const next = has
                ? current.filter(a => a.trim().toLowerCase() !== tag)
                : [...current, tag];
            return { ...p, amenities: next };
        });
    };

    return (
        <>
            {/* Special Features, Materials & Amenities */}
            <fieldset><TagListInput label={t('seller:createListing.fields.specialFeatures')} tags={listingData.specialFeatures} setTags={(tags) => setListingData(p => ({ ...p, specialFeatures: tags }))} /></fieldset>
            <fieldset><TagListInput label={t('seller:createListing.fields.materials')} tags={listingData.materials} setTags={(tags) => setListingData(p => ({ ...p, materials: tags }))} /></fieldset>
            <fieldset>
                <TagListInput
                    label={t('seller:createListing.fields.amenities')}
                    tags={listingData.amenities}
                    setTags={(tags) => setListingData(p => ({ ...p, amenities: tags }))}
                />
                <p className="text-xs text-gray-400 mt-1">{t('seller:createListing.fields.amenitiesHint')}</p>

                {/* Quick-pick premium amenities — one tap adds the matching tag */}
                <p className="text-xs font-medium text-gray-500 mt-3 mb-1.5">{t('seller:createListing.quickAmenities.label', 'Popular amenities')}</p>
                <div className="flex flex-wrap gap-2">
                    {QUICK_AMENITIES.map(({ tag, labelKey, fallback, emoji }) => {
                        const active = amenityActive(tag);
                        return (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleAmenity(tag)}
                                aria-pressed={active}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all ${
                                    active
                                        ? 'bg-primary/10 text-primary border-primary/40'
                                        : 'bg-black/[0.03] text-gray-600 border-black/[0.07] hover:border-primary/30'
                                }`}
                            >
                                <span aria-hidden="true">{emoji}</span>
                                {t(labelKey, fallback)}
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            {/* Mandatory Amenities Section - show different options for land */}
            <fieldset className="space-y-4 glass-fieldset">
                <h3 className="text-base font-semibold text-gray-700 mb-3">
                    {listingData.propertyType === 'land' ? t('seller:createListing.propertyFeatures.landFeatures', 'Land Features') : t('seller:createListing.propertyFeatures.title')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listingData.propertyType !== 'land' && (
                        <TriStateCheckbox
                            label={t('seller:createListing.propertyFeatures.balconyTerrace')}
                            value={listingData.hasBalcony}
                            onChange={(val) => setListingData(p => ({ ...p, hasBalcony: val }))}
                        />
                    )}
                    <TriStateCheckbox
                        label={listingData.propertyType === 'land' ? t('seller:createListing.propertyFeatures.hasVegetation', 'Has Vegetation/Trees') : t('seller:createListing.propertyFeatures.gardenYard')}
                        value={listingData.hasGarden}
                        onChange={(val) => setListingData(p => ({ ...p, hasGarden: val }))}
                    />
                    {listingData.propertyType !== 'land' && (
                        <TriStateCheckbox
                            label={t('seller:createListing.propertyFeatures.elevator')}
                            value={listingData.hasElevator}
                            onChange={(val) => setListingData(p => ({ ...p, hasElevator: val }))}
                        />
                    )}
                    <TriStateCheckbox
                        label={listingData.propertyType === 'land' ? t('seller:createListing.propertyFeatures.fencedSecured', 'Fenced/Secured') : t('seller:createListing.propertyFeatures.securitySystem')}
                        value={listingData.hasSecurity}
                        onChange={(val) => setListingData(p => ({ ...p, hasSecurity: val }))}
                    />
                    {listingData.propertyType !== 'land' && (
                        <TriStateCheckbox
                            label={t('seller:createListing.propertyFeatures.airConditioning')}
                            value={listingData.hasAirConditioning}
                            onChange={(val) => setListingData(p => ({ ...p, hasAirConditioning: val }))}
                        />
                    )}
                    <TriStateCheckbox
                        label={listingData.propertyType === 'land' ? t('seller:createListing.propertyFeatures.hasWaterSource', 'Has Water Source') : t('seller:createListing.propertyFeatures.swimmingPool')}
                        value={listingData.hasPool}
                        onChange={(val) => setListingData(p => ({ ...p, hasPool: val }))}
                    />
                    {listingData.propertyType !== 'land' && (
                        <TriStateCheckbox
                            label={t('seller:createListing.propertyFeatures.petsAllowed')}
                            value={listingData.petsAllowed}
                            onChange={(val) => setListingData(p => ({ ...p, petsAllowed: val }))}
                        />
                    )}
                </div>
                <p className="text-xs text-gray-400 mt-2">{t('seller:createListing.propertyFeatures.hint')}</p>
            </fieldset>

            {/* Advanced Property Details Section - hide for land */}
            {listingData.propertyType !== 'land' ? (
                <fieldset className="space-y-4 glass-fieldset">
                    <h3 className="text-base font-semibold text-gray-700 mb-3">{t('seller:createListing.advancedDetails.title')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Furnishing Status */}
                        <div>
                            <label htmlFor="furnishing" className={labelClasses}>{t('seller:createListing.advancedDetails.furnishing.label')}</label>
                            <div className="relative">
                                <select id="furnishing" name="furnishing" value={listingData.furnishing} onChange={handleInputChange} className={selectClasses}>
                                    <option value="any">{t('seller:createListing.advancedDetails.furnishing.notSpecified')}</option>
                                    <option value="furnished">{t('seller:createListing.advancedDetails.furnishing.furnished')}</option>
                                    <option value="semi-furnished">{t('seller:createListing.advancedDetails.furnishing.semiFurnished')}</option>
                                    <option value="unfurnished">{t('seller:createListing.advancedDetails.furnishing.unfurnished')}</option>
                                </select>
                                {chevronIcon}
                            </div>
                        </div>

                        {/* Heating Type */}
                        <div>
                            <label htmlFor="heatingType" className={labelClasses}>{t('seller:createListing.advancedDetails.heatingType.label')}</label>
                            <div className="relative">
                                <select id="heatingType" name="heatingType" value={listingData.heatingType} onChange={handleInputChange} className={selectClasses}>
                                    <option value="any">{t('seller:createListing.advancedDetails.heatingType.notSpecified')}</option>
                                    <option value="central">{t('seller:createListing.advancedDetails.heatingType.central')}</option>
                                    <option value="electric">{t('seller:createListing.advancedDetails.heatingType.electric')}</option>
                                    <option value="gas">{t('seller:createListing.advancedDetails.heatingType.gas')}</option>
                                    <option value="oil">{t('seller:createListing.advancedDetails.heatingType.oil')}</option>
                                    <option value="heat-pump">{t('seller:createListing.advancedDetails.heatingType.heatPump')}</option>
                                    <option value="solar">{t('seller:createListing.advancedDetails.heatingType.solar')}</option>
                                    <option value="wood">{t('seller:createListing.advancedDetails.heatingType.wood')}</option>
                                    <option value="none">{t('seller:createListing.advancedDetails.heatingType.none')}</option>
                                </select>
                                {chevronIcon}
                            </div>
                        </div>

                        {/* Property Condition */}
                        <div>
                            <label htmlFor="condition" className={labelClasses}>{t('seller:createListing.advancedDetails.condition.label')}</label>
                            <div className="relative">
                                <select id="condition" name="condition" value={listingData.condition} onChange={handleInputChange} className={selectClasses}>
                                    <option value="any">{t('seller:createListing.advancedDetails.condition.notSpecified')}</option>
                                    <option value="new">{t('seller:createListing.advancedDetails.condition.new')}</option>
                                    <option value="excellent">{t('seller:createListing.advancedDetails.condition.excellent')}</option>
                                    <option value="good">{t('seller:createListing.advancedDetails.condition.good')}</option>
                                    <option value="fair">{t('seller:createListing.advancedDetails.condition.fair')}</option>
                                    <option value="needs-renovation">{t('seller:createListing.advancedDetails.condition.needsRenovation')}</option>
                                </select>
                                {chevronIcon}
                            </div>
                        </div>

                        {/* View Type */}
                        <div>
                            <label htmlFor="viewType" className={labelClasses}>{t('seller:createListing.advancedDetails.viewType.label')}</label>
                            <div className="relative">
                                <select id="viewType" name="viewType" value={listingData.viewType} onChange={handleInputChange} className={selectClasses}>
                                    <option value="any">{t('seller:createListing.advancedDetails.viewType.notSpecified')}</option>
                                    <option value="sea">{t('seller:createListing.advancedDetails.viewType.sea')}</option>
                                    <option value="mountain">{t('seller:createListing.advancedDetails.viewType.mountain')}</option>
                                    <option value="city">{t('seller:createListing.advancedDetails.viewType.city')}</option>
                                    <option value="park">{t('seller:createListing.advancedDetails.viewType.park')}</option>
                                    <option value="garden">{t('seller:createListing.advancedDetails.viewType.garden')}</option>
                                    <option value="street">{t('seller:createListing.advancedDetails.viewType.street')}</option>
                                </select>
                                {chevronIcon}
                            </div>
                        </div>

                        {/* Energy Rating */}
                        <div>
                            <label htmlFor="energyRating" className={labelClasses}>{t('seller:createListing.advancedDetails.energyRating.label')}</label>
                            <div className="relative">
                                <select id="energyRating" name="energyRating" value={listingData.energyRating} onChange={handleInputChange} className={selectClasses}>
                                    <option value="any">{t('seller:createListing.advancedDetails.energyRating.notSpecified')}</option>
                                    <option value="A+">{t('seller:createListing.advancedDetails.energyRating.aPlus')}</option>
                                    <option value="A">{t('seller:createListing.advancedDetails.energyRating.a')}</option>
                                    <option value="B">{t('seller:createListing.advancedDetails.energyRating.b')}</option>
                                    <option value="C">{t('seller:createListing.advancedDetails.energyRating.c')}</option>
                                    <option value="D">{t('seller:createListing.advancedDetails.energyRating.d')}</option>
                                    <option value="E">{t('seller:createListing.advancedDetails.energyRating.e')}</option>
                                    <option value="F">{t('seller:createListing.advancedDetails.energyRating.f')}</option>
                                    <option value="G">{t('seller:createListing.advancedDetails.energyRating.g')}</option>
                                </select>
                                {chevronIcon}
                            </div>
                        </div>

                        {/* Orientation / Facing Direction */}
                        <div>
                            <label htmlFor="orientation" className={labelClasses}>{t('seller:createListing.advancedDetails.orientation.label')}</label>
                            <div className="relative">
                                <select id="orientation" name="orientation" value={listingData.orientation} onChange={handleInputChange} className={selectClasses}>
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
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{t('seller:createListing.advancedDetails.hint')}</p>
                </fieldset>
            ) : (
                <fieldset className="space-y-4 glass-fieldset">
                    <h3 className="text-base font-semibold text-gray-700 mb-3">{t('seller:createListing.landDetails.title')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Land Condition */}
                        <div>
                            <label htmlFor="condition" className={labelClasses}>{t('seller:createListing.landDetails.condition.label')}</label>
                            <div className="relative">
                                <select id="condition" name="condition" value={listingData.condition} onChange={handleInputChange} className={selectClasses}>
                                    <option value="any">{t('seller:createListing.landDetails.condition.notSpecified')}</option>
                                    <option value="excellent">{t('seller:createListing.landDetails.condition.readyToBuild')}</option>
                                    <option value="good">{t('seller:createListing.landDetails.condition.cleared')}</option>
                                    <option value="fair">{t('seller:createListing.landDetails.condition.partiallyCleared')}</option>
                                    <option value="needs-renovation">{t('seller:createListing.landDetails.condition.needsClearing')}</option>
                                </select>
                                {chevronIcon}
                            </div>
                        </div>

                        {/* View Type */}
                        <div>
                            <label htmlFor="viewType" className={labelClasses}>{t('seller:createListing.landDetails.viewAccess.label')}</label>
                            <div className="relative">
                                <select id="viewType" name="viewType" value={listingData.viewType} onChange={handleInputChange} className={selectClasses}>
                                    <option value="any">{t('seller:createListing.landDetails.viewAccess.notSpecified')}</option>
                                    <option value="sea">{t('seller:createListing.landDetails.viewAccess.seaView')}</option>
                                    <option value="mountain">{t('seller:createListing.landDetails.viewAccess.mountainView')}</option>
                                    <option value="city">{t('seller:createListing.landDetails.viewAccess.cityView')}</option>
                                    <option value="park">{t('seller:createListing.landDetails.viewAccess.parkView')}</option>
                                    <option value="garden">{t('seller:createListing.landDetails.viewAccess.natureView')}</option>
                                    <option value="street">{t('seller:createListing.landDetails.viewAccess.roadAccess')}</option>
                                </select>
                                {chevronIcon}
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{t('seller:createListing.landDetails.hint')}</p>
                </fieldset>
            )}
        </>
    );
}, (prev, next) => {
    // Only compare fields this component actually renders; skip description, price, image_tags, etc.
    const d0 = prev.listingData;
    const d1 = next.listingData;
    return (
        d0.specialFeatures === d1.specialFeatures &&
        d0.materials === d1.materials &&
        d0.amenities === d1.amenities &&
        d0.propertyType === d1.propertyType &&
        d0.hasBalcony === d1.hasBalcony &&
        d0.hasGarden === d1.hasGarden &&
        d0.hasElevator === d1.hasElevator &&
        d0.hasSecurity === d1.hasSecurity &&
        d0.hasAirConditioning === d1.hasAirConditioning &&
        d0.hasPool === d1.hasPool &&
        d0.petsAllowed === d1.petsAllowed &&
        d0.furnishing === d1.furnishing &&
        d0.heatingType === d1.heatingType &&
        d0.condition === d1.condition &&
        d0.viewType === d1.viewType &&
        d0.energyRating === d1.energyRating &&
        d0.orientation === d1.orientation &&
        prev.setListingData === next.setListingData &&
        prev.handleInputChange === next.handleInputChange
    );
});

export default ListingPropertyFeatures;
