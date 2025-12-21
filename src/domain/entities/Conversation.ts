// Domain Entity: Conversation
// Pure TypeScript - No framework dependencies

import { Property } from './Property';

export interface Message {
  id: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  // E2E Encryption fields
  encryptedMessage?: string;
  encryptedKeys?: Record<string, string>; // userId -> encrypted AES key
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

export class Conversation {
  constructor(
    public readonly id: string,
    public readonly propertyId: string,
    public readonly buyerId: string,
    public readonly sellerId: string,
    public readonly messages: Message[],
    public readonly createdAt: number,
    public readonly isRead: boolean,
    public readonly buyerUnreadCount: number,
    public readonly sellerUnreadCount: number,
    public readonly property?: Property,
    public readonly buyer?: ConversationParticipant,
    public readonly seller?: ConversationParticipant,
    public readonly participants?: string[]
  ) {}

  // Business logic methods

  get lastMessage(): Message | undefined {
    if (this.messages.length === 0) return undefined;
    return this.messages[this.messages.length - 1];
  }

  get lastMessageText(): string {
    const last = this.lastMessage;
    if (!last) return 'No messages yet';
    if (last.imageUrl) return '📷 Image';
    if (last.encryptedMessage) return '🔒 Encrypted message';
    return last.text || '';
  }

  get lastMessageTime(): number {
    return this.lastMessage?.timestamp || this.createdAt;
  }

  get totalMessages(): number {
    return this.messages.length;
  }

  hasUnreadMessages(currentUserId: string): boolean {
    if (currentUserId === this.buyerId) {
      return this.buyerUnreadCount > 0;
    }
    if (currentUserId === this.sellerId) {
      return this.sellerUnreadCount > 0;
    }
    return false;
  }

  getUnreadCount(currentUserId: string): number {
    if (currentUserId === this.buyerId) {
      return this.buyerUnreadCount;
    }
    if (currentUserId === this.sellerId) {
      return this.sellerUnreadCount;
    }
    return 0;
  }

  getOtherParticipant(currentUserId: string): ConversationParticipant | null {
    if (currentUserId === this.buyerId) {
      return this.seller || null;
    }
    if (currentUserId === this.sellerId) {
      return this.buyer || null;
    }
    return null;
  }

  getMessagesBySender(senderId: string): Message[] {
    return this.messages.filter(msg => msg.senderId === senderId);
  }

  getUnreadMessages(currentUserId: string): Message[] {
    return this.messages.filter(msg =>
      msg.senderId !== currentUserId && !msg.isRead
    );
  }

  isParticipant(userId: string): boolean {
    return userId === this.buyerId || userId === this.sellerId;
  }

  get conversationAge(): number {
    return Date.now() - this.createdAt;
  }

  get conversationAgeDays(): number {
    return Math.floor(this.conversationAge / (1000 * 60 * 60 * 24));
  }

  isActive(inactiveDaysThreshold: number = 7): boolean {
    const daysSinceLastMessage = Math.floor(
      (Date.now() - this.lastMessageTime) / (1000 * 60 * 60 * 24)
    );
    return daysSinceLastMessage < inactiveDaysThreshold;
  }

  hasEncryptedMessages(): boolean {
    return this.messages.some(msg => !!msg.encryptedMessage);
  }

  // Factory method
  static fromDTO(dto: any): Conversation {
    return new Conversation(
      dto.id,
      dto.propertyId,
      dto.buyerId,
      dto.sellerId,
      dto.messages || [],
      dto.createdAt,
      dto.isRead,
      dto.buyerUnreadCount || 0,
      dto.sellerUnreadCount || 0,
      dto.property ? Property.fromDTO(dto.property) : undefined,
      dto.buyer,
      dto.seller,
      dto.participants
    );
  }

  toDTO(): any {
    return {
      id: this.id,
      propertyId: this.propertyId,
      buyerId: this.buyerId,
      sellerId: this.sellerId,
      messages: this.messages,
      createdAt: this.createdAt,
      isRead: this.isRead,
      buyerUnreadCount: this.buyerUnreadCount,
      sellerUnreadCount: this.sellerUnreadCount,
      property: this.property?.toDTO(),
      buyer: this.buyer,
      seller: this.seller,
      participants: this.participants,
    };
  }
}
