// Conversation Query Keys Factory
// Centralized query key management for conversation-related queries

export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
  messages: (conversationId: string) => [...conversationKeys.detail(conversationId), 'messages'] as const,
  publicKeys: (conversationId: string) => [...conversationKeys.detail(conversationId), 'public-keys'] as const,
} as const;
