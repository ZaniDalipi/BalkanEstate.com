// Conversation API Client
// Handles all conversation/messaging API calls

import { httpClient } from './httpClient';

export class ConversationApiClient {
  async getConversations(): Promise<any> {
    return await httpClient.get('/conversations', true);
  }

  async getConversationById(id: string): Promise<any> {
    return await httpClient.get(`/conversations/${id}`, true);
  }

  async createConversation(data: {
    propertyId: string;
    buyerId: string;
    sellerId: string;
    initialMessage?: string;
  }): Promise<any> {
    return await httpClient.post('/conversations', data, true);
  }

  async sendMessage(conversationId: string, data: {
    senderId: string;
    text?: string;
    imageUrl?: string;
    encryptedMessage?: string;
    encryptedKeys?: Record<string, string>;
    iv?: string;
  }): Promise<any> {
    return await httpClient.post(`/conversations/${conversationId}/messages`, data, true);
  }

  async markAsRead(conversationId: string): Promise<void> {
    await httpClient.patch(`/conversations/${conversationId}/read`, undefined, true);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await httpClient.delete(`/conversations/${conversationId}`, true);
  }

  async uploadMessageImage(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('image', file);

    return await httpClient.uploadFile('/conversations/upload-image', formData, true);
  }

  async getUnreadCount(): Promise<any> {
    return await httpClient.get('/conversations/unread-count', true);
  }
}

export const conversationApiClient = new ConversationApiClient();
