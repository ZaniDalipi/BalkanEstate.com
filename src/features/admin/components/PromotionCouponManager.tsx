/**
 * PromotionCouponManager - Admin component for managing promotion coupons
 *
 * Uses React Query for real-time data management with:
 * - Auto-refresh every 10 seconds
 * - Optimistic updates for instant UI feedback
 * - Automatic cache invalidation
 */

import React from 'react';
import { PlusIcon } from '@/constants';
import { type PromotionCoupon } from '../hooks/usePromotionCouponData';
import { usePromotionCouponManager } from './usePromotionCouponManager';
import { CreateCouponModal } from './PromotionCouponManagerForm';

const PromotionCouponManager: React.FC = () => {
  const {
    isLoading,
    error,
    successMessage,
    isCreateModalOpen,
    setIsCreateModalOpen,
    filterStatus,
    setFilterStatus,
    newCoupon,
    setNewCoupon,
    createMutation,
    disableMutation,
    refreshCoupons,
    dataUpdatedAt,
    filteredCoupons,
    handleCreateCoupon,
    handleDisableCoupon,
    applyPreset,
    formatDate,
    formatLastUpdated,
    getStatusColor,
    getTierBadgeColor,
  } = usePromotionCouponManager();

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
              Manage discount coupons for property listing promotions (Featured, Highlight, Premium
              tiers)
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Real-time indicator */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Auto-refresh 10s</span>
              <span className="text-gray-400">|</span>
              <span>Updated: {formatLastUpdated(dataUpdatedAt)}</span>
            </div>
            <button
              onClick={refreshCoupons}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Refresh
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Create Coupon
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Discount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valid Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tiers
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCoupons.map((coupon: PromotionCoupon, index: number) => (
              <tr key={coupon.id || `coupon-${index}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-mono font-bold text-gray-900">{coupon.code}</div>
                  {coupon.description && (
                    <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                      {coupon.description}
                    </div>
                  )}
                  {coupon.isPublic && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                      Public
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-semibold text-purple-600 text-lg">
                    {coupon.discountType === 'percentage'
                      ? `${coupon.discountValue}%`
                      : `\u20AC${coupon.discountValue}`}
                  </span>
                  {coupon.minimumPurchaseAmount && coupon.minimumPurchaseAmount > 0 && (
                    <div className="text-xs text-gray-500">Min: &euro;{coupon.minimumPurchaseAmount}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <span
                      className={
                        coupon.maxTotalUses && coupon.currentTotalUses >= coupon.maxTotalUses
                          ? 'text-red-600 font-semibold'
                          : 'text-gray-900'
                      }
                    >
                      {coupon.currentTotalUses}
                    </span>
                    <span className="text-gray-500"> / {coupon.maxTotalUses || '\u221E'}</span>
                  </div>
                  <div className="text-xs text-gray-500">{coupon.maxUsesPerUser} per user</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{formatDate(coupon.validFrom)}</div>
                  <div className="text-xs">to {formatDate(coupon.validUntil)}</div>
                </td>
                <td className="px-6 py-4">
                  {coupon.applicableTiers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {coupon.applicableTiers.map((tier) => (
                        <span
                          key={tier}
                          className={`px-2 py-0.5 text-xs font-medium rounded ${getTierBadgeColor(tier)}`}
                        >
                          {tier}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">All tiers</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(coupon.status)}`}
                  >
                    {coupon.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {coupon.status === 'active' && (
                    <button
                      onClick={() => handleDisableCoupon(coupon.id)}
                      disabled={disableMutation.isPending}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      {disableMutation.isPending ? 'Disabling...' : 'Disable'}
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
        <CreateCouponModal
          newCoupon={newCoupon}
          setNewCoupon={setNewCoupon}
          applyPreset={applyPreset}
          getTierBadgeColor={getTierBadgeColor}
          onSubmit={handleCreateCoupon}
          onClose={() => setIsCreateModalOpen(false)}
          isCreating={createMutation.isPending}
        />
      )}
    </div>
  );
};

export default PromotionCouponManager;
