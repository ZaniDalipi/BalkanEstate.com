import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, XMarkIcon } from '../../constants';

interface DiscountCode {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  usedCount: number;
  usedBy: string[];
  isActive: boolean;
  applicablePlans?: string[];
  minimumPurchaseAmount?: number;
  description?: string;
  source?: string;
  createdAt: string;
}

const DiscountCodeManager: React.FC = () => {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  // Form state for creating codes
  const [newCode, setNewCode] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 10,
    validUntil: '',
    usageLimit: 1,
    description: '',
    applicablePlans: [] as string[],
    minimumPurchaseAmount: 0,
    source: 'admin' as string,
  });

  // Bulk generation form
  const [bulkForm, setBulkForm] = useState({
    count: 10,
    prefix: 'PROMO',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 10,
    validUntil: '',
    usageLimit: 1,
  });

  useEffect(() => {
    fetchDiscountCodes();
  }, []);

  const fetchDiscountCodes = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch('http://localhost:5001/api/admin/discount-codes', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch discount codes');

      const data = await response.json();
      setCodes(data.discountCodes || []);
    } catch (err) {
      setError('Failed to load discount codes');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch('http://localhost:5001/api/admin/discount-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newCode,
          code: newCode.code.toUpperCase(),
          validFrom: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create discount code');
      }

      await fetchDiscountCodes();
      setIsCreateModalOpen(false);
      setSuccessMessage('Discount code created successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Reset form
      setNewCode({
        code: '',
        discountType: 'percentage',
        discountValue: 10,
        validUntil: '',
        usageLimit: 1,
        description: '',
        applicablePlans: [],
        minimumPurchaseAmount: 0,
        source: 'admin',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create discount code');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch('http://localhost:5001/api/admin/discount-codes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...bulkForm,
          validFrom: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Failed to generate discount codes');

      const data = await response.json();
      await fetchDiscountCodes();
      setIsBulkModalOpen(false);
      setSuccessMessage(`Successfully generated ${data.codes.length} discount codes!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to generate discount codes');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this discount code?')) return;

    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`http://localhost:5001/api/admin/discount-codes/${id}/deactivate`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to deactivate code');

      await fetchDiscountCodes();
      setSuccessMessage('Discount code deactivated');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to deactivate discount code');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this discount code?')) return;

    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`http://localhost:5001/api/admin/discount-codes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete code');

      await fetchDiscountCodes();
      setSuccessMessage('Discount code deleted');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to delete discount code');
      setTimeout(() => setError(null), 5000);
    }
  };

  const filteredCodes = codes.filter(code => {
    if (filterStatus === 'active' && !code.isActive) return false;
    if (filterStatus === 'inactive' && code.isActive) return false;
    if (filterSource !== 'all' && code.source !== filterSource) return false;
    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading discount codes...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Discount Code Management</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Set preset values for listing promotion code
                setNewCode({
                  code: `PROMO${Date.now().toString().slice(-6)}`,
                  discountType: 'percentage',
                  discountValue: 20,
                  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                  usageLimit: 100,
                  description: 'Listing promotion discount',
                  applicablePlans: ['listing_promotion_15days'],
                  minimumPurchaseAmount: 0,
                  source: 'promotion',
                });
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Listing Promo
            </button>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              Bulk Generate
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Create Code
            </button>
          </div>
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
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Sources</option>
            <option value="admin">Admin</option>
            <option value="gamification">Gamification</option>
            <option value="promotion">Promotion</option>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Until</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCodes.map((code) => (
              <tr key={code._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-mono font-bold text-gray-900">{code.code}</div>
                  {code.description && (
                    <div className="text-xs text-gray-500 mt-1">{code.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-semibold text-green-600">
                    {code.discountType === 'percentage' ? `${code.discountValue}%` : `€${code.discountValue}`}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <span className={code.usedCount >= code.usageLimit ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                      {code.usedCount}
                    </span>
                    <span className="text-gray-500"> / {code.usageLimit}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(code.validUntil)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {code.source || 'admin'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    code.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {code.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    {code.isActive && (
                      <button
                        onClick={() => handleDeactivate(code._id)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Deactivate
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(code._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCodes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No discount codes found. Create your first one!
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-xl font-bold">Create Discount Code</h3>
              <button onClick={() => setIsCreateModalOpen(false)}>
                <XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <form onSubmit={handleCreateCode} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCode.code}
                  onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono"
                  placeholder="SUMMER2024"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={newCode.discountType}
                    onChange={(e) => setNewCode({ ...newCode, discountType: e.target.value as any })}
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
                    value={newCode.discountValue}
                    onChange={(e) => setNewCode({ ...newCode, discountValue: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="1"
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
                    value={newCode.validUntil}
                    onChange={(e) => setNewCode({ ...newCode, validUntil: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    value={newCode.usageLimit}
                    onChange={(e) => setNewCode({ ...newCode, usageLimit: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Purchase Amount (€)
                </label>
                <input
                  type="number"
                  value={newCode.minimumPurchaseAmount}
                  onChange={(e) => setNewCode({ ...newCode, minimumPurchaseAmount: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code Type/Source
                </label>
                <select
                  value={newCode.source}
                  onChange={(e) => setNewCode({ ...newCode, source: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="admin">Admin (General)</option>
                  <option value="promotion">Listing Promotion</option>
                  <option value="seasonal">Seasonal Campaign</option>
                  <option value="referral">Referral Program</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {newCode.source === 'promotion' && 'Use for discounts on listing promotions (15-day featured boost)'}
                  {newCode.source === 'seasonal' && 'Use for holiday/seasonal marketing campaigns'}
                  {newCode.source === 'referral' && 'Use for user referral rewards'}
                  {newCode.source === 'admin' && 'General purpose discount codes'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Applicable Plans (optional)
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newCode.applicablePlans.includes('listing_promotion_15days')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewCode({ ...newCode, applicablePlans: [...newCode.applicablePlans, 'listing_promotion_15days'] });
                        } else {
                          setNewCode({ ...newCode, applicablePlans: newCode.applicablePlans.filter(p => p !== 'listing_promotion_15days') });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Listing Promotion (15 days)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newCode.applicablePlans.includes('seller_pro_monthly')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewCode({ ...newCode, applicablePlans: [...newCode.applicablePlans, 'seller_pro_monthly'] });
                        } else {
                          setNewCode({ ...newCode, applicablePlans: newCode.applicablePlans.filter(p => p !== 'seller_pro_monthly') });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Seller Pro (Monthly)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newCode.applicablePlans.includes('seller_pro_yearly')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewCode({ ...newCode, applicablePlans: [...newCode.applicablePlans, 'seller_pro_yearly'] });
                        } else {
                          setNewCode({ ...newCode, applicablePlans: newCode.applicablePlans.filter(p => p !== 'seller_pro_yearly') });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Seller Pro (Yearly)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newCode.applicablePlans.includes('seller_enterprise_yearly')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewCode({ ...newCode, applicablePlans: [...newCode.applicablePlans, 'seller_enterprise_yearly'] });
                        } else {
                          setNewCode({ ...newCode, applicablePlans: newCode.applicablePlans.filter(p => p !== 'seller_enterprise_yearly') });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Enterprise Plan</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">Leave all unchecked to apply to all plans</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newCode.description}
                  onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Internal note about this code..."
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
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Create Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Generate Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold">Bulk Generate Codes</h3>
              <button onClick={() => setIsBulkModalOpen(false)}>
                <XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <form onSubmit={handleBulkGenerate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Codes
                  </label>
                  <input
                    type="number"
                    value={bulkForm.count}
                    onChange={(e) => setBulkForm({ ...bulkForm, count: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="1"
                    max="1000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code Prefix
                  </label>
                  <input
                    type="text"
                    value={bulkForm.prefix}
                    onChange={(e) => setBulkForm({ ...bulkForm, prefix: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={bulkForm.discountType}
                    onChange={(e) => setBulkForm({ ...bulkForm, discountType: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (€)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    value={bulkForm.discountValue}
                    onChange={(e) => setBulkForm({ ...bulkForm, discountValue: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until
                  </label>
                  <input
                    type="datetime-local"
                    value={bulkForm.validUntil}
                    onChange={(e) => setBulkForm({ ...bulkForm, validUntil: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usage Limit (each)
                  </label>
                  <input
                    type="number"
                    value={bulkForm.usageLimit}
                    onChange={(e) => setBulkForm({ ...bulkForm, usageLimit: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="1"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  This will generate {bulkForm.count} codes with random suffixes like: {bulkForm.prefix}-XXXXX
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Generate Codes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountCodeManager;
