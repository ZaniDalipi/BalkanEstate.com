/**
 * usePricingManager - Custom hook for PricingManager state and handlers
 *
 * Uses React Query hooks for reactive data management:
 * - Data auto-refreshes on window focus
 * - Optimistic updates for instant UI feedback
 * - Automatic cache invalidation after mutations
 */

import { useState } from 'react';
import {
  useProducts,
  useUpdateProduct,
  useToggleProductStatus,
  useToggleProductVisibility,
  useRefreshAdminData,
} from '../hooks/useAdminData';
import { Product } from '../api/adminApi';

export function usePricingManager() {
  // Reactive data - auto-updates like StateFlow.collectAsState()
  const { data: products = [], isLoading, error, isRefetching } = useProducts();

  // Mutations with optimistic updates
  const updateProductMutation = useUpdateProduct();
  const toggleStatusMutation = useToggleProductStatus();
  const toggleVisibilityMutation = useToggleProductVisibility();
  const refreshAll = useRefreshAdminData();

  // Local UI state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newFeature, setNewFeature] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mutatingProductId, setMutatingProductId] = useState<string | null>(null);
  const [editingFeatureIndex, setEditingFeatureIndex] = useState<number | null>(null);
  const [editingFeatureValue, setEditingFeatureValue] = useState('');

  // Derived state for mutation errors
  const mutationError =
    updateProductMutation.error ||
    toggleStatusMutation.error ||
    toggleVisibilityMutation.error;

  // Helper for validated number input
  const handleNumberChange = (
    field: keyof Product,
    value: string,
    min: number = 0,
    isFloat: boolean = false
  ) => {
    if (!editingProduct) return;

    if (value === '') {
      setEditingProduct({ ...editingProduct, [field]: min });
      return;
    }

    const parsed = isFloat ? parseFloat(value) : parseInt(value, 10);
    if (isNaN(parsed)) return;

    const clampedValue = Math.max(parsed, min);
    setEditingProduct({ ...editingProduct, [field]: clampedValue });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct({
      ...product,
      price: product.price ?? 0,
      durationDays: product.durationDays ?? 30,
      displayOrder: product.displayOrder ?? 0,
      trialPeriodDays: product.trialPeriodDays ?? 0,
      gracePeriodDays: product.gracePeriodDays ?? 3,
      listingsLimit: product.listingsLimit ?? 3,
      promotionCoupons: product.promotionCoupons ?? 0,
      premiumCoupons: product.premiumCoupons ?? 0,
      highlightedCoupons: product.highlightedCoupons ?? 0,
      featuredCoupons: product.featuredCoupons ?? 0,
      agentCoupons: product.agentCoupons ?? 0,
      aiMessagesLimit: product.aiMessagesLimit ?? 3,
      aiInsightsLimit: product.aiInsightsLimit ?? 3,
      imageDescriptionLimit: product.imageDescriptionLimit ?? 0,
      savedSearchesLimit: product.savedSearchesLimit ?? 3,
      features: product.features ?? [],
      maxActiveSubscriptions: product.maxActiveSubscriptions ?? 0,
      cardStyle: product.cardStyle ?? { backgroundColor: '', borderColor: '', textColor: '' },
    });
    setNewFeature('');
    setIsEditModalOpen(true);
  };

  const handleAddFeature = () => {
    if (!editingProduct || !newFeature.trim()) return;
    setEditingProduct({
      ...editingProduct,
      features: [...(editingProduct.features || []), newFeature.trim()],
    });
    setNewFeature('');
  };

  const handleRemoveFeature = (index: number) => {
    if (!editingProduct) return;
    const newFeatures = [...editingProduct.features];
    newFeatures.splice(index, 1);
    setEditingProduct({ ...editingProduct, features: newFeatures });
  };

  const handleMoveFeature = (index: number, direction: 'up' | 'down') => {
    if (!editingProduct) return;
    const newFeatures = [...editingProduct.features];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    // Check bounds
    if (newIndex < 0 || newIndex >= newFeatures.length) return;

    // Swap
    [newFeatures[index], newFeatures[newIndex]] = [newFeatures[newIndex], newFeatures[index]];
    setEditingProduct({ ...editingProduct, features: newFeatures });
  };

  const insertPlaceholder = (placeholder: string) => {
    // Insert into the field that's currently being edited
    if (editingFeatureIndex !== null) {
      setEditingFeatureValue(prev => prev + placeholder);
    } else {
      setNewFeature(prev => prev + placeholder);
    }
  };

  const startEditingFeature = (index: number, value: string) => {
    setEditingFeatureIndex(index);
    setEditingFeatureValue(value);
  };

  const saveEditingFeature = () => {
    if (editingFeatureIndex === null || !editingProduct) return;

    const trimmedValue = editingFeatureValue.trim();
    if (!trimmedValue) {
      // If empty, cancel editing
      cancelEditingFeature();
      return;
    }

    const newFeatures = [...editingProduct.features];
    newFeatures[editingFeatureIndex] = trimmedValue;
    setEditingProduct({ ...editingProduct, features: newFeatures });
    setEditingFeatureIndex(null);
    setEditingFeatureValue('');
  };

  const cancelEditingFeature = () => {
    setEditingFeatureIndex(null);
    setEditingFeatureValue('');
  };

  const handleFeatureKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditingFeature();
    } else if (e.key === 'Escape') {
      cancelEditingFeature();
    }
  };

  const handleSave = async () => {
    if (!editingProduct?.id) return;

    // Only include cardStyle if any value is set
    const cardStyle = editingProduct.cardStyle?.backgroundColor ||
      editingProduct.cardStyle?.borderColor ||
      editingProduct.cardStyle?.textColor
      ? editingProduct.cardStyle
      : undefined;

    const updatePayload = {
      name: editingProduct.name,
      description: editingProduct.description || '',
      type: editingProduct.type,
      tier: editingProduct.tier || '',
      price: Number(editingProduct.price) || 0,
      currency: editingProduct.currency,
      billingPeriod: editingProduct.billingPeriod,
      durationDays: Number(editingProduct.durationDays) || 30,
      features: editingProduct.features || [],
      targetRole: editingProduct.targetRole,
      displayOrder: Number(editingProduct.displayOrder) || 0,
      badge: editingProduct.badge || '',
      badgeColor: editingProduct.badgeColor || '',
      highlighted: Boolean(editingProduct.highlighted),
      isActive: Boolean(editingProduct.isActive),
      isVisible: Boolean(editingProduct.isVisible),
      hasFreeTrial: Boolean(editingProduct.hasFreeTrial),
      trialPeriodDays: Number(editingProduct.trialPeriodDays) || 0,
      gracePeriodDays: Number(editingProduct.gracePeriodDays) || 0,
      listingsLimit: Number(editingProduct.listingsLimit) || 0,
      promotionCoupons: Number(editingProduct.promotionCoupons) || 0,
      premiumCoupons: Number(editingProduct.premiumCoupons) || 0,
      highlightedCoupons: Number(editingProduct.highlightedCoupons) || 0,
      featuredCoupons: Number(editingProduct.featuredCoupons) || 0,
      agentCoupons: Number(editingProduct.agentCoupons) || 0,
      aiMessagesLimit: Number(editingProduct.aiMessagesLimit) || 0,
      aiInsightsLimit: Number(editingProduct.aiInsightsLimit) || 0,
      imageDescriptionLimit: Number(editingProduct.imageDescriptionLimit) || 0,
      savedSearchesLimit: Number(editingProduct.savedSearchesLimit) || 0,
      earlyAccessListings: Boolean(editingProduct.earlyAccessListings),
      advancedMarketInsights: Boolean(editingProduct.advancedMarketInsights),
      externalProductId: editingProduct.externalProductId || '',
      externalPriceId: editingProduct.externalPriceId || '',
      // Agency/Enterprise features
      maxActiveSubscriptions: Number(editingProduct.maxActiveSubscriptions) || 0,
      cardStyle,
    };

    try {
      await updateProductMutation.mutateAsync({
        productId: editingProduct.id,
        data: updatePayload,
      });

      setIsEditModalOpen(false);
      setEditingProduct(null);
      setSuccessMessage('Product updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      // Error is handled by mutation state
    }
  };

  const handleToggleStatus = async (product: Product) => {
    setMutatingProductId(product.id);
    try {
      const response = await toggleStatusMutation.mutateAsync(product.id);
      // Use the response to show accurate message
      const newStatus = response?.product?.isActive;
      setSuccessMessage(`Product ${newStatus ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      // Error removed
    } finally {
      setMutatingProductId(null);
    }
  };

  const handleToggleVisibility = async (product: Product) => {
    setMutatingProductId(product.id);
    try {
      const response = await toggleVisibilityMutation.mutateAsync(product.id);
      // Use the response to show accurate message
      const newVisibility = response?.product?.isVisible;
      setSuccessMessage(`Product is now ${newVisibility ? 'visible' : 'hidden'}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      // Error removed
    } finally {
      setMutatingProductId(null);
    }
  };

  const formatPrice = (price: number, currency: string, billingPeriod: string) => {
    return `€${price}/${billingPeriod === 'monthly' ? 'mo' : billingPeriod === 'yearly' ? 'yr' : billingPeriod}`;
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free':
        return 'bg-gray-100 text-gray-800';
      case 'pro':
        return 'bg-green-100 text-green-800';
      case 'agency':
        return 'bg-purple-100 text-purple-800';
      case 'buyer':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return {
    // Data
    products,
    isLoading,
    error,
    isRefetching,
    mutationError,
    successMessage,

    // Edit modal state
    editingProduct,
    setEditingProduct,
    isEditModalOpen,
    setIsEditModalOpen,
    newFeature,
    setNewFeature,
    editingFeatureIndex,
    editingFeatureValue,
    setEditingFeatureValue,
    mutatingProductId,

    // Mutations
    updateProductMutation,

    // Handlers
    handleEdit,
    handleSave,
    handleToggleStatus,
    handleToggleVisibility,
    handleAddFeature,
    handleRemoveFeature,
    handleMoveFeature,
    handleNumberChange,
    handleFeatureKeyDown,
    insertPlaceholder,
    startEditingFeature,
    saveEditingFeature,
    cancelEditingFeature,
    refreshAll,

    // Helpers
    formatPrice,
    getTierColor,
  };
}
