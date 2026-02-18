import React from 'react';
import { PlusIcon, XMarkIcon } from '@/constants';
import type { NewCodeForm, BulkForm } from './useDiscountCodeManager';

// ============================================================================
// Create Discount Code Modal
// ============================================================================

interface CreateCodeModalProps {
  newCode: NewCodeForm;
  setNewCode: React.Dispatch<React.SetStateAction<NewCodeForm>>;
  handleNewCodeNumber: (field: keyof NewCodeForm, value: string, min?: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const CreateCodeModal: React.FC<CreateCodeModalProps> = ({
  newCode,
  setNewCode,
  handleNewCodeNumber,
  onSubmit,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-xl font-bold">Create Discount Code</h3>
          <button onClick={onClose}>
            <XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
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
                <option value="fixed">Fixed Amount (&euro;)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Value <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={newCode.discountValue}
                onChange={(e) => handleNewCodeNumber('discountValue', e.target.value, 1)}
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
                onChange={(e) => handleNewCodeNumber('usageLimit', e.target.value, 1)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Purchase Amount (&euro;)
            </label>
            <input
              type="number"
              value={newCode.minimumPurchaseAmount}
              onChange={(e) => handleNewCodeNumber('minimumPurchaseAmount', e.target.value, 0)}
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
              {[
                { value: 'listing_promotion_15days', label: 'Listing Promotion (15 days)' },
                { value: 'seller_pro_monthly', label: 'Seller Pro (Monthly)' },
                { value: 'seller_pro_yearly', label: 'Seller Pro (Yearly)' },
                { value: 'seller_enterprise_yearly', label: 'Enterprise Plan' },
                { value: 'buyer_monthly', label: 'Buyer Pro' },
              ].map((plan) => (
                <label key={plan.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newCode.applicablePlans.includes(plan.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewCode({ ...newCode, applicablePlans: [...newCode.applicablePlans, plan.value] });
                      } else {
                        setNewCode({ ...newCode, applicablePlans: newCode.applicablePlans.filter(p => p !== plan.value) });
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{plan.label}</span>
                </label>
              ))}
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
              onClick={onClose}
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
  );
};

// ============================================================================
// Bulk Generate Modal
// ============================================================================

interface BulkGenerateModalProps {
  bulkForm: BulkForm;
  setBulkForm: React.Dispatch<React.SetStateAction<BulkForm>>;
  handleBulkFormNumber: (field: keyof BulkForm, value: string, min?: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const BulkGenerateModal: React.FC<BulkGenerateModalProps> = ({
  bulkForm,
  setBulkForm,
  handleBulkFormNumber,
  onSubmit,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold">Bulk Generate Codes</h3>
          <button onClick={onClose}>
            <XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Codes
              </label>
              <input
                type="number"
                value={bulkForm.count}
                onChange={(e) => handleBulkFormNumber('count', e.target.value, 1)}
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
                <option value="fixed">Fixed Amount (&euro;)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Value
              </label>
              <input
                type="number"
                value={bulkForm.discountValue}
                onChange={(e) => handleBulkFormNumber('discountValue', e.target.value, 1)}
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
                onChange={(e) => handleBulkFormNumber('usageLimit', e.target.value, 1)}
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
              onClick={onClose}
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
  );
};
