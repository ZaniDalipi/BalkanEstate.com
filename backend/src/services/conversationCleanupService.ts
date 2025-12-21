import Conversation from '../models/Conversation';
import Message from '../models/Message';
import cloudinary from '../config/cloudinary';

/**
 * Delete expired conversations (older than 30 days from last message)
 * Also deletes all associated messages and Cloudinary images
 */
export const cleanupExpiredConversations = async (): Promise<{
  deletedConversations: number;
  deletedMessages: number;
  deletedImages: number;
}> => {
  const now = new Date();

  console.log(`🧹 Starting conversation cleanup... (${now.toISOString()})`);

  try {
    // Find all expired conversations
    const expiredConversations = await Conversation.find({
      expiresAt: { $lt: now }, // expiresAt is less than now
    });

    if (expiredConversations.length === 0) {
      console.log('✨ No expired conversations to clean up');
      return {
        deletedConversations: 0,
        deletedMessages: 0,
        deletedImages: 0,
      };
    }

    console.log(`📋 Found ${expiredConversations.length} expired conversations to delete`);

    let totalDeletedMessages = 0;
    let totalDeletedImages = 0;

    // Process each expired conversation
    for (const conversation of expiredConversations) {
      const conversationId = conversation._id;

      console.log(
        `🗑️  Processing conversation ${conversationId} (expired: ${conversation.expiresAt.toISOString()})`
      );

      // Get all messages with images for this conversation
      const messagesWithImages = await Message.find({
        conversationId,
        imagePublicId: { $exists: true, $ne: null },
      }).select('imagePublicId');

      // Delete images from Cloudinary
      if (messagesWithImages.length > 0) {
        console.log(`  📸 Deleting ${messagesWithImages.length} images from Cloudinary...`);

        const imageDeletePromises = messagesWithImages.map(async (message) => {
          try {
            await cloudinary.uploader.destroy(message.imagePublicId!);
            console.log(`    ✅ Deleted: ${message.imagePublicId}`);
            return true;
          } catch (error) {
            console.error(`    ❌ Failed to delete ${message.imagePublicId}:`, error);
            return false;
          }
        });

        const results = await Promise.all(imageDeletePromises);
        const successfulDeletes = results.filter((r) => r).length;
        totalDeletedImages += successfulDeletes;

        console.log(`  ✅ Deleted ${successfulDeletes}/${messagesWithImages.length} images`);
      }

      // Count and delete all messages for this conversation
      const messageCount = await Message.countDocuments({ conversationId });
      await Message.deleteMany({ conversationId });
      totalDeletedMessages += messageCount;

      console.log(`  ✅ Deleted ${messageCount} messages`);

      // Delete the conversation itself
      await Conversation.findByIdAndDelete(conversationId);

      console.log(`  ✅ Deleted conversation ${conversationId}`);
    }

    // Try to delete empty folders from Cloudinary (optional, may not always work)
    // Cloudinary doesn't have a direct API to delete empty folders, but we can try
    console.log('🧹 Cleanup complete!');
    console.log(`  📊 Summary:`);
    console.log(`    - Conversations deleted: ${expiredConversations.length}`);
    console.log(`    - Messages deleted: ${totalDeletedMessages}`);
    console.log(`    - Images deleted: ${totalDeletedImages}`);

    return {
      deletedConversations: expiredConversations.length,
      deletedMessages: totalDeletedMessages,
      deletedImages: totalDeletedImages,
    };
  } catch (error) {
    console.error('❌ Error during conversation cleanup:', error);
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
