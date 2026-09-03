import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { uploadRequest } from '@/src/shared/api/httpClient';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { SEEDED_CITY_IMAGES, SEEDED_COUNTRIES } from '@/config/seededCityImages';
import { validateVillaDestination } from '@/src/shared/utils/validation';
import { findCityCentre, findCountryCentre } from '@/shared/geo';

// Leaflet and its tile layers are a heavy import, and an admin who only
// renames a destination or swaps its photo never needs them, so the picker is
// fetched the first time the map is actually revealed.
const MapLocationPicker = lazy(() => import('@/src/features/seller/components/MapLocationPicker'));

/** Where the map opens when neither the destination nor its country is known. */
const FALLBACK_CENTRE = { lat: 42.0, lng: 21.0 } as const;

/** The zoom a destination gets when it has none yet — a town, not a continent. */
const DEFAULT_ZOOM = 12;

/**
 * A coordinate field's value as a number, or null when it is empty or not yet
 * a number. Empty is not 0: 0/0 is a real point in the Gulf of Guinea, and
 * treating a blank field as pinned there is how a destination ends up with a
 * map that flies into the ocean.
 */
const parseCoordinate = (value: string): number | null => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

/** Leaflet only has tiles for 1–20; anything else opens the map at the default. */
const parseZoom = (value: string): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 20 ? parsed : DEFAULT_ZOOM;
};

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
    /** Carried through edits so a name change cannot strip the photographer. */
    imageCredit: string;
    imageCreditUrl: string;
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
    imageUrl: '', imagePublicId: '', imageCredit: '', imageCreditUrl: '', imageCity: '', imageCountry: '',
    lat: '', lng: '', zoom: '12', displayOrder: String(order), isActive: true,
});

interface Props {
    draft: DestinationDraft;
    saving: boolean;
    onChange: (draft: DestinationDraft) => void;
    onCancel: () => void;
    onSave: (draft: DestinationDraft) => void;
}

/**
 * Editor for one destination, as a modal.
 *
 * It used to render inline above a list that is now hundreds of rows long, so
 * pressing Edit on anything below the fold scrolled the form out of sight and
 * the admin had to scroll back up to reach the fields. A dialog keeps the
 * editor with the row that opened it, whatever the list length.
 *
 * The position is set on a map, not typed. A destination's coordinates decide
 * where the villas map flies when a visitor opens the card, and there is no
 * way to tell a right latitude from a wrong one by reading it — so the map is
 * the input: search for the place, or tap it, and the pin writes the
 * coordinates and the zoom back into the draft. The number fields stay
 * editable underneath for the case where an exact pair is already known.
 */
const VillaDestinationForm: React.FC<Props> = ({ draft, saving, onChange, onCancel, onSave }) => {
    const { t } = useTranslation(['admin']);
    const panelRef = useRef<HTMLDivElement>(null);
    const firstFieldRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const pinnedLat = parseCoordinate(draft.lat);
    const pinnedLng = parseCoordinate(draft.lng);
    const isPinned = pinnedLat !== null && pinnedLng !== null;

    /**
     * Non-null exactly while the map is open, holding the zoom it opened at.
     *
     * One value rather than an `isMapOpen` flag beside a zoom, because the two
     * are never independent — and the opening zoom is deliberately a snapshot:
     * once the map is up it owns the zoom, so feeding the draft's value back in
     * on every wheel notch would fight the user for control of their own map.
     *
     * It starts open for a destination that has no pin yet, which is every
     * destination being created: that is the field the form exists to fill.
     */
    const [mapSession, setMapSession] = useState<{ zoom: number } | null>(() =>
        isPinned ? null : { zoom: parseZoom(draft.zoom) },
    );

    const toggleMap = () =>
        setMapSession(session => (session ? null : { zoom: parseZoom(draft.zoom) }));

    // Where the map opens: the existing pin, else the place if it happens to be
    // a city we hold coordinates for, else the middle of its country.
    const mapCentre = isPinned
        ? { lat: pinnedLat, lng: pinnedLng }
        : findCityCentre(draft.country, draft.name) ?? findCountryCentre(draft.country) ?? FALLBACK_CENTRE;

    // The shared validator, not a private copy — the same rules the save path
    // and the server apply (Claude.md: validation lives in validation.ts).
    const result = validateVillaDestination(draft);
    const problem = result.isValid ? null : result.error ?? null;

    const field = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--color-villa-gold)] focus:outline-none';
    const label = 'block text-xs font-medium text-gray-600 mb-1';
    const set = (patch: Partial<DestinationDraft>) => onChange({ ...draft, ...patch });

    /*
     * Focus the first field once, when the dialog opens — and only then.
     *
     * The empty dependency list is the whole point of this being its own
     * effect. It used to share one with the Escape listener, whose deps
     * include `onCancel`, and the parent passes that as an inline arrow: a new
     * identity on every render, and it re-renders on every keystroke because
     * the draft lives in its state. So each character typed re-ran the effect
     * and pulled the caret back to the Name field, whichever field was
     * actually being typed in.
     */
    useEffect(() => {
        firstFieldRef.current?.focus();
    }, []);

    // Escape closes, unless a save is already in flight.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !saving) onCancel();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onCancel, saving]);

    /**
     * Uploads straight into the draft rather than saving the row.
     *
     * The row-level button patches an existing destination immediately, which
     * cannot work here: a destination being created has no id yet. Holding the
     * returned URL in the draft means the photo is chosen and previewed before
     * the first save, and it is written with everything else.
     */
    const handleFile = async (file: File) => {
        setUploading(true);
        setUploadError(null);
        try {
            const form = new FormData();
            form.append('image', file);
            const data = await uploadRequest<{ url: string; publicId: string }>(
                '/admin/villa-destinations/upload-image',
                form,
            );
            // Their own picture now, so any inherited credit goes with the
            // photo it belonged to.
            set({ imageUrl: data.url, imagePublicId: data.publicId, imageCredit: '', imageCreditUrl: '' });
        } catch {
            setUploadError(t('admin:villaDestinations.uploadError', 'Photo upload failed'));
        } finally {
            setUploading(false);
        }
    };

    // Cities of the destination's own country first — that is the one an admin
    // wants in almost every case — with the rest still reachable below.
    const ownCountry = SEEDED_CITY_IMAGES.filter(c => c.country === draft.country);
    const otherCountries = SEEDED_COUNTRIES.filter(c => c !== draft.country);

    const preview = draft.imageUrl
        ? optimizeCloudinaryUrl(draft.imageUrl, { width: 216, height: 300, crop: 'fill', gravity: 'auto' }) || draft.imageUrl
        : null;

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:items-center"
            onMouseDown={e => {
                // Only a click that starts on the backdrop closes; a drag that
                // begins inside the panel and ends outside must not.
                if (e.target === e.currentTarget && !saving) onCancel();
            }}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="vd-modal-title"
                className="my-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
            >
                <form onSubmit={e => { e.preventDefault(); if (!problem) onSave(draft); }}>
                    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                        <h3 id="vd-modal-title" className="text-base font-semibold text-gray-900">
                            {draft._id
                                ? t('admin:villaDestinations.editTitle', 'Edit destination')
                                : t('admin:villaDestinations.addTitle', 'Add destination')}
                        </h3>
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={saving}
                            aria-label={t('admin:villaDestinations.cancel', 'Cancel')}
                            className="rounded-lg p-2 text-gray-400 hover:bg-neutral-100 hover:text-gray-700 disabled:opacity-50"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                            </svg>
                        </button>
                    </div>

                    <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                                <label className={label} htmlFor="vd-name">{t('admin:villaDestinations.name', 'Name')}</label>
                                <input ref={firstFieldRef} id="vd-name" className={field} value={draft.name} onChange={e => set({ name: e.target.value })} maxLength={80} />
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
                                {/* A list, not free text: the country is matched
                                    against the seeded photo table and shown on the
                                    card, so a typo silently costs the photo. */}
                                <select
                                    id="vd-country"
                                    className={field}
                                    value={draft.country}
                                    onChange={e => {
                                        const country = e.target.value;
                                        // Keep the photo country in step unless the
                                        // admin has deliberately borrowed another.
                                        const keep = draft.imageCountry && draft.imageCountry !== draft.country;
                                        set({
                                            country,
                                            ...(keep ? {} : { imageCountry: country, imageCity: '' }),
                                        });
                                    }}
                                >
                                    <option value="">{t('admin:villaDestinations.choose', 'Choose…')}</option>
                                    {SEEDED_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* ── Position ── */}
                        <div className="rounded-xl border border-gray-200 p-4">
                            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        {t('admin:villaDestinations.position', 'Map position')}
                                    </p>
                                    <p className="mt-1 text-[11px] text-gray-400">
                                        {isPinned
                                            ? t('admin:villaDestinations.positionPinned', 'Where the villas map flies when a visitor opens this card.')
                                            : t('admin:villaDestinations.positionMissing', 'No position yet — search for the place on the map, or tap it, to set one.')}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={toggleMap}
                                    className="whitespace-nowrap rounded-lg bg-neutral-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-neutral-200"
                                >
                                    {mapSession
                                        ? t('admin:villaDestinations.hideMap', 'Hide map')
                                        : t('admin:villaDestinations.pickOnMap', 'Set on map')}
                                </button>
                            </div>

                            {mapSession && (
                                <Suspense
                                    fallback={
                                        <div className="flex h-96 items-center justify-center rounded-lg border-2 border-dashed border-gray-200">
                                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                        </div>
                                    }
                                >
                                    {/*
                                     * `allowOutsideCityArea` because a destination is
                                     * not a listing: many of them are regions rather
                                     * than cities, and the seller-side "must be near
                                     * the chosen city" rule has no city to measure
                                     * against here. The country still biases the
                                     * search, so typing "Ksamil" finds the Albanian
                                     * one first.
                                     */}
                                    <MapLocationPicker
                                        lat={mapCentre.lat}
                                        lng={mapCentre.lng}
                                        zoom={mapSession.zoom}
                                        address={[draft.name, draft.country].filter(Boolean).join(', ')}
                                        country={draft.country}
                                        allowOutsideCityArea
                                        title={t('admin:villaDestinations.position', 'Map position')}
                                        onLocationChange={(lat, lng) =>
                                            // Six decimals is ~11cm — past the point
                                            // where more digits mean anything for a
                                            // card that frames a whole town.
                                            set({ lat: lat.toFixed(6), lng: lng.toFixed(6) })
                                        }
                                        onZoomChange={zoom => set({ zoom: String(zoom) })}
                                    />
                                </Suspense>
                            )}

                            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                            </div>
                            <p className="mt-1 text-[11px] text-gray-400">
                                {t('admin:villaDestinations.positionHint', 'Filled in by the map. Type here only when you already have the exact pair.')}
                            </p>
                        </div>

                        <div className="sm:w-40">
                            <label className={label} htmlFor="vd-order">{t('admin:villaDestinations.order', 'Order')}</label>
                            <input id="vd-order" className={field} value={draft.displayOrder} onChange={e => set({ displayOrder: e.target.value })} inputMode="numeric" />
                        </div>

                        {/* ── Photo ── */}
                        <div className="rounded-xl border border-gray-200 p-4">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                {t('admin:villaDestinations.photo', 'Photo')}
                            </p>
                            <div className="flex flex-col gap-4 sm:flex-row">
                                <div className="h-40 w-28 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-neutral-100">
                                    {preview ? (
                                        <img src={preview} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-gray-400">
                                            {t('admin:villaDestinations.noPhoto', 'Using the city photo')}
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0 flex-1 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <label className="cursor-pointer rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary-dark">
                                            {uploading
                                                ? t('admin:villaDestinations.uploading', 'Uploading…')
                                                : draft.imageUrl
                                                    ? t('admin:villaDestinations.replacePhotoLong', 'Replace photo')
                                                    : t('admin:villaDestinations.uploadPhoto', 'Upload photo')}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                disabled={uploading}
                                                onChange={e => {
                                                    const f = e.target.files?.[0];
                                                    e.target.value = ''; // allow re-picking the same file
                                                    if (f) void handleFile(f);
                                                }}
                                            />
                                        </label>
                                        {draft.imageUrl && (
                                            <button
                                                type="button"
                                                onClick={() => set({ imageUrl: '', imagePublicId: '', imageCredit: '', imageCreditUrl: '' })}
                                                className="rounded-lg bg-neutral-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-neutral-200"
                                            >
                                                {t('admin:villaDestinations.removePhoto', 'Remove')}
                                            </button>
                                        )}
                                    </div>
                                    {uploadError && <p className="text-xs text-red-600" role="alert">{uploadError}</p>}

                                    <div>
                                        <label className={label} htmlFor="vd-city">
                                            {t('admin:villaDestinations.imageCity', 'Fallback photo city')}
                                        </label>
                                        {/* Only cities that actually have a seeded
                                            photo — a free-text name that is not in
                                            the table resolves to a 404 and leaves
                                            the card on its gradient. */}
                                        <select
                                            id="vd-city"
                                            className={field}
                                            value={draft.imageCity ? `${draft.imageCity}|${draft.imageCountry}` : ''}
                                            onChange={e => {
                                                const [city, country] = e.target.value.split('|');
                                                set({ imageCity: city ?? '', imageCountry: country ?? '' });
                                            }}
                                        >
                                            <option value="">{t('admin:villaDestinations.noCityPhoto', 'None')}</option>
                                            {ownCountry.length > 0 && (
                                                <optgroup label={draft.country}>
                                                    {ownCountry.map(c => (
                                                        <option key={`${c.city}|${c.country}`} value={`${c.city}|${c.country}`}>{c.city}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {otherCountries.map(co => (
                                                <optgroup key={co} label={co}>
                                                    {SEEDED_CITY_IMAGES.filter(c => c.country === co).map(c => (
                                                        <option key={`${c.city}|${c.country}`} value={`${c.city}|${c.country}`}>{c.city}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                        <p className="mt-1 text-[11px] text-gray-400">
                                            {t('admin:villaDestinations.imageCityHint', 'Used only until you upload a photo for this place.')}
                                        </p>
                                    </div>

                                    {/* Free text, shown on the card exactly as
                                        typed. Stock libraries word their
                                        attribution their own way, and a field
                                        that only took a name would force every
                                        one of them into ours. */}
                                    <div>
                                        <label className={label} htmlFor="vd-credit">
                                            {t('admin:villaDestinations.imageCredit', 'Photo credit (optional)')}
                                        </label>
                                        <input
                                            id="vd-credit"
                                            className={field}
                                            value={draft.imageCredit}
                                            onChange={e => set({ imageCredit: e.target.value })}
                                            maxLength={120}
                                            placeholder={t('admin:villaDestinations.imageCreditPlaceholder', 'Photo by Jane Doe on Unsplash')}
                                        />
                                        <p className="mt-1 text-[11px] text-gray-400">
                                            {t(
                                                'admin:villaDestinations.imageCreditHint',
                                                'If the photo came from Unsplash, Pexels or anywhere else, paste their credit line here — most sites show one next to the download button. It appears as a small caption on the card.',
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input type="checkbox" checked={draft.isActive} onChange={e => set({ isActive: e.target.checked })} />
                            {t('admin:villaDestinations.active', 'Show on the home page')}
                        </label>

                        {problem && <p className="text-sm text-red-600" role="alert">{problem}</p>}
                    </div>

                    <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
                        <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-neutral-200 disabled:opacity-50">
                            {t('admin:villaDestinations.cancel', 'Cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={saving || uploading || !!problem}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
                        >
                            {saving ? t('admin:villaDestinations.saving', 'Saving…') : t('admin:villaDestinations.save', 'Save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    );
};

export default VillaDestinationForm;
