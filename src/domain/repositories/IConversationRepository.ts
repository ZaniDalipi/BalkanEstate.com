// Domain Repository Interface: IConversationRepository
// Defines conversation/messaging data operations contract

import { Conversation, Message } from '../entities/Conversation';

export interface CreateConversationDTO {
  propertyId: string;
  buyerId: string;
  sellerId: string;
  initialMessage?: string;
}

export interface SendMessageDTO {
  conversationId: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  encryptedMessage?: string;
  encryptedKeys?: Record<string, string>;
  iv?: string;
}

/**
 * Repository interface for conversation/messaging operations
 */
export interface IConversationRepository {
  /**
   * Get all conversations for a user
   */
  getConversations(userId: string): Promise<Conversation[]>;

  /**
   * Get a single conversation by ID
   */
  getConversationById(id: string): Promise<Conversation>;

  /**
   * Create a new conversation
   */
  createConversation(data: CreateConversationDTO): Promise<Conversation>;

  /**
   * Send a message in a conversation
   */
  sendMessage(data: SendMessageDTO): Promise<Message>;

  /**
   * Mark conversation as read
   */
  markAsRead(conversationId: string, userId: string): Promise<void>;

  /**
   * Delete a conversation
   */
  deleteConversation(conversationId: string): Promise<void>;

  /**
   * Upload image for message
   */
  uploadMessageImage(file: File): Promise<string>;

  /**
   * Get unread message count for user
   */
  getUnreadCount(userId: string): Promise<number>;

  /**
   * Subscribe to real-time conversation updates
   */
  subscribeToConversation(
    conversationId: string,
    onMessage: (message: Message) => void
  ): () => void;

  /**
   * Subscribe to all user's conversations for real-time updates
   */
  subscribeToUserConversations(
    userId: string,
    onUpdate: (conversation: Conversation) => void
  ): () => void;
}
