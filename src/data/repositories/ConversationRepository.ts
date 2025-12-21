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
    // TODO: Implement WebSocket subscription
    // This will be implemented when integrating with existing socketService
    console.warn('WebSocket subscription not yet implemented');
    return () => {};
  }

  subscribeToUserConversations(
    userId: string,
    onUpdate: (conversation: Conversation) => void
  ): () => void {
    // TODO: Implement WebSocket subscription
    // This will be implemented when integrating with existing socketService
    console.warn('WebSocket subscription not yet implemented');
    return () => {};
  }
}

export const conversationRepository = new ConversationRepository();
