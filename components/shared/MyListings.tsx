/**
 * MyListings Component
 * Displays and manages user's property listings
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '../../types';
import { useMyListings } from '../../src/features/properties/hooks/useMyListings';
import { useDeleteProperty } from '../../src/features/properties/hooks/useDeleteProperty';
import { useMarkPropertyAsSold } from '../../src/features/properties/hooks/usePropertyActions';
import PropertyCard from '../../src/features/property-details/components/PropertyCard';
import { PlusIcon, TrashIcon, PencilIcon, CheckCircleIcon, ExclamationCircleIcon } from '../../constants';
import { useConfirmation } from '../../src/shared/hooks/useConfirmation';
import { useNotification } from '../../src/shared/hooks/useNotification';
import { buildLocalizedPath } from '../../src/utils/languageRouting';

interface MyListingsProps {
  sellerId: string;
}

type ListingFilter = 'all' | 'active' | 'sold' | 'draft';

const MyListings: React.FC<MyListingsProps> = ({ sellerId }) => {
  const { t } = useTranslation(['account', 'property', 'common']);
  const { listings, isLoading, error, refetch, isEmpty } = useMyListings();
  const { deleteProperty, isLoading: isDeleting } = useDeleteProperty();
  const { markAsSold, isLoading: isMarkingSold } = useMarkPropertyAsSold();
  const { showConfirmation } = useConfirmation();
  const { showNotification } = useNotification();
  const [filter, setFilter] = useState<ListingFilter>('all');

  // Filter listings
  const filteredListings = listings.filter((listing: Property) => {
    switch (filter) {
      case 'active':
        return listing.status === 'active';
      case 'sold':
        return listing.status === 'sold';
      case 'draft':
        return listing.status === 'draft';
      default:
        return true;
    }
  });

  const handleDelete = async (propertyId: string, propertyTitle: string) => {
    const confirmed = await showConfirmation({
      title: t('account:listings.deleteConfirmTitle'),
      message: t('account:listings.deleteConfirmMessage', { title: propertyTitle }),
      confirmText: t('common:delete'),
      cancelText: t('common:cancel'),
      type: 'danger',
    });

    if (confirmed) {
      try {
        await deleteProperty(propertyId);
        showNotification({
          type: 'success',
          message: t('account:listings.deleteSuccess'),
        });
      } catch (error) {
        showNotification({
          type: 'error',
          message: t('account:listings.deleteError'),
        });
      }
    }
  };

  const handleMarkAsSold = async (propertyId: string) => {
    const confirmed = await showConfirmation({
      title: t('account:listings.markSoldTitle'),
      message: t('account:listings.markSoldMessage'),
      confirmText: t('account:listings.markAsSold'),
      cancelText: t('common:cancel'),
      type: 'warning',
    });

    if (confirmed) {
      try {
        await markAsSold(propertyId);
        showNotification({
          type: 'success',
          message: t('account:listings.markSoldSuccess'),
        });
      } catch (error) {
        showNotification({
          type: 'error',
          message: t('account:listings.markSoldError'),
        });
      }
    }
  };

  const handleEdit = (propertyId: string) => {
    window.location.href = buildLocalizedPath(`/sell/edit/${propertyId}`);
  };

  const handleAddNew = () => {
    window.location.href = buildLocalizedPath('/sell');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ExclamationCircleIcon className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-neutral-800 mb-2">
          {t('account:listings.errorTitle')}
        </h3>
        <p className="text-neutral-600 mb-4">{t('account:listings.errorMessage')}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          {t('common:retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filter and add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ListingFilter)}
            className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="all">{t('account:listings.filterAll')}</option>
            <option value="active">{t('account:listings.filterActive')}</option>
            <option value="sold">{t('account:listings.filterSold')}</option>
            <option value="draft">{t('account:listings.filterDraft')}</option>
          </select>
          <span className="text-sm text-neutral-500">
            {filteredListings.length} {t('account:listings.properties')}
          </span>
        </div>

        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>{t('account:listings.addNew')}</span>
        </button>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-neutral-50 rounded-xl">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
            <PlusIcon className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-800 mb-2">
            {t('account:listings.emptyTitle')}
          </h3>
          <p className="text-neutral-600 mb-4 max-w-md">
            {t('account:listings.emptyMessage')}
          </p>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>{t('account:listings.createFirst')}</span>
          </button>
        </div>
      )}

      {/* Listings grid */}
      {filteredListings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing: Property) => (
            <div key={listing.id} className="relative group">
              <PropertyCard property={listing} />

              {/* Action buttons overlay */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {listing.status !== 'sold' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(listing.id);
                      }}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white transition-colors"
                      title={t('common:edit')}
                    >
                      <PencilIcon className="w-4 h-4 text-neutral-700" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsSold(listing.id);
                      }}
                      disabled={isMarkingSold}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                      title={t('account:listings.markAsSold')}
                    >
                      <CheckCircleIcon className="w-4 h-4 text-green-600" />
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(listing.id, listing.title || listing.address || 'Property');
                  }}
                  disabled={isDeleting}
                  className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  title={t('common:delete')}
                >
                  <TrashIcon className="w-4 h-4 text-red-600" />
                </button>
              </div>

              {/* Status badge */}
              {listing.status === 'sold' && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded-lg">
                  {t('property:status.sold')}
                </div>
              )}
              {listing.status === 'draft' && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-amber-500 text-white text-xs font-semibold rounded-lg">
                  {t('property:status.draft')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyListings;
