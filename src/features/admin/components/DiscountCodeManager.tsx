import React from 'react';
import { PlusIcon, ArrowPathIcon } from '@/constants';
import { useDiscountCodeManager } from './useDiscountCodeManager';
import { CreateCodeModal, BulkGenerateModal } from './DiscountCodeManagerForm';

const DiscountCodeManager: React.FC = () => {
  const {
    isCreateModalOpen,
    setIsCreateModalOpen,
    isBulkModalOpen,
    setIsBulkModalOpen,
    error,
    successMessage,
    filterStatus,
    setFilterStatus,
    filterSource,
    setFilterSource,
    isLoading,
    isRefetching,
    refetch,
    newCode,
    setNewCode,
    bulkForm,
    setBulkForm,
    filteredCodes,
    handleNewCodeNumber,
    handleBulkFormNumber,
    handleCreateCode,
    handleBulkGenerate,
    handleDeactivate,
    handleDelete,
    openListingPromoCreate,
    formatDate,
  } = useDiscountCodeManager();

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
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">Discount Code Management</h2>
            {/* Sync Status */}
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${isRefetching ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
              <span className="text-gray-600">{isRefetching ? 'Syncing...' : 'Live'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              title="Refresh discount codes"
            >
              <ArrowPathIcon className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={openListingPromoCreate}
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
            {filteredCodes.map((code, index) => (
              <tr key={code.id || `discount-code-${index}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-mono font-bold text-gray-900">{code.code}</div>
                  {code.description && (
                    <div className="text-xs text-gray-500 mt-1">{code.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-semibold text-green-600">
                    {code.discountType === 'percentage' ? `${code.discountValue}%` : `\u20AC${code.discountValue}`}
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
                        onClick={() => handleDeactivate(code.id)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Deactivate
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(code.id)}
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
        <CreateCodeModal
          newCode={newCode}
          setNewCode={setNewCode}
          handleNewCodeNumber={handleNewCodeNumber}
          onSubmit={handleCreateCode}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {/* Bulk Generate Modal */}
      {isBulkModalOpen && (
        <BulkGenerateModal
          bulkForm={bulkForm}
          setBulkForm={setBulkForm}
          handleBulkFormNumber={handleBulkFormNumber}
          onSubmit={handleBulkGenerate}
          onClose={() => setIsBulkModalOpen(false)}
        />
      )}
    </div>
  );
};

export default DiscountCodeManager;
