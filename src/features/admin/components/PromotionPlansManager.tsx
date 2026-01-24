import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PencilIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  EyeIcon,
  CheckIcon,
  StarIcon,
} from '@/constants';

interface PromotionPlan {
  _id: string;
  category: 'listing' | 'agency';
  tier: string;
  name: string;
  description?: string;
  icon?: string;
  pricing: {
    duration7?: number;
    duration30?: number;
    duration90?: number;
    fixedPrice?: number;
    fixedDuration?: string;
  };
  features: string[];
  visibilityMultiplier?: string;
  displayOrder: number;
  badge?: string;
  badgeColor?: string;
  highlighted: boolean;
  isAddOn: boolean;
  cardStyle?: {
    gradientFrom?: string;
    gradientTo?: string;
    borderColor?: string;
    iconBgColor?: string;
    priceColor?: string;
  };
  isActive: boolean;
  isVisible: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Color presets for card styling
const colorPresets = {
  purple: { gradientFrom: 'purple-50', gradientTo: 'purple-100/50', borderColor: 'purple-200', iconBgColor: 'purple-500', priceColor: 'purple-600' },
  cyan: { gradientFrom: 'cyan-50', gradientTo: 'cyan-100/50', borderColor: 'cyan-300', iconBgColor: 'gradient-to-br from-cyan-400 to-blue-500', priceColor: 'cyan-600' },
  amber: { gradientFrom: 'amber-50', gradientTo: 'yellow-100/50', borderColor: 'amber-200', iconBgColor: 'gradient-to-br from-amber-400 to-yellow-500', priceColor: 'amber-600' },
  gray: { gradientFrom: 'gray-100', gradientTo: 'gray-200', borderColor: 'gray-200', iconBgColor: 'gradient-to-br from-gray-100 to-gray-200', priceColor: 'gray-900' },
  slate: { gradientFrom: 'slate-800', gradientTo: 'slate-900', borderColor: 'transparent', iconBgColor: 'gradient-to-br from-amber-400 to-yellow-500', priceColor: 'amber-400' },
};

const PromotionPlansManager: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [plans, setPlans] = useState<PromotionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<PromotionPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFeature, setNewFeature] = useState('');
  const [activeTab, setActiveTab] = useState<'listing' | 'agency'>('listing');
  const [showPreview, setShowPreview] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/promotion-plans/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch plans');
      }
      const data = await response.json();
      setPlans(data.plans || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSave = async () => {
    if (!editingPlan) return;

    // Validation
    if (!editingPlan.name.trim()) {
      setError('Plan name is required');
      return;
    }

    // All plans now use duration-based pricing
    if (!editingPlan.pricing.duration7 && !editingPlan.pricing.duration30 && !editingPlan.pricing.duration90) {
      setError('At least one duration price is required');
      return;
    }

    try {
      const token = localStorage.getItem('balkan_estate_token');
      const isNew = !editingPlan._id;
      const url = isNew
        ? `${API_URL}/promotion-plans`
        : `${API_URL}/promotion-plans/${editingPlan._id}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingPlan),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save plan');
      }

      setSuccessMessage(isNew ? t('admin:promotionPlans.createSuccess', 'Plan created successfully!') : t('admin:promotionPlans.updateSuccess', 'Plan updated successfully!'));
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsModalOpen(false);
      setEditingPlan(null);
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin:promotionPlans.confirmDelete', 'Are you sure you want to delete this plan?'))) return;
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/promotion-plans/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete plan');
      }
      setSuccessMessage(t('admin:promotionPlans.deleteSuccess', 'Plan deleted successfully!'));
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleStatus = async (plan: PromotionPlan) => {
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/promotion-plans/${plan._id}/toggle-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to toggle status');
      }
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSeedPlans = async () => {
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/promotion-plans/seed`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setSuccessMessage(data.message);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (plan: PromotionPlan) => {
    setEditingPlan({ ...plan });
    setIsModalOpen(true);
  };

  const handleCreate = (category: 'listing' | 'agency', isAddOn: boolean = false) => {
    const defaultCardStyle = category === 'listing'
      ? colorPresets.purple
      : isAddOn ? colorPresets.cyan : colorPresets.amber;

    setEditingPlan({
      _id: '',
      category,
      tier: category === 'listing' ? 'featured' : (isAddOn ? 'addon' : 'featured'),
      name: '',
      description: '',
      icon: category === 'listing' ? '⭐' : (isAddOn ? '📍' : '🏢'),
      pricing: { duration7: 0, duration30: 0, duration90: 0 },
      features: [],
      displayOrder: plans.filter(p => p.category === category).length + 1,
      highlighted: false,
      isAddOn,
      isActive: true,
      isVisible: true,
      cardStyle: defaultCardStyle,
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

  const filteredPlans = plans.filter(p => p.category === activeTab).sort((a, b) => a.displayOrder - b.displayOrder);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-gray-600">{t('admin:promotionPlans.loading', 'Loading promotion plans...')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <SparklesIcon className="w-7 h-7" />
              {t('admin:promotionPlans.title', 'Promotion Plans')}
            </h2>
            <p className="text-purple-200 mt-1">{t('admin:promotionPlans.subtitle', 'Manage listing promotion and agency feature pricing')}</p>
          </div>
          <div className="flex items-center gap-3">
            {plans.length === 0 && (
              <button
                onClick={handleSeedPlans}
                className="px-4 py-2 text-sm bg-white/20 hover:bg-white/30 rounded-xl transition-colors backdrop-blur-sm"
              >
                {t('admin:promotionPlans.seedDefaults', 'Seed Default Plans')}
              </button>
            )}
            <button
              onClick={fetchPlans}
              className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors backdrop-blur-sm"
              title={t('common:refresh', 'Refresh')}
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded">&times;</button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckIcon className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('listing')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'listing'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <SparklesIcon className="w-5 h-5" />
            {t('admin:promotionPlans.listingPromotions', 'Listing Promotions')}
            <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${activeTab === 'listing' ? 'bg-white/20' : 'bg-gray-200'}`}>
              {plans.filter(p => p.category === 'listing').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('agency')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'agency'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BuildingOfficeIcon className="w-5 h-5" />
            {t('admin:promotionPlans.agencyFeatures', 'Agency Features')}
            <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${activeTab === 'agency' ? 'bg-white/20' : 'bg-gray-200'}`}>
              {plans.filter(p => p.category === 'agency').length}
            </span>
          </button>
          <div className="flex-1" />
          <button
            onClick={() => handleCreate(activeTab, false)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-md hover:shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            {t('admin:promotionPlans.addPlan', 'Add Plan')}
          </button>
          {activeTab === 'agency' && (
            <button
              onClick={() => handleCreate('agency', true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
            >
              <PlusIcon className="w-5 h-5" />
              {t('admin:promotionPlans.addAddon', 'Add-on')}
            </button>
          )}
        </div>
      </div>

      {/* Plans Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.map((plan) => (
          <PlanCard
            key={plan._id}
            plan={plan}
            onEdit={() => handleEdit(plan)}
            onDelete={() => handleDelete(plan._id)}
            onToggleStatus={() => handleToggleStatus(plan)}
          />
        ))}
        {filteredPlans.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {activeTab === 'listing' ? <SparklesIcon className="w-8 h-8 text-gray-400" /> : <BuildingOfficeIcon className="w-8 h-8 text-gray-400" />}
            </div>
            <p className="text-gray-500 text-lg mb-4">
              {t('admin:promotionPlans.noPlans', 'No plans found')}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleCreate(activeTab)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                {t('admin:promotionPlans.createFirst', 'Create First Plan')}
              </button>
              <button
                onClick={handleSeedPlans}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('admin:promotionPlans.seedDefaults', 'Seed Default Plans')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isModalOpen && editingPlan && (
        <EditPlanModal
          plan={editingPlan}
          onChange={setEditingPlan}
          onSave={handleSave}
          onClose={() => { setIsModalOpen(false); setEditingPlan(null); }}
          newFeature={newFeature}
          setNewFeature={setNewFeature}
          onAddFeature={handleAddFeature}
          onRemoveFeature={handleRemoveFeature}
          onApplyPreset={applyColorPreset}
          showPreview={showPreview}
          setShowPreview={setShowPreview}
        />
      )}
    </div>
  );
};

// Plan Card Component
const PlanCard: React.FC<{
  plan: PromotionPlan;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}> = ({ plan, onEdit, onDelete, onToggleStatus }) => {
  const { t } = useTranslation(['admin']);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'featured': return 'bg-purple-100 text-purple-700';
      case 'highlight': return 'bg-cyan-100 text-cyan-700';
      case 'premium': return 'bg-amber-100 text-amber-700';
      case 'spotlight': return 'bg-gray-100 text-gray-700';
      case 'homepage': return 'bg-orange-100 text-orange-700';
      case 'addon': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getHeaderGradient = () => {
    if (plan.isAddOn) return 'bg-gradient-to-r from-blue-500 to-indigo-500';
    if (plan.category === 'listing') return 'bg-gradient-to-r from-purple-500 to-indigo-500';
    return 'bg-gradient-to-r from-amber-500 to-orange-500';
  };

  return (
    <div className={`bg-white rounded-2xl shadow-lg overflow-hidden border-2 transition-all hover:shadow-xl ${
      !plan.isActive ? 'opacity-60 border-gray-200' : plan.highlighted ? 'border-amber-300' : plan.isAddOn ? 'border-blue-300' : 'border-transparent'
    }`}>
      {/* Header */}
      <div className={`p-4 ${getHeaderGradient()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{plan.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                {plan.isAddOn && (
                  <span className="px-2 py-0.5 bg-white/30 text-white text-xs font-bold rounded-full">
                    Add-on
                  </span>
                )}
              </div>
              <p className="text-white/80 text-sm">{plan.description}</p>
            </div>
          </div>
          {plan.badge && !plan.isAddOn && (
            <span className="px-2 py-1 bg-white/20 text-white text-xs font-bold rounded-full backdrop-blur-sm">
              {plan.badge}
            </span>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getTierColor(plan.tier)}`}>
            {plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1)}
          </span>
          {plan.visibilityMultiplier && (
            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
              {plan.visibilityMultiplier} visibility
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">7 days</div>
            <div className="font-bold text-gray-900">€{plan.pricing.duration7 || 0}</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">30 days</div>
            <div className="font-bold text-gray-900">€{plan.pricing.duration30 || 0}</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">90 days</div>
            <div className="font-bold text-gray-900">€{plan.pricing.duration90 || 0}</div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="p-4 border-b border-gray-100">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">{t('admin:promotionPlans.features', 'Features')}</div>
        <ul className="space-y-1">
          {plan.features.slice(0, 3).map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="truncate">{feature}</span>
            </li>
          ))}
          {plan.features.length > 3 && (
            <li className="text-xs text-gray-400">+{plan.features.length - 3} more features</li>
          )}
        </ul>
      </div>

      {/* Actions */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={onToggleStatus}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            plan.isActive
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          {plan.isActive ? t('admin:common.active', 'Active') : t('admin:common.inactive', 'Inactive')}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title={t('admin:common.edit', 'Edit')}
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title={t('admin:common.delete', 'Delete')}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit Modal Component
const EditPlanModal: React.FC<{
  plan: PromotionPlan;
  onChange: (plan: PromotionPlan) => void;
  onSave: () => void;
  onClose: () => void;
  newFeature: string;
  setNewFeature: (v: string) => void;
  onAddFeature: () => void;
  onRemoveFeature: (index: number) => void;
  onApplyPreset: (preset: 'purple' | 'cyan' | 'amber' | 'gray' | 'slate') => void;
  showPreview: boolean;
  setShowPreview: (v: boolean) => void;
}> = ({ plan, onChange, onSave, onClose, newFeature, setNewFeature, onAddFeature, onRemoveFeature, onApplyPreset, showPreview, setShowPreview }) => {
  const { t } = useTranslation(['admin', 'common']);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <h3 className="text-xl font-bold flex items-center gap-2">
            {plan._id ? <PencilIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
            {plan._id ? t('admin:promotionPlans.editPlan', 'Edit Plan') : t('admin:promotionPlans.createPlan', 'Create Plan')}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`p-2 rounded-lg transition-colors ${showPreview ? 'bg-white/20' : 'hover:bg-white/10'}`}
              title={t('admin:common.preview', 'Preview')}
            >
              <EyeIcon className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : ''}`}>
            {/* Form */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:promotionPlans.name', 'Name')} *</label>
                  <input
                    type="text"
                    value={plan.name}
                    onChange={(e) => onChange({ ...plan, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="e.g., Featured"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:promotionPlans.icon', 'Icon (Emoji)')}</label>
                  <input
                    type="text"
                    value={plan.icon || ''}
                    onChange={(e) => onChange({ ...plan, icon: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-2xl"
                    placeholder="⭐"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:promotionPlans.description', 'Description')}</label>
                <input
                  type="text"
                  value={plan.description || ''}
                  onChange={(e) => onChange({ ...plan, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Short description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:promotionPlans.tier', 'Tier')}</label>
                  <select
                    value={plan.tier}
                    onChange={(e) => onChange({ ...plan, tier: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {plan.category === 'listing' ? (
                      <>
                        <option value="featured">Featured</option>
                        <option value="highlight">Highlight</option>
                        <option value="premium">Premium</option>
                      </>
                    ) : (
                      <>
                        <option value="featured">Featured</option>
                        <option value="addon">Add-on</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:promotionPlans.displayOrder', 'Display Order')}</label>
                  <input
                    type="number"
                    value={plan.displayOrder}
                    onChange={(e) => onChange({ ...plan, displayOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">€</span>
                  {t('admin:promotionPlans.pricing', 'Pricing')}
                  {plan.isAddOn && (
                    <span className="px-2 py-0.5 bg-blue-200 text-blue-700 text-xs font-bold rounded-full ml-auto">
                      Add-on
                    </span>
                  )}
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">7 {t('admin:common.days', 'Days')}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={plan.pricing.duration7 || ''}
                      onChange={(e) => onChange({
                        ...plan,
                        pricing: { ...plan.pricing, duration7: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">30 {t('admin:common.days', 'Days')}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={plan.pricing.duration30 || ''}
                      onChange={(e) => onChange({
                        ...plan,
                        pricing: { ...plan.pricing, duration30: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">90 {t('admin:common.days', 'Days')}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={plan.pricing.duration90 || ''}
                      onChange={(e) => onChange({
                        ...plan,
                        pricing: { ...plan.pricing, duration90: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <CheckIcon className="w-5 h-5" />
                  {t('admin:promotionPlans.features', 'Features')}
                </h4>
                <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg">
                      <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="flex-1 text-sm">{feature}</span>
                      <button
                        onClick={() => onRemoveFeature(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), onAddFeature())}
                    placeholder={t('admin:promotionPlans.addFeature', 'Add a feature...')}
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                  <button
                    onClick={onAddFeature}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Display Settings */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <StarIcon className="w-5 h-5" />
                  {t('admin:promotionPlans.displaySettings', 'Display Settings')}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t('admin:promotionPlans.badge', 'Badge Text')}</label>
                    <input
                      type="text"
                      value={plan.badge || ''}
                      onChange={(e) => onChange({ ...plan, badge: e.target.value })}
                      placeholder="e.g., Popular"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t('admin:promotionPlans.visibility', 'Visibility Multiplier')}</label>
                    <input
                      type="text"
                      value={plan.visibilityMultiplier || ''}
                      onChange={(e) => onChange({ ...plan, visibilityMultiplier: e.target.value })}
                      placeholder="e.g., 2x"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plan.highlighted}
                      onChange={(e) => onChange({ ...plan, highlighted: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">{t('admin:promotionPlans.highlighted', 'Highlighted')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plan.isVisible}
                      onChange={(e) => onChange({ ...plan, isVisible: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">{t('admin:promotionPlans.visible', 'Visible')}</span>
                  </label>
                </div>

                {/* Color Presets */}
                <div className="mt-4">
                  <label className="block text-sm text-gray-700 mb-2">{t('admin:promotionPlans.colorPreset', 'Color Preset')}</label>
                  <div className="flex gap-2">
                    {(['purple', 'cyan', 'amber', 'gray', 'slate'] as const).map((preset) => (
                      <button
                        key={preset}
                        onClick={() => onApplyPreset(preset)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          preset === 'purple' ? 'bg-purple-500' :
                          preset === 'cyan' ? 'bg-cyan-500' :
                          preset === 'amber' ? 'bg-amber-500' :
                          preset === 'gray' ? 'bg-gray-400' :
                          'bg-slate-800'
                        } hover:scale-110`}
                        title={preset}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            {showPreview && (
              <div className="lg:sticky lg:top-0">
                <div className="bg-gray-100 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">{t('admin:common.preview', 'Preview')}</h4>
                  <PlanCard
                    plan={plan}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onToggleStatus={() => {}}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 bg-white border rounded-xl hover:bg-gray-50 transition-colors"
          >
            {t('common:cancel', 'Cancel')}
          </button>
          <button
            onClick={onSave}
            className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"
          >
            {t('common:save', 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromotionPlansManager;
