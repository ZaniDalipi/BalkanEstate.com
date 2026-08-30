import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@/constants';
import { BALKAN_COUNTRIES } from '@/constants/countries';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { validateCityShowcase } from '@/src/shared/utils/validation';
import type { CityDirectoryEntry } from '../api/adminApi';

/**
 * `displayOrder` is held as a string while editing so a half-typed "-" or "1."
 * is not coerced to NaN mid-keystroke and does not wipe the field.
 */
export interface CityShowcaseDraft {
    _id?: string;
    city: string;
    country: string;
    searchQuery: string;
    imageUrl: string;
    imagePublicId: string;
    /** Attribution line, e.g. "Photo by Jane Doe on Unsplash". Optional. */
    imageCredit: string;
    displayOrder: string;
    isActive: boolean;
}

export const emptyCityDraft = (order: number): CityShowcaseDraft => ({
    city: '', country: '', searchQuery: '',
    imageUrl: '', imagePublicId: '', imageCredit: '',
    displayOrder: String(order), isActive: true,
});

/** The 10 Balkan countries this app already treats as canonical, sorted for a select. */
const COUNTRY_NAMES = Object.values(BALKAN_COUNTRIES)
    .map(c => c.name)
    .sort((a, b) => a.localeCompare(b));

interface Props {
    draft: CityShowcaseDraft;
    saving: boolean;
    onChange: (draft: CityShowcaseDraft) => void;
    onCancel: () => void;
    onSave: (draft: CityShowcaseDraft) => void;
    /** Stores the file and resolves with where it landed. */
    onUploadImage: (file: File) => Promise<{ url: string; publicId: string }>;
    /** Known (city, country) pairs — from the market-data directory and the
     *  gallery's own rows — offered as suggestions for the city field. */
    citySuggestions: CityDirectoryEntry[];
}

/**
 * Create/edit form for one city panel, always shown as a modal.
 *
 * Country is a closed `<select>` — this app already treats a fixed 10-country
 * Balkan list as canonical everywhere else (search filters, the agents page),
 * so letting this one field free-type it was the one way to introduce a
 * country a typo-checked pair could never match. City stays free-text, wired
 * to a `<datalist>` of names already known for the chosen country: it can't
 * be a closed list the way country is, because the whole point of this
 * gallery is showing places nobody has entered yet, but the datalist means
 * typing "Podgorica" for a city already on record autocompletes instead of
 * risking "Podgorica " with a trailing space becoming a second, silently
 * duplicate entry.
 *
 * The photo is uploaded from inside the form rather than from the row list,
 * which is the one structural difference from the villa-destination form: a
 * panel cannot be saved without a photo, so a new panel has to be able to get
 * one before it exists as a row. The upload therefore writes into the draft,
 * and the draft is what gets saved.
 *
 * Rendered through a portal into `document.body`, not in place. The admin
 * view's page-transition wrapper (`animate-page-morph` in index.css) holds a
 * `transform: scale(1)` after its animation ends — an identity transform, but
 * any transform value other than `none` makes that element a CSS containing
 * block for `position: fixed` descendants. Left in place, this modal's
 * "centered" position would be centered inside that (tall, scrollable) page
 * wrapper instead of the actual viewport, so scrolling down a long city list
 * before opening it could put the modal partly or fully off-screen.
 * `document.body` carries no such transform, so a portal keeps it pinned to
 * the viewport regardless of scroll position or which page it was opened from.
 */
const CityShowcaseForm: React.FC<Props> = ({
    draft, saving, onChange, onCancel, onSave, onUploadImage, citySuggestions,
}) => {
    const { t } = useTranslation(['admin']);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // The same rule the server applies, so a problem reads as a sentence here
    // instead of arriving as a 400 after a round trip.
    const problem = validateCityShowcase({
        city: draft.city,
        country: draft.country,
        searchQuery: draft.searchQuery,
        imageUrl: draft.imageUrl,
        displayOrder: draft.displayOrder,
    });

    // Cities already on record for the chosen country. Case-insensitively
    // deduped: the directory and the gallery's own rows can name the same
    // city with different casing, and a datalist showing "Budva" twice reads
    // as a bug even though neither entry is wrong.
    const citySuggestionsForCountry = useMemo(() => {
        if (!draft.country) return [];
        const seen = new Set<string>();
        const names: string[] = [];
        for (const entry of citySuggestions) {
            if (entry.country !== draft.country) continue;
            const key = entry.city.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            names.push(entry.city);
        }
        return names.sort((a, b) => a.localeCompare(b));
    }, [citySuggestions, draft.country]);

    const field = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none';
    const label = 'block text-xs font-medium text-gray-600 mb-1';
    const set = (patch: Partial<CityShowcaseDraft>) => onChange({ ...draft, ...patch });

    const handleFile = async (file: File) => {
        setUploading(true);
        setUploadError(null);
        try {
            const { url, publicId } = await onUploadImage(file);
            set({ imageUrl: url, imagePublicId: publicId });
        } catch (err) {
            // The server distinguishes "not an image" from "too large" from a
            // failed store; show what it said rather than one blanket message.
            setUploadError(err instanceof Error ? err.message : t('admin:cityShowcase.uploadError', 'Photo upload failed'));
        } finally {
            setUploading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-900">
                        {draft._id
                            ? t('admin:cityShowcase.editTitle', 'Edit city')
                            : t('admin:cityShowcase.addTitle', 'Add city')}
                    </h2>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label={t('admin:cityShowcase.cancel', 'Cancel')}
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <form
                    onSubmit={e => { e.preventDefault(); if (problem.isValid) onSave(draft); }}
                    className="flex-1 space-y-4 overflow-y-auto p-6"
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className={label} htmlFor="cs-country">{t('admin:cityShowcase.country', 'Country')}</label>
                            <select
                                id="cs-country"
                                className={field}
                                value={draft.country}
                                onChange={e => set({ country: e.target.value })}
                            >
                                <option value="" disabled>
                                    {t('admin:cityShowcase.countryPlaceholder', 'Select a country…')}
                                </option>
                                {COUNTRY_NAMES.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={label} htmlFor="cs-city">{t('admin:cityShowcase.city', 'City')}</label>
                            <input
                                id="cs-city"
                                className={field}
                                list="cs-city-options"
                                value={draft.city}
                                onChange={e => set({ city: e.target.value })}
                                maxLength={80}
                                autoComplete="off"
                                placeholder={draft.country ? t('admin:cityShowcase.cityPlaceholder', 'Pick one or type a new city') : undefined}
                            />
                            <datalist id="cs-city-options">
                                {citySuggestionsForCountry.map(name => (
                                    <option key={name} value={name} />
                                ))}
                            </datalist>
                            <p className="mt-1 text-[11px] text-gray-400">
                                {t('admin:cityShowcase.cityHint', 'The name shown on the panel. Not listed? Type it — it gets saved for next time too.')}
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className={label} htmlFor="cs-query">{t('admin:cityShowcase.searchQuery', 'Search term')}</label>
                        <input id="cs-query" className={field} value={draft.searchQuery} onChange={e => set({ searchQuery: e.target.value })} maxLength={80} />
                        <p className="mt-1 text-[11px] text-gray-400">
                            {t('admin:cityShowcase.searchQueryHint', 'Sent to the search page when a visitor opens this panel.')}
                        </p>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="h-28 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                            {draft.imageUrl && (
                                <img
                                    src={optimizeCloudinaryUrl(draft.imageUrl, { width: 192, height: 224, crop: 'fill', gravity: 'auto' }) || draft.imageUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <label className="inline-block cursor-pointer rounded-lg bg-neutral-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-neutral-200">
                                {uploading
                                    ? t('admin:cityShowcase.uploading', 'Uploading…')
                                    : draft.imageUrl
                                        ? t('admin:cityShowcase.replacePhoto', 'Replace photo')
                                        : t('admin:cityShowcase.choosePhoto', 'Choose photo')}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={uploading}
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        e.target.value = ''; // allow re-picking the same file
                                        if (file) void handleFile(file);
                                    }}
                                />
                            </label>
                            <p className="mt-2 text-[11px] text-gray-400">
                                {t('admin:cityShowcase.photoSpec', 'Panels are tall — upload a portrait photo, 1600 × 2000 or as close as you have. Other shapes are cropped, never squashed. Max 10 MB.')}
                            </p>
                            {uploadError && <p className="mt-2 text-sm text-red-600" role="alert">{uploadError}</p>}
                        </div>
                    </div>

                    <div>
                        <label className={label} htmlFor="cs-credit">{t('admin:cityShowcase.imageCredit', 'Photo credit (optional)')}</label>
                        <input
                            id="cs-credit"
                            className={field}
                            value={draft.imageCredit}
                            onChange={e => set({ imageCredit: e.target.value })}
                            maxLength={200}
                            placeholder={t('admin:cityShowcase.imageCreditPlaceholder', 'Photo by Jane Doe on Unsplash')}
                        />
                        <p className="mt-1 text-[11px] text-gray-400">
                            {t('admin:cityShowcase.imageCreditHint', 'If this photo came from Unsplash, Pexels, or anywhere else, paste the credit line here — most sites show one next to the download button. It appears in a small caption on the panel.')}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={label} htmlFor="cs-order">{t('admin:cityShowcase.order', 'Order')}</label>
                            <input id="cs-order" className={field} value={draft.displayOrder} onChange={e => set({ displayOrder: e.target.value })} inputMode="numeric" />
                        </div>
                        <label className="flex items-end gap-2 pb-2 text-sm text-gray-700">
                            <input type="checkbox" checked={draft.isActive} onChange={e => set({ isActive: e.target.checked })} />
                            {t('admin:cityShowcase.active', 'Show on the home page')}
                        </label>
                    </div>

                    {!problem.isValid && <p className="text-sm text-red-600">{problem.error}</p>}

                    <div className="flex gap-2 border-t border-gray-200 pt-4">
                        <button
                            type="submit"
                            disabled={saving || uploading || !problem.isValid}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
                        >
                            {saving ? t('admin:cityShowcase.saving', 'Saving…') : t('admin:cityShowcase.save', 'Save')}
                        </button>
                        <button type="button" onClick={onCancel} className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-neutral-200">
                            {t('admin:cityShowcase.cancel', 'Cancel')}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    );
};

export default CityShowcaseForm;
