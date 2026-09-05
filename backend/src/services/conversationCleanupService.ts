import { deleteObject } from './bunnyStorageService';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import { apiLogger } from '../utils/logger';

/**
 * Delete expired conversations (older than 30 days from last message)
 * Also deletes all associated messages and their stored images
 */
export const cleanupExpiredConversations = async (): Promise<{
  deletedConversations: number;
  deletedMessages: number;
  deletedImages: number;
}> => {
  const now = new Date();

  apiLogger.info(`🧹 Starting conversation cleanup... (${now.toISOString()})`);

  try {
    // Find all expired conversations
    const expiredConversations = await Conversation.find({
      expiresAt: { $lt: now }, // expiresAt is less than now
    });

    if (expiredConversations.length === 0) {
      apiLogger.info('✨ No expired conversations to clean up');
      return {
        deletedConversations: 0,
        deletedMessages: 0,
        deletedImages: 0,
      };
    }

    apiLogger.info(`📋 Found ${expiredConversations.length} expired conversations to delete`);

    let totalDeletedMessages = 0;
    let totalDeletedImages = 0;

    // Process each expired conversation
    for (const conversation of expiredConversations) {
      const conversationId = conversation._id;

      apiLogger.info(
        `🗑️  Processing conversation ${conversationId} (expired: ${conversation.expiresAt.toISOString()})`
      );

      // Get all messages with images for this conversation
      const messagesWithImages = await Message.find({
        conversationId,
        imagePublicId: { $exists: true, $ne: null },
      }).select('imagePublicId');

      // Delete images from storage
      if (messagesWithImages.length > 0) {
        apiLogger.info(`  📸 Deleting ${messagesWithImages.length} images from storage...`);

        const imageDeletePromises = messagesWithImages.map(async (message) => {
          try {
            await deleteObject(message.imagePublicId!);
            apiLogger.info(`    ✅ Deleted: ${message.imagePublicId}`);
            return true;
          } catch (error) {
            apiLogger.error(`    ❌ Failed to delete ${message.imagePublicId}:`, error);
            return false;
          }
        });

        const results = await Promise.all(imageDeletePromises);
        const successfulDeletes = results.filter((r) => r).length;
        totalDeletedImages += successfulDeletes;

        apiLogger.info(`  ✅ Deleted ${successfulDeletes}/${messagesWithImages.length} images`);
      }

      // Count and delete all messages for this conversation
      const messageCount = await Message.countDocuments({ conversationId });
      await Message.deleteMany({ conversationId });
      totalDeletedMessages += messageCount;

      apiLogger.info(`  ✅ Deleted ${messageCount} messages`);

      // Delete the conversation itself
      await Conversation.findByIdAndDelete(conversationId);

      apiLogger.info(`  ✅ Deleted conversation ${conversationId}`);
    }

    // Try to delete the now-empty folders (optional, may not always work)
    apiLogger.info('🧹 Cleanup complete!');
    apiLogger.info(`  📊 Summary:`);
    apiLogger.info(`    - Conversations deleted: ${expiredConversations.length}`);
    apiLogger.info(`    - Messages deleted: ${totalDeletedMessages}`);
    apiLogger.info(`    - Images deleted: ${totalDeletedImages}`);

    return {
      deletedConversations: expiredConversations.length,
      deletedMessages: totalDeletedMessages,
      deletedImages: totalDeletedImages,
    };
  } catch (error) {
    apiLogger.error('❌ Error during conversation cleanup:', error);
    throw error;
  }
};

/**
 * Get statistics about conversations that will expire soon
 */
export const getExpirationStats = async (): Promise<{
  expiredCount: number;
  expiringSoonCount: number; // Expiring within 7 days
  totalCount: number;
}> => {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [expiredCount, expiringSoonCount, totalCount] = await Promise.all([
    Conversation.countDocuments({ expiresAt: { $lt: now } }),
    Conversation.countDocuments({
      expiresAt: { $gte: now, $lt: sevenDaysFromNow },
    }),
    Conversation.countDocuments(),
  ]);

  return {
    expiredCount,
    expiringSoonCount,
    totalCount,
  };
};
