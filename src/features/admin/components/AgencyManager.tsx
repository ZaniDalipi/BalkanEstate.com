import React from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon, TrashIcon, EyeIcon, BuildingOfficeIcon } from '@/constants';
import { useAgencyManager } from './useAgencyManager';
import AgencyManagerDetail from './AgencyManagerDetail';

const AgencyManager: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const {
    agencies,
    isLoading,
    error,
    successMessage,
    isViewModalOpen,
    setIsViewModalOpen,
    viewingAgency,
    isEditModalOpen,
    setIsEditModalOpen,
    editingAgency,
    editForm,
    setEditForm,
    currentPage,
    setCurrentPage,
    totalPages,
    totalAgencies,
    handleViewAgency,
    handleEditAgency,
    handleUpdateAgency,
    handleDeleteAgency,
    formatDate,
  } = useAgencyManager();

  if (isLoading && agencies.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('admin:agencies.loading')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('admin:agencies.title')}</h2>
            <p className="text-sm text-gray-600 mt-1">{t('admin:dashboard.totalAgencies')}: {totalAgencies}</p>
          </div>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agents</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {agencies.map((agency) => (
              <tr key={agency._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    {agency.logo ? (
                      <img
                        src={agency.logo}
                        alt={agency.name}
                        loading="lazy"
                        decoding="async"
                        className="w-12 h-12 rounded object-cover mr-3"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-blue-100 flex items-center justify-center mr-3">
                        <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{agency.name}</div>
                      <div className="text-xs text-gray-500">{agency.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {agency.ownerId ? (
                    <div>
                      <div className="text-sm text-gray-900">
                        {typeof agency.ownerId === 'object' ? agency.ownerId.name : 'Owner'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {typeof agency.ownerId === 'object' ? agency.ownerId.email : agency.ownerId}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {agency.email || agency.phone ? (
                    <div>
                      {agency.email && <div className="text-sm text-gray-900">{agency.email}</div>}
                      {agency.phone && <div className="text-xs text-gray-500">{agency.phone}</div>}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {agency.city || agency.country ? (
                    <div>
                      <div className="text-sm text-gray-900">{agency.city}</div>
                      <div className="text-xs text-gray-500">{agency.country}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-sm font-semibold bg-purple-100 text-purple-800 rounded-full">
                      {agency.totalAgents || 0}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(agency.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewAgency(agency)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View details"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEditAgency(agency)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit agency"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAgency(agency._id, agency.name)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete agency"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {agencies.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No agencies found.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <AgencyManagerDetail
        isViewModalOpen={isViewModalOpen}
        setIsViewModalOpen={setIsViewModalOpen}
        viewingAgency={viewingAgency}
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        editingAgency={editingAgency}
        editForm={editForm}
        setEditForm={setEditForm}
        handleUpdateAgency={handleUpdateAgency}
        formatDate={formatDate}
      />
    </div>
  );
};

export default AgencyManager;
