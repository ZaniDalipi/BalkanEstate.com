import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
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
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';

interface PropertyImage {
  url: string;
  publicId?: string;
  tag?: string;
}

interface Property {
  _id: string;
  title: string;
  price: number;
  priceType: string;
  status: 'active' | 'pending' | 'sold';
  address: string;
  city: string;
  country: string;
  propertyType: string;
  beds?: number;
  bedrooms?: number;
  baths?: number;
  bathrooms?: number;
  sqft?: number;
  area?: number;
  livingRooms?: number;
  yearBuilt?: number;
  parking?: number;
  description?: string;
  isPromoted?: boolean;
  views?: number;
  imageUrl?: string;
  images?: PropertyImage[];
  sellerId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Helper function to get the best available image URL
const getPropertyImage = (property: Property): string | null => {
  // First try the main imageUrl
  if (property.imageUrl) {
    return property.imageUrl;
  }
  // Then try the first image from the images array
  if (property.images && property.images.length > 0 && property.images[0]?.url) {
    return property.images[0].url;
  }
  return null;
};

// Helper to get all image URLs
const getAllPropertyImages = (property: Property): string[] => {
  const allImages: string[] = [];

  // Add main image first
  if (property.imageUrl) {
    allImages.push(property.imageUrl);
  }

  // Add images from the array
  if (property.images && property.images.length > 0) {
    property.images.forEach(img => {
      if (img?.url && !allImages.includes(img.url)) {
        allImages.push(img.url);
      }
    });
  }

  return allImages;
};

const PropertyManager: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const { confirm } = useConfirmation();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPromoted, setFilterPromoted] = useState<string>('all');

  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    price: 0,
    status: 'active' as 'active' | 'pending' | 'sold',
    address: '',
    city: '',
    country: '',
    beds: 0,
    baths: 0,
    livingRooms: 0,
    sqft: 0,
    yearBuilt: new Date().getFullYear(),
    parking: 0,
    propertyType: 'house',
    description: '',
    isPromoted: false,
  });

  // View modal
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProperties, setTotalProperties] = useState(0);

  useEffect(() => {
    fetchProperties();
  }, [currentPage, filterStatus, filterType, filterPromoted, searchQuery]);

  const fetchProperties = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('balkan_estate_token');

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '15',
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(filterType !== 'all' && { propertyType: filterType }),
        ...(filterPromoted !== 'all' && { isPromoted: filterPromoted }),
        ...(searchQuery && { search: searchQuery }),
      });

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_URL}/admin/properties?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch properties');

      const data = await response.json();
      setProperties(data.properties || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalProperties(data.pagination?.totalItems || 0);
    } catch (err) {
      setError('Failed to load properties');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProperty = (property: Property) => {
    setViewingProperty(property);
    setIsViewModalOpen(true);
  };

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    setEditForm({
      title: property.title || '',
      price: property.price || 0,
      status: property.status,
      address: property.address || '',
      city: property.city || '',
      country: property.country || '',
      beds: property.beds || property.bedrooms || 0,
      baths: property.baths || property.bathrooms || 0,
      livingRooms: property.livingRooms || 0,
      sqft: property.sqft || property.area || 0,
      yearBuilt: property.yearBuilt || new Date().getFullYear(),
      parking: property.parking || 0,
      propertyType: property.propertyType || 'house',
      description: property.description || '',
      isPromoted: property.isPromoted || false,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;

    try {
      const token = localStorage.getItem('balkan_estate_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

      const response = await fetch(`${API_URL}/admin/properties/${editingProperty._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error('Failed to update property');

      await fetchProperties();
      setIsEditModalOpen(false);
      setEditingProperty(null);
      setSuccessMessage('Property updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update property');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleTogglePromoted = async (property: Property) => {
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

      const response = await fetch(`${API_URL}/admin/properties/${property._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isPromoted: !property.isPromoted }),
      });

      if (!response.ok) throw new Error('Failed to update property');

      await fetchProperties();
      setSuccessMessage(`Property ${property.isPromoted ? 'unpromoted' : 'promoted'} successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update property');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteProperty = async (propertyId: string, title: string) => {
    const confirmed = await confirm({
      title: t('admin:properties.deleteTitle', 'Delete Property'),
      message: t('admin:properties.deleteConfirm', { title, defaultValue: `Are you sure you want to delete "${title}"? This action cannot be undone.` }),
      confirmLabel: t('admin:common.delete', 'Delete'),
      cancelLabel: t('admin:common.cancel', 'Cancel'),
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('balkan_estate_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

      const response = await fetch(`${API_URL}/admin/properties/${propertyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete property');

      await fetchProperties();
      setSuccessMessage('Property deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to delete property');
      setTimeout(() => setError(null), 5000);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'sold':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      house: 'House',
      apartment: 'Apartment',
      villa: 'Villa',
      land: 'Land',
      commercial: 'Commercial',
      other: 'Other',
    };
    return types[type] || type;
  };

  // Stats calculation
  const stats = {
    total: totalProperties,
    active: properties.filter(p => p.status === 'active').length,
    pending: properties.filter(p => p.status === 'pending').length,
    promoted: properties.filter(p => p.isPromoted).length,
  };

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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Property Details</h3>
                <p className="text-sm text-gray-500">ID: {viewingProperty._id}</p>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Images Gallery */}
              {getAllPropertyImages(viewingProperty).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {getAllPropertyImages(viewingProperty).slice(0, 8).map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={imgUrl}
                      alt={`${viewingProperty.title} ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-xl"
                    />
                  ))}
                </div>
              )}

              {/* Main Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{viewingProperty.title}</h4>
                    <p className="text-gray-600 mt-1">{viewingProperty.address}</p>
                    <p className="text-gray-500 text-sm">{viewingProperty.city}, {viewingProperty.country}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{formatPrice(viewingProperty.price)}</div>
                    <span className={`inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(viewingProperty.status)}`}>
                      {viewingProperty.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Specifications */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Specifications</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500 text-xs">Type</div>
                    <div className="font-medium text-gray-900">{getPropertyTypeLabel(viewingProperty.propertyType)}</div>
                  </div>
                  {viewingProperty.bedrooms && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-gray-500 text-xs">Bedrooms</div>
                      <div className="font-medium text-gray-900">{viewingProperty.bedrooms}</div>
                    </div>
                  )}
                  {viewingProperty.bathrooms && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-gray-500 text-xs">Bathrooms</div>
                      <div className="font-medium text-gray-900">{viewingProperty.bathrooms}</div>
                    </div>
                  )}
                  {viewingProperty.area && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-gray-500 text-xs">Area</div>
                      <div className="font-medium text-gray-900">{viewingProperty.area} m²</div>
                    </div>
                  )}
                  {viewingProperty.yearBuilt && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-gray-500 text-xs">Year Built</div>
                      <div className="font-medium text-gray-900">{viewingProperty.yearBuilt}</div>
                    </div>
                  )}
                  {viewingProperty.parking !== undefined && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-gray-500 text-xs">Parking</div>
                      <div className="font-medium text-gray-900">{viewingProperty.parking} spots</div>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500 text-xs">Promoted</div>
                    <div className={`font-medium ${viewingProperty.isPromoted ? 'text-purple-600' : 'text-gray-900'}`}>
                      {viewingProperty.isPromoted ? 'Yes' : 'No'}
                    </div>
                  </div>
                  {viewingProperty.views !== undefined && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-gray-500 text-xs">Views</div>
                      <div className="font-medium text-gray-900">{viewingProperty.views}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {viewingProperty.description && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">Description</h5>
                  <p className="text-gray-600 text-sm leading-relaxed">{viewingProperty.description}</p>
                </div>
              )}

              {/* Owner Info */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Property Owner</h5>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {viewingProperty.sellerId?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{viewingProperty.sellerId?.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{viewingProperty.sellerId?.email || ''}</div>
                      <div className="text-xs text-gray-400 capitalize mt-0.5">
                        {viewingProperty.sellerId?.role || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-200 pt-4">
                <div>
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-2 text-gray-900">{formatDate(viewingProperty.createdAt)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="ml-2 text-gray-900">{formatDate(viewingProperty.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingProperty && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Edit Property</h3>
                <p className="text-sm text-gray-500">{editingProperty.title}</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleUpdateProperty} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (EUR)</label>
                    <input
                      type="number"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="sold">Sold</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={editForm.country}
                      onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                    <select
                      value={editForm.propertyType}
                      onChange={(e) => setEditForm({ ...editForm, propertyType: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="house">House</option>
                      <option value="apartment">Apartment</option>
                      <option value="villa">Villa</option>
                      <option value="land">Land</option>
                      <option value="commercial">Commercial</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.beds}
                      onChange={(e) => setEditForm({ ...editForm, beds: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.baths}
                      onChange={(e) => setEditForm({ ...editForm, baths: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area (m²)</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.sqft}
                      onChange={(e) => setEditForm({ ...editForm, sqft: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year Built</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
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
                      Promote this property
                    </label>
                    <p className="text-xs text-gray-500">Promoted properties appear at the top of search results</p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3 flex-shrink-0 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors"
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

export default PropertyManager;
