// MyViewingsPage - Page for viewing all scheduled viewings
// Shows upcoming and past viewings for both agents and buyers

import React, { useState } from 'react';
import { useViewings, useUpcomingViewings } from '../hooks/useViewings';
import { ViewingCard } from './ViewingCard';
import { ViewingCalendar } from './ViewingCalendar';
import { ScheduleSettings } from './ScheduleSettings';
import type { Viewing, ViewingStatus } from '../types';

type ViewMode = 'list' | 'calendar';
type TabType = 'upcoming' | 'past' | 'all';

interface MyViewingsPageProps {
  userRole?: 'agent' | 'buyer' | 'all';
}

export const MyViewingsPage: React.FC<MyViewingsPageProps> = ({
  userRole = 'all',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedViewing, setSelectedViewing] = useState<Viewing | null>(null);

  // Fetch viewings based on active tab
  const getStatusFilter = (): ViewingStatus[] | undefined => {
    switch (activeTab) {
      case 'upcoming':
        return ['scheduled', 'rescheduled'];
      case 'past':
        return ['completed', 'cancelled', 'no_show'];
      default:
        return undefined;
    }
  };

  const { viewings, isLoading } = useViewings({
    role: userRole,
    status: getStatusFilter(),
    upcoming: activeTab === 'upcoming',
  });

  const handleReschedule = (viewing: Viewing) => {
    setSelectedViewing(viewing);
    // TODO: Open reschedule modal
    alert('Reschedule functionality - open reschedule modal');
  };

  const handleViewingClick = (viewing: Viewing) => {
    setSelectedViewing(viewing);
    // TODO: Open viewing details modal
  };

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'past', label: 'Past' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Viewings</h1>
                <p className="text-gray-500 mt-1">
                  Manage your property viewing appointments
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* View Toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white text-gray-900 shadow'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      viewMode === 'calendar'
                        ? 'bg-white text-gray-900 shadow'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>

                {/* Settings Button (for agents) */}
                {(userRole === 'agent' || userRole === 'all') && (
                  <button
                    onClick={() => setShowSettings(true)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Schedule Settings
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            {viewMode === 'list' && (
              <div className="flex items-center gap-1 mt-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'calendar' ? (
          <ViewingCalendar onViewingClick={handleViewingClick} />
        ) : (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : viewings.length === 0 ? (
              <div className="text-center py-20">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No viewings found</h3>
                <p className="text-gray-500">
                  {activeTab === 'upcoming'
                    ? "You don't have any upcoming viewings scheduled."
                    : activeTab === 'past'
                    ? "You don't have any past viewings."
                    : "You haven't scheduled any viewings yet."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {viewings.map((viewing) => (
                  <ViewingCard
                    key={viewing._id}
                    viewing={viewing}
                    role={userRole === 'all' ? 'buyer' : userRole}
                    onReschedule={handleReschedule}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Schedule Settings Modal */}
      {showSettings && (
        <ScheduleSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default MyViewingsPage;
