import React from 'react';
import {
  ChartBarIcon,
  CursorArrowRaysIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@/constants';
import { useActivityLog, filterOptions, dateRangeOptions } from './useActivityLog';
import { AnalyticsDashboard, HeatmapPanel, ActivityList } from './ActivityLogContent';

const ActivityLog: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    activities,
    dashboardStats,
    heatmapData,
    recentSubscriptions,
    isLoading,
    currentPage,
    setCurrentPage,
    totalPages,
    filter,
    setFilter,
    dateRange,
    setDateRange,
    formatTimestamp,
  } = useActivityLog();

  const tabs = [
    { key: 'analytics' as const, label: 'Analytics Dashboard', icon: ChartBarIcon },
    { key: 'heatmap' as const, label: 'Interaction Heatmap', icon: CursorArrowRaysIcon },
    { key: 'activity' as const, label: 'Activity Log', icon: ClockIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <ChartBarIcon className="w-7 h-7" />
              Analytics & Activity
            </h1>
            <p className="text-blue-200 mt-1">Monitor platform activity, user behavior, and subscription metrics</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Date Range */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-white/20 border-0 text-white rounded-xl px-4 py-2 text-sm backdrop-blur-sm [&>option]:text-gray-900"
            >
              {dateRangeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all flex-1 justify-center ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Activity Tab Filters */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <ArrowPathIcon className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="text-gray-600">Loading data...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Analytics Dashboard Tab */}
          {activeTab === 'analytics' && (
            <AnalyticsDashboard
              dashboardStats={dashboardStats}
              recentSubscriptions={recentSubscriptions}
              formatTimestamp={formatTimestamp}
            />
          )}

          {/* Heatmap Tab */}
          {activeTab === 'heatmap' && (
            <HeatmapPanel heatmapData={heatmapData} />
          )}

          {/* Activity Log Tab */}
          {activeTab === 'activity' && (
            <ActivityList
              activities={activities}
              isLoading={false}
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
              formatTimestamp={formatTimestamp}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ActivityLog;
