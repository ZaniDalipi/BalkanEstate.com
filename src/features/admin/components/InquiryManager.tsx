import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  EyeIcon,
  TrashIcon,
  EnvelopeIcon,
} from '@/constants';
import { useInquiryManager } from './useInquiryManager';
import InquiryManagerDetail from './InquiryManagerDetail';

const InquiryManager: React.FC = () => {
  const {
    inquiries,
    stats,
    isLoading,
    error,
    successMessage,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    isDetailModalOpen,
    setIsDetailModalOpen,
    selectedInquiry,
    adminNotes,
    setAdminNotes,
    selectedIds,
    setSelectedIds,
    currentPage,
    setCurrentPage,
    totalPages,
    totalInquiries,
    handleViewInquiry,
    updateInquiryStatus,
    saveAdminNotes,
    handleDeleteInquiry,
    handleBulkStatusUpdate,
    formatDate,
    getStatusBadgeColor,
    getTypeBadgeColor,
    toggleSelectAll,
  } = useInquiryManager();
  const { t } = useTranslation(['admin', 'common']);

  if (isLoading && inquiries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('admin:inquiries.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('admin:inquiries.totalInquiries')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overview.totalInquiries}</p>
              </div>
              <EnvelopeIcon className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('admin:inquiries.newUnread')}</p>
                <p className="text-2xl font-bold text-blue-600">{stats.overview.newInquiries}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">{stats.overview.newInquiries}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('admin:inquiries.today')}</p>
                <p className="text-2xl font-bold text-green-600">{stats.overview.todayInquiries}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">+{stats.overview.todayInquiries}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('admin:inquiries.thisWeek')}</p>
                <p className="text-2xl font-bold text-purple-600">{stats.overview.weekInquiries}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold">{stats.overview.weekInquiries}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('admin:inquiries.title')}</h2>
              <p className="text-sm text-gray-600 mt-1">{t('admin:inquiries.total', { count: totalInquiries })}</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('admin:inquiries.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">{t('admin:inquiries.allTypes')}</option>
              <option value="property">{t('admin:inquiries.propertyInquiry')}</option>
              <option value="agent">{t('admin:inquiries.agentInquiry')}</option>
              <option value="area_search">{t('admin:inquiries.areaSearch')}</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">{t('admin:inquiries.allStatus')}</option>
              <option value="new">{t('admin:inquiries.new')}</option>
              <option value="read">{t('admin:inquiries.read')}</option>
              <option value="replied">{t('admin:inquiries.replied')}</option>
              <option value="archived">{t('admin:inquiries.archived')}</option>
            </select>

            {selectedIds.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkStatusUpdate('read')}
                  className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm hover:bg-yellow-200"
                >
                  {t('admin:inquiries.markRead')} ({selectedIds.length})
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('archived')}
                  className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm hover:bg-gray-200"
                >
                  {t('admin:inquiries.archive')}
                </button>
              </div>
            )}
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
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === inquiries.length && inquiries.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin:inquiries.sender')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin:inquiries.recipient')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin:inquiries.type')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin:inquiries.status')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin:inquiries.propertyLocation')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin:inquiries.date')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin:inquiries.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inquiries.map((inquiry) => (
                <tr key={inquiry._id} className={`hover:bg-gray-50 ${inquiry.status === 'new' ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(inquiry._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, inquiry._id]);
                        } else {
                          setSelectedIds(selectedIds.filter(id => id !== inquiry._id));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{inquiry.buyerName}</div>
                      <div className="text-sm text-gray-500">{inquiry.buyerEmail}</div>
                      {inquiry.buyerPhone && (
                        <div className="text-xs text-gray-400">{inquiry.buyerPhone}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      {inquiry.recipientId?.avatarUrl ? (
                        <img src={inquiry.recipientId.avatarUrl} alt="" loading="lazy" decoding="async" className="w-8 h-8 rounded-full mr-2" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2 text-sm">
                          {(inquiry.recipientName || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{inquiry.recipientName || '-'}</div>
                        <div className="text-xs text-gray-500">{inquiry.recipientEmail || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeBadgeColor(inquiry.type)}`}>
                      {(inquiry.type || '').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(inquiry.status)}`}>
                      {inquiry.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {inquiry.propertyTitle ? (
                      <div className="text-sm text-gray-900 max-w-[200px] truncate" title={inquiry.propertyTitle}>
                        {inquiry.propertyTitle}
                      </div>
                    ) : inquiry.location ? (
                      <div className="text-sm text-gray-600">{inquiry.location}</div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(inquiry.createdAt)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewInquiry(inquiry)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View details"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteInquiry(inquiry._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {inquiries.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {t('admin:inquiries.noInquiriesFound')}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {t('admin:inquiries.pageOf', { current: currentPage, total: totalPages })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                {t('common:previous')}
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                {t('common:next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedInquiry && (
        <InquiryManagerDetail
          inquiry={selectedInquiry}
          adminNotes={adminNotes}
          setAdminNotes={setAdminNotes}
          onClose={() => setIsDetailModalOpen(false)}
          onUpdateStatus={updateInquiryStatus}
          onSaveNotes={saveAdminNotes}
          onDelete={handleDeleteInquiry}
          formatDate={formatDate}
          getStatusBadgeColor={getStatusBadgeColor}
          getTypeBadgeColor={getTypeBadgeColor}
        />
      )}
    </div>
  );
};

export default InquiryManager;
