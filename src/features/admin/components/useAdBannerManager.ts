import { useState, useEffect, useRef } from 'react';
import { apiRequest, uploadRequest } from '@/src/shared/api';
import type { AdBannerAdmin, AdPage, AdPlacement } from '@/src/features/ads/types';

/** Placement options with human labels for the admin form. */
export const PLACEMENT_OPTIONS: { id: AdPlacement; label: string }[] = [
  { id: 'sticky-bottom', label: 'Sticky Bottom Bar' },
  { id: 'sticky-top', label: 'Sticky Top Bar' },
  { id: 'header', label: 'Header' },
  { id: 'in-content', label: 'In Content' },
  { id: 'sidebar', label: 'Sidebar' },
  { id: 'footer', label: 'Footer' },
];

/** Page (targeting) options with human labels. */
export const PAGE_OPTIONS: { id: AdPage; label: string }[] = [
  { id: 'all', label: 'All Pages' },
  { id: 'home', label: 'Home' },
  { id: 'search', label: 'Search Results' },
  { id: 'rentals', label: 'Rentals' },
  { id: 'property-details', label: 'Property Details' },
  { id: 'agents', label: 'Agents' },
  { id: 'agencies', label: 'Agencies' },
  { id: 'business-directory', label: 'Business Directory' },
  { id: 'blog', label: 'Blog' },
  { id: 'guides', label: 'Guides' },
];

export interface AdBannerFormData {
  title: string;
  advertiserName: string;
  advertiserContact: string;
  imageUrl: string;
  imagePublicId: string;
  linkUrl: string;
  placement: AdPlacement;
  page: AdPage;
  category: string;
  price: string;
  currency: string;
  isActive: boolean;
  isSticky: boolean;
  startDate: string;
  endDate: string;
  order: number;
}

const emptyForm = (order = 0): AdBannerFormData => ({
  title: '',
  advertiserName: '',
  advertiserContact: '',
  imageUrl: '',
  imagePublicId: '',
  linkUrl: '',
  placement: 'sticky-bottom',
  page: 'all',
  category: '',
  price: '',
  currency: 'EUR',
  isActive: true,
  isSticky: true,
  startDate: '',
  endDate: '',
  order,
});

const toDateInput = (iso?: string): string => (iso ? iso.slice(0, 10) : '');

export function useAdBannerManager() {
  const [banners, setBanners] = useState<AdBannerAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AdBannerAdmin | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<AdBannerFormData>(emptyForm());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBanners = async () => {
    try {
      const data = await apiRequest<{ banners: AdBannerAdmin[] }>('/admin/ad-banners', {
        requiresAuth: true,
      });
      setBanners(data.banners || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const response = await uploadRequest<{ url: string; publicId: string }>(
        '/admin/ad-banners/upload-image',
        fd
      );
      setFormData((prev) => ({ ...prev, imageUrl: response.url, imagePublicId: response.publicId }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title || !formData.advertiserName || !formData.imageUrl || !formData.linkUrl) {
      setError('Title, advertiser, image and link are required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: formData.title,
        advertiserName: formData.advertiserName,
        advertiserContact: formData.advertiserContact || undefined,
        imageUrl: formData.imageUrl,
        imagePublicId: formData.imagePublicId || undefined,
        linkUrl: formData.linkUrl,
        placement: formData.placement,
        page: formData.page,
        category: formData.category || undefined,
        price: formData.price !== '' ? Number(formData.price) : undefined,
        currency: formData.currency || 'EUR',
        isActive: formData.isActive,
        isSticky: formData.isSticky,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        order: formData.order,
      };

      const endpoint = editingItem ? `/admin/ad-banners/${editingItem.id}` : '/admin/ad-banners';
      await apiRequest(endpoint, {
        method: editingItem ? 'PATCH' : 'POST',
        body: payload,
        requiresAuth: true,
      });

      setShowModal(false);
      setEditingItem(null);
      setFormData(emptyForm(banners.length));
      fetchBanners();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ad banner? This cannot be undone.')) return;
    try {
      await apiRequest(`/admin/ad-banners/${id}`, { method: 'DELETE', requiresAuth: true });
      fetchBanners();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (item: AdBannerAdmin) => {
    try {
      await apiRequest(`/admin/ad-banners/${item.id}`, {
        method: 'PATCH',
        body: { isActive: !item.isActive },
        requiresAuth: true,
      });
      fetchBanners();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData(emptyForm(banners.length));
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (item: AdBannerAdmin) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      advertiserName: item.advertiserName,
      advertiserContact: item.advertiserContact || '',
      imageUrl: item.imageUrl,
      imagePublicId: item.imagePublicId || '',
      linkUrl: item.linkUrl,
      placement: item.placement,
      page: item.page,
      category: item.category || '',
      price: item.price != null ? String(item.price) : '',
      currency: item.currency || 'EUR',
      isActive: item.isActive,
      isSticky: item.isSticky,
      startDate: toDateInput(item.startDate),
      endDate: toDateInput(item.endDate),
      order: item.order,
    });
    setError(null);
    setShowModal(true);
  };

  return {
    banners,
    isLoading,
    error,
    showModal,
    setShowModal,
    editingItem,
    formData,
    setFormData,
    isUploading,
    isSaving,
    fileInputRef,
    handleFileUpload,
    handleSubmit,
    handleDelete,
    handleToggleActive,
    openAddModal,
    openEditModal,
  };
}
