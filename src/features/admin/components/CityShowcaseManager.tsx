import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { CITY_SHOWCASE_MAX_PANELS } from '@/src/shared/constants/app.constants';
import { uploadCityShowcaseImage, type AdminCityShowcase } from '../api/adminApi';
import CityShowcaseForm, { emptyCityDraft, type CityShowcaseDraft } from './CityShowcaseForm';
import { useCityShowcaseManager } from './useCityShowcaseManager';

/** Row → draft. The form edits strings; the stored row holds numbers. */
const toDraft = (row: AdminCityShowcase): CityShowcaseDraft => ({
    _id: row._id,
    city: row.city,
    country: row.country,
    searchQuery: row.searchQuery,
    imageUrl: row.imageUrl,
    imagePublicId: row.imagePublicId ?? '',
    displayOrder: String(row.displayOrder),
    isActive: row.isActive,
});

/**
 * Curates the cities shown in the home-page gallery.
 *
 * This table is the whole story: the gallery has no built-in list and no
 * seeded photo library behind it, so a city appears there because it was
 * created here and it carries the photo that was uploaded here. Hiding a panel
 * or deleting it removes it from the home page outright.
 */
const CityShowcaseManager: React.FC = () => {
    const { t } = useTranslation(['admin']);
    const [editing, setEditing] = useState<CityShowcaseDraft | null>(null);

    const {
        rows, isLoading, loadError, error, notice, saving, save, remove,
    } = useCityShowcaseManager(() => setEditing(null));

    /**
     * Ids the gallery will not reach: active panels past the display limit.
     * Without this a curator adds a seventh city, sees it listed here, and has
     * no way to know the home page stops at six.
     */
    const overflowIds = useMemo(() => {
        const active = rows.filter(row => row.isActive);
        return new Set(active.slice(CITY_SHOWCASE_MAX_PANELS).map(row => row._id));
    }, [rows]);

    const handleDelete = (row: AdminCityShowcase) => {
        if (!window.confirm(t('admin:cityShowcase.confirmDelete', 'Remove {{city}} from the home page?', { city: row.city }))) return;
        remove(row);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">
                        {t('admin:cityShowcase.title', 'City Gallery')}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {t('admin:cityShowcase.subtitle', 'Cities shown in the home-page gallery. Each panel needs a photo — there is no stand-in image behind it.')}
                    </p>
                </div>
                <button
                    onClick={() => setEditing(emptyCityDraft(rows.length))}
                    className="flex-shrink-0 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                >
                    + {t('admin:cityShowcase.add', 'Add city')}
                </button>
            </div>

            <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                {t('admin:cityShowcase.limitHint', 'The gallery shows the first {{count}} visible cities, in order. Anything past that stays here until you reorder or hide one.', { count: CITY_SHOWCASE_MAX_PANELS })}
            </p>

            {(error || loadError) && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                    {error ?? loadError}
                </div>
            )}
            {notice && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</div>}

            {editing && (
                <CityShowcaseForm
                    draft={editing}
                    saving={saving}
                    onChange={setEditing}
                    onCancel={() => setEditing(null)}
                    onSave={save}
                    onUploadImage={uploadCityShowcaseImage}
                />
            )}

            {isLoading ? (
                <div className="py-12 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                </div>
            ) : rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500">
                    <p>{t('admin:cityShowcase.empty', 'No cities yet — the gallery is hidden on the home page.')}</p>
                    <p className="mt-1 text-xs text-gray-400">
                        {t('admin:cityShowcase.emptyHint', 'Add a city with a photo and it appears there straight away.')}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {rows.map(row => (
                        <div key={row._id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
                            <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                                {/* Thumbnail-sized, not the full upload: the box
                                    is 48×64 and the list can run long, so
                                    serving masters here would pull megabytes. */}
                                <img
                                    src={optimizeCloudinaryUrl(row.imageUrl, { width: 96, height: 128, crop: 'fill', gravity: 'auto' }) || row.imageUrl}
                                    alt=""
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-gray-900">
                                    {row.city}
                                    {!row.isActive && (
                                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                                            {t('admin:cityShowcase.hidden', 'Hidden')}
                                        </span>
                                    )}
                                    {overflowIds.has(row._id) && (
                                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                                            {t('admin:cityShowcase.beyondLimit', 'Not shown')}
                                        </span>
                                    )}
                                </p>
                                <p className="truncate text-sm text-gray-500">
                                    {row.country} · {t('admin:cityShowcase.searches', 'searches')} “{row.searchQuery}”
                                </p>
                                <p className="truncate text-xs text-gray-400">
                                    {t('admin:cityShowcase.order', 'Order')} {row.displayOrder}
                                </p>
                            </div>
                            <div className="flex flex-shrink-0 flex-col gap-1.5">
                                <button
                                    onClick={() => setEditing(toDraft(row))}
                                    className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-neutral-200"
                                >
                                    {t('admin:cityShowcase.edit', 'Edit')}
                                </button>
                                <button
                                    onClick={() => handleDelete(row)}
                                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                                >
                                    {t('admin:cityShowcase.delete', 'Delete')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CityShowcaseManager;
