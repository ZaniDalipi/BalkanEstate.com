import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { apiRequest } from '@/src/shared/api';

export interface PropertyImage {
  url: string;
  publicId?: string;
  tag?: string;
}

export interface Property {
  _id: string;
  title: string;
  price: number;
  priceType: string;
  status: 'active' | 'pending' | 'sold';
  address: string;
  city: string;
  country: string;
  propertyType: string;
  lat?: number;
  lng?: number;
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

export interface PropertyEditForm {
  title: string;
  price: number;
  status: 'active' | 'pending' | 'sold';
  address: string;
  city: string;
  country: string;
  beds: number;
  baths: number;
  livingRooms: number;
  sqft: number;
  yearBuilt: number;
  parking: number;
  propertyType: string;
  description: string;
  isPromoted: boolean;
  /** Map pin — drives the listing page map and the search map. */
  lat: number;
  lng: number;
}

// Helper function to get the best available image URL
export const getPropertyImage = (property: Property): string | null => {
  if (property.imageUrl) {
    return property.imageUrl;
  }
  if (property.images && property.images.length > 0 && property.images[0]?.url) {
    return property.images[0].url;
  }
  return null;
};

// Helper to get all image URLs
export const getAllPropertyImages = (property: Property): string[] => {
  const allImages: string[] = [];

  if (property.imageUrl) {
    allImages.push(property.imageUrl);
  }

  if (property.images && property.images.length > 0) {
    property.images.forEach(img => {
      if (img?.url && !allImages.includes(img.url)) {
        allImages.push(img.url);
      }
    });
  }

  return allImages;
};

export function usePropertyManager() {
  const { t } = useTranslation(['admin']);
  const { confirm } = useConfirmation();
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
  const [editForm, setEditForm] = useState<PropertyEditForm>({
    title: '',
    price: 0,
    status: 'active',
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
    lat: 0,
    lng: 0,
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

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '15',
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(filterType !== 'all' && { propertyType: filterType }),
        ...(filterPromoted !== 'all' && { isPromoted: filterPromoted }),
        ...(searchQuery && { search: searchQuery }),
      });

      const data = await apiRequest<any>(`/admin/properties?${params}`, {
        requiresAuth: true,
      });
      setProperties(data.properties || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalProperties(data.pagination?.totalItems || 0);
    } catch (err) {
      setError('Failed to load properties');
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
      lat: property.lat ?? 0,
      lng: property.lng ?? 0,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;

    // lat/lng are required on the model, so never send a half-typed or
    // out-of-range pin — leave the stored one alone instead.
    const hasValidPin =
      Number.isFinite(editForm.lat) && Number.isFinite(editForm.lng) &&
      Math.abs(editForm.lat) <= 90 && Math.abs(editForm.lng) <= 180 &&
      !(editForm.lat === 0 && editForm.lng === 0);

    if (!hasValidPin && (editForm.lat !== 0 || editForm.lng !== 0)) {
      setError('Enter a valid map location (latitude -90..90, longitude -180..180)');
      setTimeout(() => setError(null), 5000);
      return;
    }

    try {
      // Strip price fields - only property owner can change price
      const { price, lat, lng, ...rest } = editForm;
      const updateData = hasValidPin ? { ...rest, lat, lng } : rest;

      await apiRequest(`/admin/properties/${editingProperty._id}`, {
        method: 'PATCH',
        body: updateData,
        requiresAuth: true,
      });

      // Update local state instead of refetching entire list
      setProperties(prev => prev.map(p =>
        p._id === editingProperty._id ? { ...p, ...updateData } : p
      ));
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
    const promoting = !property.isPromoted;
    try {
      await apiRequest(`/admin/properties/${property._id}`, {
        method: 'PATCH',
        body: { isPromoted: promoting },
        requiresAuth: true,
      });

      const now = new Date();
      const promotionEndDate = promoting
        ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        : undefined;

      setProperties(prev => prev.map(p =>
        p._id === property._id
          ? {
              ...p,
              isPromoted: promoting,
              promotionTier: promoting ? (p.promotionTier ?? 'standard') : undefined,
              promotionStartDate: promoting ? now : undefined,
              promotionEndDate,
            }
          : p
      ));
      setSuccessMessage(`Property ${promoting ? 'promoted for 1 week' : 'unpromoted'} successfully`);
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
      await apiRequest(`/admin/properties/${propertyId}`, {
        method: 'DELETE',
        requiresAuth: true,
      });

      // Update local state instead of refetching entire list
      setProperties(prev => prev.filter(p => p._id !== propertyId));
      setTotalProperties(prev => prev - 1);
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

  // Includes the exact time (hour and minute) alongside the date — listings
  // show created/updated timestamps, so admins can see precisely when each
  // happened, not just the day.
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  return {
    // Data
    properties,
    isLoading,
    error,
    successMessage,
    stats,
    totalProperties,
    totalPages,
    currentPage,
    setCurrentPage,

    // Filters
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterType,
    setFilterType,
    filterPromoted,
    setFilterPromoted,

    // View modal
    isViewModalOpen,
    setIsViewModalOpen,
    viewingProperty,

    // Edit modal
    isEditModalOpen,
    setIsEditModalOpen,
    editingProperty,
    editForm,
    setEditForm,

    // Handlers
    fetchProperties,
    handleViewProperty,
    handleEditProperty,
    handleUpdateProperty,
    handleTogglePromoted,
    handleDeleteProperty,

    // Helpers
    formatPrice,
    formatDate,
    getStatusBadgeColor,
    getPropertyTypeLabel,
  };
}
