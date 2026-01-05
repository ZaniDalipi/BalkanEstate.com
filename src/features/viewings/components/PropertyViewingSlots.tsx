// PropertyViewingSlots - Shows available viewing slots for a property
// Allows buyers to select a date and see available time slots

import React, { useState, useMemo } from 'react';
import { useAvailableSlots } from '../hooks/useAvailableSlots';
import type { AvailableSlot } from '../types';

interface PropertyViewingSlotsProps {
  propertyId: string;
  onSlotSelect: (slot: AvailableSlot, date: string) => void;
  selectedSlot?: AvailableSlot | null;
}

export const PropertyViewingSlots: React.FC<PropertyViewingSlotsProps> = ({
  propertyId,
  onSlotSelect,
  selectedSlot,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  const { slots, isLoading, hasAvailableSlots } = useAvailableSlots(
    propertyId,
    selectedDate
  );

  // Generate dates for the next 30 days
  const availableDates = useMemo(() => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  // Format date for display
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Schedule a Viewing
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Select a date and time to visit this property
        </p>
      </div>

      {/* Date Selection */}
      <div className="p-4 border-b border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Date
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {availableDates.slice(0, 14).map((dateStr) => {
            const isSelected = selectedDate === dateStr;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`
                  flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {formatDateLabel(dateStr)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slots */}
      <div className="p-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Available Time Slots
        </label>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-500">Loading available slots...</span>
          </div>
        ) : !hasAvailableSlots ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500">No available slots for this date</p>
            <p className="text-sm text-gray-400 mt-1">Try selecting a different date</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {slots.map((slot) => {
              const isSelected = selectedSlot?.startTime === slot.startTime;
              return (
                <button
                  key={slot.startTime}
                  onClick={() => onSlotSelect(slot, selectedDate)}
                  className={`
                    px-4 py-3 rounded-lg text-sm font-medium transition-all border
                    ${isSelected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }
                  `}
                >
                  {slot.formatted}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyViewingSlots;
