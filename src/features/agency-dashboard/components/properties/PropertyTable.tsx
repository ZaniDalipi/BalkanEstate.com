import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon, EyeIcon, EnvelopeIcon, HomeIcon } from '@/constants';
import type { DashboardProperty } from '../../types';

interface PropertyTableProps {
  properties: DashboardProperty[];
  isLoading: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  sold: 'bg-blue-100 text-blue-800',
  rented: 'bg-purple-100 text-purple-800',
  pending: 'bg-yellow-100 text-yellow-800',
  draft: 'bg-gray-100 text-gray-600',
};

const SkeletonRow: React.FC = () => (
  <tr className="animate-pulse">
    <td className="px-4 py-3"><div className="w-4 h-4 bg-gray-200 rounded" /></td>
    <td className="px-4 py-3"><div className="w-10 h-10 bg-gray-200 rounded-lg" /></td>
    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-32" /></td>
    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
    <td className="px-4 py-3"><div className="h-5 bg-gray-200 rounded-full w-16" /></td>
    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-10" /></td>
    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-10" /></td>
    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
  </tr>
);

const PropertyTable: React.FC<PropertyTableProps> = ({
  properties, isLoading, selectedIds, onToggleSelect, onSelectAll,
  total, page, limit, onPageChange,
}) => {
  const { t } = useTranslation(['agencyDashboard', 'common']);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const allIds = properties.map((p) => p.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));

  if (!isLoading && properties.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <HomeIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {t('agencyDashboard:properties.emptyTitle', 'No properties found')}
        </h3>
        <p className="text-sm text-gray-500">
          {t('agencyDashboard:properties.emptyDesc', 'Try adjusting your filters or add new listings.')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox" checked={allSelected} onChange={() => onSelectAll(allIds)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-4 py-3 text-gray-600 font-medium">{t('agencyDashboard:properties.colImage', 'Image')}</th>
              <th className="px-4 py-3 text-gray-600 font-medium">{t('agencyDashboard:properties.colTitle', 'Title')}</th>
              <th className="px-4 py-3 text-gray-600 font-medium">{t('agencyDashboard:properties.colPrice', 'Price')}</th>
              <th className="px-4 py-3 text-gray-600 font-medium">{t('agencyDashboard:properties.colStatus', 'Status')}</th>
              <th className="px-4 py-3 text-gray-600 font-medium">{t('agencyDashboard:properties.colAgent', 'Agent')}</th>
              <th className="px-4 py-3 text-gray-600 font-medium">{t('agencyDashboard:properties.colViews', 'Views')}</th>
              <th className="px-4 py-3 text-gray-600 font-medium">{t('agencyDashboard:properties.colInquiries', 'Inquiries')}</th>
              <th className="px-4 py-3 text-gray-600 font-medium">{t('agencyDashboard:properties.colListed', 'Listed')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : properties.map((prop) => (
                <tr key={prop.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox" checked={selectedIds.includes(prop.id)}
                      onChange={() => onToggleSelect(prop.id)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <img src={prop.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{prop.title}</td>
                  <td className="px-4 py-3 text-gray-700">{prop.price.toLocaleString()} &euro;</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[prop.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {prop.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{prop.assignedAgent}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="inline-flex items-center gap-1"><EyeIcon className="w-3.5 h-3.5" />{prop.views}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="inline-flex items-center gap-1"><EnvelopeIcon className="w-3.5 h-3.5" />{prop.inquiries}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(prop.listedAt).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
        <span className="text-sm text-gray-600">
          {t('agencyDashboard:properties.showing', 'Showing {{from}}-{{to}} of {{total}}', {
            from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total,
          })}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
            className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
          </button>
          <span className="px-3 py-1 text-sm font-medium text-gray-700">{page} / {totalPages}</span>
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
            className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronRightIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyTable;
