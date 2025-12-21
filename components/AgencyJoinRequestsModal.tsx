import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserCircleIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '../constants';
import { getAgencyJoinRequests, approveJoinRequest, rejectJoinRequest } from '../services/apiService';
import { formatPrice } from '../utils/currency';

interface JoinRequest {
  _id: string;
  agentId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    avatarUrl?: string;
    licenseNumber?: string;
    totalSalesValue?: number;
    propertiesSold?: number;
  };
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  requestedAt: string;
  respondedAt?: string;
}

interface AgencyJoinRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agencyId: string;
  agencyName: string;
}

const AgencyJoinRequestsModal: React.FC<AgencyJoinRequestsModalProps> = ({
  isOpen,
  onClose,
  agencyId,
  agencyName
}) => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    if (isOpen && agencyId) {
      fetchRequests();
    }
  }, [isOpen, agencyId]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await getAgencyJoinRequests(agencyId);
      setRequests(response.joinRequests || []);
    } catch (error) {
      // Silent error handling
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await approveJoinRequest(requestId);
      await fetchRequests();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to approve request');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectJoinRequest(requestId);
      await fetchRequests();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to reject request');
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Join Requests</h2>
            <p className="text-sm opacity-90 mt-1">{agencyName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close join requests modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="bg-gray-50 px-6 py-3 border-b flex gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'pending'
                ? 'bg-primary text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Pending {pendingCount > 0 && <span className="ml-1 bg-white text-primary px-2 py-0.5 rounded-full text-xs font-bold">{pendingCount}</span>}
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'approved'
                ? 'bg-primary text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'rejected'
                ? 'bg-primary text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-primary text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">
                {filter === 'pending' ? 'No pending requests' : `No ${filter} requests`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div
                  key={request._id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    {request.agentId.avatarUrl ? (
                      <img
                        src={request.agentId.avatarUrl}
                        alt={request.agentId.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <UserCircleIcon className="w-16 h-16 text-gray-300" />
                    )}

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{request.agentId.name}</h3>
                          {request.agentId.licenseNumber && (
                            <div className="flex items-center gap-1 text-green-700 text-sm mt-1">
                              <CheckCircleIcon className="w-4 h-4" />
                              <span className="font-semibold">Licensed Agent</span>
                            </div>
                          )}
                        </div>

                        {/* Status badge */}
                        {request.status === 'approved' && (
                          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                            Approved
                          </span>
                        )}
                        {request.status === 'rejected' && (
                          <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
                            Rejected
                          </span>
                        )}
                        {request.status === 'pending' && (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        <p>Email: {request.agentId.email}</p>
                        <p>Phone: {request.agentId.phone}</p>
                      </div>

                      {/* Stats */}
                      {(request.agentId.totalSalesValue || request.agentId.propertiesSold) && (
                        <div className="mt-3 flex gap-4 text-sm">
                          {request.agentId.totalSalesValue && (
                            <div>
                              <span className="text-gray-500">Sales Value:</span>
                              <span className="ml-1 font-bold text-primary">
                                {formatPrice(request.agentId.totalSalesValue, 'Serbia')}
                              </span>
                            </div>
                          )}
                          {request.agentId.propertiesSold && (
                            <div>
                              <span className="text-gray-500">Properties Sold:</span>
                              <span className="ml-1 font-bold text-primary">
                                {request.agentId.propertiesSold}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message */}
                      {request.message && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700 italic">"{request.message}"</p>
                        </div>
                      )}

                      {/* Dates */}
                      <div className="mt-3 text-xs text-gray-500">
                        <p>Requested: {new Date(request.requestedAt).toLocaleDateString()}</p>
                        {request.respondedAt && (
                          <p>Responded: {new Date(request.respondedAt).toLocaleDateString()}</p>
                        )}
                      </div>

                      {/* Action buttons for pending requests */}
                      {request.status === 'pending' && (
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleApprove(request._id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <CheckCircleIcon className="w-5 h-5" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(request._id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <XCircleIcon className="w-5 h-5" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgencyJoinRequestsModal;
