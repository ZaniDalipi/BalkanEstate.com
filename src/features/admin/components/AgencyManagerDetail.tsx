import React, { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, BuildingOfficeIcon } from '@/constants';
import { Agency } from '@/types';
import { AgencyEditForm } from './useAgencyManager';
import { apiRequest } from '@/src/shared/api';
import PhoneInput from '@/src/shared/components/ui/PhoneInput';

const MapLocationPicker = lazy(() => import('@/src/features/seller/components/MapLocationPicker'));

const subscriptionStatusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  trial: 'bg-blue-100 text-blue-800',
  expired: 'bg-red-100 text-red-800',
  canceled: 'bg-gray-100 text-gray-800',
};

interface AgencyManagerDetailProps {
  // View modal
  isViewModalOpen: boolean;
  setIsViewModalOpen: (open: boolean) => void;
  viewingAgency: Agency | null;
  // Edit modal
  isEditModalOpen: boolean;
  setIsEditModalOpen: (open: boolean) => void;
  editingAgency: Agency | null;
  editForm: AgencyEditForm;
  setEditForm: React.Dispatch<React.SetStateAction<AgencyEditForm>>;
  handleUpdateAgency: (e: React.FormEvent) => void;
  // Subscription actions
  handleActivateSubscription: (agencyId: string, agencyName: string) => void;
  handleDeactivateSubscription: (agencyId: string, agencyName: string) => void;
  subscriptionLoading: string | null;
  formatDate: (dateString: string) => string;
}

const AgencyManagerDetail: React.FC<AgencyManagerDetailProps> = ({
  isViewModalOpen,
  setIsViewModalOpen,
  viewingAgency,
  isEditModalOpen,
  setIsEditModalOpen,
  editingAgency,
  editForm,
  setEditForm,
  handleUpdateAgency,
  handleActivateSubscription,
  handleDeactivateSubscription,
  subscriptionLoading,
  formatDate,
}) => {
  const { t } = useTranslation(['admin', 'common']);
  return (
    <>
      {/* View Modal */}
      {isViewModalOpen && viewingAgency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-xl font-bold">{t('admin:agencyManager.agencyDetails')}</h3>
              <button onClick={() => setIsViewModalOpen(false)}>
                <XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Logo and Basic Info */}
              <div className="flex items-start gap-4">
                {viewingAgency.logo ? (
                  <img
                    src={viewingAgency.logo}
                    alt={viewingAgency.name}
                    loading="lazy"
                    decoding="async"
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-blue-100 flex items-center justify-center">
                    <BuildingOfficeIcon className="w-12 h-12 text-blue-600" />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="text-2xl font-bold text-gray-900">{viewingAgency.name}</h4>
                  <p className="text-sm text-gray-500 mt-1">{viewingAgency.slug}</p>
                  {viewingAgency.description && (
                    <p className="text-gray-700 mt-2">{viewingAgency.description}</p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-t pt-4">
                <h5 className="font-semibold text-gray-900 mb-3">{t('admin:agencyManager.contactInformation')}</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:agencyManager.email')}</label>
                    <div className="text-gray-900">{viewingAgency.email || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:agencyManager.phone')}</label>
                    <div className="text-gray-900">{viewingAgency.phone || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:agencyManager.website')}</label>
                    <div className="text-gray-900">
                      {viewingAgency.website ? (
                        <a href={viewingAgency.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {viewingAgency.website}
                        </a>
                      ) : '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="border-t pt-4">
                <h5 className="font-semibold text-gray-900 mb-3">{t('admin:agencyManager.location')}</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:agencyManager.address')}</label>
                    <div className="text-gray-900">{viewingAgency.address || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:agencyManager.city')}</label>
                    <div className="text-gray-900">{viewingAgency.city || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:agencyManager.country')}</label>
                    <div className="text-gray-900">{viewingAgency.country || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Owner Info */}
              {viewingAgency.ownerId && typeof viewingAgency.ownerId === 'object' && (
                <div className="border-t pt-4">
                  <h5 className="font-semibold text-gray-900 mb-3">{t('admin:agencyManager.owner')}</h5>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="font-medium text-gray-900">{viewingAgency.ownerId.name}</div>
                    <div className="text-sm text-gray-600">{viewingAgency.ownerId.email}</div>
                    {viewingAgency.ownerId.role && (
                      <div className="text-xs text-gray-500 mt-1">{t('admin:agencyManager.role')}: {viewingAgency.ownerId.role}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Subscription */}
              <div className="border-t pt-4">
                <h5 className="font-semibold text-gray-900 mb-3">{t('admin:agencies.subscription', 'Subscription')}</h5>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${subscriptionStatusStyles[viewingAgency.subscription?.status || 'expired'] || 'bg-gray-100 text-gray-800'}`}>
                        {t(`admin:agencies.status.${viewingAgency.subscription?.status || 'expired'}`, viewingAgency.subscription?.status || 'expired')}
                      </span>
                      {viewingAgency.subscription?.autoRenew && (
                        <span className="text-xs text-gray-500">{t('admin:agencies.autoRenew', 'Auto-renew')}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {viewingAgency.subscription?.status === 'active' || viewingAgency.subscription?.status === 'trial' ? (
                        <button
                          onClick={() => handleDeactivateSubscription(viewingAgency._id, viewingAgency.name)}
                          disabled={subscriptionLoading === viewingAgency._id}
                          className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 disabled:opacity-50"
                        >
                          {t('admin:agencies.deactivateSubscription', 'Deactivate')}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivateSubscription(viewingAgency._id, viewingAgency.name)}
                          disabled={subscriptionLoading === viewingAgency._id}
                          className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 disabled:opacity-50"
                        >
                          {t('admin:agencies.activateSubscription', 'Activate')}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">{t('admin:agencies.startDate', 'Start Date')}:</span>
                      <span className="ml-2 text-gray-900">
                        {viewingAgency.subscription?.startDate ? formatDate(viewingAgency.subscription.startDate) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('admin:agencies.expiresAt', 'Expires At')}:</span>
                      <span className="ml-2 text-gray-900">
                        {viewingAgency.subscription?.expiresAt ? formatDate(viewingAgency.subscription.expiresAt) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('admin:agencies.amount', 'Amount')}:</span>
                      <span className="ml-2 text-gray-900">
                        {viewingAgency.subscription?.amount ? `${viewingAgency.subscription.currency || 'EUR'} ${viewingAgency.subscription.amount}` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('admin:agencies.autoRenew', 'Auto Renew')}:</span>
                      <span className="ml-2 text-gray-900">
                        {viewingAgency.subscription?.autoRenew ? t('admin:userDetail.yes', 'Yes') : t('admin:userDetail.no', 'No')}
                      </span>
                    </div>
                  </div>
                  {/* Listing Limit Override */}
                  <AgencyListingLimitOverride agency={viewingAgency} />
                </div>
              </div>

              {/* Specialties & Certifications */}
              {(viewingAgency.specialties && viewingAgency.specialties.length > 0) ||
               (viewingAgency.certifications && viewingAgency.certifications.length > 0) ? (
                <div className="border-t pt-4">
                  <h5 className="font-semibold text-gray-900 mb-3">{t('admin:agencyManager.specialtiesAndCertifications')}</h5>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingAgency.specialties && viewingAgency.specialties.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:agencyManager.specialties')}</label>
                        <div className="flex flex-wrap gap-2">
                          {viewingAgency.specialties.map((specialty, idx) => (
                            <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {viewingAgency.certifications && viewingAgency.certifications.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:agencyManager.certifications')}</label>
                        <div className="flex flex-wrap gap-2">
                          {viewingAgency.certifications.map((cert, idx) => (
                            <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Featured Status */}
              {viewingAgency.isFeatured && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      {t('admin:agencyManager.featuredAgency')}
                    </span>
                    <span className="text-sm text-gray-500">{t('admin:agencyManager.featuredAgencyDesc')}</span>
                  </div>
                </div>
              )}

              {/* Business Hours */}
              {viewingAgency.businessHours && Object.values(viewingAgency.businessHours).some(h => h) && (
                <div className="border-t pt-4">
                  <h5 className="font-semibold text-gray-900 mb-3">{t('admin:agencyManager.businessHours')}</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(viewingAgency.businessHours).map(([day, hours]) => (
                      hours && (
                        <div key={day} className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700 capitalize">{day}:</span>
                          <span className="text-gray-600">{hours}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Agents List */}
              <div className="border-t pt-4">
                <h5 className="font-semibold text-gray-900 mb-3">{t('admin:agencyManager.agents')} ({viewingAgency.totalAgents})</h5>
                {viewingAgency.agents && viewingAgency.agents.length > 0 ? (
                  <div className="space-y-2">
                    {viewingAgency.agents.map((agent) => (
                      <div key={agent._id} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{agent.name}</div>
                          <div className="text-sm text-gray-600">{agent.email}</div>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                          {agent.role}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">{t('admin:agencyManager.noAgentsAssigned')}</p>
                )}
              </div>

              {/* Timestamps */}
              <div className="border-t pt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:agencyManager.created')}</label>
                  <div className="text-gray-600">{formatDate(viewingAgency.createdAt)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:agencyManager.lastUpdated')}</label>
                  <div className="text-gray-600">{formatDate(viewingAgency.updatedAt)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingAgency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold">{t('admin:agencyManager.editAgency')}</h3>
              <button onClick={() => setIsEditModalOpen(false)}>
                <XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <form onSubmit={handleUpdateAgency} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:agencyManager.agencyName')}
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
                  {t('admin:agencyManager.description')}
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:agencyManager.email')}
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:agencyManager.phone')}
                  </label>
                  <PhoneInput
                    value={editForm.phone || ''}
                    onChange={(v) => setEditForm({ ...editForm, phone: v })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:agencyManager.website')}
                </label>
                <input
                  type="url"
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:agencyManager.address')}
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:agencyManager.city')}
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
                    {t('admin:agencyManager.country')}
                  </label>
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:agencyManager.zipCode')}
                  </label>
                  <input
                    type="text"
                    value={editForm.zipCode}
                    onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Map Location Picker */}
              <div className="border-t pt-4">
                <Suspense fallback={
                  <div className="w-full h-96 rounded-lg border-2 border-gray-200 flex items-center justify-center bg-gray-50">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                }>
                  <MapLocationPicker
                    lat={editForm.lat || 41.3275}
                    lng={editForm.lng || 19.8187}
                    address={editForm.address}
                    zoom={editForm.lat ? 15 : 8}
                    country={editForm.country}
                    city={editForm.city}
                    onLocationChange={(lat: number, lng: number) => setEditForm((prev) => ({ ...prev, lat, lng }))}
                    onAddressChange={(address: string) => setEditForm((prev) => ({ ...prev, address }))}
                  />
                </Suspense>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('admin:agencyManager.socialMediaLinks')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin:agencyManager.facebookUrl')}
                    </label>
                    <input
                      type="url"
                      value={editForm.facebookUrl}
                      onChange={(e) => setEditForm({ ...editForm, facebookUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin:agencyManager.instagramUrl')}
                    </label>
                    <input
                      type="url"
                      value={editForm.instagramUrl}
                      onChange={(e) => setEditForm({ ...editForm, instagramUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin:agencyManager.linkedinUrl')}
                    </label>
                    <input
                      type="url"
                      value={editForm.linkedinUrl}
                      onChange={(e) => setEditForm({ ...editForm, linkedinUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://linkedin.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin:agencyManager.twitterUrl')}
                    </label>
                    <input
                      type="url"
                      value={editForm.twitterUrl}
                      onChange={(e) => setEditForm({ ...editForm, twitterUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://twitter.com/..."
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:agencyManager.yearsInBusiness')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.yearsInBusiness}
                    onChange={(e) => setEditForm({ ...editForm, yearsInBusiness: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center pt-7">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={editForm.isFeatured}
                    onChange={(e) => setEditForm({ ...editForm, isFeatured: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="isFeatured" className="ml-2 text-sm text-gray-700">
                    {t('admin:agencyManager.featuredAgency')}
                  </label>
                  {editForm.isFeatured && (
                    <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      {t('admin:agencyManager.willAppearInFeatured')}
                    </span>
                  )}
                </div>
              </div>

              {/* Specialties */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:agencyManager.specialtiesCommaSeparated')}
                </label>
                <input
                  type="text"
                  value={editForm.specialties.join(', ')}
                  onChange={(e) => setEditForm({
                    ...editForm,
                    specialties: e.target.value.split(',').map(s => s.trim())
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Residential, Commercial, Luxury Properties"
                />
              </div>

              {/* Certifications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:agencyManager.certificationsCommaSeparated')}
                </label>
                <input
                  type="text"
                  value={editForm.certifications.join(', ')}
                  onChange={(e) => setEditForm({
                    ...editForm,
                    certifications: e.target.value.split(',').map(s => s.trim())
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Licensed Real Estate Agency, ISO Certified"
                />
              </div>

              {/* Business Hours */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('admin:agencyManager.businessHours')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <div key={day}>
                      <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                        {day}
                      </label>
                      <input
                        type="text"
                        value={editForm.businessHours[day as keyof typeof editForm.businessHours]}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          businessHours: { ...editForm.businessHours, [day]: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="9:00 AM - 6:00 PM"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-xs text-yellow-800">
                  <strong>{t('common:note')}:</strong> {t('admin:agencyManager.editNote')}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  {t('common:cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  {t('common:saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// ============================================================================
// Agency Listing Limit Override (inline component)
// ============================================================================

function AgencyListingLimitOverride({ agency }: { agency: Agency }) {
  const { t } = useTranslation(['admin']);
  const currentLimit = (agency.subscription as any)?.listingsLimit ?? 0;
  const [inputLimit, setInputLimit] = useState(String(currentLimit));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState('');

  const handleSave = async () => {
    const val = Number(inputLimit);
    if (isNaN(val) || val < 0) {
      setErr(t('admin:userDetail.invalidNumber', 'Invalid number'));
      return;
    }
    setSaving(true);
    setErr('');
    setResult('');
    try {
      const res = await apiRequest(`/admin/agencies/${agency._id}/listing-limit`, {
        method: 'PATCH',
        body: { listingsLimit: val, reason: 'Admin manual override' },
        requiresAuth: true,
      });
      setSaved(true);
      setResult(res.message || '');
      setTimeout(() => { setSaved(false); setResult(''); }, 4000);
    } catch (e: any) {
      setErr(e.message || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-gray-200 pt-3 mt-3">
      <label className="text-xs font-semibold text-gray-600 block mb-1">
        {t('admin:agencies.listingLimitOverride', 'Listing Limit Override')}
        <span className="font-normal text-gray-400 ml-1">
          ({t('admin:agencies.listingLimitDesc', 'currently {{current}} — applies to owner + all agents', { current: currentLimit })})
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
          {saving ? t('admin:userDetail.saving', 'Saving...') : saved ? t('admin:userDetail.saved', 'Saved!') : t('admin:userDetail.apply', 'Apply')}
        </button>
        <span className="text-xs text-gray-400">{t('admin:userDetail.listingsPerMonth', 'listings / month')}</span>
      </div>
      {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
      {result && <p className="text-xs text-green-600 mt-1">{result}</p>}
    </div>
  );
}

export default AgencyManagerDetail;
