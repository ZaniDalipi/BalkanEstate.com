// Conversation Mapper
// Converts between API DTOs and domain Conversation entity

import { Conversation } from '../../domain/entities/Conversation';
import { PropertyMapper } from './PropertyMapper';

export class ConversationMapper {
  static toDomain(dto: any): Conversation {
    return Conversation.fromDTO({
      id: dto._id || dto.id,
      propertyId: dto.propertyId,
      buyerId: dto.buyerId,
      sellerId: dto.sellerId,
      messages: dto.messages || [],
      createdAt: dto.createdAt,
      isRead: dto.isRead || false,
      buyerUnreadCount: dto.buyerUnreadCount || 0,
      sellerUnreadCount: dto.sellerUnreadCount || 0,
      property: dto.property ? PropertyMapper.toDomain(dto.property) : undefined,
      buyer: dto.buyer,
      seller: dto.seller,
      participants: dto.participants,
    });
  }

  static toDTO(conversation: Conversation): any {
    return conversation.toDTO();
  }
}
