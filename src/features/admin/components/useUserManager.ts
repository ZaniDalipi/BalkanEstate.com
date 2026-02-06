import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { useUsers, useUpdateUser, useDeleteUser } from '../hooks/useAdminData';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatarUrl?: string;
  city?: string;
  country?: string;
  isSubscribed: boolean;
  isEmailVerified?: boolean;
  subscriptionType?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  agencyName?: string;
  agencyId?: string;
  licenseNumber?: string;
  licenseVerified?: boolean;
  isEnterpriseTier?: boolean;
  createdAt: string;
  lastLogin?: string;
  stats?: {
    totalViews?: number;
    totalInquiries?: number;
    activeListings?: number;
  };
}

export interface UserEditForm {
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  role: string;
  licenseNumber: string;
  licenseVerified: boolean;
  isEmailVerified: boolean;
  isSubscribed: boolean;
  subscriptionPlan: string;
  subscriptionStatus: string;
  agencyName: string;
  isEnterpriseTier: boolean;
}

export function useUserManager() {
  const { t } = useTranslation(['admin']);
  const { confirm } = useConfirmation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterSubscription, setFilterSubscription] = useState<'all' | 'subscribed' | 'free'>('all');
  const [filterVerification, setFilterVerification] = useState<'all' | 'verified' | 'unverified'>('all');

  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<UserEditForm>({
    name: '',
    email: '',
    phone: '',
    city: '',
    country: '',
    role: 'buyer',
    licenseNumber: '',
    licenseVerified: false,
    isEmailVerified: false,
    isSubscribed: false,
    subscriptionPlan: '',
    subscriptionStatus: '',
    agencyName: '',
    isEnterpriseTier: false,
  });

  // Detail modal
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // React Query hooks for reactive data management
  const queryParams = {
    page: currentPage,
    limit: 20,
    ...(filterRole !== 'all' && { role: filterRole }),
    ...(searchQuery && { search: searchQuery }),
  };

  const { data: usersData, isLoading, error: queryError, isRefetching, refetch } = useUsers(queryParams);
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  // Process users data with frontend filters
  const processedData = useMemo(() => {
    let filteredUsers = usersData?.users || [];

    if (filterSubscription === 'subscribed') {
      filteredUsers = filteredUsers.filter((u: User) => u.isSubscribed);
    } else if (filterSubscription === 'free') {
      filteredUsers = filteredUsers.filter((u: User) => !u.isSubscribed);
    }

    if (filterVerification === 'verified') {
      filteredUsers = filteredUsers.filter((u: User) => u.isEmailVerified);
    } else if (filterVerification === 'unverified') {
      filteredUsers = filteredUsers.filter((u: User) => !u.isEmailVerified);
    }

    return {
      users: filteredUsers,
      totalPages: usersData?.pagination?.totalPages || 1,
      totalUsers: usersData?.pagination?.total || filteredUsers.length,
    };
  }, [usersData, filterSubscription, filterVerification]);

  const { users, totalPages, totalUsers } = processedData;
  const error = queryError ? 'Failed to load users' : localError;

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      city: user.city || '',
      country: user.country || '',
      role: user.role,
      licenseNumber: user.licenseNumber || '',
      licenseVerified: user.licenseVerified || false,
      isEmailVerified: user.isEmailVerified || false,
      isSubscribed: user.isSubscribed || false,
      subscriptionPlan: user.subscriptionPlan || '',
      subscriptionStatus: user.subscriptionStatus || '',
      agencyName: user.agencyName || '',
      isEnterpriseTier: user.isEnterpriseTier || false,
    });
    setIsEditModalOpen(true);
  };

  const handleViewUser = (user: User) => {
    setViewingUser(user);
    setIsDetailModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    updateUserMutation.mutate(
      { userId: editingUser._id, data: editForm },
      {
        onSuccess: () => {
          setIsEditModalOpen(false);
          setEditingUser(null);
          setSuccessMessage('User updated successfully');
          setTimeout(() => setSuccessMessage(null), 3000);
        },
        onError: () => {
          setLocalError('Failed to update user');
          setTimeout(() => setLocalError(null), 5000);
        },
      }
    );
  };

  const handleToggleEmailVerification = async (userId: string, currentStatus: boolean) => {
    updateUserMutation.mutate(
      { userId, data: { isEmailVerified: !currentStatus } },
      {
        onSuccess: () => {
          setSuccessMessage(`Email ${!currentStatus ? 'verified' : 'unverified'} successfully`);
          setTimeout(() => setSuccessMessage(null), 3000);
        },
        onError: () => {
          setLocalError('Failed to update verification status');
          setTimeout(() => setLocalError(null), 5000);
        },
      }
    );
  };

  const handleToggleLicenseVerification = async (userId: string, currentStatus: boolean) => {
    updateUserMutation.mutate(
      { userId, data: { licenseVerified: !currentStatus } },
      {
        onSuccess: () => {
          setSuccessMessage(`License ${!currentStatus ? 'verified' : 'unverified'} successfully`);
          setTimeout(() => setSuccessMessage(null), 3000);
        },
        onError: () => {
          setLocalError('Failed to update license status');
          setTimeout(() => setLocalError(null), 5000);
        },
      }
    );
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirmed = await confirm({
      title: t('admin:users.deleteTitle', 'Delete User'),
      message: t('admin:users.deleteConfirm', { name: userName, defaultValue: `Are you sure you want to delete user "${userName}"? This action cannot be undone.` }),
      confirmLabel: t('admin:common.delete', 'Delete'),
      cancelLabel: t('admin:common.cancel', 'Cancel'),
      type: 'danger',
    });
    if (!confirmed) return;

    deleteUserMutation.mutate(userId, {
      onSuccess: () => {
        setSuccessMessage('User deleted successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      },
      onError: () => {
        setLocalError('Failed to delete user');
        setTimeout(() => setLocalError(null), 5000);
      },
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'agent':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
      case 'super_admin':
        return 'bg-red-100 text-red-800';
      case 'private_seller':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return {
    users,
    isLoading,
    error,
    successMessage,
    isRefetching,
    refetch,
    searchQuery,
    setSearchQuery,
    filterRole,
    setFilterRole,
    filterSubscription,
    setFilterSubscription,
    filterVerification,
    setFilterVerification,
    isEditModalOpen,
    setIsEditModalOpen,
    editingUser,
    editForm,
    setEditForm,
    isDetailModalOpen,
    setIsDetailModalOpen,
    viewingUser,
    currentPage,
    setCurrentPage,
    totalPages,
    totalUsers,
    handleEditUser,
    handleViewUser,
    handleUpdateUser,
    handleToggleEmailVerification,
    handleToggleLicenseVerification,
    handleDeleteUser,
    formatDate,
    getRoleBadgeColor,
  };
}
