import { useQuery } from '@tanstack/react-query';
import { conversationKeys } from '../api/conversationKeys';
import * as api from '../../../services/apiService';
import { Conversation } from '../../../types';

/**
 * Hook to get all conversations for current user
 *
 * Features:
 * - Auto-refetch on focus (keep conversations fresh)
 * - Short cache time (conversations change frequently)
 *
 * Usage:
 * ```tsx
 * const { conversations, isLoading, unreadCount } = useConversations();
 * ```
 */
export function useConversations() {
  const {
    data: conversations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: conversationKeys.lists(),
    queryFn: async () => await api.getConversations(),
    staleTime: 30 * 1000, // 30 seconds - conversations should be fresh
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30 * 1000, // Poll every 30 seconds for new messages
    refetchOnWindowFocus: true,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });

  // Calculate unread count
  const unreadCount = conversations.reduce((count: number, conv: Conversation) => {
    return count + (conv.unreadCount || 0);
  }, 0);

  return {
    conversations,
    isLoading,
    error,
    refetch,
    unreadCount,
    isEmpty: !isLoading && conversations.length === 0,
  };
}
