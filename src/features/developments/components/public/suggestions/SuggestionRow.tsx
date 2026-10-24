import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Check, Loader2, MapPin } from 'lucide-react';
import { localizePath } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import type { NearbySuggestion } from '../../../types';
import { UnitPickerDialog } from '../../dashboard/listings/UnitPickerDialog';
import { useSuggestionRow } from './useSuggestionRow';

interface SuggestionRowProps {
  suggestion: NearbySuggestion;
  /** The saved listing; attaching needs it (save the listing first). */
  listingId?: string;
}

const primaryBtn = 'inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50';
const linkBtn = 'text-sm font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50';

/** One nearby residence: where the listing sits in it today, and how to attach it. */
export const SuggestionRow: React.FC<SuggestionRowProps> = ({ suggestion, listingId }) => {
  const { t } = useTranslation('developments');
  const row = useSuggestionRow(suggestion, listingId);
  const { development: dev, distanceM, matchScore, canAttach, attachment } = suggestion;
  const km = Math.max(0.1, Math.round((distanceM / 1000) * 10) / 10);
  const onApartment = !!attachment?.unitNumber;

  return (
    <li className="rounded-xl border border-border bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <a href={localizePath(paths.development(dev.slug))} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate font-medium text-foreground hover:text-primary">
            <span className="truncate">{dev.name}</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </a>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {dev.city}
            </span>
            <span>{t('suggest.distanceKm', { km })}</span>
            <span className="font-medium text-primary">{t('suggest.match', { score: matchScore })}</span>
          </div>
          {attachment && (
            <p className="mt-1.5 flex items-center gap-1 text-sm font-medium text-green-700">
              <Check className="h-4 w-4" aria-hidden="true" />
              {onApartment
                ? t('suggest.onApartment', { unit: attachment.unitNumber, building: attachment.buildingName ?? '', defaultValue: 'On apartment {{unit}} · {{building}}' })
                : t('suggest.residenceOnly', 'Linked to the residence, not to an apartment yet')}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {canAttach ? (
            <>
              <button type="button" onClick={row.openPicker} disabled={!listingId || row.busy} className={primaryBtn}>
                {row.busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                {onApartment ? t('suggest.changeApartment', 'Change apartment') : t('suggest.chooseApartment', 'Choose apartment')}
              </button>
              {!attachment && (
                <button type="button" onClick={row.linkResidenceOnly} disabled={!listingId || row.busy} className={linkBtn}>
                  {t('suggest.linkResidenceOnly', 'Link to the residence only')}
                </button>
              )}
            </>
          ) : row.requested ? (
            <span className="flex items-center gap-1 text-sm font-medium text-green-700">
              <Check className="h-4 w-4" aria-hidden="true" />
              {t('suggest.requested')}
            </span>
          ) : (
            <button type="button" onClick={row.requestAccess} disabled={row.isRequesting} className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-sm font-medium text-foreground disabled:opacity-50">
              {row.isRequesting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {row.isRequesting ? t('suggest.requesting') : t('suggest.request')}
            </button>
          )}
        </div>
      </div>
      {canAttach && !listingId && <p className="mt-2 text-xs text-muted-foreground">{t('suggest.saveFirst')}</p>}
      {canAttach && listingId && !attachment && (
        <p className="mt-2 text-xs text-muted-foreground">{t('suggest.chooseHint', 'Choose the apartment so buyers find this listing on it in the residence explorer.')}</p>
      )}
      {!canAttach && !row.requested && <p className="mt-2 text-xs text-muted-foreground">{t('suggest.requestHint')}</p>}
      {row.error && (
        <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-xs text-red-700">
          <span>{row.error}</span>
          {row.attachAnyway && (
            <button type="button" onClick={row.attachAnyway} className="font-semibold underline">
              {t('suggest.attachAnyway', 'Attach anyway')}
            </button>
          )}
        </div>
      )}
      {row.picking && <UnitPickerDialog developmentId={dev.id} onPick={(unit) => void row.placeOn(unit)} onClose={row.closePicker} />}
    </li>
  );
};
