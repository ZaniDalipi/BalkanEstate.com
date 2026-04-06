import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  EyeIcon,
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserGroupIcon,
} from '@/constants';
import { apiRequest } from '@/src/shared/api';

interface AgentRequest {
  _id: string;
  email: string;
  phone: string;
  location: string;
  propertyDescription: string;
  status: 'pending' | 'assigned' | 'contacted' | 'completed' | 'cancelled';
  outcome?: 'success' | 'no_response' | 'not_interested' | 'pending';
  assignedAgents: Array<{
    _id: string;
    agentId: string;
    userId?: {
      name: string;
      email: string;
    };
  }>;
  contactedBy?: {
    _id: string;
    agentId: string;
    userId?: {
      name: string;
    };
  };
  notes?: string;
  emailsSent: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface AgentRequestStats {
  total: number;
  byStatus: Record<string, number>;
  byOutcome: Record<string, number>;
  successRate: number;
  avgEmailsSent: number | string;
  totalEmailsSent: number;
  topLocations: Array<{ _id: string; count: number }>;
}

const AgentRequestManager: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [requests, setRequests] = useState<AgentRequest[]>([]);
  const [stats, setStats] = useState<AgentRequestStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Detail modal
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AgentRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('pending');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [currentPage, filterStatus]);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(filterStatus !== 'all' && { status: filterStatus }),
      });

      const data = await apiRequest<any>(`/agent-requests?${params}`, { requiresAuth: true });
      setRequests(data.agentRequests || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      setError('Failed to load agent requests');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiRequest<any>('/agent-requests/stats', { requiresAuth: true });
      setStats(data.stats);
    } catch (err) {
      // Error removed
    }
  };

  const updateRequest = async (requestId: string, updates: { status?: string; outcome?: string; notes?: string }) => {
    try {
      await apiRequest(`/agent-requests/${requestId}/status`, {
        method: 'PATCH',
        body: updates,
        requiresAuth: true,
      });

      setSuccessMessage(t('notifications.updated'));
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchRequests();
      fetchStats();
      setIsDetailModalOpen(false);
    } catch (err) {
      setError(t('errors.updateFailed'));
      // Error removed
    }
  };

  const openDetailModal = (request: AgentRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.notes || '');
    setSelectedOutcome(request.outcome || 'pending');
    setIsDetailModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'no_response': return 'bg-gray-100 text-gray-800';
      case 'not_interested': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRequests = requests.filter(request => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return request.email.toLowerCase().includes(query) ||
             request.phone.includes(query) ||
             request.location.toLowerCase().includes(query);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('agentConnections.title')}</h1>
          <p className="text-gray-500 mt-1">{t('agentConnections.subtitle')}</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <UserGroupIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('agentConnections.totalRequests')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('agentConnections.successRate')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.successRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <EnvelopeIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('agentConnections.emailsSent')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEmailsSent}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <ClockIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('filters.pending')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.byStatus?.pending || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Distribution */}
      {stats && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">{t('agentConnections.statusDistribution')}</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(stats.byStatus || {}).map(([status, count]) => (
              <div key={status} className={`px-4 py-2 rounded-lg ${getStatusColor(status)}`}>
                <span className="font-medium capitalize">{status.replace('_', ' ')}</span>: {count}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Locations */}
      {stats && stats.topLocations && stats.topLocations.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">{t('agentConnections.topLocations')}</h3>
          <div className="flex flex-wrap gap-2">
            {stats.topLocations.map((loc, idx) => (
              <span key={idx} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                {loc._id}: <strong>{loc.count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('agentConnections.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">{t('agentConnections.allStatus')}</option>
            <option value="pending">{t('filters.pending')}</option>
            <option value="assigned">{t('agentConnections.assigned')}</option>
            <option value="contacted">{t('agentConnections.contacted')}</option>
            <option value="completed">{t('agentConnections.completed')}</option>
            <option value="cancelled">{t('agentConnections.cancelled')}</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('agentConnections.client')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.location')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.status')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('agentConnections.outcome')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('agentConnections.agents')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('agentConnections.emailsSent')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.date')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {t('agentConnections.noRequests')}
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{request.email}</span>
                        <span className="text-sm text-gray-500">{request.phone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{request.location}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOutcomeColor(request.outcome || 'pending')}`}>
                        {(request.outcome || 'pending').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700">{request.assignedAgents?.length || 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700">{request.emailsSent || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openDetailModal(request)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-blue-600"
                        title="View Details"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {t('table.previous')}
            </button>
            <span className="text-sm text-gray-500">
              {t('agentConnections.pageOf', { current: currentPage, total: totalPages })}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {t('table.next')}
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">{t('agentConnections.requestDetails')}</h2>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Client Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3">{t('agentConnections.clientInfo')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${selectedRequest.email}`} className="text-blue-600 hover:underline">
                      {selectedRequest.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${selectedRequest.phone}`} className="text-blue-600 hover:underline">
                      {selectedRequest.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 md:col-span-2">
                    <MapPinIcon className="w-4 h-4 text-gray-400" />
                    <span>{selectedRequest.location}</span>
                  </div>
                </div>
              </div>

              {/* Property Description */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{t('agentConnections.propertyRequirements')}</h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedRequest.propertyDescription}</p>
              </div>

              {/* Assigned Agents */}
              {selectedRequest.assignedAgents && selectedRequest.assignedAgents.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('agentConnections.assignedAgents', { count: selectedRequest.assignedAgents.length })}</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.assignedAgents.map((agent) => (
                      <span key={agent._id} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                        {agent.userId?.name || agent.agentId || t('agentConnections.unknown')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Status & Outcome */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('table.status')}</label>
                  <select
                    value={selectedRequest.status}
                    onChange={(e) => updateRequest(selectedRequest._id, { status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">{t('filters.pending')}</option>
                    <option value="assigned">{t('agentConnections.assigned')}</option>
                    <option value="contacted">{t('agentConnections.contacted')}</option>
                    <option value="completed">{t('agentConnections.completed')}</option>
                    <option value="cancelled">{t('agentConnections.cancelled')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('agentConnections.outcome')}</label>
                  <select
                    value={selectedOutcome}
                    onChange={(e) => setSelectedOutcome(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">{t('agentConnections.outcomePending')}</option>
                    <option value="success">{t('agentConnections.outcomeSuccess')}</option>
                    <option value="no_response">{t('agentConnections.outcomeNoResponse')}</option>
                    <option value="not_interested">{t('agentConnections.outcomeNotInterested')}</option>
                  </select>
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('agentConnections.adminNotes')}</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={t('agentConnections.addNotesPlaceholder')}
                />
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span>{t('agentConnections.created')} {new Date(selectedRequest.createdAt).toLocaleString()}</span>
                <span>{t('agentConnections.emailsSent')}: {selectedRequest.emailsSent}</span>
                {selectedRequest.completedAt && (
                  <span>{t('agentConnections.completedAt')} {new Date(selectedRequest.completedAt).toLocaleString()}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  {t('confirmations.cancel')}
                </button>
                <button
                  onClick={() => updateRequest(selectedRequest._id, { outcome: selectedOutcome, notes: adminNotes })}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('form.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentRequestManager;
