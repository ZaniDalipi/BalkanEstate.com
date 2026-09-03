import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { ALLOWED_PHOTO_HOSTS } from '@/src/shared/utils/validation';
import {
    uploadCityPhoto,
    type AdminCityPhoto,
    type CityPhotoSource,
    type ResolvedCityPhoto,
} from '../api/adminApi';
import type { CityPhotoSubmission } from './useCityPhotosManager';

interface Props {
    row: AdminCityPhoto;
    /** True while this row's own save or clear is in flight. */
    pending: boolean;
    onSave: (submission: CityPhotoSubmission) => boolean;
    onClear: () => void;
}

/** Badge colour per source, so the winner explains itself at a glance. */
const SOURCE_STYLES: Record<CityPhotoSource, string> = {
    manual: 'bg-primary/10 text-primary',
    'city-gallery': 'bg-emerald-50 text-emerald-700',
    'villa-destination': 'bg-violet-50 text-violet-700',
    auto: 'bg-amber-50 text-amber-700',
};

/**
 * Badge wording. Real copy rather than the raw enum as the translation
 * fallback: a missing key should read as English, not leak
 * `villa-destination` into the UI.
 */
const SOURCE_LABELS: Record<CityPhotoSource, string> = {
    manual: 'Set by you',
    'city-gallery': 'City Gallery',
    'villa-destination': 'Villa destination',
    auto: 'Automatic',
};

const thumb = (url: string, w: number, h: number) =>
    optimizeCloudinaryUrl(url, { width: w, height: h, crop: 'fill', gravity: 'auto' }) || url;

/**
 * One city's photo: what visitors see today, where it came from, and the other
 * pictures that exist for the same place.
 *
 * "Adopt" writes the chosen candidate as this city's own `manual` photo rather
 * than pointing at the other collection. That is deliberate: a Villa
 * Destination can be edited or deactivated by someone curating villas, and a
 * city whose picture silently changes for that reason would be impossible to
 * explain. Adopting copies the URL and pins it.
 */
const CityPhotoRow: React.FC<Props> = ({ row, pending, onSave, onClear }) => {
    const { t } = useTranslation(['admin']);
    const [url, setUrl] = useState('');
    const [credit, setCredit] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    const commit = (submission: Omit<CityPhotoSubmission, 'city' | 'country'>) => {
        const sent = onSave({ city: row.city, country: row.country, ...submission });
        if (sent) { setUrl(''); setCredit(''); setOpen(false); }
    };

    const handleFile = async (file: File) => {
        setUploading(true);
        setUploadError(null);
        try {
            const stored = await uploadCityPhoto(file);
            // Saved straight away rather than staged: there is no modal to
            // confirm in, and an uploaded file left unattached is an asset
            // nobody can find again.
            commit({ imageUrl: stored.url, imagePublicId: stored.publicId, imageCredit: credit });
        } catch (err) {
            // The server distinguishes "not an image" from "too large" from a
            // failed store; show what it said rather than one blanket message.
            setUploadError(err instanceof Error ? err.message : t('admin:cityPhotos.uploadError', 'Photo upload failed'));
        } finally {
            setUploading(false);
        }
    };

    const candidates: Array<{ key: CityPhotoSource; photo: ResolvedCityPhoto | null; label: string }> = [
        { key: 'city-gallery', photo: row.candidates.cityGallery, label: t('admin:cityPhotos.sourceCityGallery', 'City Gallery') },
        { key: 'villa-destination', photo: row.candidates.villaDestination, label: t('admin:cityPhotos.sourceVillaDestination', 'Villa destination') },
        { key: 'auto', photo: row.candidates.auto, label: t('admin:cityPhotos.sourceAuto', 'Auto (Wikipedia)') },
    ];
    const offers = candidates.filter(c => c.photo && c.photo.imageUrl !== row.active?.imageUrl);

    return (
        <div className={`rounded-xl border border-gray-200 bg-white p-3 ${pending ? 'opacity-60' : ''}`}>
            {/* Wraps below `sm`, where a thumbnail, a name, three chips and
                three buttons on one line squeezes the name to an ellipsis. */}
            <div className="flex flex-wrap items-start gap-3">
                <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    {row.active ? (
                        <img
                            src={thumb(row.active.imageUrl, 192, 128)}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                            {t('admin:cityPhotos.noPhoto', 'No photo')}
                        </div>
                    )}
                </div>

                <div className="min-w-[150px] flex-1">
                    <p className="truncate font-semibold text-gray-900">
                        {row.city}
                        {row.active && (
                            <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${SOURCE_STYLES[row.active.source]}`}>
                                {t(`admin:cityPhotos.badge.${row.active.source}`, SOURCE_LABELS[row.active.source])}
                            </span>
                        )}
                    </p>
                    <p className="truncate text-sm text-gray-500">{row.country}</p>
                    {row.active?.credit && (
                        <p className="truncate text-xs text-gray-400">{row.active.credit}</p>
                    )}

                    {offers.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-gray-400">
                                {t('admin:cityPhotos.alsoAvailable', 'Also available:')}
                            </span>
                            {offers.map(({ key, photo, label }) => (
                                <button
                                    key={key}
                                    type="button"
                                    disabled={pending}
                                    onClick={() => commit({
                                        imageUrl: photo!.imageUrl,
                                        imageCredit: photo!.credit,
                                    })}
                                    title={t('admin:cityPhotos.adoptHint', 'Use this photo for {{city}}', { city: row.city })}
                                    className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 py-0.5 pl-0.5 pr-2 text-[11px] font-medium text-gray-700 hover:border-primary hover:text-primary disabled:opacity-50"
                                >
                                    <img src={thumb(photo!.imageUrl, 48, 48)} alt="" loading="lazy" className="h-5 w-5 rounded-full object-cover" />
                                    {t('admin:cityPhotos.adopt', 'Use {{source}}', { source: label })}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex w-full flex-shrink-0 flex-wrap gap-1.5 sm:w-auto sm:flex-col">
                    <label className={`cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-center text-xs font-semibold text-white hover:bg-primary-dark ${uploading || pending ? 'pointer-events-none opacity-50' : ''}`}>
                        {uploading
                            ? t('admin:cityPhotos.uploading', 'Uploading…')
                            : t('admin:cityPhotos.upload', 'Upload')}
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploading || pending}
                            onChange={e => {
                                const file = e.target.files?.[0];
                                e.target.value = ''; // allow re-picking the same file
                                if (file) void handleFile(file);
                            }}
                        />
                    </label>
                    <button
                        type="button"
                        onClick={() => setOpen(v => !v)}
                        className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-neutral-200"
                    >
                        {t('admin:cityPhotos.useUrl', 'Use a URL')}
                    </button>
                    {row.candidates.manual && (
                        <button
                            type="button"
                            disabled={pending}
                            onClick={onClear}
                            title={t('admin:cityPhotos.clearHint', 'Hand this city back to the City Gallery / villa / auto photo')}
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                            {t('admin:cityPhotos.clear', 'Clear override')}
                        </button>
                    )}
                </div>
            </div>

            {uploadError && (
                <p className="mt-2 text-xs text-red-600" role="alert">{uploadError}</p>
            )}

            {open && (
                <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
                    <label className="min-w-[240px] flex-1 text-xs font-medium text-gray-600">
                        {t('admin:cityPhotos.urlLabel', 'Image URL (https)')}
                        <input
                            type="url"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder="https://…"
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900"
                        />
                    </label>
                    <label className="min-w-[160px] flex-1 text-xs font-medium text-gray-600">
                        {t('admin:cityPhotos.creditLabel', 'Credit (optional)')}
                        <input
                            type="text"
                            value={credit}
                            maxLength={200}
                            onChange={e => setCredit(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900"
                        />
                    </label>
                    <button
                        type="button"
                        disabled={pending || !url.trim()}
                        onClick={() => commit({ imageUrl: url, imageCredit: credit })}
                        className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
                    >
                        {t('admin:cityPhotos.saveUrl', 'Save photo')}
                    </button>
                    {/* Stated up front, because a URL from any other host saves
                        and then renders as a blank frame — the site's content
                        policy only permits images from these two. */}
                    <p className="w-full text-[11px] text-gray-400">
                        {t('admin:cityPhotos.urlHint', 'Only {{hosts}} can be linked. For a photo anywhere else, use Upload — it will be hosted for you.', {
                            hosts: ALLOWED_PHOTO_HOSTS.join(' and '),
                        })}
                    </p>
                </div>
            )}
        </div>
    );
};

export default CityPhotoRow;
