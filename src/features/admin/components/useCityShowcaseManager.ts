import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cityShowcaseKeys } from '@/src/shared/query/queryKeys';
import { validateCityShowcase } from '@/src/shared/utils/validation';
import {
    getAdminCityShowcase,
    createCityShowcase,
    updateCityShowcase,
    deleteCityShowcase,
    type AdminCityShowcase,
} from '../api/adminApi';
import type { CityShowcaseDraft } from './CityShowcaseForm';

interface UseCityShowcaseManager {
    rows: AdminCityShowcase[];
    isLoading: boolean;
    /** Set when the list itself could not be loaded — nothing to show at all. */
    loadError: string | null;
    /** Set when a save or delete failed. Cleared on the next attempt. */
    error: string | null;
    notice: string | null;
    saving: boolean;
    /** Validates, then creates or updates. Returns false if it never left. */
    save: (draft: CityShowcaseDraft) => boolean;
    remove: (row: AdminCityShowcase) => void;
}

/** Draft (strings, for the form) → request body (typed, for the server). */
function toBody(draft: CityShowcaseDraft) {
    return {
        city: draft.city.trim(),
        country: draft.country.trim(),
        searchQuery: draft.searchQuery.trim(),
        imageUrl: draft.imageUrl.trim(),
        imagePublicId: draft.imagePublicId.trim() || undefined,
        displayOrder: Number(draft.displayOrder),
        isActive: draft.isActive,
    };
}

/**
 * Server state and mutations for the city-showcase admin table.
 *
 * Separated from the component so the table stays a rendering concern: this
 * hook owns the cache, the optimistic updates and the error text, and hands
 * back only what the table paints.
 *
 * The list is React Query state, never fetched in an effect (backend/CLAUDE.md).
 * That is what makes the two sides agree quickly: a mutation writes its result
 * into the cache straight away so the table repaints in the same frame, the
 * request goes out underneath it, and whatever the database actually stored
 * replaces the guess when the refetch lands. A failed write rolls the cache
 * back to the snapshot taken before it, so the table can never sit showing an
 * edit the database rejected.
 */
export function useCityShowcaseManager(onSaved: () => void): UseCityShowcaseManager {
    const { t } = useTranslation(['admin']);
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const adminKey = cityShowcaseKeys.admin();

    const { data: rows = [], isLoading, isError } = useQuery({
        queryKey: adminKey,
        queryFn: async () => (await getAdminCityShowcase()).cities ?? [],
        staleTime: 5_000,
        refetchOnWindowFocus: true,
    });

    /** Both the admin table and the public gallery — invalidate together. */
    const invalidateAll = useCallback(
        () => queryClient.invalidateQueries({ queryKey: cityShowcaseKeys.all }),
        [queryClient],
    );

    /**
     * Applies `patch` to the cached list immediately and hands back the
     * snapshot to restore if the server refuses it.
     */
    const applyOptimistic = async (patch: (prev: AdminCityShowcase[]) => AdminCityShowcase[]) => {
        await queryClient.cancelQueries({ queryKey: adminKey });
        const previous = queryClient.getQueryData<AdminCityShowcase[]>(adminKey);
        queryClient.setQueryData<AdminCityShowcase[]>(adminKey, prev => patch(prev ?? []));
        return { previous };
    };

    const rollback = (ctx: { previous?: AdminCityShowcase[] } | undefined) => {
        if (ctx?.previous) queryClient.setQueryData(adminKey, ctx.previous);
    };

    const saveMutation = useMutation({
        mutationFn: async (draft: CityShowcaseDraft) => {
            const body = toBody(draft);
            return draft._id ? updateCityShowcase(draft._id, body) : createCityShowcase(body);
        },
        onMutate: async (draft: CityShowcaseDraft) => {
            setError(null);
            // Only an existing row can be patched in place. A new one has no id
            // until the server assigns it, and inventing a placeholder would
            // put a row on screen that cannot be edited or deleted until the
            // refetch lands — worse than waiting one round trip for it.
            if (!draft._id) return { previous: undefined };
            const id = draft._id;
            const body = toBody(draft);
            return applyOptimistic(prev =>
                prev.map(row => (row._id === id ? { ...row, ...body } : row)),
            );
        },
        onError: (err, _draft, ctx) => {
            rollback(ctx);
            // The server validates the same fields; surface its message so a
            // rejected photo or name reads as a reason, not a generic failure.
            setError(err instanceof Error ? err.message : t('admin:cityShowcase.saveError', 'Failed to save city panel'));
        },
        onSuccess: () => {
            onSaved();
            setNotice(t('admin:cityShowcase.saved', 'City panel saved'));
        },
        onSettled: invalidateAll,
    });

    const deleteMutation = useMutation({
        mutationFn: (row: AdminCityShowcase) => deleteCityShowcase(row._id),
        onMutate: async (row: AdminCityShowcase) => {
            setError(null);
            return applyOptimistic(prev => prev.filter(r => r._id !== row._id));
        },
        onError: (_err, _row, ctx) => {
            rollback(ctx);
            setError(t('admin:cityShowcase.deleteError', 'Failed to delete city panel'));
        },
        onSettled: invalidateAll,
    });

    const save = useCallback(
        (draft: CityShowcaseDraft) => {
            // Validated before the request so a bad row is rejected inline
            // rather than as a 400 (Claude.md: validation lives in validation.ts).
            const result = validateCityShowcase({
                city: draft.city,
                country: draft.country,
                searchQuery: draft.searchQuery,
                imageUrl: draft.imageUrl,
                displayOrder: draft.displayOrder,
            });
            if (!result.isValid) {
                setError(result.error ?? null);
                return false;
            }
            saveMutation.mutate(draft);
            return true;
        },
        [saveMutation],
    );

    const remove = useCallback(
        (row: AdminCityShowcase) => deleteMutation.mutate(row),
        [deleteMutation],
    );

    return {
        rows,
        isLoading,
        loadError: isError ? t('admin:cityShowcase.loadError', 'Failed to load the city gallery') : null,
        error,
        notice,
        saving: saveMutation.isPending,
        save,
        remove,
    };
}
