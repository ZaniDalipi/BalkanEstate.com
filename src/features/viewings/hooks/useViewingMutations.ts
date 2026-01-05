// Viewing Mutations Hook
// Provides all mutation functions for viewing management

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { viewingKeys } from '../api/viewingKeys';
import * as viewingApi from '../api/viewingApi';
import type { BookViewingParams, RescheduleParams, CancelParams, ViewingFeedback } from '../types';

/**
 * Hook for viewing mutations (book, reschedule, cancel, etc.)
 *
 * Usage:
 * ```tsx
 * const {
 *   bookViewing,
 *   rescheduleViewing,
 *   cancelViewing,
 *   completeViewing,
 *   isBooking,
 * } = useViewingMutations();
 *
 * // Book a viewing
 * await bookViewing({ propertyId, startTime: date.toISOString() });
 *
 * // Cancel a viewing
 * await cancelViewing({ viewingId, reason: 'Schedule conflict' });
 * ```
 */
export function useViewingMutations() {
  const queryClient = useQueryClient();

  // Invalidate all viewing queries
  const invalidateViewings = () => {
    queryClient.invalidateQueries({ queryKey: viewingKeys.all });
  };

  // Book viewing mutation
  const bookMutation = useMutation({
    mutationFn: (params: BookViewingParams) => viewingApi.bookViewing(params),
    onSuccess: () => {
      invalidateViewings();
    },
  });

  // Reschedule viewing mutation
  const rescheduleMutation = useMutation({
    mutationFn: (params: RescheduleParams) => viewingApi.rescheduleViewing(params),
    onSuccess: () => {
      invalidateViewings();
    },
  });

  // Cancel viewing mutation
  const cancelMutation = useMutation({
    mutationFn: (params: CancelParams) => viewingApi.cancelViewing(params),
    onSuccess: () => {
      invalidateViewings();
    },
  });

  // Complete viewing mutation
  const completeMutation = useMutation({
    mutationFn: ({ viewingId, agentNotes }: { viewingId: string; agentNotes?: string }) =>
      viewingApi.completeViewing(viewingId, agentNotes),
    onSuccess: () => {
      invalidateViewings();
    },
  });

  // Mark no-show mutation
  const noShowMutation = useMutation({
    mutationFn: (viewingId: string) => viewingApi.markNoShow(viewingId),
    onSuccess: () => {
      invalidateViewings();
    },
  });

  // Add feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: ({ viewingId, feedback }: { viewingId: string; feedback: ViewingFeedback }) =>
      viewingApi.addViewingFeedback(viewingId, feedback),
    onSuccess: () => {
      invalidateViewings();
    },
  });

  return {
    // Book
    bookViewing: bookMutation.mutateAsync,
    isBooking: bookMutation.isPending,
    bookError: bookMutation.error,

    // Reschedule
    rescheduleViewing: rescheduleMutation.mutateAsync,
    isRescheduling: rescheduleMutation.isPending,
    rescheduleError: rescheduleMutation.error,

    // Cancel
    cancelViewing: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
    cancelError: cancelMutation.error,

    // Complete
    completeViewing: completeMutation.mutateAsync,
    isCompleting: completeMutation.isPending,
    completeError: completeMutation.error,

    // No-show
    markNoShow: noShowMutation.mutateAsync,
    isMarkingNoShow: noShowMutation.isPending,

    // Feedback
    addFeedback: feedbackMutation.mutateAsync,
    isAddingFeedback: feedbackMutation.isPending,
  };
}
