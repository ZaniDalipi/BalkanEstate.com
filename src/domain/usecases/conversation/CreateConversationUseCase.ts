// Use Case: Create Conversation
// Single responsibility: Create a new conversation between buyer and seller

import { Conversation } from '../../entities/Conversation';
import { IConversationRepository, CreateConversationDTO } from '../../repositories/IConversationRepository';

export class CreateConversationUseCase {
  constructor(private conversationRepository: IConversationRepository) {}

  async execute(data: CreateConversationDTO): Promise<Conversation> {
    // Business logic validation
    if (!data.propertyId) {
      throw new Error('Property ID is required');
    }

    if (!data.buyerId || !data.sellerId) {
      throw new Error('Buyer and seller IDs are required');
    }

    if (data.buyerId === data.sellerId) {
      throw new Error('Buyer and seller cannot be the same user');
    }

    // Delegate to repository
    return await this.conversationRepository.createConversation(data);
  }
}
