import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_CONFIG } from '@/src/shared/constants/app.constants';
import { tokenService } from '@/src/shared/api';
import { csrfHeaders } from '@/src/shared/api/httpClient';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { villaDestinationKeys } from '@/src/shared/query/queryKeys';
import { validateVillaDestination } from '@/src/shared/utils/validation';
import {
    getAdminVillaDestinations,
    createVillaDestination,
    updateVillaDestination,
    deleteVillaDestination,
    importDefaultVillaDestinations,
    type AdminVillaDestination,
} from '../api/adminApi';
import VillaDestinationForm, { type DestinationDraft, emptyDraft } from './VillaDestinationForm';
import { VILLA_DESTINATIONS } from '@/src/features/home/data/villaDestinations';

/**
 * The `query` of every destination the app ships with. The import endpoint
 * matches on exactly this field, so comparing against it tells an admin how
 * many shipped places are not in the database yet — otherwise a release that
 * adds destinations is invisible here until someone happens to press Import.
 */
const DEFAULT_DESTINATION_QUERIES = VILLA_DESTINATIONS.map(d => d.query);

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
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [editing, setEditing] = useState<DestinationDraft | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    const adminKey = villaDestinationKeys.admin();

    /*
     * The list is React Query state, not component state fetched in an effect
     * (backend/CLAUDE.md: never fetch in useEffect). That is what makes the
     * two sides agree quickly: a mutation writes the new row into the cache
     * straight away so the table repaints in the same frame, the request goes
     * out underneath it, and whatever the database actually stored replaces
     * the guess when the refetch lands. A failed write rolls the cache back to
     * the snapshot taken before it, so the table can never sit showing an edit
     * the database rejected.
     *
     * `refetchOnWindowFocus` and the poll cover the other direction — a change
     * made by a second admin, or by the seed script — without a WebSocket.
     */
    const { data: rows = [], isLoading, isError } = useQuery({
        queryKey: adminKey,
        queryFn: async () => (await getAdminVillaDestinations()).destinations ?? [],
        staleTime: 5_000,
        refetchInterval: 15_000,
        refetchOnWindowFocus: true,
    });

    /** Both admin and public views of one collection — invalidate together. */
    const invalidateAll = () =>
        queryClient.invalidateQueries({ queryKey: villaDestinationKeys.all });

    /**
     * Applies `patch` to the cached list immediately and hands back the
     * snapshot to restore if the server refuses it.
     */
    const applyOptimistic = async (patch: (prev: AdminVillaDestination[]) => AdminVillaDestination[]) => {
        await queryClient.cancelQueries({ queryKey: adminKey });
        const previous = queryClient.getQueryData<AdminVillaDestination[]>(adminKey);
        queryClient.setQueryData<AdminVillaDestination[]>(adminKey, prev => patch(prev ?? []));
        return { previous };
    };

    const rollback = (ctx: { previous?: AdminVillaDestination[] } | undefined) => {
        if (ctx?.previous) queryClient.setQueryData(adminKey, ctx.previous);
    };

    const saveMutation = useMutation({
        mutationFn: async (draft: DestinationDraft) => {
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
            return draft._id ? updateVillaDestination(draft._id, body) : createVillaDestination(body);
        },
        onMutate: async (draft: DestinationDraft) => {
            setError(null);
            // Only an existing row can be patched in place. A brand-new one has
            // no id until the server assigns it, and inventing a placeholder
            // would put a row on screen that cannot be edited or deleted until
            // the refetch lands — worse than waiting one round trip for it.
            if (!draft._id) return { previous: undefined };
            return applyOptimistic(prev =>
                prev.map(r =>
                    r._id === draft._id
                        ? {
                            ...r,
                            name: draft.name.trim(),
                            query: draft.query.trim(),
                            country: draft.country.trim(),
                            lat: Number(draft.lat),
                            lng: Number(draft.lng),
                            zoom: Number(draft.zoom),
                            displayOrder: Number(draft.displayOrder),
                            isActive: draft.isActive,
                        }
                        : r,
                ),
            );
        },
        onError: (e, _draft, ctx) => {
            rollback(ctx);
            // The server validates coordinates too; surface its message so a
            // bad latitude reads as a reason rather than a generic failure.
            setError(e instanceof Error ? e.message : t('admin:villaDestinations.saveError', 'Failed to save destination'));
        },
        onSuccess: () => {
            setEditing(null);
            setNotice(t('admin:villaDestinations.saved', 'Destination saved'));
        },
        onSettled: invalidateAll,
    });

    const deleteMutation = useMutation({
        mutationFn: (row: AdminVillaDestination) => deleteVillaDestination(row._id),
        onMutate: async (row: AdminVillaDestination) => {
            setError(null);
            return applyOptimistic(prev => prev.filter(r => r._id !== row._id));
        },
        onError: (_e, _row, ctx) => {
            rollback(ctx);
            setError(t('admin:villaDestinations.deleteError', 'Failed to delete destination'));
        },
        onSettled: invalidateAll,
    });

    /**
     * Pulls the built-in destinations into the database so they can be curated
     * here. Idempotent server-side (it matches on `query`), so pressing it
     * again after the shipped list grows brings in only what is missing.
     */
    const importMutation = useMutation({
        mutationFn: importDefaultVillaDestinations,
        onMutate: () => setError(null),
        onSuccess: result => {
            setNotice(
                t('admin:villaDestinations.imported', 'Imported {{imported}} destination(s), skipped {{skipped}} already present', {
                    imported: result.imported,
                    skipped: result.skipped,
                })
            );
        },
        onError: () => setError(t('admin:villaDestinations.importError', 'Failed to import the built-in destinations')),
        onSettled: invalidateAll,
    });

    const loading = isLoading;
    const saving = saveMutation.isPending;
    const importing = importMutation.isPending;

    // A failed load is the one case where there is nothing to show at all.
    const loadError = isError ? t('admin:villaDestinations.loadError', 'Failed to load villa destinations') : null;

    /** How many of the shipped destinations are not in the database yet. */
    const missingCount = useMemo(() => {
        const present = new Set(rows.map(r => r.query));
        return DEFAULT_DESTINATION_QUERIES.filter(q => !present.has(q)).length;
    }, [rows]);

    const handleSave = (draft: DestinationDraft) => {
        // Validate before the request so a bad row is rejected inline rather
        // than as a 400 (Claude.md: validation lives in validation.ts).
        const result = validateVillaDestination(draft);
        if (!result.isValid) {
            setError(result.error ?? null);
            return;
        }
        saveMutation.mutate(draft);
    };

    const handleDelete = (row: AdminVillaDestination) => {
        if (!window.confirm(t('admin:villaDestinations.confirmDelete', 'Remove {{name}} from the home page?', { name: row.name }))) return;
        deleteMutation.mutate(row);
    };

    const handleImport = () => importMutation.mutate();

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
            // Paint the new photo before the refetch returns; the invalidate
            // right after replaces it with whatever the database stored.
            queryClient.setQueryData<AdminVillaDestination[]>(adminKey, prev =>
                (prev ?? []).map(r =>
                    r._id === row._id ? { ...r, imageUrl: data.url, imagePublicId: data.publicId } : r,
                ),
            );
            setNotice(t('admin:villaDestinations.imageUpdated', 'Photo updated'));
            await invalidateAll();
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

            {/* The corridor card is a fixed portrait shape, so say so here
                rather than letting a curator find out by uploading a
                landscape photo and seeing its sides cropped away. */}
            <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                {t('admin:villaDestinations.photoSpec', 'Card photos are portrait, 18:25 — upload 900 × 1250 or larger at that shape. Any other size still fills the card, but is cropped to fit.')}
            </p>

            {/* Without this, destinations added in a release stay invisible
                here until somebody happens to press Import again. */}
            {!loading && missingCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <span>
                        {t('admin:villaDestinations.newAvailable', '{{count}} new built-in destination(s) are not in the database yet.', { count: missingCount })}
                    </span>
                    <button
                        onClick={handleImport}
                        disabled={importing}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                    >
                        {importing
                            ? t('admin:villaDestinations.importing', 'Importing…')
                            : t('admin:villaDestinations.importNew', 'Import them')}
                    </button>
                </div>
            )}

            {(error || loadError) && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                    {error ?? loadError}
                </div>
            )}
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
                                    // Thumbnail-sized, not the full upload: the
                                    // box is 48×64 and this list is dozens of
                                    // rows long, so serving the originals here
                                    // would pull tens of megabytes.
                                    <img
                                        src={optimizeCloudinaryUrl(row.imageUrl, { width: 96, height: 128, crop: 'fill', gravity: 'auto' }) || row.imageUrl}
                                        alt=""
                                        loading="lazy"
                                        className="h-full w-full object-cover"
                                    />
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
