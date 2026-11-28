import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ScanSearch } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import type { FloorReview } from './useFloorReview';

/**
 * The checklist for automatically placed regions, at the top of the sidebar:
 * how many are checked, the next one to check, and "Looks right" for the
 * selected one. Hidden until something was placed.
 */
export const FloorReviewPanel: React.FC<{ review: FloorReview }> = ({ review }) => {
  const { t } = useTranslation('developments');
  if (review.total === 0) return null;
  const left = review.pending.length;
  const done = review.total - left;

  if (left === 0) {
    return (
      <p role="status" className="flex items-center gap-1.5 rounded-lg bg-emerald-50 p-2 text-xs font-medium text-emerald-800">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        {t('editor.review.allChecked', 'All automatically placed regions are checked.')}
      </p>
    );
  }
  return (
    <section aria-label={t('editor.review.panel', 'Regions to check')} className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
        <ScanSearch className="h-4 w-4" aria-hidden="true" />
        {t('editor.review.left', { count: left, defaultValue: '{{count}} new regions to check' })}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-amber-100" role="progressbar" aria-valuemin={0} aria-valuemax={review.total} aria-valuenow={done} aria-label={t('editor.review.progress', { done, total: review.total, defaultValue: 'Checked {{done}} of {{total}}' })}>
        <div className="h-full bg-amber-500 transition-[width]" style={{ width: `${(done / review.total) * 100}%` }} />
      </div>
      <p className="text-xs leading-relaxed text-amber-900">
        {t('editor.review.hint', 'Move each one onto the building and check its apartment. Positions on an angled photo are only a first guess.')}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="min-h-[44px] flex-1 sm:min-h-0" onClick={review.next}>
          {review.selectedPending ? t('editor.review.nextOne', 'Next to check') : t('editor.review.start', 'Start checking')}
        </Button>
        {review.selectedPending && (
          <Button size="sm" variant="outline" className="min-h-[44px] flex-1 sm:min-h-0" onClick={review.markSelected}>
            {t('editor.review.looksRight', 'Looks right')}
          </Button>
        )}
      </div>
      <button type="button" onClick={review.markAll} className="min-h-[44px] text-xs text-amber-900 underline underline-offset-2 sm:min-h-0">
        {t('editor.review.markAll', 'I have checked them all')}
      </button>
    </section>
  );
};
