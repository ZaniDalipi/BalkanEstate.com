import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  CheckIcon,
  XCircleIcon,
  ShieldCheckIcon,
} from '@/constants';
import { User, UserEditForm } from './useUserManager';
import { apiRequest } from '@/src/shared/api';
import PhoneInput from '@/src/shared/components/ui/PhoneInput';
import { approveLicense, rejectLicense } from '../api/adminApi';
import { useUpdateUserListingCounter, useUpdateUserListingLimit } from '../hooks/useAdminData';
import UserAvatar from '@/components/shared/UserAvatar';

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
  formatDateTime: (dateString: string) => string;
  getRoleBadgeColor: (role: string) => string;
  // Callback to refresh user data after updates
  onUserUpdated?: () => void;
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
  formatDateTime,
  getRoleBadgeColor,
  onUserUpdated,
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
                <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-blue-50">
                  <UserAvatar
                    src={viewingUser.avatarUrl}
                    alt={viewingUser.name}
                    gender={viewingUser.gender}
                    seed={viewingUser._id || viewingUser.name}
                    avatarOptions={viewingUser.avatarOptions}
                    width={160}
                    className="w-full h-full object-cover"
                  />
                </div>
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
                      ) : viewingUser.licenseStatus === 'pending' ? (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                          <ShieldCheckIcon className="w-3 h-3" /> {t('userDetail.licensePending', 'License Pending')}
                        </span>
                      ) : viewingUser.licenseStatus === 'rejected' ? (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          <ShieldCheckIcon className="w-3 h-3" /> {t('userDetail.licenseRejected', 'License Rejected')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          <ShieldCheckIcon className="w-3 h-3" /> {t('userDetail.noLicense', 'No License')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {viewingUser.role === 'agent' && viewingUser.licenseNumber && (
                  <div className="mt-3">
                    <label className="text-xs text-gray-500">{t('userDetail.licenseNumber')}</label>
                    <p className="font-medium">{viewingUser.licenseNumber}</p>
                    {viewingUser.licenseCountry && (
                      <p className="text-xs text-gray-400 mt-0.5">{t('userDetail.licenseCountry', 'Country')}: {viewingUser.licenseCountry}</p>
                    )}
                  </div>
                )}
                {viewingUser.role === 'agent' && viewingUser.licenseStatus === 'pending' && viewingUser.licenseNumber && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await approveLicense(viewingUser._id);
                          viewingUser.licenseVerified = true;
                          viewingUser.licenseStatus = 'verified';
                          setIsDetailModalOpen(false);
                          setTimeout(() => setIsDetailModalOpen(true), 100);
                        } catch {}
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                    >
                      {t('userDetail.approveLicense', 'Approve License')}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await rejectLicense(viewingUser._id);
                          viewingUser.licenseVerified = false;
                          viewingUser.licenseStatus = 'rejected';
                          setIsDetailModalOpen(false);
                          setTimeout(() => setIsDetailModalOpen(true), 100);
                        } catch {}
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      {t('userDetail.rejectLicense', 'Reject License')}
                    </button>
                  </div>
                )}
              </div>

              {/* Subscription Info */}
              <SubscriptionPanel viewingUser={viewingUser} onUpdate={onUserUpdated} />

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
                  <p>{formatDateTime(viewingUser.createdAt)}</p>
                </div>
                {viewingUser.lastLogin && (
                  <div>
                    <label className="text-xs text-gray-500">{t('userDetail.lastLogin')}</label>
                    <p>{formatDateTime(viewingUser.lastLogin)}</p>
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
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">{t('userDetail.emailReadOnly')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('userDetail.phone')}
                </label>
                <PhoneInput
                  value={editForm.phone || ''}
                  onChange={(v) => setEditForm({ ...editForm, phone: v })}
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
                </div>
              </div>

              {/* Subscription Management */}
              <SubscriptionEditPanel editingUser={editingUser} />

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
function SubscriptionPanel({ viewingUser, onUpdate }: { viewingUser: User; onUpdate?: () => void }) {
  const { t } = useTranslation('admin');
  const currentLimit = viewingUser.subscription?.listingsLimit ?? 0;
  const [inputLimit, setInputLimit] = useState(String(currentLimit));
  const [displayLimit, setDisplayLimit] = useState(currentLimit);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  const [sendNotification, setSendNotification] = useState(true);

  // Monthly counter editor state
  const currentMonthlyCounter = viewingUser.subscription?.listingsCreatedThisMonth ?? 0;
  const [inputMonthlyCounter, setInputMonthlyCounter] = useState(String(currentMonthlyCounter));
  const [savedMonthly, setSavedMonthly] = useState(false);
  const [errMonthly, setErrMonthly] = useState('');
  const [resetMonthCheckbox, setResetMonthCheckbox] = useState(false);

  // React Query mutations — handle optimistic update + cache invalidation
  const counterMutation = useUpdateUserListingCounter();
  const limitMutation = useUpdateUserListingLimit();
  const savingMonthly = counterMutation.isPending;
  const saving = limitMutation.isPending;

  // Sync inputs only when switching to a different user. Doing so on counter
  // changes would stomp on the admin's in-progress edits; optimistic updates
  // already keep the "current:" label in sync with the server.
  useEffect(() => {
    setInputLimit(String(currentLimit));
    setDisplayLimit(currentLimit);
    setInputMonthlyCounter(String(currentMonthlyCounter));
    setSaved(false);
    setSavedMonthly(false);
    setErr('');
    setErrMonthly('');
    setResetMonthCheckbox(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingUser._id]);

  // Track if value has changed from original
  const hasLimitChanged = Number(inputLimit) !== displayLimit;
  const hasCounterChanged = Number(inputMonthlyCounter) !== currentMonthlyCounter;

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Validation: ensure value is valid integer >= 0
  const validateNumber = (value: string): { valid: boolean; error?: string } => {
    const num = Number(value);
    if (value.trim() === '') return { valid: false, error: 'Value cannot be empty' };
    if (isNaN(num)) return { valid: false, error: 'Must be a valid number' };
    if (!Number.isInteger(num)) return { valid: false, error: 'Must be a whole number' };
    if (num < 0) return { valid: false, error: 'Cannot be negative' };
    if (num > 999) return { valid: false, error: 'Value too large (max 999)' };
    return { valid: true };
  };

  const handleSave = () => {
    // Validation
    const validation = validateNumber(inputLimit);
    if (!validation.valid) {
      setErr(validation.error || 'Invalid value');
      return;
    }

    const val = Number(inputLimit);
    if (val === displayLimit) {
      setErr('No change from current value');
      return;
    }

    setErr('');
    limitMutation.mutate(
      {
        userId: viewingUser._id,
        listingsLimit: val,
        sendNotification,
      },
      {
        onSuccess: (response) => {
          if (!response.success) {
            setErr(response.message || 'Failed to update listing limit');
            return;
          }
          // Persist the new value in local state — optimistic update
          // already patched the React Query cache, so the parent's
          // viewingUser will reflect this on next render too.
          setInputLimit(String(val));
          setDisplayLimit(val);
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        },
        onError: (e: any) => {
          setErr(e?.message || 'Error saving listing limit');
        },
      }
    );
  };

  const handleSaveMonthlyCounter = () => {
    const validation = validateNumber(inputMonthlyCounter);
    if (!validation.valid) {
      setErrMonthly(validation.error || 'Invalid value');
      return;
    }

    const val = Number(inputMonthlyCounter);
    if (val === currentMonthlyCounter && !resetMonthCheckbox) {
      setErrMonthly('No change from current value');
      return;
    }

    setErrMonthly('');
    counterMutation.mutate(
      {
        userId: viewingUser._id,
        listingsCreatedThisMonth: val,
        resetMonth: resetMonthCheckbox,
      },
      {
        onSuccess: () => {
          setSavedMonthly(true);
          setTimeout(() => setSavedMonthly(false), 3000);
          setResetMonthCheckbox(false);
        },
        onError: (e: any) => {
          setErrMonthly(e?.message || 'Failed to update counter');
        },
      }
    );
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

      {/* Subscription dates */}
      {viewingUser.isSubscribed && (
        <div className="grid grid-cols-2 gap-4 border-t border-green-200 pt-3">
          <div>
            <label className="text-xs text-gray-500">Started</label>
            <p className="font-medium text-sm">{formatDisplayDate(viewingUser.subscriptionStartedAt)}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">Expires</label>
            <p className="font-medium text-sm">{formatDisplayDate(viewingUser.subscriptionExpiresAt)}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">Source</label>
            <p className="font-medium text-sm capitalize">{viewingUser.subscriptionSource || '—'}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">Product Name</label>
            <p className="font-medium text-sm">{viewingUser.subscriptionProductName || '—'}</p>
          </div>
        </div>
      )}

      {/* Listing limit override */}
      <div className="border-t border-green-200 pt-3">
        <label className="text-xs font-semibold text-gray-600 block mb-1">
          {t('userDetail.listingLimitOverride')}
          <span className="font-normal text-gray-400 ml-1">
            (sub.listingsLimit: {displayLimit} · activeListingsLimit: {viewingUser.activeListingsLimit ?? '—'} · {viewingUser.subscription?.activeListingsCount ?? 0} active)
          </span>
        </label>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="number"
            min={0}
            max={999}
            value={inputLimit}
            onChange={e => {
              setInputLimit(e.target.value);
              setSaved(false);
              setErr('');
            }}
            className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={saving}
          />
          <button
            onClick={handleSave}
            disabled={saving || !hasLimitChanged}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
            title={!hasLimitChanged ? 'No changes to save' : 'Save changes'}
          >
            {saving ? t('userDetail.saving') : saved ? t('userDetail.saved') : t('userDetail.apply')}
          </button>
          <span className="text-xs text-gray-400">listings/month</span>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded mb-2">
          <input
            type="checkbox"
            checked={sendNotification}
            onChange={e => setSendNotification(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
            disabled={saving}
          />
          <span className="text-xs text-gray-600">Notify user of limit increase</span>
        </label>
        {err && <p className="text-xs text-red-600 font-medium mt-1">{err}</p>}
        {saved && <p className="text-xs text-green-600 font-medium mt-1">✓ Limit updated successfully</p>}
      </div>

      {/* Monthly listing counter */}
      <div className="border-t border-green-200 pt-3">
        <label className="text-xs font-semibold text-gray-600 block mb-1">
          {t('userDetail.monthlyListingCounter', 'Monthly Listing Counter')}
          <span className="font-normal text-gray-400 ml-1">
            (current: {currentMonthlyCounter})
          </span>
        </label>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="number"
            min={0}
            max={999}
            value={inputMonthlyCounter}
            onChange={e => {
              setInputMonthlyCounter(e.target.value);
              setSavedMonthly(false);
              setErrMonthly('');
            }}
            className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={savingMonthly}
          />
          <button
            onClick={handleSaveMonthlyCounter}
            disabled={savingMonthly || (!hasCounterChanged && !resetMonthCheckbox)}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
            title={!hasCounterChanged && !resetMonthCheckbox ? 'No changes to save' : 'Save changes'}
          >
            {savingMonthly ? t('userDetail.saving') : savedMonthly ? t('userDetail.saved') : t('userDetail.apply')}
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm mb-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
          <input
            type="checkbox"
            checked={resetMonthCheckbox}
            onChange={e => {
              setResetMonthCheckbox(e.target.checked);
              setSavedMonthly(false);
              setErrMonthly('');
            }}
            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
            disabled={savingMonthly}
          />
          <span className="text-xs text-gray-600">Reset monthResetDate to today</span>
          {resetMonthCheckbox && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Will update</span>}
        </label>
        {errMonthly && <p className="text-xs text-red-600 font-medium mt-1">{errMonthly}</p>}
        {savedMonthly && <p className="text-xs text-green-600 font-medium mt-1">✓ Counter updated successfully</p>}
      </div>
    </div>
  );
}

// ─── Subscription edit panel for the edit modal ───────────────────────────────
function SubscriptionEditPanel({ editingUser }: { editingUser: User }) {
  const { t } = useTranslation('admin');
  const [isSubscribed, setIsSubscribed] = useState(editingUser.isSubscribed);
  const [plan, setPlan] = useState(editingUser.subscriptionPlan || '');
  const [startDate, setStartDate] = useState(
    editingUser.subscriptionStartedAt ? new Date(editingUser.subscriptionStartedAt).toISOString().split('T')[0] : ''
  );
  const [expiresDate, setExpiresDate] = useState(
    editingUser.subscriptionExpiresAt ? new Date(editingUser.subscriptionExpiresAt).toISOString().split('T')[0] : ''
  );
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleActivate = async () => {
    if (!plan || !expiresDate) {
      setResult({ type: 'error', msg: 'Plan and expiration date are required' });
      return;
    }
    setSaving(true);
    setResult(null);
    try {
      await apiRequest(`/admin/subscriptions/manage/${editingUser._id}`, {
        method: 'PATCH',
        body: {
          isSubscribed: true,
          subscriptionPlan: plan,
          subscriptionStartedAt: startDate || new Date().toISOString(),
          subscriptionExpiresAt: new Date(expiresDate + 'T23:59:59.999Z').toISOString(),
          reason: 'Admin manual activation',
        },
        requiresAuth: true,
      });
      setIsSubscribed(true);
      setResult({ type: 'success', msg: 'Subscription activated successfully' });
    } catch (e: any) {
      setResult({ type: 'error', msg: e.message || 'Error activating subscription' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setSaving(true);
    setResult(null);
    try {
      await apiRequest(`/admin/subscriptions/manage/${editingUser._id}`, {
        method: 'PATCH',
        body: {
          isSubscribed: false,
          reason: 'Admin manual deactivation',
        },
        requiresAuth: true,
      });
      setIsSubscribed(false);
      setResult({ type: 'success', msg: 'Subscription deactivated successfully' });
    } catch (e: any) {
      setResult({ type: 'error', msg: e.message || 'Error deactivating subscription' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDates = async () => {
    if (!expiresDate) {
      setResult({ type: 'error', msg: 'Expiration date is required' });
      return;
    }
    setSaving(true);
    setResult(null);
    try {
      await apiRequest(`/admin/subscriptions/manage/${editingUser._id}`, {
        method: 'PATCH',
        body: {
          ...(plan && { subscriptionPlan: plan }),
          ...(startDate && { subscriptionStartedAt: startDate }),
          subscriptionExpiresAt: new Date(expiresDate + 'T23:59:59.999Z').toISOString(),
          reason: 'Admin date update',
        },
        requiresAuth: true,
      });
      setResult({ type: 'success', msg: 'Subscription updated successfully' });
    } catch (e: any) {
      setResult({ type: 'error', msg: e.message || 'Error updating subscription' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">{t('userDetail.subscriptionSection')}</h4>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${isSubscribed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {isSubscribed ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Plan selector */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">— Select Plan —</option>
          <option value="seller_pro_monthly">Seller Pro Monthly</option>
          <option value="seller_pro_yearly">Seller Pro Yearly</option>
          <option value="seller_enterprise_yearly">Seller Enterprise Yearly</option>
          <option value="buyer_monthly">Buyer Monthly</option>
          <option value="buyer_yearly">Buyer Yearly</option>
          <option value="pro_monthly">Pro Monthly</option>
          <option value="pro_yearly">Pro Yearly</option>
          <option value="agency_yearly">Agency Yearly</option>
        </select>
      </div>

      {/* Date pickers */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Expiration Date</label>
          <input
            type="date"
            value={expiresDate}
            onChange={(e) => setExpiresDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Current info */}
      {editingUser.subscriptionSource && (
        <p className="text-xs text-gray-400">
          Source: <span className="capitalize">{editingUser.subscriptionSource}</span>
          {editingUser.subscriptionProductName && <> &middot; {editingUser.subscriptionProductName}</>}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        {isSubscribed ? (
          <>
            <button
              type="button"
              onClick={handleUpdateDates}
              disabled={saving}
              className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 font-medium"
            >
              {saving ? 'Saving...' : 'Update Dates'}
            </button>
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={saving}
              className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-40 font-medium"
            >
              {saving ? 'Saving...' : 'Deactivate'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleActivate}
            disabled={saving || !plan || !expiresDate}
            className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-40 font-medium"
          >
            {saving ? 'Activating...' : 'Activate Subscription'}
          </button>
        )}
      </div>

      {/* Feedback */}
      {result && (
        <p className={`text-xs mt-1 ${result.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
          {result.msg}
        </p>
      )}
    </div>
  );
}

export default UserManagerDetail;
