// ScheduleSettings - Modal for agents to manage their viewing schedule settings
// Allows configuring working hours, viewing duration, buffer time, etc.

import React, { useState, useEffect } from 'react';
import { useViewingSchedule } from '../hooks/useViewingSchedule';
import type { WorkingDay, ViewingScheduleUpdate } from '../types';

interface ScheduleSettingsProps {
  onClose: () => void;
}

const DAYS: { id: WorkingDay['day']; label: string }[] = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
];

export const ScheduleSettings: React.FC<ScheduleSettingsProps> = ({ onClose }) => {
  const { schedule, isLoading, updateSchedule, isUpdating } = useViewingSchedule();

  const [localSettings, setLocalSettings] = useState<ViewingScheduleUpdate>({
    viewingDuration: 30,
    bufferTime: 15,
    minimumNotice: 24,
    advanceBookingDays: 30,
    autoConfirm: true,
    notifyByEmail: true,
    workingDays: [],
  });

  // Initialize local settings when schedule loads
  useEffect(() => {
    if (schedule) {
      setLocalSettings({
        viewingDuration: schedule.viewingDuration,
        bufferTime: schedule.bufferTime,
        minimumNotice: schedule.minimumNotice,
        advanceBookingDays: schedule.advanceBookingDays,
        autoConfirm: schedule.autoConfirm,
        notifyByEmail: schedule.notifyByEmail,
        workingDays: schedule.workingDays,
      });
    }
  }, [schedule]);

  const handleSave = () => {
    updateSchedule(localSettings);
    onClose();
  };

  const toggleDay = (dayId: WorkingDay['day']) => {
    const workingDays = [...(localSettings.workingDays || [])];
    const dayIndex = workingDays.findIndex((d) => d.day === dayId);

    if (dayIndex >= 0) {
      workingDays[dayIndex] = {
        ...workingDays[dayIndex],
        enabled: !workingDays[dayIndex].enabled,
      };
      setLocalSettings({ ...localSettings, workingDays });
    }
  };

  const updateDaySlot = (dayId: WorkingDay['day'], field: 'start' | 'end', value: string) => {
    const workingDays = [...(localSettings.workingDays || [])];
    const dayIndex = workingDays.findIndex((d) => d.day === dayId);

    if (dayIndex >= 0 && workingDays[dayIndex].slots[0]) {
      workingDays[dayIndex].slots[0] = {
        ...workingDays[dayIndex].slots[0],
        [field]: value,
      };
      setLocalSettings({ ...localSettings, workingDays });
    }
  };

  const getDayConfig = (dayId: WorkingDay['day']): WorkingDay | undefined => {
    return localSettings.workingDays?.find((d) => d.day === dayId);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Schedule Settings</h2>
              <p className="text-sm text-gray-500 mt-1">
                Configure your availability for property viewings
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Viewing Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Viewing Duration
            </label>
            <select
              value={localSettings.viewingDuration}
              onChange={(e) => setLocalSettings({ ...localSettings, viewingDuration: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
            </select>
          </div>

          {/* Buffer Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buffer Time Between Viewings
            </label>
            <select
              value={localSettings.bufferTime}
              onChange={(e) => setLocalSettings({ ...localSettings, bufferTime: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>No buffer</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </div>

          {/* Minimum Notice */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Booking Notice
            </label>
            <select
              value={localSettings.minimumNotice}
              onChange={(e) => setLocalSettings({ ...localSettings, minimumNotice: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 hour</option>
              <option value={2}>2 hours</option>
              <option value={4}>4 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How far in advance buyers must book
            </p>
          </div>

          {/* Advance Booking */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Advance Booking Window
            </label>
            <select
              value={localSettings.advanceBookingDays}
              onChange={(e) => setLocalSettings({ ...localSettings, advanceBookingDays: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>1 week</option>
              <option value={14}>2 weeks</option>
              <option value={30}>1 month</option>
              <option value={60}>2 months</option>
              <option value={90}>3 months</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How far in advance buyers can book
            </p>
          </div>

          {/* Working Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Working Hours
            </label>
            <div className="space-y-3">
              {DAYS.map(({ id, label }) => {
                const dayConfig = getDayConfig(id);
                const isEnabled = dayConfig?.enabled ?? false;
                const slot = dayConfig?.slots?.[0];

                return (
                  <div key={id} className="flex items-center gap-4">
                    <label className="flex items-center gap-2 w-28">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => toggleDay(id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                    {isEnabled && (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={slot?.start || '09:00'}
                          onChange={(e) => updateDaySlot(id, 'start', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={slot?.end || '17:00'}
                          onChange={(e) => updateDaySlot(id, 'end', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notifications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Notifications
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localSettings.notifyByEmail}
                  onChange={(e) => setLocalSettings({ ...localSettings, notifyByEmail: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Email notifications for bookings</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localSettings.autoConfirm}
                  onChange={(e) => setLocalSettings({ ...localSettings, autoConfirm: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Automatically confirm bookings</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isUpdating ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleSettings;
