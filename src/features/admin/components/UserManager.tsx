import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  ShieldCheckIcon,
  EyeIcon,
  ArrowPathIcon,
} from '@/constants';
import { useUserManager } from './useUserManager';
import UserManagerDetail from './UserManagerDetail';

const UserManager: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const {
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
  } = useUserManager();

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
          {/* Sync Status & Refresh */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${isRefetching ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
              <span className="text-gray-600">{isRefetching ? 'Syncing...' : 'Live'}</span>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              title="Refresh users"
            >
              <ArrowPathIcon className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
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

      <UserManagerDetail
        isDetailModalOpen={isDetailModalOpen}
        setIsDetailModalOpen={setIsDetailModalOpen}
        viewingUser={viewingUser}
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        editingUser={editingUser}
        editForm={editForm}
        setEditForm={setEditForm}
        handleUpdateUser={handleUpdateUser}
        handleEditUser={handleEditUser}
        formatDate={formatDate}
        getRoleBadgeColor={getRoleBadgeColor}
      />
    </div>
  );
};

export default UserManager;
