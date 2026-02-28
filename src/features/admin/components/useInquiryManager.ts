import React, { useState, useEffect } from 'react';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { apiRequest } from '@/src/shared/api';

export interface Inquiry {
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

export interface InquiryStats {
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

export function useInquiryManager() {
  const { confirm } = useConfirmation();
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

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(filterType !== 'all' && { type: filterType }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(searchQuery && { search: searchQuery }),
      });

      const data = await apiRequest<any>(`/admin/inquiries?${params}`, {
        requiresAuth: true,
        encryptResponse: true,
      });
      setInquiries(data.inquiries || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalInquiries(data.pagination?.totalItems || 0);
    } catch (err) {
      setError('Failed to load inquiries');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiRequest<InquiryStats>(`/admin/inquiries/stats`, {
        requiresAuth: true,
        encryptResponse: true,
      });
      setStats(data);
    } catch (err) {
      // Stats are optional
    }
  };

  const handleViewInquiry = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setAdminNotes(inquiry.adminNotes || '');
    setIsDetailModalOpen(true);

    if (inquiry.status === 'new') {
      updateInquiryStatus(inquiry._id, 'read');
    }
  };

  const updateInquiryStatus = async (id: string, status: string) => {
    try {
      await apiRequest(`/admin/inquiries/${id}`, {
        method: 'PATCH',
        body: { status },
        requiresAuth: true,
        encryptResponse: true,
      });

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
      await apiRequest(`/admin/inquiries/${selectedInquiry._id}`, {
        method: 'PATCH',
        body: { adminNotes },
        requiresAuth: true,
        encryptResponse: true,
      });

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
      await apiRequest(`/admin/inquiries/${id}`, {
        method: 'DELETE',
        requiresAuth: true,
        encryptResponse: true,
      });

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
      const data = await apiRequest<any>(`/admin/inquiries/bulk-status`, {
        method: 'PATCH',
        body: { inquiryIds: selectedIds, status },
        requiresAuth: true,
        encryptResponse: true,
      });

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
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'read': return 'bg-yellow-100 text-yellow-800';
      case 'replied': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'property': return 'bg-purple-100 text-purple-800';
      case 'agent': return 'bg-indigo-100 text-indigo-800';
      case 'area_search': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === inquiries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(inquiries.map(i => i._id));
    }
  };

  return {
    inquiries,
    stats,
    isLoading,
    error,
    successMessage,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    isDetailModalOpen,
    setIsDetailModalOpen,
    selectedInquiry,
    adminNotes,
    setAdminNotes,
    selectedIds,
    setSelectedIds,
    currentPage,
    setCurrentPage,
    totalPages,
    totalInquiries,
    handleViewInquiry,
    updateInquiryStatus,
    saveAdminNotes,
    handleDeleteInquiry,
    handleBulkStatusUpdate,
    formatDate,
    getStatusBadgeColor,
    getTypeBadgeColor,
    toggleSelectAll,
  };
}
