import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Filters,
    FurnishingStatus,
    HeatingType,
    PropertyCondition,
    ViewType,
    EnergyRating,
    SellerType,
} from '@/types';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import { getCurrencySymbol } from '@/utils/currency';
import type { VillaListingMode } from '../hooks/useVillaSearch';

/**
 * The complete filter set, in Zillow's vocabulary and section order.
 *
 * This is the same filter *system* the buy page runs — every control here
 * writes the same `Filters` field that `filterProperties` already reads, so
 * nothing needed to be taught to the villa query. What differs is density:
 * the buy page gives filters a 50vh panel, which on the villa page would push
 * the cards off screen. Everything here is one step smaller (11px labels,
 * 28px controls, two columns from `sm` up) and the panel that hosts it is
 * collapsed by default, so the collection stays visible.
 *
 * Section names follow Zillow rather than the buy page's own: "Home Type",
 * "Listing Status", "Beds & Baths", "Days on Market", "Must Haves", "Keywords".
 */

interface VillaAllFiltersProps {
    filters: Filters;
    onFilterChange: (key: keyof Filters, value: any) => void;
    /** Zillow's "Listing Status" — omit to hide that section. */
    listingMode?: VillaListingMode;
    onListingModeChange?: (mode: VillaListingMode) => void;
    /** Desktop panel sizing. `false` gives the roomier touch layout. */
    dense?: boolean;
}

const VIEW_CHIPS: { value: ViewType; labelKey: string; fallback: string; emoji: string }[] = [
    { value: 'sea', labelKey: 'villas:filters.sea', fallback: 'Waterfront', emoji: '🌊' },
    { value: 'mountain', labelKey: 'villas:filters.mountain', fallback: 'Mountain', emoji: '⛰️' },
    { value: 'park', labelKey: 'villas:filters.lakeForest', fallback: 'Lake / Forest', emoji: '🌲' },
    { value: 'city', labelKey: 'villas:filters.cityView', fallback: 'City View', emoji: '🏙️' },
    { value: 'garden', labelKey: 'villas:filters.gardenView', fallback: 'Garden View', emoji: '🌷' },
    { value: 'street', labelKey: 'villas:filters.streetView', fallback: 'Street View', emoji: '🏘️' },
];

/** Zillow's "Must have …" checkboxes, as two-state chips (off = any). */
const MUST_HAVE_CHIPS: { key: keyof Filters; labelKey: string; fallback: string; emoji: string }[] = [
    { key: 'hasPool', labelKey: 'villas:filters.pool', fallback: 'Pool', emoji: '🏊' },
    { key: 'hasGarden', labelKey: 'villas:filters.garden', fallback: 'Garden', emoji: '🌿' },
    { key: 'hasBalcony', labelKey: 'search:amenities.balcony', fallback: 'Balcony', emoji: '🪟' },
    { key: 'hasAirConditioning', labelKey: 'search:amenities.airConditioning', fallback: 'Air Conditioning', emoji: '❄️' },
    { key: 'hasElevator', labelKey: 'search:amenities.elevator', fallback: 'Elevator', emoji: '🛗' },
    { key: 'hasSecurity', labelKey: 'search:amenities.security', fallback: 'Security', emoji: '🛡️' },
    { key: 'petsAllowed', labelKey: 'search:amenities.petsAllowed', fallback: 'Pets Allowed', emoji: '🐾' },
    { key: 'has360Tour', labelKey: 'villas:filters.tour3d', fallback: '3D Tour', emoji: '🎥' },
];

/** Premium tags matched against a listing's free-text amenities. */
const AMENITY_TAG_CHIPS: { tag: string; labelKey: string; fallback: string; emoji: string }[] = [
    { tag: 'sauna', labelKey: 'villas:filters.sauna', fallback: 'Sauna', emoji: '🧖' },
    { tag: 'wine cellar', labelKey: 'villas:filters.wineCellar', fallback: 'Wine Cellar', emoji: '🍷' },
    { tag: 'panoramic', labelKey: 'villas:filters.panoramic', fallback: 'Panoramic', emoji: '🏔️' },
    { tag: 'gym', labelKey: 'villas:filters.gym', fallback: 'Gym', emoji: '🏋️' },
    { tag: 'jacuzzi', labelKey: 'villas:filters.jacuzzi', fallback: 'Jacuzzi', emoji: '🛀' },
    { tag: 'helipad', labelKey: 'villas:filters.helipad', fallback: 'Helipad', emoji: '🚁' },
];

const VillaAllFilters: React.FC<VillaAllFiltersProps> = ({
    filters,
    onFilterChange,
    listingMode,
    onListingModeChange,
    dense = false,
}) => {
    const { t } = useTranslation(['villas', 'search', 'common', 'rental']);
    const currencySymbol = getCurrencySymbol(filters.country !== 'any' ? filters.country : '');

    /* ── Shared class strings, sized by `dense` ── */
    const label = `block font-semibold text-gray-500 uppercase tracking-wide ${dense ? 'text-[10px] mb-1' : 'text-[11px] mb-1.5'}`;
    const control = `block w-full bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-[var(--color-villa-gold)] focus:ring-1 focus:ring-[var(--color-villa-gold)]/30 transition-all ${
        dense ? 'text-[11px] px-2 py-1.5' : 'text-sm px-3 py-2.5 rounded-xl'
    }`;
    const sectionGap = dense ? 'space-y-2.5' : 'space-y-4';
    const chipBase = `inline-flex items-center gap-1 rounded-full font-medium border transition-all cursor-pointer whitespace-nowrap select-none ${
        dense ? 'px-2 py-[3px] text-[10px]' : 'px-3 py-1.5 text-xs min-h-[36px]'
    }`;
    const chipOn = 'bg-[var(--color-villa-gold)]/15 text-[var(--color-villa-gold-ink)] border-[var(--color-villa-gold)] font-semibold';
    const chipOff = 'bg-white text-gray-500 border-gray-200 hover:border-[var(--color-villa-gold)]/60 hover:text-[var(--color-villa-gold-ink)]';

    const pill = (active: boolean) =>
        `flex-1 rounded-lg font-semibold border transition-all ${dense ? 'text-[10px] py-1' : 'text-xs py-2 min-h-[36px]'} ${
            active
                ? 'bg-[var(--color-villa-gold-bright)]/15 text-[var(--color-primary)] border-[var(--color-villa-gold-bright)]'
                : 'bg-white text-gray-500 border-gray-200 hover:border-[var(--color-villa-gold-bright)]/60 hover:text-[var(--color-primary)]'
        }`;

    /* ── Helpers ── */
    const anyLabel = t('common:any', 'Any');

    /* Section labels are named once: each is both the visible <label> and the
       accessible name of the two inputs inside its range. */
    const priceLabel = listingMode === 'rent'
        ? t('villas:filters.pricePerNight', 'Price / Night')
        : t('search:filters.priceRange', 'Price');
    const areaLabel = t('search:filters.areaRange', 'Area (m²)');
    const pricePerSqmLabel = t('search:filters.pricePerSqm', 'Price per m²');
    const yearBuiltLabel = t('search:filters.yearBuilt', 'Year Built');
    const floorLabel = t('search:filters.floorNumber', 'Floor');

    /**
     * `allowNegative` is for the floor range only. Everything else here is a
     * count, an area or a price, where a negative is meaningless — but a floor
     * below ground is a real floor, and `filterProperties` matches it, so the
     * panel has to be able to express it.
     */
    const parseNum = (raw: string, allowNegative = false): number | null => {
        if (raw.trim() === '') return null;
        const n = Number(raw.replace(allowNegative ? /[^\d.-]/g : /[^\d.]/g, ''));
        if (!Number.isFinite(n)) return null;
        if (!allowNegative && n < 0) return null;
        return n;
    };

    const priceInvalid = filters.minPrice != null && filters.maxPrice != null && filters.minPrice > filters.maxPrice;
    const areaInvalid = filters.minSqft != null && filters.maxSqft != null && filters.minSqft > filters.maxSqft;

    const activeAmenities: string[] = (filters.amenities as string[]) || [];
    const toggleAmenity = (tag: string) => {
        const next = activeAmenities.includes(tag)
            ? activeAmenities.filter(a => a !== tag)
            : [...activeAmenities, tag];
        onFilterChange('amenities', next);
    };

    /*
     * These two are plain render helpers, deliberately not components.
     * Declared as components inside this function body they would be a fresh
     * type on every render, so React would unmount and remount the subtree on
     * each keystroke — and the number input being typed into would lose focus
     * after every character.
     */

    /** Any/N+ pill row — the shape Zillow uses for Beds, Baths and Parking. */
    const pillRow = (
        values: (number | null)[],
        selected: number | null,
        onSelect: (v: number | null) => void,
    ) => (
        <div className="flex gap-1">
            {values.map(n => (
                <button
                    key={n ?? 'any'}
                    type="button"
                    onClick={() => onSelect(n)}
                    className={pill((selected ?? null) === n)}
                    aria-pressed={(selected ?? null) === n}
                >
                    {n === null ? anyLabel : `${n}+`}
                </button>
            ))}
        </div>
    );

    /**
     * Two numeric boxes with a dash, for every min/max range below.
     *
     * `section` is the range's own label. There are eight of these ranges in
     * the panel, so labelling the inputs "Min"/"Max" alone would leave a screen
     * reader reciting sixteen fields with eight distinct names between them;
     * the accessible name has to carry which range it belongs to.
     */
    const rangeRow = ({
        section,
        minKey,
        maxKey,
        prefix,
        unit,
        invalid,
        allowNegative,
    }: {
        section: string;
        minKey: keyof Filters;
        maxKey: keyof Filters;
        prefix?: string;
        unit?: string;
        invalid?: boolean;
        allowNegative?: boolean;
    }) => {
        const ring = invalid ? ' !border-red-300 ring-1 ring-red-300/60' : '';
        const box = (key: keyof Filters, bound: string) => (
            <div className="relative flex-1 min-w-0">
                {prefix && (
                    <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${dense ? 'text-[10px]' : 'text-xs'}`}>
                        {prefix}
                    </span>
                )}
                <input
                    type="number"
                    inputMode="numeric"
                    min={allowNegative ? undefined : 0}
                    placeholder={bound}
                    value={(filters[key] as number | null) ?? ''}
                    onChange={(e) => onFilterChange(key, parseNum(e.target.value, allowNegative))}
                    aria-invalid={!!invalid}
                    aria-label={`${bound} — ${section}`}
                    className={`${control}${ring} ${prefix ? (dense ? 'pl-5' : 'pl-6') : ''} ${unit ? (dense ? 'pr-7' : 'pr-9') : ''}`}
                />
                {unit && (
                    <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${dense ? 'text-[10px]' : 'text-xs'}`}>
                        {unit}
                    </span>
                )}
            </div>
        );
        return (
            <div className="flex items-center gap-1.5">
                {box(minKey, t('search:filters.min', 'Min'))}
                <span className="text-gray-300 flex-shrink-0" aria-hidden="true">–</span>
                {box(maxKey, t('search:filters.max', 'Max'))}
            </div>
        );
    };

    return (
        <div className={`${sectionGap} ${dense ? 'px-3 py-3' : 'p-4 pb-6'}`}>

            {/* ── Listing Status (Zillow: "Listing Status") ── */}
            {listingMode && onListingModeChange && (
                <div>
                    <label className={label}>{t('villas:filters.listingStatus', 'Listing Status')}</label>
                    <div className="flex gap-1">
                        {([
                            { value: 'any' as const, text: t('villas:filters.allListings', 'All') },
                            { value: 'sale' as const, text: t('villas:filters.forSale', 'For Sale') },
                            { value: 'rent' as const, text: t('villas:filters.forRent', 'For Rent') },
                        ]).map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => onListingModeChange(opt.value)}
                                className={pill(listingMode === opt.value)}
                                aria-pressed={listingMode === opt.value}
                            >
                                {opt.text}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Home Type (Zillow: "Home Type") — this page is the luxury-villa
                   collection, so the type is fixed; shown for orientation. ── */}
            <div>
                <label className={label}>{t('villas:filters.homeType', 'Home Type')}</label>
                <span className={`${chipBase} ${chipOn} cursor-default`}>
                    🏛️ {t('villas:card.defaultTitle', 'Luxury Villa')}
                </span>
            </div>

            <div className={`grid grid-cols-1 ${dense ? 'sm:grid-cols-2 gap-x-3 gap-y-2.5' : 'sm:grid-cols-2 gap-3'}`}>

                {/* ── Location ── */}
                <div>
                    <label className={label}>{t('villas:filters.country', 'Country')}</label>
                    <select
                        value={filters.country}
                        onChange={(e) => onFilterChange('country', e.target.value)}
                        className={control}
                        aria-label={t('villas:filters.country', 'Country')}
                    >
                        <option value="any">{t('villas:filters.allCountries', 'All Countries')}</option>
                        {BALKAN_LOCATIONS.map(c => (
                            <option key={c.code} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* ── Price ── */}
                <div>
                    <label className={label}>{priceLabel}</label>
                    {rangeRow({ section: priceLabel, minKey: 'minPrice', maxKey: 'maxPrice', prefix: currencySymbol, invalid: priceInvalid })}
                    {priceInvalid && (
                        <p className="mt-1 text-[10px] text-red-500" role="alert">
                            {t('villas:filters.priceRangeInvalid', 'Minimum price is higher than the maximum.')}
                        </p>
                    )}
                </div>

                {/* ── Beds & Baths (Zillow: "Beds & Baths") ── */}
                <div>
                    <label className={label}>{t('villas:filters.beds', 'Bedrooms')}</label>
                    {pillRow([null, 2, 3, 4, 5], filters.beds, (v) => onFilterChange('beds', v))}
                </div>
                <div>
                    <label className={label}>{t('villas:filters.bathrooms', 'Bathrooms')}</label>
                    {pillRow([null, 1, 2, 3, 4], filters.baths, (v) => onFilterChange('baths', v))}
                </div>

                <div>
                    <label className={label}>{t('search:filters.livingRooms', 'Living Rooms')}</label>
                    {pillRow([null, 1, 2, 3], filters.livingRooms, (v) => onFilterChange('livingRooms', v))}
                </div>

                {/* ── Parking (Zillow: "Parking Spots") ── */}
                <div>
                    <label className={label}>{t('search:filters.parkingSpaces', 'Parking Spots')}</label>
                    {pillRow([null, 1, 2, 3], filters.minParking, (v) => onFilterChange('minParking', v))}
                </div>

                {/* ── Square Feet → m² (Zillow: "Square Feet") ── */}
                <div>
                    <label className={label}>{areaLabel}</label>
                    {rangeRow({ section: areaLabel, minKey: 'minSqft', maxKey: 'maxSqft', unit: 'm²', invalid: areaInvalid })}
                    {areaInvalid && (
                        <p className="mt-1 text-[10px] text-red-500" role="alert">
                            {t('villas:filters.areaRangeInvalid', 'Minimum area is larger than the maximum.')}
                        </p>
                    )}
                </div>

                {/* ── Price/m² (Zillow: "Price/sqft") ── */}
                <div>
                    <label className={label}>{pricePerSqmLabel}</label>
                    {rangeRow({ section: pricePerSqmLabel, minKey: 'minPricePerSqm', maxKey: 'maxPricePerSqm', unit: '€/m²' })}
                </div>

                {/* ── Year Built ── */}
                <div>
                    <label className={label}>{yearBuiltLabel}</label>
                    {rangeRow({ section: yearBuiltLabel, minKey: 'minYearBuilt', maxKey: 'maxYearBuilt' })}
                </div>

                {/* ── Floor ── */}
                <div>
                    <label className={label}>{floorLabel}</label>
                    {rangeRow({ section: floorLabel, minKey: 'minFloorNumber', maxKey: 'maxFloorNumber', allowNegative: true })}
                </div>

                {/* ── Days on Market (Zillow: "Days on Zillow") ── */}
                <div>
                    <label className={label}>{t('search:filters.daysOnMarket', 'Days on Market')}</label>
                    <select
                        value={filters.maxDaysListed ?? ''}
                        onChange={(e) => onFilterChange('maxDaysListed', e.target.value ? parseInt(e.target.value, 10) : null)}
                        className={control}
                        aria-label={t('search:filters.daysOnMarket', 'Days on Market')}
                    >
                        <option value="">{anyLabel}</option>
                        <option value="1">{t('search:filters.last24h', 'Last 24 hours')}</option>
                        <option value="3">{t('search:filters.last3Days', 'Last 3 days')}</option>
                        <option value="7">{t('search:filters.last7Days', 'Last 7 days')}</option>
                        <option value="30">{t('search:filters.last30Days', 'Last 30 days')}</option>
                    </select>
                </div>

                {/* ── Listed By (Zillow: "Listing Type" — by agent / by owner) ── */}
                <div>
                    <label className={label}>{t('villas:filters.listedBy', 'Listed By')}</label>
                    <div className="flex gap-1">
                        {([
                            { value: 'any' as SellerType, text: anyLabel },
                            { value: 'agent' as SellerType, text: t('search:listingTypes.agent', 'Agent') },
                            { value: 'private' as SellerType, text: t('search:listingTypes.private', 'Owner') },
                        ]).map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => onFilterChange('sellerType', opt.value)}
                                className={pill(filters.sellerType === opt.value)}
                                aria-pressed={filters.sellerType === opt.value}
                            >
                                {opt.text}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Condition (Zillow: "New construction" and friends) ── */}
                <div>
                    <label className={label}>{t('search:filters.condition', 'Condition')}</label>
                    <select
                        value={filters.condition}
                        onChange={(e) => onFilterChange('condition', e.target.value as PropertyCondition)}
                        className={control}
                        aria-label={t('search:filters.condition', 'Condition')}
                    >
                        <option value="any">{anyLabel}</option>
                        <option value="new">{t('search:conditionOptions.new', 'New construction')}</option>
                        <option value="excellent">{t('search:conditionOptions.excellent', 'Excellent')}</option>
                        <option value="good">{t('search:conditionOptions.good', 'Good')}</option>
                        <option value="fair">{t('search:conditionOptions.fair', 'Fair')}</option>
                        <option value="needs-renovation">{t('search:conditionOptions.needs-renovation', 'Needs renovation')}</option>
                    </select>
                </div>

                {/* ── Furnishing ── */}
                <div>
                    <label className={label}>{t('villas:filters.furnishing', 'Furnishing')}</label>
                    <select
                        value={filters.furnishing}
                        onChange={(e) => onFilterChange('furnishing', e.target.value as FurnishingStatus)}
                        className={control}
                        aria-label={t('villas:filters.furnishing', 'Furnishing')}
                    >
                        <option value="any">{anyLabel}</option>
                        <option value="furnished">{t('rental:furnishing.furnished', 'Furnished')}</option>
                        <option value="semi-furnished">{t('rental:furnishing.semi-furnished', 'Semi-furnished')}</option>
                        <option value="unfurnished">{t('rental:furnishing.unfurnished', 'Unfurnished')}</option>
                    </select>
                </div>

                {/* ── Heating ── */}
                <div>
                    <label className={label}>{t('search:filters.heating', 'Heating')}</label>
                    <select
                        value={filters.heatingType}
                        onChange={(e) => onFilterChange('heatingType', e.target.value as HeatingType)}
                        className={control}
                        aria-label={t('search:filters.heating', 'Heating')}
                    >
                        <option value="any">{anyLabel}</option>
                        <option value="central">{t('search:heatingOptions.central', 'Central')}</option>
                        <option value="electric">{t('search:heatingOptions.electric', 'Electric')}</option>
                        <option value="gas">{t('search:heatingOptions.gas', 'Gas')}</option>
                        <option value="oil">{t('search:heatingOptions.oil', 'Oil')}</option>
                        <option value="heat-pump">{t('search:heatingOptions.heat-pump', 'Heat pump')}</option>
                        <option value="solar">{t('search:heatingOptions.solar', 'Solar')}</option>
                        <option value="wood">{t('search:heatingOptions.wood', 'Wood')}</option>
                        <option value="none">{t('search:heatingOptions.none', 'None')}</option>
                    </select>
                </div>

                {/* ── Energy Rating ── */}
                <div>
                    <label className={label}>{t('search:filters.energyRating', 'Energy Rating')}</label>
                    <select
                        value={filters.energyRating}
                        onChange={(e) => onFilterChange('energyRating', e.target.value as EnergyRating)}
                        className={control}
                        aria-label={t('search:filters.energyRating', 'Energy Rating')}
                    >
                        <option value="any">{anyLabel}</option>
                        {['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'].map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Views (Zillow: "View") ── */}
            <div>
                <label className={label}>{t('villas:filters.views', 'View')}</label>
                <div className="flex flex-wrap gap-1.5">
                    {VIEW_CHIPS.map(chip => {
                        const active = (filters.viewType || 'any') === chip.value;
                        return (
                            <button
                                key={chip.value}
                                type="button"
                                onClick={() => onFilterChange('viewType', active ? 'any' : chip.value)}
                                className={`${chipBase} ${active ? chipOn : chipOff}`}
                                aria-pressed={active}
                            >
                                <span aria-hidden="true">{chip.emoji}</span>
                                <span>{t(chip.labelKey, chip.fallback)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Must Haves (Zillow: "Other Amenities" / "Must have …") ── */}
            <div>
                <label className={label}>{t('villas:filters.mustHaves', 'Must Haves')}</label>
                <div className="flex flex-wrap gap-1.5">
                    {MUST_HAVE_CHIPS.map(({ key, labelKey, fallback, emoji }) => {
                        const active = (filters as any)[key] === true;
                        return (
                            <button
                                key={String(key)}
                                type="button"
                                onClick={() => onFilterChange(key, active ? null : true)}
                                className={`${chipBase} ${active ? chipOn : chipOff}`}
                                aria-pressed={active}
                            >
                                <span aria-hidden="true">{emoji}</span>
                                <span>{t(labelKey, fallback)}</span>
                            </button>
                        );
                    })}
                    {AMENITY_TAG_CHIPS.map(({ tag, labelKey, fallback, emoji }) => {
                        const active = activeAmenities.includes(tag);
                        return (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleAmenity(tag)}
                                className={`${chipBase} ${active ? chipOn : chipOff}`}
                                aria-pressed={active}
                            >
                                <span aria-hidden="true">{emoji}</span>
                                <span>{t(labelKey, fallback)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Price change (Zillow: "Price Reduced") ── */}
            <div>
                <label className={label}>{t('villas:filters.priceChange', 'Price Change')}</label>
                <div className="flex flex-wrap gap-1.5">
                    <button
                        type="button"
                        onClick={() => onFilterChange('hasDiscount', filters.hasDiscount === true ? null : true)}
                        className={`${chipBase} ${filters.hasDiscount === true ? 'bg-red-50 text-red-600 border-red-300 font-semibold' : chipOff}`}
                        aria-pressed={filters.hasDiscount === true}
                    >
                        <span aria-hidden="true">↓</span>
                        <span>{t('search:filters.priceReduced', 'Price Reduced')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onFilterChange('hasPriceIncrease', filters.hasPriceIncrease === true ? null : true)}
                        className={`${chipBase} ${filters.hasPriceIncrease === true ? 'bg-amber-50 text-amber-700 border-amber-300 font-semibold' : chipOff}`}
                        aria-pressed={filters.hasPriceIncrease === true}
                    >
                        <span aria-hidden="true">↑</span>
                        <span>{t('search:filters.priceIncreased', 'Price Increased')}</span>
                    </button>
                </div>
            </div>

            {/* ── Commute / distance (Zillow: "Commute Time") ── */}
            <div>
                <label className={label}>{t('search:distance.title', 'Maximum Distance (km)')}</label>
                <div className="grid grid-cols-2 gap-1.5">
                    {([
                        { key: 'maxDistanceToCenter' as keyof Filters, text: t('search:distance.toCenter', 'To centre') },
                        { key: 'maxDistanceToSea' as keyof Filters, text: t('search:distance.toSea', 'To sea') },
                        { key: 'maxDistanceToSchool' as keyof Filters, text: t('search:distance.toSchool', 'To school') },
                        { key: 'maxDistanceToHospital' as keyof Filters, text: t('search:distance.toHospital', 'To hospital') },
                    ]).map(({ key, text }) => (
                        <div key={String(key)} className="relative">
                            <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="0.1"
                                placeholder={text}
                                value={(filters[key] as number | null) ?? ''}
                                onChange={(e) => onFilterChange(key, parseNum(e.target.value))}
                                className={`${control} ${dense ? 'pr-7' : 'pr-9'}`}
                                aria-label={text}
                            />
                            <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${dense ? 'text-[10px]' : 'text-xs'}`}>
                                km
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Keywords (Zillow: "Keywords") ── */}
            <div>
                <label className={label}>{t('villas:filters.keywords', 'Keywords')}</label>
                <input
                    type="text"
                    placeholder={t('villas:filters.keywordsPlaceholder', 'e.g. infinity pool — press Enter')}
                    onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        const input = e.currentTarget;
                        const value = input.value.trim().toLowerCase();
                        if (value && !activeAmenities.includes(value)) {
                            onFilterChange('amenities', [...activeAmenities, value]);
                        }
                        input.value = '';
                    }}
                    className={control}
                    aria-label={t('villas:filters.keywords', 'Keywords')}
                />
                {activeAmenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {activeAmenities.map(tag => (
                            <span key={tag} className={`${chipBase} ${chipOn}`}>
                                #{tag}
                                <button
                                    type="button"
                                    onClick={() => toggleAmenity(tag)}
                                    className="ml-0.5 hover:text-red-500 transition-colors"
                                    aria-label={t('common:aria.clearFilter', 'Remove {{tag}}', { tag })}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VillaAllFilters;
