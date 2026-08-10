import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { useHotelReviews, useCreateReview } from '../hooks';
import { REVIEW_CATEGORIES, type ReviewCategory } from '@/src/shared/types/hotel.types';
import { StarIconSolid, StarIcon } from '@/constants';

interface ReviewsSectionProps {
  hotelId: string;
}

/** Read-only star row. */
const Stars: React.FC<{ value: number; className?: string }> = ({ value, className = 'w-4 h-4' }) => (
  <span className="inline-flex items-center gap-0.5 text-amber-400" aria-label={`${value}/5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      n <= Math.round(value)
        ? <StarIconSolid key={n} className={className} />
        : <StarIcon key={n} className={`${className} text-neutral-300`} />
    ))}
  </span>
);

/** Clickable star input. */
const StarInput: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <span className="inline-flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" onClick={() => onChange(n)} className="transition-transform hover:scale-110" aria-label={`${n}`}>
        {n <= value
          ? <StarIconSolid className="w-7 h-7 text-amber-400" />
          : <StarIcon className="w-7 h-7 text-neutral-300" />}
      </button>
    ))}
  </span>
);

const fmtDate = (iso: string, lang: string) => {
  try { return new Date(iso).toLocaleDateString(lang, { month: 'long', year: 'numeric' }); }
  catch { return iso; }
};

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ hotelId }) => {
  const { t, i18n } = useTranslation('hotels');
  const { state, dispatch } = useAppContext();
  const { reviews, summary, total, isLoading, refetch } = useHotelReviews(hotelId);
  const { createReview, isLoading: saving } = useCreateReview(hotelId);

  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [cats, setCats] = useState<Record<ReviewCategory, number>>({ cleanliness: 0, location: 0, value: 0, service: 0 });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (rating < 1) { setError(t('reviews.ratingRequired')); return; }
    try {
      await createReview({
        hotelId,
        rating,
        comment: comment.trim() || undefined,
        ...REVIEW_CATEGORIES.reduce((acc, c) => ({ ...acc, [c]: cats[c] || undefined }), {}),
      });
      setOpen(false);
      setRating(0); setComment(''); setCats({ cleanliness: 0, location: 0, value: 0, service: 0 });
      refetch();
      dispatch({ type: 'SHOW_ALERT', payload: { type: 'success', title: t('reviews.title'), message: t('reviews.thanks') } });
    } catch (err: any) {
      setError(err?.message || t('form.errors.generic'));
    }
  };

  const startReview = () => {
    if (!state.isAuthenticated) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
      return;
    }
    setOpen((o) => !o);
  };

  const avg = summary?.avgRating || 0;
  const count = summary?.reviewCount || 0;
  const categoryEntries = summary
    ? (Object.entries(summary.categories) as Array<[ReviewCategory, number | null]>).filter(([, v]) => v != null)
    : [];

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
          <StarIconSolid className="w-5 h-5 text-amber-400" />
          {count > 0 ? `${avg.toFixed(1)} · ${t('reviews.reviewsCount', { count })}` : t('reviews.title')}
        </h2>
        <button
          type="button"
          onClick={startReview}
          className="px-4 py-2 rounded-xl border border-neutral-800 text-neutral-800 text-sm font-semibold hover:bg-neutral-50 transition-colors"
        >
          {t('reviews.writeReview')}
        </button>
      </div>

      {/* Category score bars */}
      {categoryEntries.length > 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
          {categoryEntries.map(([cat, v]) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="w-28 text-sm text-neutral-600 shrink-0">{t(`reviews.categories.${cat}`)}</span>
              <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                <div className="h-full rounded-full bg-neutral-800" style={{ width: `${((v || 0) / 5) * 100}%` }} />
              </div>
              <span className="w-8 text-right text-sm font-medium text-neutral-800 tabular-nums">{(v || 0).toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Write-a-review form */}
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-5 rounded-2xl border border-neutral-200 p-4 bg-neutral-50/60"
        >
          <p className="text-sm font-semibold text-neutral-700 mb-2">{t('reviews.yourRating')}</p>
          <StarInput value={rating} onChange={setRating} />
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REVIEW_CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-center justify-between gap-2">
                <span className="text-sm text-neutral-600">{t(`reviews.categories.${cat}`)}</span>
                <span className="inline-flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setCats((c) => ({ ...c, [cat]: n }))} aria-label={`${cat} ${n}`}>
                      {n <= cats[cat] ? <StarIconSolid className="w-4 h-4 text-amber-400" /> : <StarIcon className="w-4 h-4 text-neutral-300" />}
                    </button>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={t('reviews.commentPlaceholder')}
            className="mt-3 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-100">
              {t('form.cancel')}
            </button>
            <button type="button" onClick={handleSubmit} disabled={saving} className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60">
              {saving ? t('reviews.submitting') : t('reviews.submit')}
            </button>
          </div>
        </motion.div>
      )}

      {/* Review list */}
      <div className="mt-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-neutral-100 animate-pulse" />)}
          </div>
        ) : total === 0 ? (
          <p className="text-sm text-neutral-500 py-4 text-center">{t('reviews.beFirst')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {reviews.map((r) => (
              <div key={r.id} className="border-t border-neutral-100 pt-4 sm:border-t-0 sm:pt-0">
                <div className="flex items-center gap-3">
                  {r.guestAvatar ? (
                    <img src={r.guestAvatar} alt={r.guestName} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                      {r.guestName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">{r.guestName}</p>
                    <p className="text-xs text-neutral-400">{fmtDate(r.createdAt, i18n.language)}</p>
                  </div>
                </div>
                <div className="mt-2"><Stars value={r.rating} /></div>
                {r.comment && <p className="mt-2 text-sm text-neutral-600 leading-relaxed break-words">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsSection;
