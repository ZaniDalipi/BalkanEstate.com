import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { API_URL } from '../../src/shared/api/config';

type ViewingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
type StatusFilter = ViewingStatus | 'all';

interface ViewingProperty {
  _id: string;
  title?: string;
  propertyType?: string;
  city?: string;
  country?: string;
  address?: string;
  imageUrl?: string;
  price?: number;
  listingType?: string;
}

interface ViewingRequest {
  id: string;
  property: ViewingProperty;
  visitorName: string;
  visitorEmail: string;
  visitorPhone?: string;
  visitorMessage?: string;
  date: string;
  timeSlot: string;
  status: ViewingStatus;
  cancelledBy?: string;
  cancelReason?: string;
  createdAt: string;
}

interface ViewingCounts {
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  total: number;
}

const statusConfig: Record<ViewingStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'Pending', bg: 'bg-amber-50/60', text: 'text-amber-700', dot: 'bg-amber-400' },
  confirmed: { label: 'Approved', bg: 'bg-green-50/60', text: 'text-green-700', dot: 'bg-green-400' },
  cancelled: { label: 'Declined', bg: 'bg-red-50/60', text: 'text-red-700', dot: 'bg-red-400' },
  completed: { label: 'Completed', bg: 'bg-blue-50/60', text: 'text-blue-700', dot: 'bg-blue-400' },
};

const ViewingRequestsTab: React.FC = () => {
  const { dispatch } = useAppContext();
  const [viewings, setViewings] = useState<ViewingRequest[]>([]);
  const [counts, setCounts] = useState<ViewingCounts>({ pending: 0, confirmed: 0, cancelled: 0, completed: 0, total: 0 });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [declineViewingId, setDeclineViewingId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const token = localStorage.getItem('balkan_estate_token');

  const fetchViewings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`${API_URL}/viewings/seller?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to fetch viewing requests');
      }

      const data = await res.json();
      setViewings(data.viewings || []);
      setCounts(data.counts || { pending: 0, confirmed: 0, cancelled: 0, completed: 0, total: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, token]);

  useEffect(() => {
    fetchViewings();
  }, [fetchViewings]);

  const updateStatus = async (viewingId: string, status: 'confirmed' | 'cancelled' | 'completed', cancelReason?: string) => {
    setActionLoading(viewingId);
    try {
      const res = await fetch(`${API_URL}/viewings/${viewingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, cancelReason }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update viewing status');
      }

      // Refresh the list
      await fetchViewings();
      setDeclineViewingId(null);
      setDeclineReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatRelativeDate = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Past';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `In ${diffDays} days`;
    return '';
  };

  const isPast = (dateStr: string) => {
    return new Date(dateStr) < new Date(new Date().toDateString());
  };

  const navigateToProperty = (propertyId: string) => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
    window.history.pushState({}, '', `/property/${propertyId}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const filterTabs: { key: StatusFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: counts.total },
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'confirmed', label: 'Approved', count: counts.confirmed },
    { key: 'cancelled', label: 'Declined', count: counts.cancelled },
    { key: 'completed', label: 'Completed', count: counts.completed },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-800">Viewing Requests</h2>
        <p className="text-neutral-500 text-sm mt-1">
          Manage property viewing requests from potential buyers. Approve or decline to notify them by email.
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border backdrop-blur-sm ${
              statusFilter === tab.key
                ? 'bg-white/70 text-primary border-white/60 shadow-sm'
                : 'text-neutral-600 hover:bg-white/40 border-transparent hover:border-white/30'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                statusFilter === tab.key ? 'bg-primary/15 text-primary' : 'bg-neutral-200/60 text-neutral-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50/60 backdrop-blur-sm border border-red-200/50 rounded-2xl">
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={fetchViewings} className="text-sm text-red-600 underline mt-1">Try again</button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-2xl p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-neutral-200/50 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-neutral-200/50 rounded w-3/4" />
                  <div className="h-3 bg-neutral-200/40 rounded w-1/2" />
                  <div className="h-3 bg-neutral-200/40 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && viewings.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/40 backdrop-blur-sm border border-white/40 flex items-center justify-center">
            <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-neutral-700 mb-1">No viewing requests</h3>
          <p className="text-neutral-500 text-sm">
            {statusFilter === 'all'
              ? 'When someone schedules a viewing for your property, it will appear here.'
              : `No ${statusFilter} viewing requests found.`}
          </p>
        </div>
      )}

      {/* Viewing request cards */}
      {!isLoading && viewings.length > 0 && (
        <div className="space-y-4">
          {viewings.map(viewing => {
            const config = statusConfig[viewing.status];
            const past = isPast(viewing.date);
            const relative = formatRelativeDate(viewing.date);
            const propertyTitle = viewing.property?.title || `${viewing.property?.propertyType || 'Property'} in ${viewing.property?.city || 'Unknown'}`;

            return (
              <div
                key={viewing.id}
                className={`bg-white/30 backdrop-blur-sm border border-white/40 rounded-2xl p-5 transition-all hover:shadow-md ${
                  viewing.status === 'pending' ? 'ring-1 ring-amber-200/50' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Property image */}
                  {viewing.property?.imageUrl && (
                    <button
                      onClick={() => navigateToProperty(viewing.property._id)}
                      className="w-full sm:w-24 h-32 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer group"
                    >
                      <img
                        src={viewing.property.imageUrl}
                        alt={propertyTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                      <div>
                        <button
                          onClick={() => navigateToProperty(viewing.property._id)}
                          className="text-base font-semibold text-neutral-800 hover:text-primary transition-colors text-left"
                        >
                          {propertyTitle}
                        </button>
                        <p className="text-sm text-neutral-500">
                          {[viewing.property?.city, viewing.property?.country].filter(Boolean).join(', ')}
                        </p>
                      </div>
                      {/* Status badge */}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} border border-current/10 self-start flex-shrink-0`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                        {config.label}
                      </span>
                    </div>

                    {/* Viewing details grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-neutral-700 font-medium">{formatDate(viewing.date)}</span>
                        {relative && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            past ? 'bg-neutral-100 text-neutral-500' : 'bg-primary/10 text-primary font-medium'
                          }`}>
                            {relative}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-neutral-700">{viewing.timeSlot}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-neutral-700">{viewing.visitorName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <a href={`mailto:${viewing.visitorEmail}`} className="text-primary hover:underline truncate">{viewing.visitorEmail}</a>
                      </div>
                      {viewing.visitorPhone && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <a href={`tel:${viewing.visitorPhone}`} className="text-primary hover:underline">{viewing.visitorPhone}</a>
                        </div>
                      )}
                    </div>

                    {/* Visitor message */}
                    {viewing.visitorMessage && (
                      <div className="bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl p-3 mb-3">
                        <p className="text-sm text-neutral-600 italic">"{viewing.visitorMessage}"</p>
                      </div>
                    )}

                    {/* Cancel reason */}
                    {viewing.status === 'cancelled' && viewing.cancelReason && (
                      <div className="bg-red-50/40 border border-red-200/30 rounded-xl p-3 mb-3">
                        <p className="text-sm text-red-600"><strong>Reason:</strong> {viewing.cancelReason}</p>
                      </div>
                    )}

                    {/* Decline reason input */}
                    {declineViewingId === viewing.id && (
                      <div className="bg-white/40 backdrop-blur-sm border border-white/40 rounded-xl p-4 mb-3 space-y-3">
                        <label className="block text-sm font-medium text-neutral-700">
                          Reason for declining (optional)
                        </label>
                        <textarea
                          value={declineReason}
                          onChange={e => setDeclineReason(e.target.value)}
                          placeholder="e.g., The time slot is no longer available..."
                          className="w-full px-3 py-2 bg-white/40 backdrop-blur-sm border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateStatus(viewing.id, 'cancelled', declineReason)}
                            disabled={actionLoading === viewing.id}
                            className="px-4 py-2 bg-red-500/80 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-all disabled:opacity-50"
                          >
                            {actionLoading === viewing.id ? 'Declining...' : 'Confirm Decline'}
                          </button>
                          <button
                            onClick={() => { setDeclineViewingId(null); setDeclineReason(''); }}
                            className="px-4 py-2 bg-white/50 text-neutral-600 text-sm font-medium rounded-xl hover:bg-white/70 transition-all border border-white/50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    {viewing.status === 'pending' && declineViewingId !== viewing.id && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          onClick={() => updateStatus(viewing.id, 'confirmed')}
                          disabled={actionLoading === viewing.id}
                          className="px-5 py-2 bg-green-500/80 backdrop-blur-sm text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-all shadow-md shadow-green-500/20 border border-green-400/30 disabled:opacity-50"
                        >
                          {actionLoading === viewing.id ? (
                            <span className="flex items-center gap-2">
                              <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                              Approving...
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Approve
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => setDeclineViewingId(viewing.id)}
                          disabled={actionLoading === viewing.id}
                          className="px-5 py-2 bg-white/50 backdrop-blur-sm text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50/60 transition-all border border-red-200/40 disabled:opacity-50"
                        >
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Decline
                          </span>
                        </button>
                        {!past && (
                          <button
                            onClick={() => updateStatus(viewing.id, 'completed')}
                            disabled={actionLoading === viewing.id}
                            className="px-5 py-2 bg-white/50 backdrop-blur-sm text-blue-600 text-sm font-semibold rounded-xl hover:bg-blue-50/60 transition-all border border-blue-200/40 disabled:opacity-50"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    )}

                    {/* Confirmed viewing actions */}
                    {viewing.status === 'confirmed' && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          onClick={() => updateStatus(viewing.id, 'completed')}
                          disabled={actionLoading === viewing.id}
                          className="px-5 py-2 bg-blue-500/80 backdrop-blur-sm text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20 border border-blue-400/30 disabled:opacity-50"
                        >
                          {actionLoading === viewing.id ? 'Updating...' : 'Mark Completed'}
                        </button>
                        <button
                          onClick={() => setDeclineViewingId(viewing.id)}
                          disabled={actionLoading === viewing.id}
                          className="px-5 py-2 bg-white/50 backdrop-blur-sm text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50/60 transition-all border border-red-200/40 disabled:opacity-50"
                        >
                          Cancel Viewing
                        </button>
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-neutral-400 mt-2">
                      Requested {new Date(viewing.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ViewingRequestsTab;
