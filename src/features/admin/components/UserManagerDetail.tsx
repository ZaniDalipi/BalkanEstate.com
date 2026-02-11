import React from 'react';
import {
  XMarkIcon,
  CheckIcon,
  XCircleIcon,
  ShieldCheckIcon,
} from '@/constants';
import { User, UserEditForm } from './useUserManager';

interface UserManagerDetailProps {
  // Detail modal
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: (open: boolean) => void;
  viewingUser: User | null;
  // Edit modal
  isEditModalOpen: boolean;
  setIsEditModalOpen: (open: boolean) => void;
  editingUser: User | null;
  editForm: UserEditForm;
  setEditForm: (form: UserEditForm) => void;
  handleUpdateUser: (e: React.FormEvent) => void;
  handleEditUser: (user: User) => void;
  formatDate: (dateString: string) => string;
  getRoleBadgeColor: (role: string) => string;
}

const UserManagerDetail: React.FC<UserManagerDetailProps> = ({
  isDetailModalOpen,
  setIsDetailModalOpen,
  viewingUser,
  isEditModalOpen,
  setIsEditModalOpen,
  editingUser,
  editForm,
  setEditForm,
  handleUpdateUser,
  handleEditUser,
  formatDate,
  getRoleBadgeColor,
}) => {
  return (
    <>
      {/* Detail Modal */}
      {isDetailModalOpen && viewingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="presentation">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col" role="dialog" aria-modal="true" aria-label="User details">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-xl font-bold">User Details</h3>
              <button onClick={() => setIsDetailModalOpen(false)} aria-label="Close">
                <XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* User Header */}
              <div className="flex items-center gap-4">
                {viewingUser.avatarUrl ? (
                  <img src={viewingUser.avatarUrl} alt={viewingUser.name} loading="lazy" decoding="async" className="w-20 h-20 rounded-full" referrerPolicy="no-referrer" />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="presentation">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col" role="dialog" aria-modal="true" aria-label="Edit user">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-xl font-bold">Edit User</h3>
              <button onClick={() => setIsEditModalOpen(false)} aria-label="Close">
                <XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label htmlFor="edit-user-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  id="edit-user-name"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-user-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="edit-user-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-user-phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  id="edit-user-phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-user-city" className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    id="edit-user-city"
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="edit-user-country" className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    id="edit-user-country"
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-user-role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="edit-user-role"
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
                    <label htmlFor="edit-user-license" className="block text-sm font-medium text-gray-700 mb-1">
                      License Number
                    </label>
                    <input
                      id="edit-user-license"
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
    </>
  );
};

export default UserManagerDetail;
