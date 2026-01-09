import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  XCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  ShieldCheckIcon,
  EyeIcon,
} from '@/constants';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';

interface User {
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

const UserManager: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const { confirm } = useConfirmation();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterSubscription, setFilterSubscription] = useState<'all' | 'subscribed' | 'free'>('all');
  const [filterVerification, setFilterVerification] = useState<'all' | 'verified' | 'unverified'>('all');

  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
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
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, filterRole, filterSubscription, filterVerification, searchQuery]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('balkan_estate_token');

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(filterRole !== 'all' && { role: filterRole }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`${API_URL}/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();

      let filteredUsers = data.users || [];

      // Apply subscription filter on frontend
      if (filterSubscription === 'subscribed') {
        filteredUsers = filteredUsers.filter((u: User) => u.isSubscribed);
      } else if (filterSubscription === 'free') {
        filteredUsers = filteredUsers.filter((u: User) => !u.isSubscribed);
      }

      // Apply verification filter on frontend
      if (filterVerification === 'verified') {
        filteredUsers = filteredUsers.filter((u: User) => u.isEmailVerified);
      } else if (filterVerification === 'unverified') {
        filteredUsers = filteredUsers.filter((u: User) => !u.isEmailVerified);
      }

      setUsers(filteredUsers);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalUsers(data.pagination?.total || filteredUsers.length);
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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

    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/admin/users/${editingUser._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error('Failed to update user');

      await fetchUsers();
      setIsEditModalOpen(false);
      setEditingUser(null);
      setSuccessMessage('User updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update user');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Quick action: Toggle email verification
  const handleToggleEmailVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isEmailVerified: !currentStatus }),
      });

      if (!response.ok) throw new Error('Failed to update user');

      await fetchUsers();
      setSuccessMessage(`Email ${!currentStatus ? 'verified' : 'unverified'} successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update verification status');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Quick action: Toggle license verification (for agents)
  const handleToggleLicenseVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ licenseVerified: !currentStatus }),
      });

      if (!response.ok) throw new Error('Failed to update user');

      await fetchUsers();
      setSuccessMessage(`License ${!currentStatus ? 'verified' : 'unverified'} successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update license status');
      setTimeout(() => setError(null), 5000);
    }
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

    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete user');

      await fetchUsers();
      setSuccessMessage('User deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to delete user');
      setTimeout(() => setError(null), 5000);
    }
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

  if (isLoading && users.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('admin:users.loading')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('admin:users.title')}</h2>
            <p className="text-sm text-gray-600 mt-1">{t('admin:dashboard.totalUsers')}: {totalUsers}</p>
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
              placeholder={t('admin:filters.search')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Roles</option>
            <option value="buyer">{t('admin:users.roles.buyer')}</option>
            <option value="private_seller">{t('admin:users.roles.seller')}</option>
            <option value="agent">{t('admin:users.roles.agent')}</option>
            <option value="admin">{t('admin:users.roles.admin')}</option>
          </select>

          <select
            value={filterVerification}
            onChange={(e) => setFilterVerification(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Verification</option>
            <option value="verified">Email Verified</option>
            <option value="unverified">Email Not Verified</option>
          </select>

          <select
            value={filterSubscription}
            onChange={(e) => setFilterSubscription(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Subscription</option>
            <option value="subscribed">Subscribed</option>
            <option value="free">Free</option>
          </select>
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verification</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user._id} className={`hover:bg-gray-50 ${!user.isEmailVerified ? 'bg-yellow-50' : ''}`}>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full mr-3" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mr-3 font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      {user.agencyName && (
                        <div className="text-xs text-gray-500">{user.agencyName}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1 text-sm text-gray-900">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                    {user.email}
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <PhoneIcon className="w-3 h-3 text-gray-400" />
                      {user.phone}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                    {user.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-1">
                    {/* Email verification toggle */}
                    <button
                      onClick={() => handleToggleEmailVerification(user._id, user.isEmailVerified || false)}
                      className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                        user.isEmailVerified
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                      title={`Click to ${user.isEmailVerified ? 'unverify' : 'verify'} email`}
                    >
                      {user.isEmailVerified ? (
                        <CheckIcon className="w-3 h-3" />
                      ) : (
                        <XCircleIcon className="w-3 h-3" />
                      )}
                      Email {user.isEmailVerified ? 'Verified' : 'Not Verified'}
                    </button>

                    {/* License verification for agents */}
                    {user.role === 'agent' && (
                      <button
                        onClick={() => handleToggleLicenseVerification(user._id, user.licenseVerified || false)}
                        className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          user.licenseVerified
                            ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                            : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                        }`}
                        title={`Click to ${user.licenseVerified ? 'unverify' : 'verify'} license`}
                      >
                        <ShieldCheckIcon className="w-3 h-3" />
                        License {user.licenseVerified ? 'Verified' : 'Pending'}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {user.isSubscribed ? (
                    <div>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        {user.subscriptionPlan || user.subscriptionType || 'Active'}
                      </span>
                      {user.subscriptionStatus && (
                        <div className="text-xs text-gray-500 mt-1 capitalize">{user.subscriptionStatus}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">Free</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleViewUser(user)}
                      className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                      title="View details"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                      title="Edit user"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user._id, user.name)}
                      className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                      title="Delete user"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No users found matching your filters.
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

      {/* Detail Modal */}
      {isDetailModalOpen && viewingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-xl font-bold">User Details</h3>
              <button onClick={() => setIsDetailModalOpen(false)}>
                <XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* User Header */}
              <div className="flex items-center gap-4">
                {viewingUser.avatarUrl ? (
                  <img src={viewingUser.avatarUrl} alt={viewingUser.name} className="w-20 h-20 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
                    {viewingUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{viewingUser.name}</h4>
                  <p className="text-gray-600">{viewingUser.email}</p>
                  <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(viewingUser.role)}`}>
                    {viewingUser.role.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 mb-3">Contact Information</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Email</label>
                    <p className="font-medium">{viewingUser.email}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Phone</label>
                    <p className="font-medium">{viewingUser.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">City</label>
                    <p className="font-medium">{viewingUser.city || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Country</label>
                    <p className="font-medium">{viewingUser.country || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Verification Status */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 mb-3">Verification Status</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    {viewingUser.isEmailVerified ? (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        <CheckIcon className="w-3 h-3" /> Email Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        <XCircleIcon className="w-3 h-3" /> Email Not Verified
                      </span>
                    )}
                  </div>
                  {viewingUser.role === 'agent' && (
                    <div className="flex items-center gap-2">
                      {viewingUser.licenseVerified ? (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                          <ShieldCheckIcon className="w-3 h-3" /> License Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                          <ShieldCheckIcon className="w-3 h-3" /> License Pending
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {viewingUser.role === 'agent' && viewingUser.licenseNumber && (
                  <div className="mt-3">
                    <label className="text-xs text-gray-500">License Number</label>
                    <p className="font-medium">{viewingUser.licenseNumber}</p>
                  </div>
                )}
              </div>

              {/* Subscription Info */}
              <div className="bg-green-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 mb-3">Subscription</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Status</label>
                    <p className="font-medium">
                      {viewingUser.isSubscribed ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          {viewingUser.subscriptionPlan || 'Active'}
                        </span>
                      ) : (
                        <span className="text-gray-500">Free</span>
                      )}
                    </p>
                  </div>
                  {viewingUser.subscriptionStatus && (
                    <div>
                      <label className="text-xs text-gray-500">Subscription Status</label>
                      <p className="font-medium capitalize">{viewingUser.subscriptionStatus}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500">Enterprise Tier</label>
                    <p className="font-medium">{viewingUser.isEnterpriseTier ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>

              {/* Agency Info */}
              {viewingUser.agencyName && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h5 className="font-semibold text-gray-700 mb-3">Agency</h5>
                  <p className="font-medium">{viewingUser.agencyName}</p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-gray-500">Joined</label>
                  <p>{formatDate(viewingUser.createdAt)}</p>
                </div>
                {viewingUser.lastLogin && (
                  <div>
                    <label className="text-xs text-gray-500">Last Login</label>
                    <p>{formatDate(viewingUser.lastLogin)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-200 flex gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleEditUser(viewingUser);
                }}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Edit User
              </button>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-xl font-bold">Edit User</h3>
              <button onClick={() => setIsEditModalOpen(false)}>
                <XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="buyer">Buyer</option>
                  <option value="private_seller">Private Seller</option>
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {(editForm.role === 'agent' || editingUser.role === 'agent') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      License Number
                    </label>
                    <input
                      type="text"
                      value={editForm.licenseNumber}
                      onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="licenseVerified"
                      checked={editForm.licenseVerified}
                      onChange={(e) => setEditForm({ ...editForm, licenseVerified: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="licenseVerified" className="ml-2 text-sm text-gray-700">
                      License Verified
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Agency Name
                    </label>
                    <input
                      type="text"
                      value={editForm.agencyName}
                      onChange={(e) => setEditForm({ ...editForm, agencyName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}

              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Account Status</h4>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isEmailVerified"
                      checked={editForm.isEmailVerified}
                      onChange={(e) => setEditForm({ ...editForm, isEmailVerified: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="isEmailVerified" className="ml-2 text-sm text-gray-700">
                      Email Verified
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isSubscribed"
                      checked={editForm.isSubscribed}
                      onChange={(e) => setEditForm({ ...editForm, isSubscribed: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="isSubscribed" className="ml-2 text-sm text-gray-700">
                      Subscribed
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isEnterpriseTier"
                      checked={editForm.isEnterpriseTier}
                      onChange={(e) => setEditForm({ ...editForm, isEnterpriseTier: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="isEnterpriseTier" className="ml-2 text-sm text-gray-700">
                      Enterprise Tier
                    </label>
                  </div>
                </div>
              </div>

              {editForm.isSubscribed && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subscription Plan
                    </label>
                    <input
                      type="text"
                      value={editForm.subscriptionPlan}
                      onChange={(e) => setEditForm({ ...editForm, subscriptionPlan: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., buyer_pro_monthly"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subscription Status
                    </label>
                    <select
                      value={editForm.subscriptionStatus}
                      onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select status</option>
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="trial">Trial</option>
                      <option value="grace">Grace</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> Changing a user's role or verification status can affect their access and permissions.
                </p>
              </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;
