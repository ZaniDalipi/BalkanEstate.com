// Use Case: Send Message
// Single responsibility: Send a message in a conversation

import { Message } from '../../entities/Conversation';
import { IConversationRepository, SendMessageDTO } from '../../repositories/IConversationRepository';

export class SendMessageUseCase {
  constructor(private conversationRepository: IConversationRepository) {}

  async execute(data: SendMessageDTO): Promise<Message> {
    // Business logic validation
    if (!data.conversationId) {
      throw new Error('Conversation ID is required');
    }

    if (!data.senderId) {
      throw new Error('Sender ID is required');
    }

    // Must have either text, image, or encrypted message
    if (!data.text && !data.imageUrl && !data.encryptedMessage) {
      throw new Error('Message must contain text, image, or encrypted content');
    }

    // If encrypted, must have keys and IV
    if (data.encryptedMessage && (!data.encryptedKeys || !data.iv)) {
      throw new Error('Encrypted messages must include encryption keys and IV');
    }

    // Validate text length if provided
    if (data.text && data.text.length > 5000) {
      throw new Error('Message text cannot exceed 5000 characters');
    }

    // Delegate to repository
    return await this.conversationRepository.sendMessage(data);
  }
}
