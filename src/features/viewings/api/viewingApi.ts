// Viewing API module
// Handles all viewing-related API calls

import { apiRequest } from '@/src/shared/api';
import type {
  Viewing,
  ViewingSchedule,
  ViewingScheduleUpdate,
  AvailableSlot,
  BookViewingParams,
  RescheduleParams,
  CancelParams,
  GetViewingsOptions,
  ViewingFeedback,
} from '../types';

// --- Schedule Management ---

export const getSchedule = async (): Promise<ViewingSchedule> => {
  const response = await apiRequest<{ schedule: ViewingSchedule }>('/viewings/schedule', {
    requiresAuth: true,
  });
  return response.schedule;
};

export const updateSchedule = async (updates: ViewingScheduleUpdate): Promise<ViewingSchedule> => {
  const response = await apiRequest<{ schedule: ViewingSchedule }>('/viewings/schedule', {
    method: 'PUT',
    body: updates,
    requiresAuth: true,
  });
  return response.schedule;
};

export const addBlockedDate = async (date: string, reason?: string): Promise<ViewingSchedule> => {
  const response = await apiRequest<{ schedule: ViewingSchedule }>(
    '/viewings/schedule/blocked-dates',
    {
      method: 'POST',
      body: { date, reason },
      requiresAuth: true,
    }
  );
  return response.schedule;
};

export const removeBlockedDate = async (date: string): Promise<ViewingSchedule> => {
  const response = await apiRequest<{ schedule: ViewingSchedule }>(
    '/viewings/schedule/blocked-dates',
    {
      method: 'DELETE',
      body: { date },
      requiresAuth: true,
    }
  );
  return response.schedule;
};

// --- Available Slots ---

export const getAvailableSlots = async (
  propertyId: string,
  date: string
): Promise<AvailableSlot[]> => {
  const response = await apiRequest<{ slots: AvailableSlot[] }>(
    `/viewings/available/${propertyId}?date=${encodeURIComponent(date)}`
  );
  return response.slots;
};

// --- Viewing Management ---

export const bookViewing = async (params: BookViewingParams): Promise<Viewing> => {
  const response = await apiRequest<{ viewing: Viewing }>('/viewings/book', {
    method: 'POST',
    body: params,
    requiresAuth: true,
  });
  return response.viewing;
};

export const getMyViewings = async (options: GetViewingsOptions = {}): Promise<Viewing[]> => {
  const params = new URLSearchParams();
  if (options.role) params.append('role', options.role);
  if (options.status?.length) params.append('status', options.status.join(','));
  if (options.upcoming) params.append('upcoming', 'true');
  if (options.limit) params.append('limit', options.limit.toString());

  const queryString = params.toString();
  const endpoint = `/viewings${queryString ? `?${queryString}` : ''}`;

  const response = await apiRequest<{ viewings: Viewing[] }>(endpoint, {
    requiresAuth: true,
  });
  return response.viewings;
};

export const getViewing = async (id: string): Promise<Viewing> => {
  const response = await apiRequest<{ viewing: Viewing }>(`/viewings/${id}`, {
    requiresAuth: true,
  });
  return response.viewing;
};

export const rescheduleViewing = async (params: RescheduleParams): Promise<Viewing> => {
  const { viewingId, ...body } = params;
  const response = await apiRequest<{ viewing: Viewing }>(`/viewings/${viewingId}/reschedule`, {
    method: 'PUT',
    body,
    requiresAuth: true,
  });
  return response.viewing;
};

export const cancelViewing = async (params: CancelParams): Promise<Viewing> => {
  const { viewingId, reason } = params;
  const response = await apiRequest<{ viewing: Viewing }>(`/viewings/${viewingId}/cancel`, {
    method: 'PUT',
    body: { reason },
    requiresAuth: true,
  });
  return response.viewing;
};

export const completeViewing = async (
  viewingId: string,
  agentNotes?: string
): Promise<Viewing> => {
  const response = await apiRequest<{ viewing: Viewing }>(`/viewings/${viewingId}/complete`, {
    method: 'PUT',
    body: { agentNotes },
    requiresAuth: true,
  });
  return response.viewing;
};

export const markNoShow = async (viewingId: string): Promise<Viewing> => {
  const response = await apiRequest<{ viewing: Viewing }>(`/viewings/${viewingId}/no-show`, {
    method: 'PUT',
    requiresAuth: true,
  });
  return response.viewing;
};

export const addViewingFeedback = async (
  viewingId: string,
  feedback: ViewingFeedback
): Promise<Viewing> => {
  const response = await apiRequest<{ viewing: Viewing }>(`/viewings/${viewingId}/feedback`, {
    method: 'POST',
    body: feedback,
    requiresAuth: true,
  });
  return response.viewing;
};

// --- Property Viewings ---

export const getPropertyViewings = async (
  propertyId: string,
  options: { status?: string[]; upcoming?: boolean } = {}
): Promise<Viewing[]> => {
  const params = new URLSearchParams();
  if (options.status?.length) params.append('status', options.status.join(','));
  if (options.upcoming) params.append('upcoming', 'true');

  const queryString = params.toString();
  const endpoint = `/viewings/property/${propertyId}${queryString ? `?${queryString}` : ''}`;

  const response = await apiRequest<{ viewings: Viewing[] }>(endpoint, {
    requiresAuth: true,
  });
  return response.viewings;
};

// --- Calendar View ---

export const getCalendar = async (
  startDate: string,
  endDate: string
): Promise<{ viewings: Viewing[]; schedule: ViewingSchedule }> => {
  const params = new URLSearchParams({
    startDate,
    endDate,
  });

  const response = await apiRequest<{ viewings: Viewing[]; schedule: ViewingSchedule }>(
    `/viewings/calendar?${params.toString()}`,
    {
      requiresAuth: true,
    }
  );
  return response;
};
