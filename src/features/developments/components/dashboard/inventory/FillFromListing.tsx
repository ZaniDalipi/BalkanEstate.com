import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Copy, Loader2, Undo2 } from 'lucide-react';
import { useUnitPrefill } from '../../../hooks/useUnitPrefill';
import type { UnitPrefill } from '../../../types';
import { ListingLinkPicker } from '../../scene/ListingLinkPicker';

/** What was filled, from which listing — enough to describe it. */
export interface FilledFrom {
  title: string;
  filled: number;
  skipped: UnitPrefill['skipped'];
  link: boolean;
  /** What will be copied, shown when the values are not visible in the form (adding units). */
  details?: string[];
}

interface FillFromListingProps {
  developmentId: string;
  source: FilledFrom | null;
  /** Whether the caller may link listings to units (listing.attach). */
  canLink: boolean;
  disabled: boolean;
  onFill: (prefill: UnitPrefill, canLink: boolean) => void;
  onUndo: () => void;
  onLinkChange: (link: boolean) => void;
  /** 'create' when the values go into a new unit (Add units), 'edit' in the unit editor. */
  mode?: 'edit' | 'create';
}

/**
 * "Fill from a listing": pick one of your listings and its rooms, areas,
 * price, outlook, description and features are copied into the form (review
 * them, then save). Optionally the listing is linked to this unit on save.
 */
export const FillFromListing: React.FC<FillFromListingProps> = ({ developmentId, source, canLink, disabled, onFill, onUndo, onLinkChange, mode = 'edit' }) => {
  const { t } = useTranslation('developments');
  const [open, setOpen] = useState(false);
  const prefill = useUnitPrefill(developmentId);

  const pick = async (listingId: string) => {
    try {
      onFill(await prefill.load(listingId), canLink);
      setOpen(false);
    } catch {
      /* the error is shown below */
    }
  };

  if (source) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {mode === 'create'
              ? t('inventory.prefill.doneCreate', { title: source.title, defaultValue: 'From “{{title}}” — these details are added to the new unit when you click Add unit.' })
              : t('inventory.prefill.done', { n: source.filled, title: source.title, defaultValue: 'Filled {{n}} fields from “{{title}}”. Review them, then save.' })}
          </p>
          <button type="button" onClick={onUndo} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-900 underline-offset-2 hover:underline">
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            {t('inventory.prefill.undo', 'Undo')}
          </button>
        </div>
        {source.details && source.details.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t('inventory.prefill.copied', 'Copied from the listing')}>
            {source.details.map((d) => (
              <li key={d} className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200">
                {d}
              </li>
            ))}
          </ul>
        )}
        {source.skipped.includes('rentPrice') && <p className="mt-1">{t('inventory.prefill.rentSkipped', 'This is a rental listing, so its monthly rent was not copied as the price.')}</p>}
        {canLink && (
          <label className="mt-2 flex min-h-[40px] items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-[#0252CD]" checked={source.link} onChange={(e) => onLinkChange(e.target.checked)} />
            {mode === 'create'
              ? t('inventory.prefill.linkCreate', 'Also link this listing to the new unit')
              : t('inventory.prefill.link', 'Also link this listing to the unit when I save')}
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-3">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} disabled={disabled} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline disabled:opacity-50">
          <Copy className="h-4 w-4" aria-hidden="true" />
          {t('inventory.prefill.open', 'Fill from one of your listings')}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-slate-700">{t('inventory.prefill.hint', 'Choose a listing — its details are copied here so you don’t type them twice.')}</p>
          <ListingLinkPicker developmentId={developmentId} value="" onPick={(id) => void pick(id)} onClear={() => setOpen(false)} />
          {prefill.isLoading && (
            <p className="flex items-center gap-1.5 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t('inventory.prefill.loading', 'Reading the listing…')}
            </p>
          )}
          {prefill.error && (
            <p role="alert" className="text-sm text-red-700">
              {(prefill.error as { message?: string }).message || t('errors.generic')}
            </p>
          )}
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-600 hover:underline">{t('wizard.cancel', 'Cancel')}</button>
        </div>
      )}
    </div>
  );
};
