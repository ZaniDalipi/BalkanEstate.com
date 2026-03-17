import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '@/src/shared/api';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { BuildingStorefrontIcon, TrashIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from '@/constants';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';

interface AdminBusinessListing extends BusinessListing {
  _id: string;
  owner?: { name: string; email: string; avatarUrl?: string };
}

const BusinessListingManager: React.FC = () => {
  const { t } = useTranslation(['admin', 'businessDirectory']);
  const { confirm } = useConfirmation();

  const [listings, setListings] = useState<AdminBusinessListing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        ...(search && { search }),
      });
      const data = await apiRequest<any>(`/admin/business-listings?${params}`, {
        requiresAuth: true,
      });
      setListings(data.listings || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch business listings');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleDelete = useCallback(async (listing: AdminBusinessListing) => {
    const confirmed = await confirm({
      title: 'Delete Business Listing',
      message: `Are you sure you want to delete "${listing.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await apiRequest(`/admin/business-listings/${listing._id || listing.id}`, {
        method: 'DELETE',
        requiresAuth: true,
      });
      setListings(prev => prev.filter(l => (l._id || l.id) !== (listing._id || listing.id)));
      setTotal(prev => prev - 1);
      setSuccessMessage(`"${listing.name}" deleted successfully`);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete listing');
    }
  }, [confirm]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchListings();
  }, [fetchListings]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <BuildingStorefrontIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Business Listings</h1>
            <p className="text-sm text-neutral-500">{total} total listings</p>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, city..."
              className="pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary w-64"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
          {successMessage}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-neutral-400">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading listings...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <BuildingStorefrontIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No business listings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Business</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Owner</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Location</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Views</th>
                  <th className="text-right px-4 py-3 font-semibold text-neutral-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {listings.map((listing) => (
                  <tr key={listing._id || listing.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {listing.logoUrl ? (
                          <img src={listing.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <BuildingStorefrontIcon className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-neutral-900 truncate max-w-[200px]">{listing.name}</p>
                          {listing.contactPhone && (
                            <p className="text-xs text-neutral-400">{listing.contactPhone}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-neutral-700">{listing.owner?.name || 'Unknown'}</p>
                        <p className="text-xs text-neutral-400">{listing.owner?.email || ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium capitalize">
                        {listing.category?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {listing.city}{listing.country ? `, ${listing.country}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        listing.listingType === 'business'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-violet-50 text-violet-600'
                      }`}>
                        {listing.listingType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{listing.views || 0}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(listing)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete listing"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessListingManager;
