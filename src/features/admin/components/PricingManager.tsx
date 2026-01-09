import React, { useState, useEffect } from 'react';
import { PencilIcon, ShieldCheckIcon, XMarkIcon, PlusIcon, TrashIcon } from '@/constants';

interface Product {
  _id: string;
  productId: string;
  name: string;
  description?: string;
  type: string;
  tier: string;
  price: number;
  currency: string;
  billingPeriod: string;
  durationDays: number;
  features: string[];
  targetRole: string;
  displayOrder: number;
  badge?: string;
  badgeColor?: string;
  highlighted: boolean;
  isActive: boolean;
  isVisible: boolean;
  hasFreeTrial: boolean;
  trialPeriodDays?: number;
  gracePeriodDays: number;
  // Limits
  listingsLimit: number;
  promotionCoupons: number;
  premiumCoupons: number;
  highlightedCoupons: number;
  featuredCoupons: number;
  agentCoupons: number;
  // AI Limits
  aiMessagesLimit: number;
  aiInsightsLimit: number;
  imageDescriptionLimit: number;
  // Buyer features
  savedSearchesLimit: number;
  earlyAccessListings?: boolean;
  advancedMarketInsights?: boolean;
  // Stripe
  stripeProductId?: string;
  stripePriceId?: string;
}

const PricingManager: React.FC = () => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newFeature, setNewFeature] = useState('');

  // Helper for validated number input - prevents negative values where min >= 0
  const handleNumberChange = (
    field: keyof Product,
    value: string,
    min: number = 0,
    isFloat: boolean = false
  ) => {
    if (!editingProduct) return;

    // Allow empty for editing
    if (value === '') {
      setEditingProduct({ ...editingProduct, [field]: min });
      return;
    }

    const parsed = isFloat ? parseFloat(value) : parseInt(value, 10);
    if (isNaN(parsed)) return;

    // Clamp to minimum (prevent negatives where not allowed)
    const clampedValue = Math.max(parsed, min);
    setEditingProduct({ ...editingProduct, [field]: clampedValue });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/products/admin/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch products');

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct({ ...product });
    setNewFeature('');
    setIsEditModalOpen(true);
  };

  const handleAddFeature = () => {
    if (!editingProduct || !newFeature.trim()) return;
    setEditingProduct({
      ...editingProduct,
      features: [...(editingProduct.features || []), newFeature.trim()]
    });
    setNewFeature('');
  };

  const handleRemoveFeature = (index: number) => {
    if (!editingProduct) return;
    const newFeatures = [...editingProduct.features];
    newFeatures.splice(index, 1);
    setEditingProduct({ ...editingProduct, features: newFeatures });
  };

  const handleSave = async () => {
    if (!editingProduct) return;

    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/products/admin/${editingProduct._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editingProduct),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update product');
      }

      await fetchProducts();
      setIsEditModalOpen(false);
      setEditingProduct(null);
      setSuccessMessage('Product updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/products/admin/${product._id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to toggle status');

      await fetchProducts();
      setSuccessMessage(`Product ${product.isActive ? 'deactivated' : 'activated'}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to toggle product status');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleToggleVisibility = async (product: Product) => {
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/products/admin/${product._id}/visibility`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to toggle visibility');

      await fetchProducts();
      setSuccessMessage(`Product ${product.isVisible ? 'hidden' : 'visible'}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to toggle product visibility');
      setTimeout(() => setError(null), 5000);
    }
  };

  const formatPrice = (price: number, currency: string, billingPeriod: string) => {
    return `€${price}/${billingPeriod === 'monthly' ? 'mo' : billingPeriod === 'yearly' ? 'yr' : billingPeriod}`;
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'pro': return 'bg-green-100 text-green-800';
      case 'agency': return 'bg-purple-100 text-purple-800';
      case 'buyer': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading products...</span>
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
            <h2 className="text-2xl font-bold text-gray-900">Pricing & Products</h2>
            <p className="text-gray-600 mt-1">Manage subscription plans and pricing</p>
          </div>
          <div className="text-sm text-gray-500">
            {products.length} product{products.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Limits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product._id} className={!product.isActive ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {product.name}
                          {product.highlighted && (
                            <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">Featured</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{product.productId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTierColor(product.tier)}`}>
                      {product.tier?.toUpperCase() || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">
                      {formatPrice(product.price, product.currency, product.billingPeriod)}
                    </div>
                    <div className="text-xs text-gray-500">{product.durationDays} days</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>{product.listingsLimit > 0 ? `${product.listingsLimit} listings` : '-'}</div>
                    <div className="text-xs text-gray-400">
                      {product.promotionCoupons > 0 ? `${product.promotionCoupons} promo/mo` : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleToggleStatus(product)}
                        className={`px-2 py-1 text-xs rounded-full ${
                          product.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {product.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(product)}
                        className={`px-2 py-1 text-xs rounded-full ${
                          product.isVisible
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {product.isVisible ? 'Visible' : 'Hidden'}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(product)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-900">Edit Product</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                  <input
                    type="text"
                    value={editingProduct.productId}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Role</label>
                  <select
                    value={editingProduct.targetRole}
                    onChange={(e) => setEditingProduct({ ...editingProduct, targetRole: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                    <option value="agent">Agent</option>
                    <option value="all">All</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                  <select
                    value={editingProduct.tier || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, tier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">None</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="agency">Agency</option>
                    <option value="buyer">Buyer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Pricing */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Pricing</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (€)</label>
                    <input
                      type="number"
                      value={editingProduct.price}
                      onChange={(e) => handleNumberChange('price', e.target.value, 0, true)}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      value={editingProduct.currency}
                      onChange={(e) => setEditingProduct({ ...editingProduct, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Period</label>
                    <select
                      value={editingProduct.billingPeriod}
                      onChange={(e) => setEditingProduct({ ...editingProduct, billingPeriod: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="weekly">Weekly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="one_time">One-time</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                    <input
                      type="number"
                      value={editingProduct.durationDays}
                      onChange={(e) => handleNumberChange('durationDays', e.target.value, 1)}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Limits */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-3">Limits & Quotas</h4>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Listings Limit</label>
                    <input
                      type="number"
                      value={editingProduct.listingsLimit}
                      onChange={(e) => handleNumberChange('listingsLimit', e.target.value, -1)}
                      min="-1"
                      placeholder="-1 for unlimited"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Agent Coupons</label>
                    <input
                      type="number"
                      value={editingProduct.agentCoupons}
                      onChange={(e) => handleNumberChange('agentCoupons', e.target.value, 0)}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Saved Searches</label>
                    <input
                      type="number"
                      value={editingProduct.savedSearchesLimit}
                      onChange={(e) => handleNumberChange('savedSearchesLimit', e.target.value, -1)}
                      min="-1"
                      placeholder="-1 for unlimited"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Promotion Coupon Breakdown */}
                <h5 className="font-medium text-green-800 mb-2 text-sm">Promotion Coupons (per month)</h5>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Promos</label>
                    <input
                      type="number"
                      value={editingProduct.promotionCoupons}
                      onChange={(e) => handleNumberChange('promotionCoupons', e.target.value, 0)}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Premium</label>
                    <input
                      type="number"
                      value={editingProduct.premiumCoupons || 0}
                      onChange={(e) => handleNumberChange('premiumCoupons', e.target.value, 0)}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Highlighted</label>
                    <input
                      type="number"
                      value={editingProduct.highlightedCoupons || 0}
                      onChange={(e) => handleNumberChange('highlightedCoupons', e.target.value, 0)}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Featured</label>
                    <input
                      type="number"
                      value={editingProduct.featuredCoupons || 0}
                      onChange={(e) => handleNumberChange('featuredCoupons', e.target.value, 0)}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* AI & Insights Limits */}
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                <h4 className="font-semibold text-cyan-900 mb-3">AI & Insights Limits</h4>
                <p className="text-xs text-cyan-700 mb-3">Use -1 for unlimited</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AI Messages/mo</label>
                    <input
                      type="number"
                      value={editingProduct.aiMessagesLimit ?? 0}
                      onChange={(e) => handleNumberChange('aiMessagesLimit', e.target.value, -1)}
                      min="-1"
                      placeholder="-1 for unlimited"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Insights/mo</label>
                    <input
                      type="number"
                      value={editingProduct.aiInsightsLimit ?? 0}
                      onChange={(e) => handleNumberChange('aiInsightsLimit', e.target.value, -1)}
                      min="-1"
                      placeholder="-1 for unlimited"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image Desc/mo</label>
                    <input
                      type="number"
                      value={editingProduct.imageDescriptionLimit ?? 0}
                      onChange={(e) => handleNumberChange('imageDescriptionLimit', e.target.value, -1)}
                      min="-1"
                      placeholder="-1 for unlimited"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Buyer Features */}
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                <h4 className="font-semibold text-sky-900 mb-3">Buyer Features</h4>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.earlyAccessListings || false}
                      onChange={(e) => setEditingProduct({ ...editingProduct, earlyAccessListings: e.target.checked })}
                      className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                    />
                    <span className="text-sm text-gray-700">Early Access to New Listings</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.advancedMarketInsights || false}
                      onChange={(e) => setEditingProduct({ ...editingProduct, advancedMarketInsights: e.target.checked })}
                      className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                    />
                    <span className="text-sm text-gray-700">Advanced Market Insights</span>
                  </label>
                </div>
              </div>

              {/* Trial & Grace Period */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-900 mb-3">Trial & Grace Period</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={editingProduct.hasFreeTrial}
                        onChange={(e) => setEditingProduct({ ...editingProduct, hasFreeTrial: e.target.checked })}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Has Free Trial</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trial Days</label>
                    <input
                      type="number"
                      value={editingProduct.trialPeriodDays || 0}
                      onChange={(e) => setEditingProduct({ ...editingProduct, trialPeriodDays: parseInt(e.target.value) || 0 })}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (days)</label>
                    <input
                      type="number"
                      value={editingProduct.gracePeriodDays}
                      onChange={(e) => setEditingProduct({ ...editingProduct, gracePeriodDays: parseInt(e.target.value) || 0 })}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h4 className="font-semibold text-indigo-900 mb-3">Features (displayed in pricing page)</h4>
                <div className="space-y-2 mb-3">
                  {(editingProduct.features || []).map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-indigo-100">
                      <span className="flex-1 text-sm text-gray-700">{feature}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(!editingProduct.features || editingProduct.features.length === 0) && (
                    <p className="text-sm text-gray-500 italic">No features added yet</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                    placeholder="Add a feature..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>

              {/* Display Settings */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-3">Display Settings</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={editingProduct.badge || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value })}
                      placeholder="e.g., BEST VALUE"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Badge Color</label>
                    <select
                      value={editingProduct.badgeColor || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, badgeColor: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Default</option>
                      <option value="red">Red</option>
                      <option value="green">Green</option>
                      <option value="blue">Blue</option>
                      <option value="amber">Amber</option>
                      <option value="purple">Purple</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                    <input
                      type="number"
                      value={editingProduct.displayOrder}
                      onChange={(e) => setEditingProduct({ ...editingProduct, displayOrder: parseInt(e.target.value) || 0 })}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.highlighted}
                      onChange={(e) => setEditingProduct({ ...editingProduct, highlighted: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Highlighted (Featured styling on pricing page)</span>
                  </label>
                </div>
              </div>

              {/* Stripe Integration */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Stripe Integration</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Product ID</label>
                    <input
                      type="text"
                      value={editingProduct.stripeProductId || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stripeProductId: e.target.value })}
                      placeholder="prod_..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Price ID</label>
                    <input
                      type="text"
                      value={editingProduct.stripePriceId || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stripePriceId: e.target.value })}
                      placeholder="price_..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <ShieldCheckIcon className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingManager;
