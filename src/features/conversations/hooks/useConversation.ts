import { useQuery } from '@tanstack/react-query';
import { conversationKeys } from '../api/conversationKeys';
import * as api from '../../../services/apiService';
import { Conversation, Message } from '../../../types';

/**
 * Hook to get conversation details with messages
 *
 * Features:
 * - Auto-refetch for real-time updates
 * - Polling for new messages
 * - Combined conversation + messages data
 *
 * Usage:
 * ```tsx
 * const { conversation, messages, isLoading } = useConversation(conversationId);
 * ```
 */
export function useConversation(conversationId: string | null | undefined) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: conversationKeys.detail(conversationId || ''),
    queryFn: async () => {
      if (!conversationId) throw new Error('Conversation ID required');
      return await api.getConversation(conversationId);
    },
    enabled: !!conversationId,
    staleTime: 10 * 1000, // 10 seconds - messages should be very fresh
    gcTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 15 * 1000, // Poll every 15 seconds
    refetchOnWindowFocus: true,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 3;
    },
  });

  return {
    conversation: data?.conversation ?? null,
    messages: data?.messages ?? [],
    isLoading,
    error,
    refetch,
    isNotFound: error?.response?.status === 404,
  };
}

/**
 * Hook to get conversation public keys (for encryption)
 *
 * Usage:
 * ```tsx
 * const { publicKeys, isLoading } = useConversationPublicKeys(conversationId);
 * ```
 */
export function useConversationPublicKeys(conversationId: string | null) {
  const {
    data: publicKeys = {},
    isLoading,
    error,
  } = useQuery({
    queryKey: conversationKeys.publicKeys(conversationId || ''),
    queryFn: async () => {
      if (!conversationId) throw new Error('Conversation ID required');
      return await api.getConversationPublicKeys(conversationId);
    },
    enabled: !!conversationId,
    staleTime: 5 * 60 * 1000, // 5 minutes - public keys don't change often
    gcTime: 10 * 60 * 1000,
  });

  return { publicKeys, isLoading, error };
}
