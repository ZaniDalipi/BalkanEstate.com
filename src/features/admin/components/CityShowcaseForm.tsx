import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { validateCityShowcase } from '@/src/shared/utils/validation';

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
    displayOrder: string;
    isActive: boolean;
}

export const emptyCityDraft = (order: number): CityShowcaseDraft => ({
    city: '', country: '', searchQuery: '',
    imageUrl: '', imagePublicId: '',
    displayOrder: String(order), isActive: true,
});

interface Props {
    draft: CityShowcaseDraft;
    saving: boolean;
    onChange: (draft: CityShowcaseDraft) => void;
    onCancel: () => void;
    onSave: (draft: CityShowcaseDraft) => void;
    /** Stores the file and resolves with where it landed. */
    onUploadImage: (file: File) => Promise<{ url: string; publicId: string }>;
}

/**
 * Create/edit form for one city panel.
 *
 * The photo is uploaded from inside the form rather than from the row list,
 * which is the one structural difference from the villa-destination form: a
 * panel cannot be saved without a photo, so a new panel has to be able to get
 * one before it exists as a row. The upload therefore writes into the draft,
 * and the draft is what gets saved.
 */
const CityShowcaseForm: React.FC<Props> = ({
    draft, saving, onChange, onCancel, onSave, onUploadImage,
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

    return (
        <form
            onSubmit={e => { e.preventDefault(); if (problem.isValid) onSave(draft); }}
            className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
        >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                    <label className={label} htmlFor="cs-city">{t('admin:cityShowcase.city', 'City')}</label>
                    <input id="cs-city" className={field} value={draft.city} onChange={e => set({ city: e.target.value })} maxLength={80} />
                    <p className="mt-1 text-[11px] text-gray-400">
                        {t('admin:cityShowcase.cityHint', 'The name shown on the panel.')}
                    </p>
                </div>
                <div>
                    <label className={label} htmlFor="cs-country">{t('admin:cityShowcase.country', 'Country')}</label>
                    <input id="cs-country" className={field} value={draft.country} onChange={e => set({ country: e.target.value })} maxLength={60} />
                </div>
                <div>
                    <label className={label} htmlFor="cs-query">{t('admin:cityShowcase.searchQuery', 'Search term')}</label>
                    <input id="cs-query" className={field} value={draft.searchQuery} onChange={e => set({ searchQuery: e.target.value })} maxLength={80} />
                    <p className="mt-1 text-[11px] text-gray-400">
                        {t('admin:cityShowcase.searchQueryHint', 'Sent to the search page when a visitor opens this panel.')}
                    </p>
                </div>
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

            <div className="flex gap-2">
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
    );
};

export default CityShowcaseForm;
