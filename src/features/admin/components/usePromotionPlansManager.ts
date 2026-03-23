import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  usePromotionPlans,
  useCreatePromotionPlan,
  useUpdatePromotionPlan,
  useDeletePromotionPlan,
  useTogglePromotionPlanStatus,
  useSeedPromotionPlans,
  useRefreshAdminData,
} from '../hooks/useAdminData';
import { PromotionPlan } from '../api/adminApi';

export const colorPresets = {
  purple: { gradientFrom: 'purple-50', gradientTo: 'purple-100/50', borderColor: 'purple-200', iconBgColor: 'purple-500', priceColor: 'purple-600' },
  cyan: { gradientFrom: 'cyan-50', gradientTo: 'cyan-100/50', borderColor: 'cyan-300', iconBgColor: 'gradient-to-br from-cyan-400 to-blue-500', priceColor: 'cyan-600' },
  amber: { gradientFrom: 'amber-50', gradientTo: 'yellow-100/50', borderColor: 'amber-200', iconBgColor: 'gradient-to-br from-amber-400 to-yellow-500', priceColor: 'amber-600' },
  gray: { gradientFrom: 'gray-100', gradientTo: 'gray-200', borderColor: 'gray-200', iconBgColor: 'gradient-to-br from-gray-100 to-gray-200', priceColor: 'gray-900' },
  slate: { gradientFrom: 'slate-800', gradientTo: 'slate-900', borderColor: 'transparent', iconBgColor: 'gradient-to-br from-amber-400 to-yellow-500', priceColor: 'amber-400' },
};

export function usePromotionPlansManager() {
  const { t } = useTranslation(['admin', 'common']);

  // React Query hooks
  const { data: plans = [], isLoading, error, isRefetching } = usePromotionPlans();
  const createPlanMutation = useCreatePromotionPlan();
  const updatePlanMutation = useUpdatePromotionPlan();
  const deletePlanMutation = useDeletePromotionPlan();
  const toggleStatusMutation = useTogglePromotionPlanStatus();
  const seedPlansMutation = useSeedPromotionPlans();
  const refreshAll = useRefreshAdminData();

  // Local UI state
  const [editingPlan, setEditingPlan] = useState<PromotionPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFeature, setNewFeature] = useState('');
  const [activeTab, setActiveTab] = useState<'listing' | 'agency' | 'special-offers'>('listing');
  const [showPreview, setShowPreview] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mutatingPlanId, setMutatingPlanId] = useState<string | null>(null);

  const mutationError =
    createPlanMutation.error ||
    updatePlanMutation.error ||
    deletePlanMutation.error ||
    toggleStatusMutation.error ||
    seedPlansMutation.error;

  const handleSave = async () => {
    if (!editingPlan) return;
    if (!editingPlan.name.trim()) return;
    const hasAnyPrice = editingPlan.pricing.duration7 || editingPlan.pricing.duration14 ||
      editingPlan.pricing.duration28 || editingPlan.pricing.duration30 || editingPlan.pricing.duration90;
    if (!hasAnyPrice) return;

    // Validate special offer date range
    if (editingPlan.isSpecialOffer && editingPlan.availableFrom && editingPlan.availableTo) {
      if (new Date(editingPlan.availableTo) <= new Date(editingPlan.availableFrom)) return;
    }

    try {
      const isNew = !editingPlan.id;

      // Strip id and timestamps before sending to backend
      const { id: planId, createdAt, updatedAt, ...planData } = editingPlan as PromotionPlan & { createdAt?: string; updatedAt?: string };

      if (isNew) {
        await createPlanMutation.mutateAsync(planData);
      } else {
        await updatePlanMutation.mutateAsync({
          planId,
          data: planData,
        });
      }

      setIsModalOpen(false);
      setEditingPlan(null);
      setSuccessMessage(isNew ? t('admin:promotionPlans.createSuccess', 'Plan created successfully!') : t('admin:promotionPlans.updateSuccess', 'Plan updated successfully!'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin:promotionPlans.confirmDelete', 'Are you sure you want to delete this plan?'))) return;
    try {
      await deletePlanMutation.mutateAsync(id);
      setSuccessMessage(t('admin:promotionPlans.deleteSuccess', 'Plan deleted successfully!'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleToggleStatus = async (plan: PromotionPlan) => {
    setMutatingPlanId(plan.id);
    try {
      const response = await toggleStatusMutation.mutateAsync(plan.id);
      const newStatus = response?.plan?.isActive;
      setSuccessMessage(`Plan ${newStatus ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      // Error handled by mutation
    } finally {
      setMutatingPlanId(null);
    }
  };

  const handleSeedPlans = async () => {
    try {
      const response = await seedPlansMutation.mutateAsync(undefined);
      setSuccessMessage(response.message);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleEdit = (plan: PromotionPlan) => {
    setEditingPlan({ ...plan });
    setIsModalOpen(true);
  };

  const handleCreate = (category: 'listing' | 'agency', isAddOn: boolean = false, isSpecialOffer: boolean = false) => {
    const defaultCardStyle = isSpecialOffer
      ? colorPresets.slate
      : category === 'listing'
        ? colorPresets.purple
        : isAddOn ? colorPresets.cyan : colorPresets.amber;

    // Special offers default to 7 days from now
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    setEditingPlan({
      id: '',
      category,
      tier: category === 'listing' ? 'featured' : (isAddOn ? 'addon' : 'featured'),
      name: '',
      description: '',
      icon: isSpecialOffer ? '🔥' : (category === 'listing' ? '⭐' : (isAddOn ? '📍' : '🏢')),
      pricing: category === 'agency'
        ? { duration7: 0, duration14: 0, duration28: 0, duration90: 0 }
        : { duration7: 0, duration30: 0, duration90: 0 },
      features: [],
      displayOrder: plans.filter(p => p.category === category).length + 1,
      highlighted: isSpecialOffer,
      isAddOn,
      isActive: true,
      isVisible: true,
      cardStyle: defaultCardStyle,
      isSpecialOffer,
      ...(isSpecialOffer && {
        availableFrom: now.toISOString().slice(0, 16),
        availableTo: weekFromNow.toISOString().slice(0, 16),
        offerLabel: '',
      }),
    });
    setIsModalOpen(true);
  };

  const handleAddFeature = () => {
    if (!editingPlan || !newFeature.trim()) return;
    setEditingPlan({
      ...editingPlan,
      features: [...editingPlan.features, newFeature.trim()],
    });
    setNewFeature('');
  };

  const handleRemoveFeature = (index: number) => {
    if (!editingPlan) return;
    const newFeatures = [...editingPlan.features];
    newFeatures.splice(index, 1);
    setEditingPlan({ ...editingPlan, features: newFeatures });
  };

  const applyColorPreset = (preset: keyof typeof colorPresets) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      cardStyle: colorPresets[preset],
    });
  };

  const filteredPlans = activeTab === 'special-offers'
    ? plans.filter(p => p.isSpecialOffer).sort((a, b) => a.displayOrder - b.displayOrder)
    : plans.filter(p => p.category === activeTab && !p.isSpecialOffer).sort((a, b) => a.displayOrder - b.displayOrder);

  return {
    plans,
    filteredPlans,
    isLoading,
    error,
    mutationError,
    isRefetching,
    editingPlan,
    setEditingPlan,
    isModalOpen,
    setIsModalOpen,
    newFeature,
    setNewFeature,
    activeTab,
    setActiveTab,
    showPreview,
    setShowPreview,
    successMessage,
    mutatingPlanId,
    createPlanMutation,
    updatePlanMutation,
    seedPlansMutation,
    refreshAll,
    handleSave,
    handleDelete,
    handleToggleStatus,
    handleSeedPlans,
    handleEdit,
    handleCreate,
    handleAddFeature,
    handleRemoveFeature,
    applyColorPreset,
  };
}
