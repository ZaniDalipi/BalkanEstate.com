// Conversations API module
// Handles all messaging/conversation-related API calls

import { apiRequest, uploadRequest } from '@/src/shared/api';
import { API_URL } from '@/src/shared/api/config';
import { tokenService } from '@/src/shared/api/tokenService';
import type { Conversation, Message, Property } from '@/src/shared/types';
import { transformBackendProperty } from '@/src/features/properties/api/propertyApi';

// --- Transformers ---

function transformBackendMessage(backendMsg: any): Message {
  const sender = backendMsg.senderId || null;

  return {
    id: backendMsg._id,
    senderId: sender ? (sender._id || sender) : null,
    text: backendMsg.text,
    imageUrl: backendMsg.imageUrl,
    encryptedMessage: backendMsg.encryptedMessage,
    encryptedKeys: backendMsg.encryptedKeys,
    iv: backendMsg.iv,
    timestamp: new Date(backendMsg.createdAt).getTime(),
    isRead: backendMsg.isRead,
  };
}

function transformBackendConversation(backendConv: any): Conversation {
  const property = backendConv.propertyId || null;
  const buyer = backendConv.buyerId || null;
  const seller = backendConv.sellerId || null;

  return {
    id: backendConv._id,
    propertyId: property ? (property._id || property) : null,
    property: property && property._id ? transformBackendProperty(property) : undefined,
    buyerId: buyer ? (buyer._id || buyer) : null,
    sellerId: seller ? (seller._id || seller) : null,
    buyer: buyer && buyer._id
      ? {
          id: buyer._id,
          name: buyer.name,
          avatarUrl: buyer.avatarUrl,
        }
      : undefined,
    seller: seller && seller._id
      ? {
          id: seller._id,
          name: seller.name,
          avatarUrl: seller.avatarUrl,
          role: seller.role,
          agencyName: seller.agencyName,
        }
      : undefined,
    messages: [],
    lastMessage: backendConv.lastMessage
      ? transformBackendMessage(backendConv.lastMessage)
      : undefined,
    createdAt: new Date(backendConv.createdAt).getTime(),
    isRead: backendConv.buyerUnreadCount === 0 && backendConv.sellerUnreadCount === 0,
    buyerUnreadCount: backendConv.buyerUnreadCount || 0,
    sellerUnreadCount: backendConv.sellerUnreadCount || 0,
  };
}

// --- API Functions ---

export const getConversations = async (): Promise<Conversation[]> => {
  try {
    const response = await apiRequest<{ conversations: any[] }>('/conversations', {
      requiresAuth: true,
    });

    const validConversations = response.conversations?.filter(
      (conv: any) => conv && conv._id
    ) || [];

    return validConversations.map(transformBackendConversation);
  } catch (error) {
    // Error removed
    return [];
  }
};

export const getConversation = async (
  conversationId: string
): Promise<{ conversation: Conversation; messages: Message[] }> => {
  const response = await apiRequest<{ conversation: any; messages: any[] }>(
    `/conversations/${conversationId}`,
    { requiresAuth: true }
  );

  return {
    conversation: transformBackendConversation(response.conversation),
    messages: response.messages.map(transformBackendMessage),
  };
};

export const createConversation = async (propertyId: string): Promise<Conversation> => {
  const response = await apiRequest<{ conversation: any }>('/conversations', {
    method: 'POST',
    body: { propertyId },
    requiresAuth: true,
  });

  return transformBackendConversation(response.conversation);
};

export const deleteConversation = async (conversationId: string): Promise<void> => {
  await apiRequest(`/conversations/${conversationId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

export const sendMessage = async (
  conversationId: string,
  message: Partial<Message>
): Promise<{ message: Message; securityWarnings?: string[] }> => {
  const body: any = {};

  if (message.text) body.text = message.text;
  if (message.imageUrl) body.imageUrl = message.imageUrl;
  if (message.encryptedMessage) body.encryptedMessage = message.encryptedMessage;
  if (message.encryptedKeys) body.encryptedKeys = message.encryptedKeys;
  if (message.iv) body.iv = message.iv;

  const response = await apiRequest<{ message: any; securityWarnings?: string[] }>(
    `/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body,
      requiresAuth: true,
    }
  );

  return {
    message: transformBackendMessage(response.message),
    securityWarnings: response.securityWarnings,
  };
};

export const uploadMessageImage = async (
  conversationId: string,
  imageFile: File
): Promise<string> => {
  const formData = new FormData();
  formData.append('image', imageFile);

  const token = tokenService.getAccessToken();
  const response = await fetch(`${API_URL}/conversations/${conversationId}/upload-image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }

  const data = await response.json();
  return data.imageUrl;
};

export const getSecurityWarning = async (): Promise<string> => {
  const response = await apiRequest<{ warning: string }>('/conversations/security-warning');
  return response.warning;
};

export const getConversationPublicKeys = async (
  conversationId: string
): Promise<Record<string, string | null>> => {
  const response = await apiRequest<{ publicKeys: Record<string, string | null> }>(
    `/conversations/${conversationId}/public-keys`,
    { requiresAuth: true }
  );
  return response.publicKeys;
};

export const markConversationAsRead = async (conversationId: string): Promise<void> => {
  await apiRequest(`/conversations/${conversationId}/read`, {
    method: 'PATCH',
    requiresAuth: true,
  });
};
