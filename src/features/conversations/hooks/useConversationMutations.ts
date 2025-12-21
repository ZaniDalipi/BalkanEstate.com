import { useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationKeys } from '../api/conversationKeys';
import * as api from '../../../services/apiService';
import { Conversation, Message } from '../../../types';

/**
 * Hook to create new conversation
 *
 * Usage:
 * ```tsx
 * const { createConversation, isLoading } = useCreateConversation();
 * const conversation = await createConversation(propertyId);
 * ```
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (propertyId: string): Promise<Conversation> => {
      return await api.createConversation(propertyId);
    },
    onSuccess: (newConversation) => {
      // Add to conversations list
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      // Cache the new conversation
      queryClient.setQueryData(conversationKeys.detail(newConversation.id), {
        conversation: newConversation,
        messages: [],
      });
    },
  });

  return {
    createConversation: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to send message in conversation
 *
 * Features:
 * - Optimistic updates (instant UI feedback)
 * - Automatic message list update
 * - Rollback on error
 *
 * Usage:
 * ```tsx
 * const { sendMessage, isSending } = useSendMessage();
 * await sendMessage({ conversationId, message });
 * ```
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      conversationId,
      message,
    }: {
      conversationId: string;
      message: Message;
    }): Promise<{ message: Message; securityWarnings?: string[] }> => {
      return await api.sendMessage(conversationId, message);
    },
    onMutate: async ({ conversationId, message }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: conversationKeys.detail(conversationId) });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(conversationKeys.detail(conversationId));

      // Optimistically add message
      queryClient.setQueryData(conversationKeys.detail(conversationId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: [...(old.messages || []), { ...message, status: 'sending' }],
        };
      });

      return { previousData, conversationId };
    },
    onError: (err, { conversationId }, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(conversationKeys.detail(conversationId), context.previousData);
      }
      console.error('Send message error:', err);
    },
    onSuccess: (result, { conversationId }) => {
      // Update with server response
      queryClient.setQueryData(conversationKeys.detail(conversationId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: [...(old.messages || []).filter((m: Message) => m.status !== 'sending'), result.message],
        };
      });

      // Invalidate conversations list (to update last message)
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });

  return {
    sendMessage: mutation.mutateAsync,
    sendMessageSync: mutation.mutate,
    isSending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to upload message image
 *
 * Usage:
 * ```tsx
 * const { uploadImage, isUploading } = useUploadMessageImage();
 * const imageUrl = await uploadImage({ conversationId, imageFile });
 * ```
 */
export function useUploadMessageImage() {
  const mutation = useMutation({
    mutationFn: async ({
      conversationId,
      imageFile,
    }: {
      conversationId: string;
      imageFile: File;
    }): Promise<string> => {
      return await api.uploadMessageImage(conversationId, imageFile);
    },
  });

  return {
    uploadImage: mutation.mutateAsync,
    isUploading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to delete conversation
 *
 * Features:
 * - Optimistic removal from list
 * - Rollback on error
 *
 * Usage:
 * ```tsx
 * const { deleteConversation, isDeleting } = useDeleteConversation();
 * await deleteConversation(conversationId);
 * ```
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (conversationId: string): Promise<void> => {
      await api.deleteConversation(conversationId);
    },
    onMutate: async (conversationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: conversationKeys.lists() });

      // Snapshot previous value
      const previousConversations = queryClient.getQueryData(conversationKeys.lists());

      // Optimistically remove
      queryClient.setQueryData(conversationKeys.lists(), (old: Conversation[] = []) => {
        return old.filter(c => c.id !== conversationId);
      });

      return { previousConversations, conversationId };
    },
    onError: (err, conversationId, context) => {
      // Rollback on error
      if (context?.previousConversations) {
        queryClient.setQueryData(conversationKeys.lists(), context.previousConversations);
      }
      console.error('Delete conversation error:', err);
    },
    onSuccess: (_, conversationId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: conversationKeys.detail(conversationId) });
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });

  return {
    deleteConversation: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to mark conversation as read
 *
 * Usage:
 * ```tsx
 * const { markAsRead } = useMarkConversationAsRead();
 * await markAsRead(conversationId);
 * ```
 */
export function useMarkConversationAsRead() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (conversationId: string): Promise<void> => {
      await api.markConversationAsRead(conversationId);
    },
    onSuccess: (_, conversationId) => {
      // Update unread count in conversation list
      queryClient.setQueryData(conversationKeys.lists(), (old: Conversation[] = []) => {
        return old.map(c =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        );
      });
    },
  });

  return {
    markAsRead: mutation.mutateAsync,
    isMarking: mutation.isPending,
  };
}
