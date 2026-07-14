import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { useMyHotels, useDeleteHotel } from '../hooks';
import type { Hotel } from '@/src/shared/types/hotel.types';
import { CURRENCY_SYMBOLS } from '@/src/shared/types/hotel.types';
import { PlusIcon, HomeIcon, PencilIcon, TrashIcon, EyeIcon, MapPinIcon } from '@/constants';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';

/**
 * Rough listing-quality score (0-100) to nudge hosts toward a fuller
 * profile — more photos/amenities/description tends to mean more clicks.
 */
const computeCompleteness = (hotel: Hotel): number => {
  let score = 0;
  if (hotel.coverImageUrl) score += 20;
  if ((hotel.images?.length || 0) >= 3) score += 20;
  if ((hotel.description?.length || 0) >= 80) score += 20;
  if ((hotel.amenities?.length || 0) >= 3) score += 15;
  if (hotel.rooms?.length && hotel.rooms.every((r) => (r.description?.length || 0) > 0)) score += 15;
  if ((hotel.languagesSpoken?.length || 0) > 0 || (hotel.houseRules?.length || 0) > 0) score += 10;
  return Math.min(100, score);
};

interface ManageHotelsPageProps {
  onBack: () => void;
  onCreate: () => void;
  onEdit: (hotel: Hotel) => void;
  onView: (hotel: Hotel) => void;
  onManageCodes: () => void;
}

const ManageHotelsPage: React.FC<ManageHotelsPageProps> = ({ onBack, onCreate, onEdit, onView, onManageCodes }) => {
  const { t } = useTranslation('hotels');
  const { state, dispatch } = useAppContext();
  const role = state.currentUser?.role;
  const isAdmin = role === 'admin' || role === 'super_admin';
  const { hotels, isLoading, refetch } = useMyHotels();
  const { deleteHotel } = useDeleteHotel();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(async (hotel: Hotel) => {
    if (!window.confirm(t('manage.deleteConfirm'))) return;
    setDeletingId(hotel.id);
    try {
      await deleteHotel(hotel.id);
      await refetch();
    } catch (err: any) {
      dispatch({
        type: 'SHOW_ALERT',
        payload: { type: 'error', title: t('form.errors.generic'), message: err?.message || '' },
      });
    } finally {
      setDeletingId(null);
    }
  }, [deleteHotel, refetch, dispatch, t]);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button onClick={onBack} className="text-sm text-white/70 hover:text-white font-medium mb-4">
            ← {t('detail.backToList')}
          </button>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                <HomeIcon className="w-7 h-7" /> {t('manage.title')}
              </h1>
              <p className="mt-1 text-white/70 text-sm">{t('manage.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && (
                <button
                  onClick={onManageCodes}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                >
                  {t('codes.manageCodes')}
                </button>
              )}
              <button
                onClick={onCreate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-900 font-semibold hover:bg-white/90 transition-colors"
              >
                <PlusIcon className="w-5 h-5" /> {t('page.listYourProperty')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white border border-neutral-200 animate-pulse" />
            ))}
          </div>
        ) : hotels.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-cyan-100 flex items-center justify-center">
              <HomeIcon className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-neutral-600 font-medium mb-4">{t('manage.empty')}</p>
            <button onClick={onCreate} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-medium">
              <PlusIcon className="w-4 h-4" /> {t('page.listYourProperty')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {hotels.map((hotel, i) => {
              const currencySymbol = CURRENCY_SYMBOLS[hotel.currency] || '€';
              const cover = hotel.coverImageUrl || hotel.images?.[0]?.url;
              const completeness = computeCompleteness(hotel);
              return (
                <motion.div
                  key={hotel.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex flex-col sm:flex-row gap-4 bg-white rounded-2xl border border-neutral-200 p-4 hover:shadow-md transition-shadow"
                >
                  {/* Thumb */}
                  <div className="w-full sm:w-32 h-32 sm:h-24 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
                    {cover ? (
                      <img src={optimizeCloudinaryUrl(cover, { width: 240, quality: 'auto', crop: 'fill' })} alt={hotel.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-300"><HomeIcon className="w-8 h-8" /></div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-neutral-900 break-words">{hotel.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${hotel.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-neutral-500'}`}>
                        {hotel.isActive ? t('manage.active') : t('manage.inactive')}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
                      <MapPinIcon className="w-4 h-4" /> {hotel.city}, {hotel.country}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                      <span>{t('manage.roomsLine', { count: hotel.rooms?.length || 0 })}</span>
                      <span className="font-semibold text-neutral-700">{currencySymbol}{hotel.priceFrom ?? '—'} / {t('card.night')}</span>
                      <span className="flex items-center gap-1">
                        <EyeIcon className="w-3.5 h-3.5" /> {t('manage.viewsCount', { count: hotel.views || 0 })}
                      </span>
                    </div>

                    {/* Listing-quality nudge — encourages hosts back into the edit flow */}
                    {completeness < 100 && (
                      <button
                        type="button"
                        onClick={() => onEdit(hotel)}
                        className="mt-3 w-full max-w-xs text-left group/nudge"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium text-neutral-500 group-hover/nudge:text-primary transition-colors">
                            {t('manage.completeness', { percent: completeness })}
                          </span>
                          <span className="text-[11px] font-semibold text-primary opacity-0 group-hover/nudge:opacity-100 transition-opacity">
                            {t('manage.improveListing')} →
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-primary transition-all"
                            style={{ width: `${completeness}%` }}
                          />
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0">
                    <button onClick={() => onView(hotel)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-50">
                      <EyeIcon className="w-4 h-4" /> {t('manage.view')}
                    </button>
                    <button onClick={() => onEdit(hotel)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90">
                      <PencilIcon className="w-4 h-4" /> {t('manage.edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(hotel)}
                      disabled={deletingId === hotel.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                    >
                      <TrashIcon className="w-4 h-4" /> {t('manage.delete')}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageHotelsPage;
