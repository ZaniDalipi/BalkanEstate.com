import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Numbers are held as strings while editing so a half-typed "-" or "42."
 * doesn't get coerced to NaN mid-keystroke and wipe the field.
 */
export interface DestinationDraft {
    _id?: string;
    name: string;
    query: string;
    country: string;
    imageUrl: string;
    imagePublicId: string;
    imageCity: string;
    imageCountry: string;
    lat: string;
    lng: string;
    zoom: string;
    displayOrder: string;
    isActive: boolean;
}

export const emptyDraft = (order: number): DestinationDraft => ({
    name: '', query: '', country: '',
    imageUrl: '', imagePublicId: '', imageCity: '', imageCountry: '',
    lat: '', lng: '', zoom: '12', displayOrder: String(order), isActive: true,
});

interface Props {
    draft: DestinationDraft;
    saving: boolean;
    onChange: (draft: DestinationDraft) => void;
    onCancel: () => void;
    onSave: (draft: DestinationDraft) => void;
}

/** Mirrors the server's rules so the admin sees the problem before saving. */
function validate(d: DestinationDraft): string | null {
    if (!d.name.trim()) return 'Name is required';
    if (!d.query.trim()) return 'Search term is required';
    if (!d.country.trim()) return 'Country is required';
    const lat = Number(d.lat);
    const lng = Number(d.lng);
    const zoom = Number(d.zoom);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return 'Latitude must be between -90 and 90';
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return 'Longitude must be between -180 and 180';
    if (!Number.isFinite(zoom) || zoom < 1 || zoom > 20) return 'Zoom must be between 1 and 20';
    if (!Number.isFinite(Number(d.displayOrder))) return 'Order must be a number';
    return null;
}

const VillaDestinationForm: React.FC<Props> = ({ draft, saving, onChange, onCancel, onSave }) => {
    const { t } = useTranslation(['admin']);
    const problem = validate(draft);

    const field = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--color-villa-gold)] focus:outline-none';
    const label = 'block text-xs font-medium text-gray-600 mb-1';
    const set = (patch: Partial<DestinationDraft>) => onChange({ ...draft, ...patch });

    return (
        <form
            onSubmit={e => { e.preventDefault(); if (!problem) onSave(draft); }}
            className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
        >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                    <label className={label} htmlFor="vd-name">{t('admin:villaDestinations.name', 'Name')}</label>
                    <input id="vd-name" className={field} value={draft.name} onChange={e => set({ name: e.target.value })} maxLength={80} />
                </div>
                <div>
                    <label className={label} htmlFor="vd-query">{t('admin:villaDestinations.query', 'Search term')}</label>
                    <input id="vd-query" className={field} value={draft.query} onChange={e => set({ query: e.target.value })} maxLength={80} />
                    <p className="mt-1 text-[11px] text-gray-400">
                        {t('admin:villaDestinations.queryHint', 'Sent to the villas page as the location search.')}
                    </p>
                </div>
                <div>
                    <label className={label} htmlFor="vd-country">{t('admin:villaDestinations.country', 'Country')}</label>
                    <input id="vd-country" className={field} value={draft.country} onChange={e => set({ country: e.target.value })} maxLength={60} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                    <label className={label} htmlFor="vd-lat">{t('admin:villaDestinations.lat', 'Latitude')}</label>
                    <input id="vd-lat" className={field} value={draft.lat} onChange={e => set({ lat: e.target.value })} inputMode="decimal" />
                </div>
                <div>
                    <label className={label} htmlFor="vd-lng">{t('admin:villaDestinations.lng', 'Longitude')}</label>
                    <input id="vd-lng" className={field} value={draft.lng} onChange={e => set({ lng: e.target.value })} inputMode="decimal" />
                </div>
                <div>
                    <label className={label} htmlFor="vd-zoom">{t('admin:villaDestinations.zoom', 'Zoom')}</label>
                    <input id="vd-zoom" className={field} value={draft.zoom} onChange={e => set({ zoom: e.target.value })} inputMode="numeric" />
                </div>
                <div>
                    <label className={label} htmlFor="vd-order">{t('admin:villaDestinations.order', 'Order')}</label>
                    <input id="vd-order" className={field} value={draft.displayOrder} onChange={e => set({ displayOrder: e.target.value })} inputMode="numeric" />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <label className={label} htmlFor="vd-city">{t('admin:villaDestinations.imageCity', 'Fallback photo city')}</label>
                    <input id="vd-city" className={field} value={draft.imageCity} onChange={e => set({ imageCity: e.target.value })} maxLength={80} />
                    <p className="mt-1 text-[11px] text-gray-400">
                        {t('admin:villaDestinations.imageCityHint', 'Used only until you upload a photo for this place.')}
                    </p>
                </div>
                <div>
                    <label className={label} htmlFor="vd-imgcountry">{t('admin:villaDestinations.imageCountry', 'Fallback photo country')}</label>
                    <input id="vd-imgcountry" className={field} value={draft.imageCountry} onChange={e => set({ imageCountry: e.target.value })} maxLength={60} />
                </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={draft.isActive} onChange={e => set({ isActive: e.target.checked })} />
                {t('admin:villaDestinations.active', 'Show on the home page')}
            </label>

            {problem && <p className="text-sm text-red-600">{problem}</p>}

            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={saving || !!problem}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
                >
                    {saving ? t('admin:villaDestinations.saving', 'Saving…') : t('admin:villaDestinations.save', 'Save')}
                </button>
                <button type="button" onClick={onCancel} className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-neutral-200">
                    {t('admin:villaDestinations.cancel', 'Cancel')}
                </button>
            </div>
        </form>
    );
};

export default VillaDestinationForm;
