import React, { Suspense, lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, CalendarDays, GitCompareArrows, Heart, MessageSquare } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { useProperty } from '@/src/features/properties/hooks/useProperty';
import { SocialShare } from '@/src/components/marketing/SocialShare';
import { cn } from '@/src/lib/utils';

const PropertyInquiryModal = lazy(() => import('@/src/features/inquiries/components/PropertyInquiryModal'));
const ScheduleViewingModal = lazy(() => import('@/src/features/rental/components/ScheduleViewingModal'));

interface ListingActionsProps {
  listingId: string;
  /** False for sold / rented units: no inquiry or viewing. */
  pursuable: boolean;
  onModalChange: (open: boolean) => void;
}

const secondary =
  'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/** Platform actions for a unit's primary listing (inquiry, viewing, save, compare, share, open). */
export const ListingActions: React.FC<ListingActionsProps> = ({ listingId, pursuable, onModalChange }) => {
  const { t } = useTranslation('developments');
  const { state, dispatch, toggleSavedHome } = useAppContext();
  const { property } = useProperty(listingId, { enabled: !!listingId, enablePolling: false });
  const [modal, setModal] = useState<'inquiry' | 'viewing' | null>(null);
  const setOpen = (m: typeof modal) => {
    setModal(m);
    onModalChange(m !== null);
  };

  const saved = !!property && state.savedHomes.some((p) => p.id === property.id);
  const compared = state.comparisonList.includes(listingId);
  const requireAuth = () => {
    if (state.isAuthenticated) return true;
    dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
    return false;
  };
  const onSave = () => property && requireAuth() && void toggleSavedHome(property).catch(() => undefined);
  const onCompare = () => {
    if (compared) dispatch({ type: 'REMOVE_FROM_COMPARISON', payload: listingId });
    else if (state.comparisonList.length >= 5)
      dispatch({ type: 'SHOW_ALERT', payload: { type: 'warning', title: t('explorer.compareLimitTitle', 'Comparison limit'), message: t('explorer.compareLimit', 'You can compare up to 5 homes.') } });
    else dispatch({ type: 'ADD_TO_COMPARISON', payload: listingId });
  };

  return (
    <div className="space-y-3">
      {pursuable && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={!property} onClick={() => setOpen('inquiry')} className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            {t('explorer.drawer.inquire', 'Send inquiry')}
          </button>
          <button type="button" disabled={!property} onClick={() => setOpen('viewing')} className={cn(secondary, 'min-h-[48px] disabled:opacity-60')}>
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {t('explorer.drawer.scheduleViewing', 'Schedule viewing')}
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onSave} disabled={!property} aria-pressed={saved} className={secondary}>
          <Heart className={cn('h-4 w-4', saved && 'fill-red-500 text-red-500')} aria-hidden="true" />
          {saved ? t('explorer.drawer.saved', 'Saved') : t('explorer.drawer.save', 'Save')}
        </button>
        <button type="button" onClick={onCompare} aria-pressed={compared} className={secondary}>
          <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
          {compared ? t('explorer.drawer.compared', 'In comparison') : t('explorer.drawer.compare', 'Compare')}
        </button>
        {typeof window !== 'undefined' && (
          <SocialShare variant="dropdown" url={window.location.href} title={property?.title ?? document.title} image={property?.imageUrl} />
        )}
      </div>
      <button type="button" onClick={() => navigate(paths.property(listingId))} className={cn(secondary, 'w-full')}>
        {t('explorer.drawer.openListing', 'Open full listing')}
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </button>
      {property && modal && (
        <Suspense fallback={null}>
          {modal === 'inquiry' ? (
            <PropertyInquiryModal property={property} isOpen onClose={() => setOpen(null)} defaultName={state.currentUser?.name} defaultEmail={state.currentUser?.email} defaultPhone={state.currentUser?.phone} />
          ) : (
            <ScheduleViewingModal property={property} isOpen onClose={() => setOpen(null)} />
          )}
        </Suspense>
      )}
    </div>
  );
};
