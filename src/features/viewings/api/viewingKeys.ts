// React Query keys for viewing feature
// Following the established pattern from other features

export const viewingKeys = {
  all: ['viewings'] as const,
  lists: () => [...viewingKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...viewingKeys.lists(), filters] as const,
  details: () => [...viewingKeys.all, 'detail'] as const,
  detail: (id: string) => [...viewingKeys.details(), id] as const,
  schedule: () => [...viewingKeys.all, 'schedule'] as const,
  availableSlots: (propertyId: string, date: string) =>
    [...viewingKeys.all, 'slots', propertyId, date] as const,
  calendar: (startDate: string, endDate: string) =>
    [...viewingKeys.all, 'calendar', startDate, endDate] as const,
  propertyViewings: (propertyId: string) =>
    [...viewingKeys.all, 'property', propertyId] as const,
};
