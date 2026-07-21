import { useState, useEffect, useRef, useCallback } from 'react';
import { apiRequest, uploadRequest } from '@/src/shared/api';
import type { AdBannerAdmin, AdBannerFormData } from '@/src/features/ads/types';
import type { AdPlacement, BillingPeriod } from '@/src/features/ads/placements';

const emptyForm: AdBannerFormData = {
  title: '',
  advertiserName: '',
  imageUrl: '',
  imagePublicId: '',
  mobileImageUrl: '',
  mobileImagePublicId: '',
  linkUrl: '',
  openInNewTab: true,
  placement: 'home-below-hero',
  isActive: true,
  isSticky: false,
  dismissible: true,
  priority: 0,
  startDate: '',
  endDate: '',
  price: '',
  currency: 'EUR',
  billingPeriod: 'monthly',
  notes: '',
};

const toDateInput = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

export function useAdBannerManager() {
  const [banners, setBanners] = useState<AdBannerAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AdBannerAdmin | null>(null);
  const [formData, setFormData] = useState<AdBannerFormData>(emptyForm);
  const [placementFilter, setPlacementFilter] = useState<AdPlacement | 'all'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  const fetchBanners = useCallback(async () => {
    try {
      const data = await apiRequest<AdBannerAdmin[]>('/admin/ad-banners', { requiresAuth: true });
      setBanners(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const resetForm = useCallback(() => {
    setFormData({ ...emptyForm, priority: 0 });
  }, []);

  const openAddModal = useCallback(() => {
    setEditingItem(null);
    resetForm();
    setShowModal(true);
  }, [resetForm]);

  const openEditModal = useCallback((item: AdBannerAdmin) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      advertiserName: item.advertiserName || '',
      imageUrl: item.imageUrl,
      imagePublicId: item.imagePublicId || '',
      mobileImageUrl: item.mobileImageUrl || '',
      mobileImagePublicId: item.mobileImagePublicId || '',
      linkUrl: item.linkUrl,
      openInNewTab: item.openInNewTab,
      placement: item.placement,
      isActive: item.isActive,
      isSticky: item.isSticky,
      dismissible: item.dismissible,
      priority: item.priority,
      startDate: toDateInput(item.startDate),
      endDate: toDateInput(item.endDate),
      price: item.price !== undefined && item.price !== null ? String(item.price) : '',
      currency: item.currency || 'EUR',
      billingPeriod: (item.billingPeriod || 'monthly') as BillingPeriod,
      notes: item.notes || '',
    });
    setShowModal(true);
  }, []);

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, target: 'desktop' | 'mobile') => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      setError(null);
      try {
        const fd = new FormData();
        fd.append('image', file);
        const res = await uploadRequest<{ url: string; publicId: string }>(
          '/admin/ad-banners/upload-image',
          fd
        );
        setFormData((prev) =>
          target === 'desktop'
            ? { ...prev, imageUrl: res.url, imagePublicId: res.publicId }
            : { ...prev, mobileImageUrl: res.url, mobileImagePublicId: res.publicId }
        );
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsUploading(false);
        if (e.target) e.target.value = '';
      }
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.title.trim() || !formData.imageUrl.trim() || !formData.linkUrl.trim()) {
        setError('Title, image and link URL are required.');
        return;
      }
      setIsSaving(true);
      setError(null);
      try {
        const body = {
          ...formData,
          priority: Number(formData.priority) || 0,
          price: formData.price === '' ? null : Number(formData.price),
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
        };
        const endpoint = editingItem ? `/admin/ad-banners/${editingItem._id}` : '/admin/ad-banners';
        await apiRequest(endpoint, {
          method: editingItem ? 'PATCH' : 'POST',
          body,
          requiresAuth: true,
        });
        setShowModal(false);
        setEditingItem(null);
        resetForm();
        await fetchBanners();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsSaving(false);
      }
    },
    [formData, editingItem, resetForm, fetchBanners]
  );

  const handleToggleActive = useCallback(
    async (item: AdBannerAdmin) => {
      try {
        await apiRequest(`/admin/ad-banners/${item._id}`, {
          method: 'PATCH',
          body: { isActive: !item.isActive },
          requiresAuth: true,
        });
        await fetchBanners();
      } catch (err: any) {
        setError(err.message);
      }
    },
    [fetchBanners]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Delete this banner permanently?')) return;
      try {
        await apiRequest(`/admin/ad-banners/${id}`, { method: 'DELETE', requiresAuth: true });
        await fetchBanners();
      } catch (err: any) {
        setError(err.message);
      }
    },
    [fetchBanners]
  );

  const filteredBanners =
    placementFilter === 'all' ? banners : banners.filter((b) => b.placement === placementFilter);

  return {
    banners,
    filteredBanners,
    isLoading,
    error,
    setError,
    placementFilter,
    setPlacementFilter,
    showModal,
    setShowModal,
    editingItem,
    formData,
    setFormData,
    isUploading,
    isSaving,
    fileInputRef,
    mobileFileInputRef,
    openAddModal,
    openEditModal,
    handleImageUpload,
    handleSubmit,
    handleToggleActive,
    handleDelete,
  };
}
