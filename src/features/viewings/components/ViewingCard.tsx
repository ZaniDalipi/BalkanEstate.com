// ViewingCard - Card component for displaying a viewing
// Shows viewing details with status badge and action buttons

import React, { useState } from 'react';
import { useViewingMutations } from '../hooks/useViewingMutations';
import type { Viewing } from '../types';

interface ViewingCardProps {
  viewing: Viewing;
  role: 'agent' | 'buyer';
  onReschedule?: (viewing: Viewing) => void;
}

export const ViewingCard: React.FC<ViewingCardProps> = ({
  viewing,
  role,
  onReschedule,
}) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const { cancelViewing, isCancelling, completeViewing, markNoShow } = useViewingMutations();

  const handleCancel = async () => {
    try {
      await cancelViewing({
        viewingId: viewing._id,
        reason: cancelReason.trim() || undefined,
      });
      setShowCancelModal(false);
      setCancelReason('');
    } catch (error) {
      console.error('Failed to cancel viewing:', error);
    }
  };

  const handleComplete = async () => {
    try {
      await completeViewing({ viewingId: viewing._id });
    } catch (error) {
      console.error('Failed to complete viewing:', error);
    }
  };

  const handleNoShow = async () => {
    if (window.confirm('Mark this viewing as a no-show?')) {
      try {
        await markNoShow(viewing._id);
      } catch (error) {
        console.error('Failed to mark no-show:', error);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    return `${start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })} - ${end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`;
  };

  const getStatusBadge = () => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Scheduled' },
      rescheduled: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Rescheduled' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Cancelled' },
      no_show: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'No Show' },
    };
    const config = statusConfig[viewing.status] || statusConfig.scheduled;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const isPast = new Date(viewing.startTime) < new Date();
  const canModify = ['scheduled', 'rescheduled'].includes(viewing.status) && !isPast;
  const canComplete = ['scheduled', 'rescheduled'].includes(viewing.status) && role === 'agent';

  const otherParty = role === 'agent' ? viewing.buyerId : viewing.agentId;
  const property = viewing.propertyId;

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
        <div className="flex">
          {/* Property Image */}
          <div className="w-32 h-32 flex-shrink-0">
            {property.imageUrl ? (
              <img
                src={property.imageUrl}
                alt={property.title || property.address}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 line-clamp-1">
                  {property.title || property.address}
                </h3>
                <p className="text-sm text-gray-500">{property.address}, {property.city}</p>
              </div>
              {getStatusBadge()}
            </div>

            {/* Date/Time */}
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDate(viewing.startTime)}</span>
              <span className="text-gray-400">|</span>
              <span className="font-medium text-blue-600">{formatTime(viewing.startTime, viewing.endTime)}</span>
            </div>

            {/* Other Party */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {otherParty.avatarUrl ? (
                  <img src={otherParty.avatarUrl} alt={otherParty.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-medium text-gray-500">
                    {otherParty.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span>
                {role === 'agent' ? 'Buyer:' : 'Agent:'} {otherParty.name}
              </span>
            </div>

            {/* Notes */}
            {viewing.notes && (
              <p className="text-sm text-gray-500 mt-2 line-clamp-1" title={viewing.notes}>
                Note: {viewing.notes}
              </p>
            )}

            {/* Cancellation reason */}
            {viewing.status === 'cancelled' && viewing.cancellationReason && (
              <p className="text-sm text-red-600 mt-2">
                Reason: {viewing.cancellationReason}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {(canModify || canComplete) && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2">
            {canComplete && isPast && (
              <>
                <button
                  onClick={handleComplete}
                  className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                >
                  Mark Completed
                </button>
                <button
                  onClick={handleNoShow}
                  className="px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors"
                >
                  No Show
                </button>
              </>
            )}
            {canModify && (
              <>
                <button
                  onClick={() => onReschedule?.(viewing)}
                  className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Cancel Viewing</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel this viewing? The other party will be notified.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                disabled={isCancelling}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Keep Viewing
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Viewing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ViewingCard;
