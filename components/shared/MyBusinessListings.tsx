import React, { useState, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useMyBusinessListings, useDeleteBusinessListing } from '@/src/features/business-directory/hooks';
import { useAppContext } from '@/context/AppContext';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { buildLocalizedPath } from '@/src/utils/languageRouting';
import { generateBusinessSlug } from '@/utils/slug';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import {
  BuildingStorefrontIcon,
  UserIcon,
  MapPinIcon,
  EyeIcon,
  PencilIcon,
  CheckBadgeIcon,
  ArrowLeftIcon,
} from '@/constants';

const EditBusinessListingForm = lazy(() => import('@/src/features/business-directory/components/EditBusinessListingForm'));

const CATEGORY_GRADIENTS: Record<string, string> = {
  construction: 'from-amber-500 to-orange-600',
  renovation: 'from-blue-500 to-cyan-600',
  cleaning: 'from-emerald-400 to-teal-600',
  moving: 'from-purple-500 to-indigo-600',
  interior_design: 'from-pink-500 to-rose-600',
  architecture: 'from-slate-500 to-zinc-700',
  plumbing: 'from-sky-500 to-blue-600',
  electrical: 'from-yellow-500 to-amber-600',
  landscaping: 'from-green-500 to-emerald-700',
  security: 'from-red-500 to-rose-700',
  real_estate_law: 'from-indigo-500 to-violet-700',
  insurance: 'from-cyan-500 to-blue-700',
  home_inspection: 'from-orange-400 to-red-600',
  pest_control: 'from-lime-500 to-green-700',
  painting: 'from-fuchsia-500 to-purple-700',
  roofing: 'from-stone-500 to-neutral-700',
  hvac: 'from-blue-400 to-indigo-600',
  furniture: 'from-amber-400 to-yellow-600',
  appliances: 'from-gray-500 to-slate-700',
  other: 'from-primary to-blue-600',
};

const MyBusinessListings: React.FC = () => {
  const { t } = useTranslation(['businessDirectory', 'account']);
  const { dispatch } = useAppContext();
  const { listings, isLoading, error, refetch } = useMyBusinessListings(true);
  const { deleteListing } = useDeleteBusinessListing();
  const { confirm } = useConfirmation();
  const { success, error: notifyError } = useNotification();
  const [editingListing, setEditingListing] = useState<BusinessListing | null>(null);

  const navigateToListing = useCallback((listing: BusinessListing) => {
    const urlSlug = generateBusinessSlug(listing);
    dispatch({ type: 'SET_SELECTED_BUSINESS_LISTING', payload: listing.id });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'business-directory' });
    window.history.pushState({}, '', buildLocalizedPath(`/business-directory/${urlSlug}`));
  }, [dispatch]);

  const handleEdit = useCallback((listing: BusinessListing) => {
    setEditingListing(listing);
  }, []);

  const handleEditBack = useCallback(() => {
    setEditingListing(null);
  }, []);

  const handleEditSuccess = useCallback(() => {
    setEditingListing(null);
    refetch();
    success(
      t('businessDirectory:myBusinesses.editSuccessTitle', 'Updated'),
      t('businessDirectory:myBusinesses.editSuccessMessage', 'Business listing has been updated.'),
    );
  }, [refetch, success, t]);

  const handleDelete = useCallback(async (listing: BusinessListing) => {
    const confirmed = await confirm(
      t('businessDirectory:delete.confirmTitle', 'Delete Listing'),
      t('businessDirectory:delete.confirmMessage', { name: listing.name, defaultValue: `Are you sure you want to delete "${listing.name}"? This action cannot be undone.` }),
    );
    if (!confirmed) return;

    try {
      await deleteListing(listing.id);
      success(
        t('businessDirectory:delete.successTitle', 'Deleted'),
        t('businessDirectory:delete.successMessage', 'Business listing has been deleted.'),
      );
    } catch {
      notifyError(
        t('businessDirectory:delete.errorTitle', 'Error'),
        t('businessDirectory:delete.errorMessage', 'Failed to delete listing. Please try again.'),
      );
    }
  }, [deleteListing, confirm, success, notifyError, t]);

  const handleCreateNew = useCallback(() => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'business-directory' });
    window.history.pushState({}, '', buildLocalizedPath('/business-directory'));
  }, [dispatch]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 bg-neutral-200 rounded-lg w-40 animate-pulse" />
          <div className="h-10 bg-neutral-200 rounded-xl w-36 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-neutral-100 rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-2xl flex items-center justify-center">
          <BuildingStorefrontIcon className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-neutral-700 mb-2">
          {t('businessDirectory:myBusinesses.errorTitle', 'Failed to load businesses')}
        </h3>
        <p className="text-neutral-500 text-sm">
          {t('businessDirectory:myBusinesses.errorMessage', 'Something went wrong. Please try again later.')}
        </p>
      </div>
    );
  }

  // Edit mode - show the edit form inline
  if (editingListing) {
    return (
      <div>
        {/* Back to list header */}
        <button
          onClick={handleEditBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-primary transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {t('businessDirectory:myBusinesses.backToList', 'Back to My Businesses')}
        </button>
        <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
          <EditBusinessListingForm
            listing={editingListing}
            onBack={handleEditBack}
            onSuccess={handleEditSuccess}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
            {t('account:tabs.myBusinesses', 'My Businesses')}
          </h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            {t('businessDirectory:myBusinesses.subtitle', { count: listings.length, defaultValue: `${listings.length} business listing${listings.length !== 1 ? 's' : ''}` })}
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t('businessDirectory:myBusinesses.createNew', 'New Business')}
        </button>
      </div>

      {/* Empty state */}
      {listings.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-3xl flex items-center justify-center">
            <BuildingStorefrontIcon className="w-10 h-10 text-primary/60" />
          </div>
          <h3 className="text-lg font-bold text-neutral-700 mb-2">
            {t('businessDirectory:myBusinesses.emptyTitle', 'No businesses yet')}
          </h3>
          <p className="text-neutral-500 text-sm max-w-md mx-auto mb-6">
            {t('businessDirectory:myBusinesses.emptyMessage', 'Create your first business listing to showcase your services in the directory.')}
          </p>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('businessDirectory:myBusinesses.createFirst', 'Create Business Listing')}
          </button>
        </div>
      )}

      {/* Business cards grid - responsive */}
      {listings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {listings.map((listing) => (
            <BusinessListingCard
              key={listing.id}
              listing={listing}
              onView={navigateToListing}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- Card sub-component ---

interface BusinessListingCardProps {
  listing: BusinessListing;
  onView: (listing: BusinessListing) => void;
  onEdit: (listing: BusinessListing) => void;
  onDelete: (listing: BusinessListing) => void;
}

const BusinessListingCard: React.FC<BusinessListingCardProps> = ({ listing, onView, onEdit, onDelete }) => {
  const { t } = useTranslation('businessDirectory');
  const gradient = CATEGORY_GRADIENTS[listing.category] || CATEGORY_GRADIENTS.other;
  const isIndividual = listing.listingType === 'individual';

  return (
    <div
      className="group bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer"
      onClick={() => onView(listing)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onView(listing); }}
    >
      {/* Banner strip */}
      <div className={`h-20 sm:h-24 bg-gradient-to-r ${gradient} relative overflow-hidden`}>
        {listing.bannerUrl && (
          <img src={listing.bannerUrl} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/10" />

        {/* Status badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-sm border ${
            listing.isActive
              ? 'bg-emerald-500/80 text-white border-emerald-400/30'
              : 'bg-neutral-500/80 text-white border-neutral-400/30'
          }`}>
            {listing.isActive ? t('status.active', 'Active') : t('status.inactive', 'Inactive')}
          </span>
          {listing.isVerified && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/80 text-emerald-600 backdrop-blur-sm border border-white/30 flex items-center gap-0.5">
              <CheckBadgeIcon className="w-3 h-3" />
              {t('verified')}
            </span>
          )}
        </div>

        {/* Type badge */}
        <div className="absolute top-2 right-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/80 backdrop-blur-sm border border-white/30 text-neutral-700 flex items-center gap-0.5">
            {isIndividual ? <UserIcon className="w-3 h-3" /> : <BuildingStorefrontIcon className="w-3 h-3" />}
            {isIndividual ? t('types.individual') : t('types.business')}
          </span>
        </div>

        {/* Logo - overlapping banner */}
        <div className={`absolute -bottom-5 left-4 w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-[3px] border-white shadow-lg bg-gradient-to-br ${gradient}`}>
          {listing.logoUrl ? (
            <img src={listing.logoUrl} alt={listing.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-lg sm:text-xl font-bold text-white">{listing.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pt-7 sm:pt-8 px-4 pb-4">
        {/* Name + category */}
        <h3 className="font-bold text-neutral-900 text-base sm:text-lg truncate mb-1">{listing.name}</h3>
        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/5 text-primary rounded-full font-medium border border-primary/10">
            {t(`categories.${listing.category}`)}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-3">
          <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{listing.city}, {listing.country}</span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-neutral-400 mb-3">
          <span className="flex items-center gap-1">
            <EyeIcon className="w-3.5 h-3.5" />
            {listing.views} {t('detail.stats.views')}
          </span>
          <span className="flex items-center gap-1">
            <BuildingStorefrontIcon className="w-3.5 h-3.5" />
            {listing.services.length} {t('detail.stats.services')}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
          <button
            onClick={(e) => { e.stopPropagation(); onView(listing); }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold rounded-xl transition-colors border border-primary/10"
          >
            <EyeIcon className="w-3.5 h-3.5" />
            {t('myBusinesses.view', 'View')}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(listing); }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold rounded-xl transition-colors border border-neutral-200"
          >
            <PencilIcon className="w-3.5 h-3.5" />
            {t('myBusinesses.edit', 'Edit')}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(listing); }}
            className="flex items-center justify-center p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
            title={t('myBusinesses.delete', 'Delete')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyBusinessListings;
