import React, { useState, useEffect } from 'react';
import { PencilIcon, XMarkIcon, PlusIcon, TrashIcon, ArrowPathIcon, SparklesIcon, BuildingOfficeIcon } from '@/constants';

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

const PromotionPlansManager: React.FC = () => {
  const [plans, setPlans] = useState<PromotionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<PromotionPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFeature, setNewFeature] = useState('');
  const [activeTab, setActiveTab] = useState<'listing' | 'agency'>('listing');

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/promotion-plans/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch plans');
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

      if (!response.ok) throw new Error('Failed to save plan');

      setSuccessMessage(isNew ? 'Plan created successfully!' : 'Plan updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsModalOpen(false);
      setEditingPlan(null);
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/promotion-plans/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete plan');
      setSuccessMessage('Plan deleted successfully!');
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
      if (!response.ok) throw new Error('Failed to toggle status');
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

  const handleCreate = (category: 'listing' | 'agency') => {
    setEditingPlan({
      _id: '',
      category,
      tier: category === 'listing' ? 'featured' : 'spotlight',
      name: '',
      description: '',
      icon: category === 'listing' ? '⭐' : '🔦',
      pricing: category === 'listing'
        ? { duration7: 0, duration30: 0, duration90: 0 }
        : { fixedPrice: 0, fixedDuration: '30 days' },
      features: [],
      displayOrder: 0,
      highlighted: false,
      isActive: true,
      isVisible: true,
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

  const filteredPlans = plans.filter(p => p.category === activeTab);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading promotion plans...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Promotion Plans</h2>
            <p className="text-gray-600 mt-1">Manage listing promotion and agency feature pricing</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSeedPlans}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Seed Default Plans
            </button>
            <button
              onClick={fetchPlans}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right">&times;</button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('listing')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'listing'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <SparklesIcon className="w-5 h-5" />
            Listing Promotions
          </button>
          <button
            onClick={() => setActiveTab('agency')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'agency'
                ? 'bg-amber-100 text-amber-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BuildingOfficeIcon className="w-5 h-5" />
            Agency Features
          </button>
          <div className="flex-1" />
          <button
            onClick={() => handleCreate(activeTab)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Plan
          </button>
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pricing</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Features</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredPlans.map((plan) => (
              <tr key={plan._id} className={!plan.isActive ? 'bg-gray-50 opacity-60' : ''}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{plan.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {plan.name}
                        {plan.highlighted && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                            Highlighted
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{plan.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {plan.tier}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  {plan.category === 'listing' ? (
                    <div className="space-y-1">
                      <div>7d: <span className="font-bold">€{plan.pricing.duration7}</span></div>
                      <div>30d: <span className="font-bold">€{plan.pricing.duration30}</span></div>
                      <div>90d: <span className="font-bold">€{plan.pricing.duration90}</span></div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold">€{plan.pricing.fixedPrice}</div>
                      <div className="text-xs text-gray-500">{plan.pricing.fixedDuration}</div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600">
                    {plan.features.slice(0, 2).map((f, i) => (
                      <div key={i}>• {f}</div>
                    ))}
                    {plan.features.length > 2 && (
                      <div className="text-gray-400">+{plan.features.length - 2} more</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleStatus(plan)}
                    className={`px-2 py-1 text-xs rounded-full ${
                      plan.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEdit(plan)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPlans.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No plans found. Click "Add Plan" to create one or "Seed Default Plans" to add defaults.
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isModalOpen && editingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-900">
                {editingPlan._id ? 'Edit Plan' : 'Create Plan'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon (Emoji)</label>
                  <input
                    type="text"
                    value={editingPlan.icon || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, icon: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editingPlan.description || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                  <select
                    value={editingPlan.tier}
                    onChange={(e) => setEditingPlan({ ...editingPlan, tier: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {editingPlan.category === 'listing' ? (
                      <>
                        <option value="featured">Featured</option>
                        <option value="highlight">Highlight</option>
                        <option value="premium">Premium</option>
                      </>
                    ) : (
                      <>
                        <option value="spotlight">Spotlight</option>
                        <option value="homepage">Homepage</option>
                        <option value="premium">Premium</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={editingPlan.displayOrder}
                    onChange={(e) => setEditingPlan({ ...editingPlan, displayOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Pricing (€)</h4>
                {editingPlan.category === 'listing' ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">7 Days</label>
                      <input
                        type="number"
                        value={editingPlan.pricing.duration7 || 0}
                        onChange={(e) => setEditingPlan({
                          ...editingPlan,
                          pricing: { ...editingPlan.pricing, duration7: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">30 Days</label>
                      <input
                        type="number"
                        value={editingPlan.pricing.duration30 || 0}
                        onChange={(e) => setEditingPlan({
                          ...editingPlan,
                          pricing: { ...editingPlan.pricing, duration30: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">90 Days</label>
                      <input
                        type="number"
                        value={editingPlan.pricing.duration90 || 0}
                        onChange={(e) => setEditingPlan({
                          ...editingPlan,
                          pricing: { ...editingPlan.pricing, duration90: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Price</label>
                      <input
                        type="number"
                        value={editingPlan.pricing.fixedPrice || 0}
                        onChange={(e) => setEditingPlan({
                          ...editingPlan,
                          pricing: { ...editingPlan.pricing, fixedPrice: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Duration</label>
                      <input
                        type="text"
                        value={editingPlan.pricing.fixedDuration || '30 days'}
                        onChange={(e) => setEditingPlan({
                          ...editingPlan,
                          pricing: { ...editingPlan.pricing, fixedDuration: e.target.value }
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-3">Features</h4>
                <div className="space-y-2 mb-3">
                  {editingPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg">
                      <span className="flex-1 text-sm">{feature}</span>
                      <button
                        onClick={() => handleRemoveFeature(index)}
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
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                    placeholder="Add a feature..."
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                  <button
                    onClick={handleAddFeature}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Display Settings */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-3">Display Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={editingPlan.badge || ''}
                      onChange={(e) => setEditingPlan({ ...editingPlan, badge: e.target.value })}
                      placeholder="e.g., Popular"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Visibility Multiplier</label>
                    <input
                      type="text"
                      value={editingPlan.visibilityMultiplier || ''}
                      onChange={(e) => setEditingPlan({ ...editingPlan, visibilityMultiplier: e.target.value })}
                      placeholder="e.g., 2x"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPlan.highlighted}
                      onChange={(e) => setEditingPlan({ ...editingPlan, highlighted: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Highlighted (show with special styling)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionPlansManager;
