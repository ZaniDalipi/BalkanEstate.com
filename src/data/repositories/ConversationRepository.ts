// Conversation Repository Implementation
// Implements IConversationRepository using ConversationApiClient

import {
  IConversationRepository,
  CreateConversationDTO,
  SendMessageDTO,
} from '../../domain/repositories/IConversationRepository';
import { Conversation, Message } from '../../domain/entities/Conversation';
import { conversationApiClient } from '../api/ConversationApiClient';
import { ConversationMapper } from '../mappers/ConversationMapper';

export class ConversationRepository implements IConversationRepository {
  async getConversations(userId: string): Promise<Conversation[]> {
    const response = await conversationApiClient.getConversations();
    return response.conversations.map((dto: any) => ConversationMapper.toDomain(dto));
  }

  async getConversationById(id: string): Promise<Conversation> {
    const response = await conversationApiClient.getConversationById(id);
    return ConversationMapper.toDomain(response.conversation);
  }

  async createConversation(data: CreateConversationDTO): Promise<Conversation> {
    const response = await conversationApiClient.createConversation(data);
    return ConversationMapper.toDomain(response.conversation);
  }

  async sendMessage(data: SendMessageDTO): Promise<Message> {
    const { conversationId, ...messageData } = data;
    const response = await conversationApiClient.sendMessage(conversationId, messageData);
    return response.message;
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await conversationApiClient.markAsRead(conversationId);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await conversationApiClient.deleteConversation(conversationId);
  }

  async uploadMessageImage(file: File): Promise<string> {
    const response = await conversationApiClient.uploadMessageImage(file);
    return response.imageUrl;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const response = await conversationApiClient.getUnreadCount();
    return response.unreadCount || 0;
  }

  subscribeToConversation(
    conversationId: string,
    onMessage: (message: Message) => void
  ): () => void {
    // WebSocket subscriptions are handled by the Socket.io connection in useChat hook.
    // This repository method is not needed as real-time updates flow through Socket.io events
    // (e.g., 'new_message', 'message_sent') managed at the hook/service layer.
    return () => {}; // no-op cleanup
  }

  subscribeToUserConversations(
    userId: string,
    onUpdate: (conversation: Conversation) => void
  ): () => void {
    // WebSocket subscriptions for conversation list updates are handled by Socket.io
    // in the chat hooks layer. Real-time conversation updates (new messages, read receipts)
    // flow through Socket.io events, not through the repository pattern.
    return () => {}; // no-op cleanup
  }
}

export const conversationRepository = new ConversationRepository();
