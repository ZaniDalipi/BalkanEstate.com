import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_CONFIG } from '@/src/shared/constants/app.constants';
import { tokenService } from '@/src/shared/api';
import { csrfHeaders } from '@/src/shared/api/httpClient';
import {
    getAdminVillaDestinations,
    createVillaDestination,
    updateVillaDestination,
    deleteVillaDestination,
    importDefaultVillaDestinations,
    type AdminVillaDestination,
} from '../api/adminApi';
import VillaDestinationForm, { type DestinationDraft, emptyDraft } from './VillaDestinationForm';

/**
 * Curates the places shown in the home-page villa corridor.
 *
 * The photo matters most here: destinations that are regions rather than
 * seeded cities (Jezerc, Brezovica, Rugova…) fall back to a nearby city's
 * picture, which is approximate by design. Uploading a real photo here is
 * what makes the card accurate.
 */
const VillaDestinationsManager: React.FC = () => {
    const { t } = useTranslation(['admin']);
    const [rows, setRows] = useState<AdminVillaDestination[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [editing, setEditing] = useState<DestinationDraft | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAdminVillaDestinations();
            setRows(data.destinations ?? []);
        } catch {
            setError(t('admin:villaDestinations.loadError', 'Failed to load villa destinations'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async (draft: DestinationDraft) => {
        setSaving(true);
        setError(null);
        try {
            const body = {
                name: draft.name.trim(),
                query: draft.query.trim(),
                country: draft.country.trim(),
                imageUrl: draft.imageUrl || undefined,
                imagePublicId: draft.imagePublicId || undefined,
                imageCity: draft.imageCity.trim() || undefined,
                imageCountry: draft.imageCountry.trim() || undefined,
                lat: Number(draft.lat),
                lng: Number(draft.lng),
                zoom: Number(draft.zoom),
                displayOrder: Number(draft.displayOrder),
                isActive: draft.isActive,
            };
            if (draft._id) await updateVillaDestination(draft._id, body);
            else await createVillaDestination(body);

            setEditing(null);
            setNotice(t('admin:villaDestinations.saved', 'Destination saved'));
            await load();
        } catch (e) {
            // The server validates coordinates too; surface its message so a
            // bad latitude reads as a reason rather than a generic failure.
            setError(e instanceof Error ? e.message : t('admin:villaDestinations.saveError', 'Failed to save destination'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (row: AdminVillaDestination) => {
        if (!window.confirm(t('admin:villaDestinations.confirmDelete', 'Remove {{name}} from the home page?', { name: row.name }))) return;
        setError(null);
        try {
            await deleteVillaDestination(row._id);
            await load();
        } catch {
            setError(t('admin:villaDestinations.deleteError', 'Failed to delete destination'));
        }
    };

    /**
     * Pulls the built-in destinations into the database so they can be curated
     * here. Idempotent server-side, so pressing it twice is harmless.
     */
    const handleImport = async () => {
        setImporting(true);
        setError(null);
        try {
            const result = await importDefaultVillaDestinations();
            setNotice(
                t('admin:villaDestinations.imported', 'Imported {{imported}} destination(s), skipped {{skipped}} already present', {
                    imported: result.imported,
                    skipped: result.skipped,
                })
            );
            await load();
        } catch {
            setError(t('admin:villaDestinations.importError', 'Failed to import the built-in destinations'));
        } finally {
            setImporting(false);
        }
    };

    /** Uploads straight onto an existing row — the common case is swapping a photo. */
    const handleUpload = async (row: AdminVillaDestination, file: File) => {
        setUploadingId(row._id);
        setError(null);
        try {
            const form = new FormData();
            form.append('image', file);
            const res = await fetch(`${API_CONFIG.BASE_URL}/admin/villa-destinations/upload-image`, {
                method: 'POST',
                credentials: 'include',
                headers: { Authorization: `Bearer ${tokenService.getAccessToken()}`, ...csrfHeaders() },
                body: form,
            });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            await updateVillaDestination(row._id, { imageUrl: data.url, imagePublicId: data.publicId });
            setNotice(t('admin:villaDestinations.imageUpdated', 'Photo updated'));
            await load();
        } catch {
            setError(t('admin:villaDestinations.uploadError', 'Photo upload failed'));
        } finally {
            setUploadingId(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">
                        {t('admin:villaDestinations.title', 'Villa Destinations')}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {t('admin:villaDestinations.subtitle', 'Places shown in the home-page villa showcase. Upload a photo to replace the stand-in city image.')}
                    </p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                    <button
                        onClick={handleImport}
                        disabled={importing}
                        className="rounded-lg bg-neutral-100 px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-neutral-200 disabled:opacity-50"
                    >
                        {importing
                            ? t('admin:villaDestinations.importing', 'Importing…')
                            : t('admin:villaDestinations.import', 'Import built-in places')}
                    </button>
                    <button
                        onClick={() => setEditing(emptyDraft(rows.length))}
                        className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                    >
                        + {t('admin:villaDestinations.add', 'Add destination')}
                    </button>
                </div>
            </div>

            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            {notice && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</div>}

            {editing && (
                <VillaDestinationForm
                    draft={editing}
                    saving={saving}
                    onChange={setEditing}
                    onCancel={() => setEditing(null)}
                    onSave={handleSave}
                />
            )}

            {loading ? (
                <div className="py-12 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--color-villa-gold)]" />
                </div>
            ) : rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500">
                    <p>{t('admin:villaDestinations.empty', 'No destinations yet — the home page is using its built-in list.')}</p>
                    <p className="mt-1 text-xs text-gray-400">
                        {t('admin:villaDestinations.emptyHint', 'Press “Import built-in places” above to bring in the fourteen shipped destinations, then edit them here.')}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {rows.map(row => (
                        <div key={row._id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
                            <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                                {row.imageUrl && (
                                    <img src={row.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-gray-900">
                                    {row.name}
                                    {!row.isActive && (
                                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                                            {t('admin:villaDestinations.hidden', 'Hidden')}
                                        </span>
                                    )}
                                </p>
                                <p className="truncate text-sm text-gray-500">
                                    {row.country} · {t('admin:villaDestinations.searches', 'searches')} “{row.query}”
                                </p>
                                <p className="truncate text-xs text-gray-400">
                                    {row.lat.toFixed(4)}, {row.lng.toFixed(4)} · zoom {row.zoom}
                                    {!row.imageUrl && row.imageCity ? ` · ${t('admin:villaDestinations.usingCityPhoto', 'using {{city}} photo', { city: row.imageCity })}` : ''}
                                </p>
                            </div>
                            <div className="flex flex-shrink-0 flex-col gap-1.5">
                                <label className="cursor-pointer rounded-lg bg-neutral-100 px-3 py-1.5 text-center text-xs font-semibold text-gray-700 hover:bg-neutral-200">
                                    {uploadingId === row._id
                                        ? t('admin:villaDestinations.uploading', 'Uploading…')
                                        : t('admin:villaDestinations.replacePhoto', 'Photo')}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={uploadingId === row._id}
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            e.target.value = ''; // allow re-picking the same file
                                            if (file) handleUpload(row, file);
                                        }}
                                    />
                                </label>
                                <button
                                    onClick={() => setEditing({ ...row, lat: String(row.lat), lng: String(row.lng), zoom: String(row.zoom), displayOrder: String(row.displayOrder), imageCity: row.imageCity ?? '', imageCountry: row.imageCountry ?? '', imageUrl: row.imageUrl ?? '', imagePublicId: row.imagePublicId ?? '' })}
                                    className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-neutral-200"
                                >
                                    {t('admin:villaDestinations.edit', 'Edit')}
                                </button>
                                <button
                                    onClick={() => handleDelete(row)}
                                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                                >
                                    {t('admin:villaDestinations.delete', 'Delete')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VillaDestinationsManager;
