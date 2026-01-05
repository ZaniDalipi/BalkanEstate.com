// ViewingCalendar - Agent's calendar for managing property viewings
// Shows monthly calendar with booked viewings and blocked dates

import React, { useState, useMemo } from 'react';
import { useViewingCalendar } from '../hooks/useViewingCalendar';
import { useViewingSchedule } from '../hooks/useViewingSchedule';
import { useViewingMutations } from '../hooks/useViewingMutations';
import type { Viewing } from '../types';

interface ViewingCalendarProps {
  onViewingClick?: (viewing: Viewing) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const ViewingCalendar: React.FC<ViewingCalendarProps> = ({ onViewingClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showBlockDateModal, setShowBlockDateModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  // Get the start and end of the current month view
  const { startDate, endDate } = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [currentDate]);

  const { viewings, schedule, isLoading } = useViewingCalendar(startDate, endDate);
  const { addBlockedDate, removeBlockedDate, isAddingBlockedDate } = useViewingSchedule();
  const { completeViewing, markNoShow } = useViewingMutations();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Add padding days from previous month
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }

    // Add padding days from next month
    const remaining = 42 - days.length; // 6 rows x 7 days
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  // Group viewings by date
  const viewingsByDate = useMemo(() => {
    const grouped: Record<string, Viewing[]> = {};
    viewings.forEach((viewing) => {
      const dateKey = new Date(viewing.startTime).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(viewing);
    });
    return grouped;
  }, [viewings]);

  // Check if a date is blocked
  const isDateBlocked = (date: Date): boolean => {
    if (!schedule?.blockedDates) return false;
    const dateStr = date.toDateString();
    return schedule.blockedDates.some(
      (blocked) => new Date(blocked.date).toDateString() === dateStr
    );
  };

  // Get blocked date reason
  const getBlockedReason = (date: Date): string | undefined => {
    if (!schedule?.blockedDates) return undefined;
    const dateStr = date.toDateString();
    const blocked = schedule.blockedDates.find(
      (b) => new Date(b.date).toDateString() === dateStr
    );
    return blocked?.reason;
  };

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle blocking/unblocking dates
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (isDateBlocked(date)) {
      // Show option to unblock
      if (window.confirm('This date is blocked. Would you like to unblock it?')) {
        removeBlockedDate(date.toISOString());
      }
    } else {
      setShowBlockDateModal(true);
    }
  };

  const handleBlockDate = () => {
    if (selectedDate) {
      addBlockedDate(selectedDate.toISOString(), blockReason || undefined);
      setShowBlockDateModal(false);
      setBlockReason('');
      setSelectedDate(null);
    }
  };

  const handleViewingAction = async (viewing: Viewing, action: 'complete' | 'no_show') => {
    try {
      if (action === 'complete') {
        await completeViewing({ viewingId: viewing._id });
      } else {
        await markNoShow(viewing._id);
      }
    } catch (error) {
      console.error('Failed to update viewing:', error);
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToPreviousMonth}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ date, isCurrentMonth }, index) => {
              const dateKey = date.toDateString();
              const dayViewings = viewingsByDate[dateKey] || [];
              const blocked = isDateBlocked(date);
              const blockedReason = getBlockedReason(date);
              const today = isToday(date);
              const past = isPastDate(date);

              return (
                <div
                  key={index}
                  onClick={() => !past && handleDateClick(date)}
                  className={`
                    min-h-[100px] p-1 rounded-lg border transition-all
                    ${!isCurrentMonth ? 'bg-gray-50 opacity-50' : ''}
                    ${blocked ? 'bg-red-50 border-red-200' : 'border-gray-200'}
                    ${today ? 'ring-2 ring-blue-500' : ''}
                    ${!past && isCurrentMonth ? 'cursor-pointer hover:bg-gray-50' : ''}
                    ${past ? 'opacity-60' : ''}
                  `}
                >
                  <div className={`
                    text-sm font-medium mb-1
                    ${today ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                  `}>
                    {date.getDate()}
                  </div>

                  {blocked && (
                    <div className="text-xs text-red-600 truncate" title={blockedReason}>
                      Blocked{blockedReason ? `: ${blockedReason}` : ''}
                    </div>
                  )}

                  {/* Viewings for this day */}
                  <div className="space-y-1">
                    {dayViewings.slice(0, 3).map((viewing) => (
                      <div
                        key={viewing._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewingClick?.(viewing);
                        }}
                        className={`
                          text-xs p-1 rounded truncate cursor-pointer
                          ${viewing.status === 'completed' ? 'bg-green-100 text-green-800' :
                            viewing.status === 'cancelled' ? 'bg-gray-100 text-gray-500 line-through' :
                            viewing.status === 'no_show' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'}
                        `}
                        title={`${viewing.propertyId.title || viewing.propertyId.address} - ${viewing.buyerId.name}`}
                      >
                        {new Date(viewing.startTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                        {' '}
                        {viewing.propertyId.title?.substring(0, 10) || viewing.propertyId.address.substring(0, 10)}
                      </div>
                    ))}
                    {dayViewings.length > 3 && (
                      <div className="text-xs text-gray-500 pl-1">
                        +{dayViewings.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 pb-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></div>
          <span className="text-gray-600">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
          <span className="text-gray-600">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-50 border border-red-300"></div>
          <span className="text-gray-600">Blocked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-100 border border-orange-300"></div>
          <span className="text-gray-600">No-show</span>
        </div>
      </div>

      {/* Block Date Modal */}
      {showBlockDateModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Block Date</h3>
            <p className="text-gray-600 mb-4">
              Block {selectedDate.toLocaleDateString()} from receiving viewing bookings.
            </p>
            <input
              type="text"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBlockDateModal(false);
                  setBlockReason('');
                  setSelectedDate(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockDate}
                disabled={isAddingBlockedDate}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isAddingBlockedDate ? 'Blocking...' : 'Block Date'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewingCalendar;
