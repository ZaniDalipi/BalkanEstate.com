import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cityPhotoKeys, cityShowcaseKeys } from '@/src/shared/query/queryKeys';
import { validateCityPhoto } from '@/src/shared/utils/validation';
import {
    getAdminCityPhotos,
    setCityPhoto,
    clearCityPhoto,
    type AdminCityPhoto,
    type ResolvedCityPhoto,
} from '../api/adminApi';

/** What a save carries: the place, the picture and an optional credit line. */
export interface CityPhotoSubmission {
    city: string;
    country: string;
    imageUrl: string;
    imageCredit?: string;
    /** Set when the URL came from our own upload endpoint. */
    imagePublicId?: string;
}

interface UseCityPhotosManager {
    rows: AdminCityPhoto[];
    /** Rows matching the current search, in the order the server returned them. */
    visibleRows: AdminCityPhoto[];
    search: string;
    setSearch: (value: string) => void;
    /** Show only cities whose photo is inherited or missing. */
    onlyNeedsAttention: boolean;
    setOnlyNeedsAttention: (value: boolean) => void;
    isLoading: boolean;
    /** Set when the list itself could not be loaded — nothing to show at all. */
    loadError: string | null;
    /** Set when a save or clear failed. Cleared on the next attempt. */
    error: string | null;
    notice: string | null;
    /** `city|country` of the row currently being written, if any. */
    pendingKey: string | null;
    /** Validates, then overrides the city's photo. False if it never left. */
    save: (submission: CityPhotoSubmission) => boolean;
    /** Drops the override, handing the city back to the resolution chain. */
    clear: (row: AdminCityPhoto) => void;
}

/** Row identity for this screen: `CityMarketData` has no id in the projection. */
export const cityRowKey = (city: string, country: string): string =>
    `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`;

/** True when a city shows a photo nobody chose for it, or none at all. */
export function needsAttention(row: AdminCityPhoto): boolean {
    return row.active === null || row.active.source === 'auto';
}

/**
 * Server state and mutations for the city-photos admin screen.
 *
 * Split from the component for the reason the rest of the admin is: the table
 * paints, this owns the cache, the optimistic writes and the error text. The
 * list is React Query state, never fetched in an effect (backend/CLAUDE.md).
 *
 * Optimistic here is worth the machinery because the visible effect of a save
 * is the photo itself: adopting the City Gallery picture should swap the
 * thumbnail in the same frame, not a round trip later. A rejected write rolls
 * the cache back to the snapshot taken before it, so the screen can never sit
 * showing a photo the database refused.
 */
export function useCityPhotosManager(): UseCityPhotosManager {
    const { t } = useTranslation(['admin']);
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [onlyNeedsAttention, setOnlyNeedsAttention] = useState(false);
    const [pendingKey, setPendingKey] = useState<string | null>(null);

    const adminKey = cityPhotoKeys.admin();

    const { data: rows = [], isLoading, isError } = useQuery({
        queryKey: adminKey,
        queryFn: async () => (await getAdminCityPhotos()).cities ?? [],
        staleTime: 30_000,
        refetchOnWindowFocus: true,
    });

    const visibleRows = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return rows.filter(row => {
            if (onlyNeedsAttention && !needsAttention(row)) return false;
            if (!needle) return true;
            return (
                row.city.toLowerCase().includes(needle) ||
                row.country.toLowerCase().includes(needle)
            );
        });
    }, [rows, search, onlyNeedsAttention]);

    /**
     * Rewrites one row's photo in the cache and hands back the snapshot to
     * restore if the server refuses it.
     */
    const applyOptimistic = async (key: string, active: ResolvedCityPhoto | null) => {
        await queryClient.cancelQueries({ queryKey: adminKey });
        const previous = queryClient.getQueryData<AdminCityPhoto[]>(adminKey);
        queryClient.setQueryData<AdminCityPhoto[]>(adminKey, prev =>
            (prev ?? []).map(row =>
                cityRowKey(row.city, row.country) === key
                    ? {
                        ...row,
                        active,
                        candidates: {
                            ...row.candidates,
                            manual: active?.source === 'manual' ? active : row.candidates.manual,
                        },
                    }
                    : row,
            ),
        );
        return { previous };
    };

    const rollback = (ctx: { previous?: AdminCityPhoto[] } | undefined) => {
        if (ctx?.previous) queryClient.setQueryData(adminKey, ctx.previous);
    };

    /**
     * Explore Cities and the home gallery both read these photos, so an edit
     * has to reach past this screen's own list — otherwise the public pages
     * keep serving the previous picture from cache until it goes stale.
     */
    const invalidateAll = useCallback(() => {
        setPendingKey(null);
        void queryClient.invalidateQueries({ queryKey: cityPhotoKeys.all });
        void queryClient.invalidateQueries({ queryKey: cityShowcaseKeys.all });
        void queryClient.invalidateQueries({ queryKey: ['cities'] });
    }, [queryClient]);

    const saveMutation = useMutation({
        mutationFn: (submission: CityPhotoSubmission) => setCityPhoto(submission),
        onMutate: async (submission: CityPhotoSubmission) => {
            setError(null);
            setNotice(null);
            const key = cityRowKey(submission.city, submission.country);
            setPendingKey(key);
            return applyOptimistic(key, {
                imageUrl: submission.imageUrl,
                source: 'manual',
                ...(submission.imageCredit ? { credit: submission.imageCredit } : {}),
            });
        },
        onError: (err, _submission, ctx) => {
            rollback(ctx);
            // The server validates the same fields; surface its message so a
            // rejected URL reads as a reason, not a generic failure.
            setError(
                err instanceof Error
                    ? err.message
                    : t('admin:cityPhotos.saveError', 'Failed to save the city photo'),
            );
        },
        onSuccess: (_result, submission) =>
            setNotice(t('admin:cityPhotos.saved', 'Photo updated for {{city}}', { city: submission.city })),
        onSettled: invalidateAll,
    });

    const clearMutation = useMutation({
        mutationFn: (row: AdminCityPhoto) => clearCityPhoto(row.city, row.country),
        onMutate: async (row: AdminCityPhoto) => {
            setError(null);
            setNotice(null);
            const key = cityRowKey(row.city, row.country);
            setPendingKey(key);
            // What the chain would pick without the override. Guessed rather
            // than left blank so the thumbnail doesn't flash empty; the
            // server's answer replaces it on success either way.
            const next =
                row.candidates.cityGallery ?? row.candidates.villaDestination ?? row.candidates.auto ?? null;
            const ctx = await applyOptimistic(key, next);
            queryClient.setQueryData<AdminCityPhoto[]>(adminKey, prev =>
                (prev ?? []).map(r =>
                    cityRowKey(r.city, r.country) === key
                        ? { ...r, candidates: { ...r.candidates, manual: null } }
                        : r,
                ),
            );
            return ctx;
        },
        onError: (err, _row, ctx) => {
            rollback(ctx);
            setError(
                err instanceof Error
                    ? err.message
                    : t('admin:cityPhotos.clearError', 'Failed to clear the city photo'),
            );
        },
        onSuccess: (_result, row) =>
            setNotice(t('admin:cityPhotos.cleared', 'Override removed for {{city}}', { city: row.city })),
        onSettled: invalidateAll,
    });

    const save = useCallback(
        (submission: CityPhotoSubmission) => {
            // Validated before the request so a bad URL is rejected inline
            // rather than as a 400 (CLAUDE.md: validation lives in validation.ts).
            const result = validateCityPhoto(submission);
            if (!result.isValid) {
                setError(result.error ?? null);
                return false;
            }
            saveMutation.mutate({
                ...submission,
                city: submission.city.trim(),
                country: submission.country.trim(),
                imageUrl: submission.imageUrl.trim(),
                imageCredit: submission.imageCredit?.trim() || undefined,
            });
            return true;
        },
        [saveMutation],
    );

    const clear = useCallback((row: AdminCityPhoto) => clearMutation.mutate(row), [clearMutation]);

    return {
        rows,
        visibleRows,
        search,
        setSearch,
        onlyNeedsAttention,
        setOnlyNeedsAttention,
        isLoading,
        loadError: isError ? t('admin:cityPhotos.loadError', 'Failed to load city photos') : null,
        error,
        notice,
        pendingKey,
        save,
        clear,
    };
}
