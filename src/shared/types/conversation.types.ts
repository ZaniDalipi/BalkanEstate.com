// Conversation/Messaging domain types

import { Property } from './property.types';

export interface Message {
  id: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  // E2E Encryption fields
  encryptedMessage?: string;
  encryptedKeys?: Record<string, string>;
  iv?: string;
  timestamp: number;
  isRead: boolean;
}

export interface ConversationParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
  agencyName?: string;
}

export interface Conversation {
  id: string;
  propertyId: string;
  property?: Property;
  buyerId: string;
  sellerId: string;
  buyer?: ConversationParticipant;
  seller?: ConversationParticipant;
  participants?: string[];
  messages: Message[];
  lastMessage?: Message;
  createdAt: number;
  isRead: boolean;
  buyerUnreadCount: number;
  sellerUnreadCount: number;
  unreadCount?: number; // Generic unread count for current user
  status?: 'active' | 'archived' | 'deleted';
}
