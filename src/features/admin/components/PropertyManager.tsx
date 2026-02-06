import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  HomeIcon,
  SparklesIcon,
  BedIcon,
  BathIcon,
  SqftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@/constants';
import { usePropertyManager, getPropertyImage } from './usePropertyManager';
import { PropertyViewModal, PropertyEditModal } from './PropertyManagerDetail';

const PropertyManager: React.FC = () => {
  const { t } = useTranslation(['admin']);

  const {
    properties,
    isLoading,
    error,
    successMessage,
    stats,
    totalProperties,
    totalPages,
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterType,
    setFilterType,
    filterPromoted,
    setFilterPromoted,
    isViewModalOpen,
    setIsViewModalOpen,
    viewingProperty,
    isEditModalOpen,
    setIsEditModalOpen,
    editingProperty,
    editForm,
    setEditForm,
    fetchProperties,
    handleViewProperty,
    handleEditProperty,
    handleUpdateProperty,
    handleTogglePromoted,
    handleDeleteProperty,
    formatPrice,
    formatDate,
    getStatusBadgeColor,
    getPropertyTypeLabel,
  } = usePropertyManager();

  if (isLoading && properties.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('admin:properties.loading', 'Loading properties...')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('admin:properties.title', 'Property Manager')}</h2>
            <p className="text-sm text-gray-500 mt-1">Manage all property listings on the platform</p>
          </div>
          <button
            onClick={fetchProperties}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HomeIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalProperties}</div>
                <div className="text-xs text-gray-500">Total Properties</div>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <HomeIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
                <div className="text-xs text-gray-500">Active</div>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <HomeIcon className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <SparklesIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.promoted}</div>
                <div className="text-xs text-gray-500">Promoted</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <span className="font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search properties..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="sold">Sold</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="house">House</option>
            <option value="apartment">Apartment</option>
            <option value="villa">Villa</option>
            <option value="land">Land</option>
            <option value="commercial">Commercial</option>
            <option value="other">Other</option>
          </select>
          <select
            value={filterPromoted}
            onChange={(e) => setFilterPromoted(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Properties</option>
            <option value="true">Promoted Only</option>
            <option value="false">Not Promoted</option>
          </select>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 flex items-center gap-3">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-3">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Properties Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Property</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Specs</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Owner</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {properties.map((property) => (
                <tr key={property._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {getPropertyImage(property) ? (
                        <img
                          src={getPropertyImage(property)!}
                          alt={property.title}
                          loading="lazy"
                          decoding="async"
                          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <HomeIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate max-w-[200px]" title={property.title}>
                          {property.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {getPropertyTypeLabel(property.propertyType)}
                          </span>
                          {property.isPromoted && (
                            <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <SparklesIcon className="w-3 h-3" />
                              Promoted
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">{property.city}</div>
                    <div className="text-xs text-gray-500">{property.country}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-gray-900">{formatPrice(property.price)}</div>
                    {property.priceType && (
                      <div className="text-xs text-gray-500">{property.priceType}</div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1 text-xs text-gray-600">
                      {(property.bedrooms || property.beds) && (
                        <div className="flex items-center gap-1">
                          <BedIcon className="w-3.5 h-3.5" />
                          {property.bedrooms || property.beds} beds
                        </div>
                      )}
                      {(property.bathrooms || property.baths) && (
                        <div className="flex items-center gap-1">
                          <BathIcon className="w-3.5 h-3.5" />
                          {property.bathrooms || property.baths} baths
                        </div>
                      )}
                      {(property.area || property.sqft) && (
                        <div className="flex items-center gap-1">
                          <SqftIcon className="w-3.5 h-3.5" />
                          {property.area || property.sqft} m²
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">{property.sellerId?.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500 truncate max-w-[120px]" title={property.sellerId?.email}>
                      {property.sellerId?.email || ''}
                    </div>
                    <div className="text-xs text-gray-400 capitalize mt-0.5">
                      {property.sellerId?.role || ''}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(property.status)}`}>
                      {property.status}
                    </span>
                    {property.views !== undefined && (
                      <div className="text-xs text-gray-500 mt-1">
                        {property.views} views
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">{formatDate(property.createdAt)}</div>
                    <div className="text-xs text-gray-500">Updated: {formatDate(property.updatedAt)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleViewProperty(property)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleTogglePromoted(property)}
                        className={`p-2 rounded-lg transition-colors ${
                          property.isPromoted
                            ? 'text-purple-600 bg-purple-50 hover:bg-purple-100'
                            : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                        }`}
                        title={property.isPromoted ? 'Remove promotion' : 'Promote property'}
                      >
                        <SparklesIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditProperty(property)}
                        className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit property"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProperty(property._id, property.title)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete property"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {properties.length === 0 && !isLoading && (
            <div className="text-center py-16">
              <HomeIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No properties found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
              <span className="text-gray-400 ml-2">({totalProperties} total properties)</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Next
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {isViewModalOpen && viewingProperty && (
        <PropertyViewModal
          property={viewingProperty}
          onClose={() => setIsViewModalOpen(false)}
          formatPrice={formatPrice}
          formatDate={formatDate}
          getStatusBadgeColor={getStatusBadgeColor}
          getPropertyTypeLabel={getPropertyTypeLabel}
        />
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingProperty && (
        <PropertyEditModal
          property={editingProperty}
          editForm={editForm}
          setEditForm={setEditForm}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleUpdateProperty}
        />
      )}
    </div>
  );
};

export default PropertyManager;
