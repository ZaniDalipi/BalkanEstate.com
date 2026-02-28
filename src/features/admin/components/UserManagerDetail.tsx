import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  CheckIcon,
  XCircleIcon,
  ShieldCheckIcon,
} from '@/constants';
import { User, UserEditForm } from './useUserManager';
import { apiRequest } from '@/src/shared/api';

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
  const { t } = useTranslation('admin');

  return (
    <>
      {/* Detail Modal */}
      {isDetailModalOpen && viewingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-xl font-bold">{t('userDetail.title')}</h3>
              <button onClick={() => setIsDetailModalOpen(false)}>
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
                <h5 className="font-semibold text-gray-700 mb-3">{t('userDetail.contactInfo')}</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">{t('userDetail.email')}</label>
                    <p className="font-medium">{viewingUser.email}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">{t('userDetail.phone')}</label>
                    <p className="font-medium">{viewingUser.phone || t('userDetail.notProvided')}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">{t('userDetail.city')}</label>
                    <p className="font-medium">{viewingUser.city || t('userDetail.notProvided')}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">{t('userDetail.country')}</label>
                    <p className="font-medium">{viewingUser.country || t('userDetail.notProvided')}</p>
                  </div>
                </div>
              </div>

              {/* Verification Status */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 mb-3">{t('userDetail.verificationStatus')}</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    {viewingUser.isEmailVerified ? (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        <CheckIcon className="w-3 h-3" /> {t('userDetail.emailVerified')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        <XCircleIcon className="w-3 h-3" /> {t('userDetail.emailNotVerified')}
                      </span>
                    )}
                  </div>
                  {viewingUser.role === 'agent' && (
                    <div className="flex items-center gap-2">
                      {viewingUser.licenseVerified ? (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                          <ShieldCheckIcon className="w-3 h-3" /> {t('userDetail.licenseVerified')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                          <ShieldCheckIcon className="w-3 h-3" /> {t('userDetail.licensePending')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {viewingUser.role === 'agent' && viewingUser.licenseNumber && (
                  <div className="mt-3">
                    <label className="text-xs text-gray-500">{t('userDetail.licenseNumber')}</label>
                    <p className="font-medium">{viewingUser.licenseNumber}</p>
                  </div>
                )}
              </div>

              {/* Subscription Info */}
              <SubscriptionPanel viewingUser={viewingUser} />

              {/* Agency Info */}
              {viewingUser.agencyName && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h5 className="font-semibold text-gray-700 mb-3">{t('userDetail.agency')}</h5>
                  <p className="font-medium">{viewingUser.agencyName}</p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-gray-500">{t('userDetail.joined')}</label>
                  <p>{formatDate(viewingUser.createdAt)}</p>
                </div>
                {viewingUser.lastLogin && (
                  <div>
                    <label className="text-xs text-gray-500">{t('userDetail.lastLogin')}</label>
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
                {t('userDetail.editUser')}
              </button>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                {t('userDetail.close')}
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
              <h3 className="text-xl font-bold">{t('userDetail.editTitle')}</h3>
              <button onClick={() => setIsEditModalOpen(false)}>
                <XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('userDetail.name')}
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
                  {t('userDetail.email')}
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
                  {t('userDetail.phone')}
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
                    {t('userDetail.city')}
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
                    {t('userDetail.country')}
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
                  {t('userDetail.role')}
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="buyer">{t('users.roles.buyer')}</option>
                  <option value="private_seller">{t('users.roles.seller')}</option>
                  <option value="agent">{t('users.roles.agent')}</option>
                  <option value="admin">{t('users.roles.admin')}</option>
                </select>
              </div>

              {(editForm.role === 'agent' || editingUser.role === 'agent') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('userDetail.licenseNumber')}
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
                      {t('userDetail.licenseVerified')}
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('userDetail.agencyName')}
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
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('userDetail.accountStatus')}</h4>
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
                      {t('userDetail.emailVerified')}
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
                      {t('userDetail.subscribed')}
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
                      {t('userDetail.enterpriseTier')}
                    </label>
                  </div>
                </div>
              </div>

              {editForm.isSubscribed && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('userDetail.subscriptionPlan')}
                    </label>
                    <input
                      type="text"
                      value={editForm.subscriptionPlan}
                      onChange={(e) => setEditForm({ ...editForm, subscriptionPlan: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., buyer_monthly"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('userDetail.subscriptionStatus')}
                    </label>
                    <select
                      value={editForm.subscriptionStatus}
                      onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">{t('form.selectOption')}</option>
                      <option value="active">{t('filters.active')}</option>
                      <option value="expired">{t('discountCodes.status.expired')}</option>
                      <option value="trial">Trial</option>
                      <option value="grace">Grace</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-xs text-yellow-800">
                  <strong>{t('userDetail.noteLabel')}</strong> {t('userDetail.roleChangeNote')}
                </p>
              </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  {t('userDetail.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  {t('userDetail.saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Subscription info + listing-limit override panel ───────────────────────
function SubscriptionPanel({ viewingUser }: { viewingUser: User }) {
  const { t } = useTranslation('admin');
  const currentLimit = viewingUser.subscription?.listingsLimit ?? 0;
  const [inputLimit, setInputLimit] = useState(String(currentLimit));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    const val = Number(inputLimit);
    if (isNaN(val) || val < 0) { setErr(t('userDetail.invalidNumber')); return; }
    setSaving(true); setErr('');
    try {
      await apiRequest(`/admin/subscriptions/listing-limit/${viewingUser._id}`, {
        method: 'PATCH',
        body: { listingsLimit: val, reason: 'Admin manual override' },
        requiresAuth: true,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setErr(e.message || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-green-50 rounded-lg p-4 space-y-3">
      <h5 className="font-semibold text-gray-700">{t('userDetail.subscriptionSection')}</h5>

      {/* Status row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-500">{t('userDetail.status')}</label>
          <p className="font-medium">
            {viewingUser.isSubscribed ? (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                {viewingUser.subscriptionPlan || t('userDetail.active')}
              </span>
            ) : (
              <span className="text-gray-500">{t('userDetail.free')}</span>
            )}
          </p>
        </div>
        {viewingUser.subscriptionStatus && (
          <div>
            <label className="text-xs text-gray-500">{t('userDetail.subscriptionStatus')}</label>
            <p className="font-medium capitalize">{viewingUser.subscriptionStatus}</p>
          </div>
        )}
        <div>
          <label className="text-xs text-gray-500">{t('userDetail.enterpriseTier')}</label>
          <p className="font-medium">{viewingUser.isEnterpriseTier ? t('userDetail.yes') : t('userDetail.no')}</p>
        </div>
        {viewingUser.subscription?.tier && (
          <div>
            <label className="text-xs text-gray-500">{t('userDetail.tier')}</label>
            <p className="font-medium capitalize">{viewingUser.subscription.tier.replace(/_/g, ' ')}</p>
          </div>
        )}
      </div>

      {/* Listing limit override */}
      <div className="border-t border-green-200 pt-3">
        <label className="text-xs font-semibold text-gray-600 block mb-1">
          {t('userDetail.listingLimitOverride')}
          <span className="font-normal text-gray-400 ml-1">
            {t('userDetail.listingLimitDesc', { current: currentLimit, active: viewingUser.subscription?.activeListingsCount ?? 0 })}
          </span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={inputLimit}
            onChange={e => { setInputLimit(e.target.value); setSaved(false); }}
            className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSave}
            disabled={saving || String(currentLimit) === inputLimit}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {saving ? t('userDetail.saving') : saved ? t('userDetail.saved') : t('userDetail.apply')}
          </button>
          <span className="text-xs text-gray-400">{t('userDetail.listingsPerMonth')}</span>
        </div>
        {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
        {saved && <p className="text-xs text-green-600 mt-1">{t('userDetail.limitUpdated')}</p>}
      </div>
    </div>
  );
}

export default UserManagerDetail;
