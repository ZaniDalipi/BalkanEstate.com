import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  EyeIcon,
  TrashIcon,
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon,
  HomeIcon,
  UserIcon,
  CheckIcon,
  ArchiveBoxIcon,
} from '@/constants';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';

interface Inquiry {
  _id: string;
  type: 'property' | 'agent' | 'area_search';
  status: 'new' | 'read' | 'replied' | 'archived';
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  recipientId?: {
    _id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
  };
  recipientName: string;
  recipientEmail: string;
  propertyId?: {
    _id: string;
    title: string;
    images?: string[];
    price: number;
    city: string;
    country: string;
  };
  propertyTitle?: string;
  message: string;
  location?: string;
  propertyType?: string;
  budget?: number;
  adminNotes?: string;
  createdAt: string;
  readAt?: string;
  repliedAt?: string;
}

interface InquiryStats {
  overview: {
    totalInquiries: number;
    newInquiries: number;
    todayInquiries: number;
    weekInquiries: number;
  };
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  topAgents: Array<{
    _id: string;
    count: number;
    name: string;
    email: string;
    avatarUrl?: string;
  }>;
}

const InquiryManager: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const { confirm } = useConfirmation();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [stats, setStats] = useState<InquiryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Detail modal
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInquiries, setTotalInquiries] = useState(0);

  useEffect(() => {
    fetchInquiries();
    fetchStats();
  }, [currentPage, filterType, filterStatus, searchQuery]);

  const fetchInquiries = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('balkan_estate_token');

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(filterType !== 'all' && { type: filterType }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`${API_URL}/admin/inquiries?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch inquiries');

      const data = await response.json();
      setInquiries(data.inquiries || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalInquiries(data.pagination?.totalItems || 0);
    } catch (err) {
      setError('Failed to load inquiries');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/admin/inquiries/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleViewInquiry = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setAdminNotes(inquiry.adminNotes || '');
    setIsDetailModalOpen(true);

    // Mark as read if new
    if (inquiry.status === 'new') {
      updateInquiryStatus(inquiry._id, 'read');
    }
  };

  const updateInquiryStatus = async (id: string, status: string) => {
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/admin/inquiries/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update inquiry');

      await fetchInquiries();
      await fetchStats();
      setSuccessMessage(`Inquiry marked as ${status}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update inquiry');
      setTimeout(() => setError(null), 5000);
    }
  };

  const saveAdminNotes = async () => {
    if (!selectedInquiry) return;

    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/admin/inquiries/${selectedInquiry._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ adminNotes }),
      });

      if (!response.ok) throw new Error('Failed to save notes');

      await fetchInquiries();
      setSuccessMessage('Notes saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to save notes');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Inquiry',
      message: 'Are you sure you want to delete this inquiry? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/admin/inquiries/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete inquiry');

      await fetchInquiries();
      await fetchStats();
      setIsDetailModalOpen(false);
      setSuccessMessage('Inquiry deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to delete inquiry');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedIds.length === 0) return;

    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch('${API_URL}/admin/inquiries/bulk-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ inquiryIds: selectedIds, status }),
      });

      if (!response.ok) throw new Error('Failed to update inquiries');

      const data = await response.json();
      await fetchInquiries();
      await fetchStats();
      setSelectedIds([]);
      setSuccessMessage(data.message);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update inquiries');
      setTimeout(() => setError(null), 5000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'read':
        return 'bg-yellow-100 text-yellow-800';
      case 'replied':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'property':
        return 'bg-purple-100 text-purple-800';
      case 'agent':
        return 'bg-indigo-100 text-indigo-800';
      case 'area_search':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === inquiries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(inquiries.map(i => i._id));
    }
  };

  if (isLoading && inquiries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading inquiries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Inquiries</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overview.totalInquiries}</p>
              </div>
              <EnvelopeIcon className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">New (Unread)</p>
                <p className="text-2xl font-bold text-blue-600">{stats.overview.newInquiries}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">{stats.overview.newInquiries}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.overview.todayInquiries}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">+{stats.overview.todayInquiries}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">This Week</p>
                <p className="text-2xl font-bold text-purple-600">{stats.overview.weekInquiries}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold">{stats.overview.weekInquiries}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Inquiries</h2>
              <p className="text-sm text-gray-600 mt-1">Total: {totalInquiries} inquiries</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search inquiries..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Types</option>
              <option value="property">Property Inquiry</option>
              <option value="agent">Agent Inquiry</option>
              <option value="area_search">Area Search</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
              <option value="archived">Archived</option>
            </select>

            {selectedIds.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkStatusUpdate('read')}
                  className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm hover:bg-yellow-200"
                >
                  Mark Read ({selectedIds.length})
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('archived')}
                  className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm hover:bg-gray-200"
                >
                  Archive
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === inquiries.length && inquiries.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property/Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inquiries.map((inquiry) => (
                <tr key={inquiry._id} className={`hover:bg-gray-50 ${inquiry.status === 'new' ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(inquiry._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, inquiry._id]);
                        } else {
                          setSelectedIds(selectedIds.filter(id => id !== inquiry._id));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{inquiry.buyerName}</div>
                      <div className="text-sm text-gray-500">{inquiry.buyerEmail}</div>
                      {inquiry.buyerPhone && (
                        <div className="text-xs text-gray-400">{inquiry.buyerPhone}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      {inquiry.recipientId?.avatarUrl ? (
                        <img src={inquiry.recipientId.avatarUrl} alt="" className="w-8 h-8 rounded-full mr-2" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2 text-sm">
                          {inquiry.recipientName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{inquiry.recipientName}</div>
                        <div className="text-xs text-gray-500">{inquiry.recipientEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeBadgeColor(inquiry.type)}`}>
                      {inquiry.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(inquiry.status)}`}>
                      {inquiry.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {inquiry.propertyTitle ? (
                      <div className="text-sm text-gray-900 max-w-[200px] truncate" title={inquiry.propertyTitle}>
                        {inquiry.propertyTitle}
                      </div>
                    ) : inquiry.location ? (
                      <div className="text-sm text-gray-600">{inquiry.location}</div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(inquiry.createdAt)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewInquiry(inquiry)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View details"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteInquiry(inquiry._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {inquiries.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No inquiries found matching your filters.
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedInquiry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold">Inquiry Details</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeBadgeColor(selectedInquiry.type)}`}>
                  {selectedInquiry.type.replace('_', ' ')}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(selectedInquiry.status)}`}>
                  {selectedInquiry.status}
                </span>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)}>
                <XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Sender Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <UserIcon className="w-5 h-5" />
                  Sender (Buyer) Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Name</label>
                    <p className="font-medium">{selectedInquiry.buyerName}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Email</label>
                    <p className="font-medium flex items-center gap-2">
                      <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                      <a href={`mailto:${selectedInquiry.buyerEmail}`} className="text-blue-600 hover:underline">
                        {selectedInquiry.buyerEmail}
                      </a>
                    </p>
                  </div>
                  {selectedInquiry.buyerPhone && (
                    <div>
                      <label className="text-xs text-gray-500">Phone</label>
                      <p className="font-medium flex items-center gap-2">
                        <PhoneIcon className="w-4 h-4 text-gray-400" />
                        <a href={`tel:${selectedInquiry.buyerPhone}`} className="text-blue-600 hover:underline">
                          {selectedInquiry.buyerPhone}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recipient Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-3">Recipient (Agent/Seller)</h4>
                <div className="flex items-center gap-3">
                  {selectedInquiry.recipientId?.avatarUrl ? (
                    <img src={selectedInquiry.recipientId.avatarUrl} alt="" className="w-12 h-12 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
                      {selectedInquiry.recipientName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{selectedInquiry.recipientName}</p>
                    <p className="text-sm text-gray-600">{selectedInquiry.recipientEmail}</p>
                  </div>
                </div>
              </div>

              {/* Property Info (if applicable) */}
              {selectedInquiry.propertyId && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <HomeIcon className="w-5 h-5" />
                    Property
                  </h4>
                  <div className="flex items-center gap-4">
                    {selectedInquiry.propertyId.images?.[0] && (
                      <img
                        src={selectedInquiry.propertyId.images[0]}
                        alt=""
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <p className="font-medium">{selectedInquiry.propertyId.title}</p>
                      <p className="text-sm text-gray-600">
                        {selectedInquiry.propertyId.city}, {selectedInquiry.propertyId.country}
                      </p>
                      <p className="text-lg font-bold text-green-600">
                        {selectedInquiry.propertyId.price?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Location for area search */}
              {selectedInquiry.type === 'area_search' && selectedInquiry.location && (
                <div className="bg-teal-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Search Preferences</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-500">Location</label>
                      <p className="font-medium">{selectedInquiry.location}</p>
                    </div>
                    {selectedInquiry.propertyType && (
                      <div>
                        <label className="text-xs text-gray-500">Property Type</label>
                        <p className="font-medium">{selectedInquiry.propertyType}</p>
                      </div>
                    )}
                    {selectedInquiry.budget && (
                      <div>
                        <label className="text-xs text-gray-500">Budget</label>
                        <p className="font-medium">{selectedInquiry.budget.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Message */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Message</h4>
                <div className="bg-gray-100 rounded-lg p-4 whitespace-pre-wrap">
                  {selectedInquiry.message}
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <label className="text-xs text-gray-500">Created</label>
                  <p>{formatDate(selectedInquiry.createdAt)}</p>
                </div>
                {selectedInquiry.readAt && (
                  <div>
                    <label className="text-xs text-gray-500">Read</label>
                    <p>{formatDate(selectedInquiry.readAt)}</p>
                  </div>
                )}
                {selectedInquiry.repliedAt && (
                  <div>
                    <label className="text-xs text-gray-500">Replied</label>
                    <p>{formatDate(selectedInquiry.repliedAt)}</p>
                  </div>
                )}
              </div>

              {/* Admin Notes */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Admin Notes</h4>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this inquiry..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                  rows={3}
                />
                <button
                  onClick={saveAdminNotes}
                  className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Save Notes
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-200 flex gap-3 flex-shrink-0">
              <button
                onClick={() => updateInquiryStatus(selectedInquiry._id, 'replied')}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <CheckIcon className="w-5 h-5" />
                Mark as Replied
              </button>
              <button
                onClick={() => updateInquiryStatus(selectedInquiry._id, 'archived')}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2"
              >
                <ArchiveBoxIcon className="w-5 h-5" />
                Archive
              </button>
              <button
                onClick={() => handleDeleteInquiry(selectedInquiry._id)}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center justify-center gap-2"
              >
                <TrashIcon className="w-5 h-5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InquiryManager;
