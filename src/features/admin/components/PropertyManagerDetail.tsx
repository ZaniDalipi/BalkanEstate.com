import React from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@/constants';
import { PROPERTY_TYPE_OPTIONS } from '@/shared/constants/propertyTypes';
import { type Property, type PropertyEditForm, getAllPropertyImages } from './usePropertyManager';
import AdminPropertyLocationEditor from './AdminPropertyLocationEditor';
import { resolveConstruction } from '@/shared/property/construction';
import UserAvatar from '@/components/shared/UserAvatar';

interface PropertyViewModalProps {
  property: Property;
  onClose: () => void;
  formatPrice: (price: number) => string;
  formatDate: (dateString: string) => string;
  getStatusBadgeColor: (status: string) => string;
  getPropertyTypeLabel: (type: string) => string;
}

export const PropertyViewModal: React.FC<PropertyViewModalProps> = ({
  property,
  onClose,
  formatPrice,
  formatDate,
  getStatusBadgeColor,
  getPropertyTypeLabel,
}) => {
  const { t } = useTranslation(['admin', 'common', 'property']);
  const construction = resolveConstruction(property);
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{t('admin:propertyManager.propertyDetails')}</h3>
            <p className="text-sm text-gray-500">ID: {property._id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Images Gallery */}
          {getAllPropertyImages(property).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {getAllPropertyImages(property).slice(0, 8).map((imgUrl, idx) => (
                <img
                  key={idx}
                  src={imgUrl}
                  alt={`${property.title} ${idx + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-32 object-cover rounded-xl"
                />
              ))}
            </div>
          )}

          {/* Main Info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{property.title}</h4>
                <p className="text-gray-600 mt-1">{property.address}</p>
                <p className="text-gray-500 text-sm">{property.city}, {property.country}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{formatPrice(property.price)}</div>
                <span className={`inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(property.status)}`}>
                  {property.status}
                </span>
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">{t('admin:propertyManager.specifications')}</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-500 text-xs">{t('admin:propertyManager.type')}</div>
                <div className="font-medium text-gray-900">{getPropertyTypeLabel(property.propertyType)}</div>
              </div>
              {property.bedrooms && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500 text-xs">{t('admin:propertyManager.bedrooms')}</div>
                  <div className="font-medium text-gray-900">{property.bedrooms}</div>
                </div>
              )}
              {property.bathrooms && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500 text-xs">{t('admin:properties.bathrooms')}</div>
                  <div className="font-medium text-gray-900">{property.bathrooms}</div>
                </div>
              )}
              {property.area && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500 text-xs">{t('admin:properties.area')}</div>
                  <div className="font-medium text-gray-900">{property.area} m²</div>
                </div>
              )}
              {property.yearBuilt && (
                <div className="bg-gray-50 rounded-lg p-3">
                  {/* Same rule as the public detail page: an unfinished building
                      has a handover year, not a year built. */}
                  <div className="text-gray-500 text-xs">
                    {construction.status === 'under-construction'
                      ? t('property:features.expectedCompletion', 'Expected completion')
                      : t('admin:properties.yearBuilt')}
                  </div>
                  <div className="font-medium text-gray-900">
                    {construction.status === 'under-construction'
                      ? (construction.expectedYear ?? t('property:features.underConstruction', 'Under construction'))
                      : property.yearBuilt}
                  </div>
                </div>
              )}
              {property.parking !== undefined && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500 text-xs">{t('admin:properties.parking')}</div>
                  <div className="font-medium text-gray-900">{t('admin:properties.parkingSpots', { count: property.parking })}</div>
                </div>
              )}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-500 text-xs">{t('admin:properties.promoted')}</div>
                <div className={`font-medium ${property.isPromoted ? 'text-purple-600' : 'text-gray-900'}`}>
                  {property.isPromoted ? t('admin:userDetail.yes') : t('admin:userDetail.no')}
                </div>
              </div>
              {property.views !== undefined && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500 text-xs">{t('admin:properties.views')}</div>
                  <div className="font-medium text-gray-900">{property.views}</div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {property.description && (
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">{t('admin:properties.description')}</h5>
              <p className="text-gray-600 text-sm leading-relaxed">{property.description}</p>
            </div>
          )}

          {/* Owner Info */}
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">{t('admin:properties.owner')}</h5>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-blue-50">
                  <UserAvatar
                    src={property.sellerId?.avatarUrl}
                    alt={property.sellerId?.name || ''}
                    gender={property.sellerId?.gender}
                    seed={property.sellerId?._id || property.sellerId?.name}
                    avatarOptions={property.sellerId?.avatarOptions}
                    width={96}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{property.sellerId?.name || t('admin:properties.unknown')}</div>
                  <div className="text-sm text-gray-500">{property.sellerId?.email || ''}</div>
                  <div className="text-xs text-gray-400 capitalize mt-0.5">
                    {property.sellerId?.role || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-200 pt-4">
            <div>
              <span className="text-gray-500">{t('admin:properties.created')}:</span>
              <span className="ml-2 text-gray-900">{formatDate(property.createdAt)}</span>
            </div>
            <div>
              <span className="text-gray-500">{t('admin:properties.lastUpdated')}:</span>
              <span className="ml-2 text-gray-900">{formatDate(property.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PropertyEditModalProps {
  property: Property;
  editForm: PropertyEditForm;
  setEditForm: React.Dispatch<React.SetStateAction<PropertyEditForm>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const PropertyEditModal: React.FC<PropertyEditModalProps> = ({
  property,
  editForm,
  setEditForm,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation(['admin']);
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{t('admin:properties.edit')}</h3>
            <p className="text-sm text-gray-500">{property.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:table.title')}</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:properties.priceEUR')}</label>
                <input
                  type="number"
                  value={editForm.price}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">{t('admin:properties.priceReadOnly')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:table.status')}</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">{t('admin:properties.status.active')}</option>
                  <option value="pending">{t('admin:properties.status.pending')}</option>
                  <option value="sold">{t('admin:properties.status.sold')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:properties.address')}</label>
              <input
                type="text"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:userDetail.city')}</label>
                <input
                  type="text"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:userDetail.country')}</label>
                <input
                  type="text"
                  value={editForm.country}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:properties.propertyType')}</label>
                <select
                  value={editForm.propertyType}
                  onChange={(e) => setEditForm({ ...editForm, propertyType: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PROPERTY_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {t(`admin:properties.types.${option.value}`, option.fallback)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <AdminPropertyLocationEditor
              country={editForm.country}
              city={editForm.city}
              location={{ lat: editForm.lat, lng: editForm.lng, address: editForm.address }}
              // Functional update: the map's pin handlers can fire long after
              // the render they were bound in, and spreading a captured
              // editForm there would put the coordinates back where they were.
              onChange={(patch) => setEditForm((prev) => ({ ...prev, ...patch }))}
            />

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:properties.bedrooms')}</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.beds}
                  onChange={(e) => setEditForm({ ...editForm, beds: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:properties.bathrooms')}</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.baths}
                  onChange={(e) => setEditForm({ ...editForm, baths: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:properties.areaM2')}</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.sqft}
                  onChange={(e) => setEditForm({ ...editForm, sqft: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:properties.yearBuilt')}</label>
                <input
                  type="number"
                  min="1800"
                  max={new Date().getFullYear() + 5}
                  value={editForm.yearBuilt}
                  onChange={(e) => setEditForm({ ...editForm, yearBuilt: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:properties.description')}</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Property description..."
              />
            </div>

            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl">
              <input
                type="checkbox"
                id="isPromoted"
                checked={editForm.isPromoted}
                onChange={(e) => setEditForm({ ...editForm, isPromoted: e.target.checked })}
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <div>
                <label htmlFor="isPromoted" className="text-sm font-medium text-gray-900">
                  {t('admin:properties.promoteProperty')}
                </label>
                <p className="text-xs text-gray-500">{t('admin:properties.promotePropertyDesc')}</p>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 flex gap-3 flex-shrink-0 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-medium transition-colors"
            >
              {t('admin:confirmations.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors"
            >
              {t('admin:properties.saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
