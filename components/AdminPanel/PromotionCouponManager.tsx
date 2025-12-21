import React, { useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon } from '../../constants';

interface PromotionCoupon {
  _id: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  validFrom: string;
  validUntil: string;
  status: 'active' | 'expired' | 'disabled';
  maxTotalUses?: number;
  maxUsesPerUser: number;
  currentTotalUses: number;
  applicableTiers: string[];
  minimumPurchaseAmount?: number;
  isPublic: boolean;
  notes?: string;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const PromotionCouponManager: React.FC = () => {
  const [coupons, setCoupons] = useState<PromotionCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'disabled'>('all');

  // Form state for creating coupons
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 10,
    validUntil: '',
    maxTotalUses: 100,
    maxUsesPerUser: 1,
    applicableTiers: [] as string[],
    minimumPurchaseAmount: 0,
    isPublic: false,
    notes: '',
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/coupons`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch coupons');

      const data = await response.json();
      setCoupons(data.coupons || []);
    } catch (err) {
      setError('Failed to load promotion coupons');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newCoupon,
          code: newCoupon.code.toUpperCase(),
          validFrom: new Date().toISOString(),
          validUntil: new Date(newCoupon.validUntil).toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create coupon');
      }

      await fetchCoupons();
      setIsCreateModalOpen(false);
      setSuccessMessage('Promotion coupon created successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Reset form
      setNewCoupon({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: 10,
        validUntil: '',
        maxTotalUses: 100,
        maxUsesPerUser: 1,
        applicableTiers: [],
        minimumPurchaseAmount: 0,
        isPublic: false,
        notes: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create coupon');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDisableCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to disable this coupon?')) return;

    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/coupons/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to disable coupon');

      await fetchCoupons();
      setSuccessMessage('Coupon disabled successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to disable coupon');
      setTimeout(() => setError(null), 5000);
    }
  };

  const filteredCoupons = coupons.filter(coupon => {
    if (filterStatus === 'all') return true;
    return coupon.status === filterStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'disabled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'highlight': return 'bg-amber-100 text-amber-800';
      case 'featured': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Quick create presets
  const applyPreset = (preset: 'test100' | 'welcome' | 'seasonal') => {
    const presets = {
      test100: {
        code: 'TEST100',
        description: 'Test coupon - 100% off for development',
        discountType: 'percentage' as const,
        discountValue: 100,
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        maxTotalUses: 1000,
        maxUsesPerUser: 100,
        applicableTiers: [],
        minimumPurchaseAmount: 0,
        isPublic: false,
        notes: 'Development testing only',
      },
      welcome: {
        code: 'WELCOME15',
        description: 'Welcome bonus - 15% off first promotion',
        discountType: 'percentage' as const,
        discountValue: 15,
        validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        maxTotalUses: 500,
        maxUsesPerUser: 1,
        applicableTiers: [],
        minimumPurchaseAmount: 0,
        isPublic: true,
        notes: 'Welcome coupon for new users',
      },
      seasonal: {
        code: 'SUMMER25',
        description: 'Summer sale - 25% off all promotions',
        discountType: 'percentage' as const,
        discountValue: 25,
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        maxTotalUses: 200,
        maxUsesPerUser: 3,
        applicableTiers: [],
        minimumPurchaseAmount: 0,
        isPublic: true,
        notes: 'Seasonal promotion campaign',
      },
    };
    setNewCoupon(presets[preset]);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading promotion coupons...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Promotion Coupons</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage discount coupons for property listing promotions (Featured, Highlight, Premium tiers)
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Create Coupon
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiers</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCoupons.map((coupon) => (
              <tr key={coupon._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-mono font-bold text-gray-900">{coupon.code}</div>
                  {coupon.description && (
                    <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">{coupon.description}</div>
                  )}
                  {coupon.isPublic && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                      Public
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-semibold text-purple-600 text-lg">
                    {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `€${coupon.discountValue}`}
                  </span>
                  {coupon.minimumPurchaseAmount && coupon.minimumPurchaseAmount > 0 && (
                    <div className="text-xs text-gray-500">Min: €{coupon.minimumPurchaseAmount}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <span className={coupon.maxTotalUses && coupon.currentTotalUses >= coupon.maxTotalUses ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                      {coupon.currentTotalUses}
                    </span>
                    <span className="text-gray-500"> / {coupon.maxTotalUses || '∞'}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {coupon.maxUsesPerUser} per user
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{formatDate(coupon.validFrom)}</div>
                  <div className="text-xs">to {formatDate(coupon.validUntil)}</div>
                </td>
                <td className="px-6 py-4">
                  {coupon.applicableTiers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {coupon.applicableTiers.map((tier) => (
                        <span key={tier} className={`px-2 py-0.5 text-xs font-medium rounded ${getTierBadgeColor(tier)}`}>
                          {tier}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">All tiers</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(coupon.status)}`}>
                    {coupon.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {coupon.status === 'active' && (
                    <button
                      onClick={() => handleDisableCoupon(coupon._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Disable
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCoupons.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">🎟️</div>
            <p>No promotion coupons found.</p>
            <p className="text-sm mt-1">Create your first coupon to get started!</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-xl font-bold">Create Promotion Coupon</h3>
              <button onClick={() => setIsCreateModalOpen(false)}>
                <XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="px-6 pt-4 flex gap-2">
              <button
                type="button"
                onClick={() => applyPreset('test100')}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Test 100% Off
              </button>
              <button
                type="button"
                onClick={() => applyPreset('welcome')}
                className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Welcome 15%
              </button>
              <button
                type="button"
                onClick={() => applyPreset('seasonal')}
                className="px-3 py-1.5 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
              >
                Seasonal 25%
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono uppercase"
                  placeholder="SUMMER25"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newCoupon.description}
                  onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Summer promotion - 25% off"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={newCoupon.discountType}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (€)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Value <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newCoupon.discountValue}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="1"
                    max={newCoupon.discountType === 'percentage' ? 100 : undefined}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={newCoupon.validUntil}
                    onChange={(e) => setNewCoupon({ ...newCoupon, validUntil: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min. Purchase (€)
                  </label>
                  <input
                    type="number"
                    value={newCoupon.minimumPurchaseAmount}
                    onChange={(e) => setNewCoupon({ ...newCoupon, minimumPurchaseAmount: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Usage Limit
                  </label>
                  <input
                    type="number"
                    value={newCoupon.maxTotalUses}
                    onChange={(e) => setNewCoupon({ ...newCoupon, maxTotalUses: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Uses Per User
                  </label>
                  <input
                    type="number"
                    value={newCoupon.maxUsesPerUser}
                    onChange={(e) => setNewCoupon({ ...newCoupon, maxUsesPerUser: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Applicable Promotion Tiers
                </label>
                <div className="flex flex-wrap gap-3">
                  {['featured', 'highlight', 'premium'].map((tier) => (
                    <label key={tier} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCoupon.applicableTiers.includes(tier)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewCoupon({ ...newCoupon, applicableTiers: [...newCoupon.applicableTiers, tier] });
                          } else {
                            setNewCoupon({ ...newCoupon, applicableTiers: newCoupon.applicableTiers.filter(t => t !== tier) });
                          }
                        }}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getTierBadgeColor(tier)}`}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Leave all unchecked to apply to all tiers</p>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCoupon.isPublic}
                    onChange={(e) => setNewCoupon({ ...newCoupon, isPublic: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Public Coupon</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">Public coupons can be displayed to users on the promotion page</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Internal Notes
                </label>
                <textarea
                  value={newCoupon.notes}
                  onChange={(e) => setNewCoupon({ ...newCoupon, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder="Internal notes about this coupon..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionCouponManager;
