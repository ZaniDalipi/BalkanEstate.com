import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSuggestionActions } from '../../../hooks';
import type { AttachmentConflict, DashboardUnit, NearbySuggestion } from '../../../types';

type ApiError = { message?: string; details?: { conflicts?: AttachmentConflict[] } };

/**
 * Actions for one suggested residence: put the listing on an apartment, link
 * it to the residence only, or ask for access. A non-blocking conflict (e.g.
 * the apartment already has a listing) can be confirmed with "Attach anyway".
 */
export const useSuggestionRow = (suggestion: NearbySuggestion, listingId?: string) => {
  const { t } = useTranslation('developments');
  const actions = useSuggestionActions();
  const [picking, setPicking] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState<DashboardUnit | null>(null);
  const developmentId = suggestion.development.id;

  const fail = (err: unknown, unit?: DashboardUnit) => {
    const e = err as ApiError;
    const conflicts = e?.details?.conflicts ?? [];
    setError(conflicts[0]?.message || e?.message || t('errors.generic'));
    setRetry(unit && conflicts.length > 0 && conflicts.every((c) => !c.blocking) ? unit : null);
  };

  const placeOn = async (unit: DashboardUnit, force = false) => {
    if (!listingId) return;
    setPicking(false);
    setError(null);
    setRetry(null);
    try {
      await actions.place({ developmentId, unitId: unit.id, listingId, force });
    } catch (err) {
      fail(err, unit);
    }
  };

  const linkResidenceOnly = async () => {
    if (!listingId) return;
    setError(null);
    try {
      await actions.attach({ developmentId, listingId });
    } catch (err) {
      fail(err);
    }
  };

  const requestAccess = async () => {
    setError(null);
    try {
      await actions.request({ slug: suggestion.development.slug, listingId });
      setRequested(true);
    } catch (err) {
      fail(err);
    }
  };

  return {
    picking,
    openPicker: () => setPicking(true),
    closePicker: () => setPicking(false),
    placeOn,
    attachAnyway: retry ? () => placeOn(retry, true) : null,
    linkResidenceOnly,
    requestAccess,
    requested,
    error,
    busy: actions.isPlacing || actions.isAttaching,
    isRequesting: actions.isRequesting,
  };
};
