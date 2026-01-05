// Viewing types for the property viewing scheduler feature

export type ViewingStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';

export interface TimeSlot {
  start: string; // HH:mm format
  end: string;
}

export interface WorkingDay {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  enabled: boolean;
  slots: TimeSlot[];
}

export interface BlockedDate {
  date: string;
  reason?: string;
}

export interface ViewingSchedule {
  _id: string;
  userId: string;
  workingDays: WorkingDay[];
  timezone: string;
  viewingDuration: number;
  bufferTime: number;
  maxViewingsPerDay: number;
  advanceBookingDays: number;
  minimumNotice: number;
  blockedDates: BlockedDate[];
  autoConfirm: boolean;
  requireApproval: boolean;
  notifyByEmail: boolean;
  notifyBySms: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ViewingScheduleUpdate {
  workingDays?: WorkingDay[];
  timezone?: string;
  viewingDuration?: number;
  bufferTime?: number;
  maxViewingsPerDay?: number;
  advanceBookingDays?: number;
  minimumNotice?: number;
  autoConfirm?: boolean;
  requireApproval?: boolean;
  notifyByEmail?: boolean;
  notifyBySms?: boolean;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  formatted: string;
}

export interface ViewingProperty {
  _id: string;
  title?: string;
  address: string;
  city: string;
  imageUrl?: string;
  price?: number;
}

export interface ViewingUser {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
}

export interface ViewingFeedback {
  rating?: number;
  interested: boolean;
  comments?: string;
}

export interface Viewing {
  _id: string;
  propertyId: ViewingProperty;
  agentId: ViewingUser;
  buyerId: ViewingUser;
  startTime: string;
  endTime: string;
  status: ViewingStatus;
  notes?: string;
  agentNotes?: string;
  meetingLocation?: string;
  cancellationReason?: string;
  cancelledBy?: 'agent' | 'buyer';
  rescheduledFrom?: string;
  reminder24hSent: boolean;
  reminder1hSent: boolean;
  buyerFeedback?: ViewingFeedback;
  createdAt: string;
  updatedAt: string;
}

export interface BookViewingParams {
  propertyId: string;
  startTime: string;
  notes?: string;
}

export interface RescheduleParams {
  viewingId: string;
  newStartTime: string;
  reason?: string;
}

export interface CancelParams {
  viewingId: string;
  reason?: string;
}

export interface GetViewingsOptions {
  role?: 'agent' | 'buyer' | 'all';
  status?: ViewingStatus[];
  upcoming?: boolean;
  limit?: number;
}

export interface CalendarViewParams {
  startDate: string;
  endDate: string;
}
