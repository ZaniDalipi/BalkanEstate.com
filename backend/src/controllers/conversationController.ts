import { Request, Response } from 'express';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import Property from '../models/Property';
import User, { IUser } from '../models/User';
import { SECURITY_WARNING } from '../utils/messageFilter';
import cloudinary from '../config/cloudinary';
import { sendNewMessageNotification } from '../services/emailService';
import { getSocketInstance } from '../utils/socketInstance';
import { incrementInquiryCount } from '../utils/statsUpdater';

// @desc    Get user's conversations
// @route   GET /api/conversations
// @access  Private
export const getConversations = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // Find conversations where user is either buyer or seller
    const conversations = await Conversation.find({
      $or: [{ buyerId: String((req.user as IUser)._id) }, { sellerId: String((req.user as IUser)._id) }],
    })
      .populate('propertyId')
      .populate('buyerId', 'name email phone avatarUrl')
      .populate('sellerId', 'name email phone avatarUrl role agencyName')
      .sort({ lastMessageAt: -1 });

    // Get last message for each conversation
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await Message.findOne({
          conversationId: conv._id,
        }).sort({ createdAt: -1 });

        return {
          ...conv.toObject(),
          lastMessage,
        };
      })
    );

    res.json({ conversations: conversationsWithMessages });
  } catch (error: any) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Error fetching conversations', error: error.message });
  }
};

// @desc    Get single conversation with messages
// @route   GET /api/conversations/:id
// @access  Private
export const getConversation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const conversation = await Conversation.findById(req.params.id)
      .populate('propertyId')
      .populate('buyerId', 'name email phone avatarUrl')
      .populate('sellerId', 'name email phone avatarUrl role agencyName');

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    // Check if user is part of conversation
    const isBuyer = conversation.buyerId._id.toString() === String((req.user as IUser)._id).toString();
    const isSeller = conversation.sellerId._id.toString() === String((req.user as IUser)._id).toString();

    if (!isBuyer && !isSeller) {
      res.status(403).json({ message: 'Not authorized to view this conversation' });
      return;
    }

    // Get messages (E2E encrypted, server cannot decrypt)
    const messages = await Message.find({ conversationId: conversation._id })
      .populate('senderId', 'name avatarUrl')
      .sort({ createdAt: 1 });

    // Messages remain encrypted, client will decrypt them

    // Mark messages as read
    if (isBuyer) {
      await Message.updateMany(
        {
          conversationId: conversation._id,
          senderId: conversation.sellerId._id,
          isRead: false,
        },
        { isRead: true }
      );
      conversation.buyerUnreadCount = 0;
    } else {
      await Message.updateMany(
        {
          conversationId: conversation._id,
          senderId: conversation.buyerId._id,
          isRead: false,
        },
        { isRead: true }
      );
      conversation.sellerUnreadCount = 0;
    }

    await conversation.save();

    res.json({ conversation, messages });
  } catch (error: any) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Error fetching conversation', error: error.message });
  }
};

// @desc    Create or get conversation
// @route   POST /api/conversations
// @access  Private
export const createConversation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { propertyId } = req.body;

    if (!propertyId) {
      res.status(400).json({ message: 'Property ID is required' });
      return;
    }

    // Get property
    const property = await Property.findById(propertyId);

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    // Can't create conversation with yourself
    if (property.sellerId.toString() === String((req.user as IUser)._id).toString()) {
      res.status(400).json({ message: 'Cannot create conversation with yourself' });
      return;
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      propertyId,
      buyerId: String((req.user as IUser)._id),
      sellerId: property.sellerId,
    })
      .populate('propertyId')
      .populate('buyerId', 'name email phone avatarUrl')
      .populate('sellerId', 'name email phone avatarUrl role agencyName');

    if (!conversation) {
      // Create new conversation
      conversation = await Conversation.create({
        propertyId,
        buyerId: String((req.user as IUser)._id),
        sellerId: property.sellerId,
      });

      // Increment inquiries count on property
      property.inquiries += 1;
      await property.save();

      // Update seller's inquiry stats in real-time
      await incrementInquiryCount(String(property.sellerId));

      await conversation.populate('propertyId');
      await conversation.populate('buyerId', 'name email phone avatarUrl');
      await conversation.populate(
        'sellerId',
        'name email phone avatarUrl role agencyName'
      );
    }

    res.status(201).json({ conversation });
  } catch (error: any) {
    console.error('Create conversation error:', error);
    res.status(500).json({ message: 'Error creating conversation', error: error.message });
  }
};

// @desc    Send message
// @route   POST /api/conversations/:id/messages
// @access  Private
export const sendMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { text, imageUrl, imagePublicId, encryptedMessage, encryptedKeys, iv } = req.body;

    // Either have E2E encrypted data or plain text/image
    if (!encryptedMessage && !text && !imageUrl) {
      res.status(400).json({ message: 'Message content is required' });
      return;
    }

    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    // Check if user is part of conversation
    const isBuyer = conversation.buyerId.toString() === String((req.user as IUser)._id).toString();
    const isSeller = conversation.sellerId.toString() === String((req.user as IUser)._id).toString();

    if (!isBuyer && !isSeller) {
      res.status(403).json({ message: 'Not authorized to send message' });
      return;
    }

    // Create message (E2E encrypted or plain text)
    // If text is provided, it will be sanitized by pre-save hook
    const messageData: any = {
      conversationId: conversation._id,
      senderId: String((req.user as IUser)._id),
      imageUrl,
      imagePublicId, // Store Cloudinary public ID for cleanup
    };

    // E2E encrypted message
    if (encryptedMessage && encryptedKeys && iv) {
      messageData.encryptedMessage = encryptedMessage;
      messageData.encryptedKeys = encryptedKeys;
      messageData.iv = iv;
    } else if (text) {
      // Plain text (will be sanitized by pre-save hook)
      messageData.text = text;
    }

    const message = await Message.create(messageData);

    // Update conversation
    conversation.lastMessageAt = new Date();
    if (isBuyer) {
      conversation.sellerUnreadCount += 1;
    } else {
      conversation.buyerUnreadCount += 1;
    }
    await conversation.save();

    await message.populate('senderId', 'name avatarUrl');

    // Send email notification to recipient
    try {
      // Populate conversation with property and user details
      await conversation.populate('propertyId');
      await conversation.populate('buyerId', 'name email');
      await conversation.populate('sellerId', 'name email');

      const sender = req.user as IUser;
      const recipient = (isBuyer ? conversation.sellerId : conversation.buyerId) as any;
      const property = conversation.propertyId as any;

      // Only send email if recipient has an email
      if (recipient && recipient.email && property) {
        const messageText = text || '[Image message]';
        const appUrl = process.env.APP_URL || 'http://localhost:5173';

        await sendNewMessageNotification({
          recipientEmail: recipient.email as string,
          recipientName: (recipient.name as string) || 'User',
          senderName: sender.name || 'A user',
          propertyAddress: property.address as string,
          propertyCity: property.city as string,
          messagePreview: messageText,
          conversationUrl: `${appUrl}/inbox`,
        });
      }
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't fail the request if email fails
    }

    // Emit WebSocket event to conversation room for real-time delivery
    const io = getSocketInstance();
    if (io) {
     const conversationId = String((conversation as any)._id);

      io.to(conversationId).emit('message-received', {

        conversationId: conversationId,

        message: message.toObject(),

      });

      console.log(`📨 Emitted message to conversation room: ${conversationId}`);

    }

    // Include security warnings if any (from server-side filtering)
    const response: any = { message };
    if (message.hadSensitiveInfo && message.securityWarnings && message.securityWarnings.length > 0) {
      response.securityWarnings = message.securityWarnings;
    }

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
};

// @desc    Upload image for message
// @route   POST /api/conversations/:id/upload-image
// @access  Private
export const uploadMessageImage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'No image file provided' });
      return;
    }

    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    // Check if user is part of conversation
    const isBuyer = conversation.buyerId.toString() === String((req.user as IUser)._id).toString();
    const isSeller = conversation.sellerId.toString() === String((req.user as IUser)._id).toString();

    if (!isBuyer && !isSeller) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    // Upload to Cloudinary with organized folder structure
    // Store images by both user IDs for tracking who is in the conversation
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    // Create folder path that includes both users
    // Format: balkan-estate/messages/user-{userId1}-user-{userId2}/conv-{conversationId}
    const buyerId = String(conversation.buyerId);
    const sellerId = String(conversation.sellerId);
    const conversationId = String(conversation._id);

    // Sort user IDs alphabetically for consistent folder naming
    const [user1, user2] = [buyerId, sellerId].sort();
    const folderPath = `balkan-estate/messages/user-${user1}-user-${user2}/conv-${conversationId}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: folderPath,
      resource_type: 'image',
      // Add context for tracking
      context: {
        conversation_id: conversationId,
        buyer_id: buyerId,
        seller_id: sellerId,
        uploaded_by: String((req.user as IUser)._id),
      },
    });

    console.log(`📸 Message image uploaded: ${result.public_id}`);

    res.json({
      imageUrl: result.secure_url,
      publicId: result.public_id, // Return public ID for message storage
    });
  } catch (error: any) {
    console.error('Upload message image error:', error);
    res.status(500).json({ message: 'Error uploading image', error: error.message });
  }
};

// @desc    Get security warning
// @route   GET /api/conversations/security-warning
// @access  Public
export const getSecurityWarning = async (
  req: Request,
  res: Response
): Promise<void> => {
  res.json({ warning: SECURITY_WARNING });
};

// @desc    Get public keys for conversation participants
// @route   GET /api/conversations/:id/public-keys
// @access  Private
export const getConversationPublicKeys = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    // Check if user is part of conversation
    const isBuyer = conversation.buyerId.toString() === String((req.user as IUser)._id).toString();
    const isSeller = conversation.sellerId.toString() === String((req.user as IUser)._id).toString();

    if (!isBuyer && !isSeller) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    // Get public keys for both participants
    const buyer = await User.findById(conversation.buyerId).select('publicKey');
    const seller = await User.findById(conversation.sellerId).select('publicKey');

    res.json({
      publicKeys: {
        [String(conversation.buyerId)]: buyer?.publicKey || null,
        [String(conversation.sellerId)]: seller?.publicKey || null,
      },
    });
  } catch (error: any) {
    console.error('Get conversation public keys error:', error);
    res.status(500).json({ message: 'Error getting public keys', error: error.message });
  }
};

// @desc    Mark conversation as read
// @route   PATCH /api/conversations/:id/read
// @access  Private
export const markAsRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    // Check if user is part of conversation
    const isBuyer = conversation.buyerId.toString() === String((req.user as IUser)._id).toString();
    const isSeller = conversation.sellerId.toString() === String((req.user as IUser)._id).toString();

    if (!isBuyer && !isSeller) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    // Mark messages as read
    if (isBuyer) {
      await Message.updateMany(
        {
          conversationId: conversation._id,
          senderId: conversation.sellerId,
          isRead: false,
        },
        { isRead: true }
      );
      conversation.buyerUnreadCount = 0;
    } else {
      await Message.updateMany(
        {
          conversationId: conversation._id,
          senderId: conversation.buyerId,
          isRead: false,
        },
        { isRead: true }
      );
      conversation.sellerUnreadCount = 0;
    }

    await conversation.save();

    res.json({ message: 'Marked as read' });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Error marking as read', error: error.message });
  }
};

// @desc    Delete a conversation
// @route   DELETE /api/conversations/:id
// @access  Private
export const deleteConversation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    // Check if user is part of this conversation
    const userId = String((req.user as IUser)._id);
    const isBuyer = String(conversation.buyerId) === userId;
    const isSeller = String(conversation.sellerId) === userId;

    if (!isBuyer && !isSeller) {
      res.status(403).json({ message: 'Not authorized to delete this conversation' });
      return;
    }

    // Get all messages with images to delete from Cloudinary
    const messagesWithImages = await Message.find({
      conversationId: conversation._id,
      imagePublicId: { $exists: true, $ne: null },
    }).select('imagePublicId');

    // Delete images from Cloudinary
    if (messagesWithImages.length > 0) {
      console.log(`🗑️  Deleting ${messagesWithImages.length} images from Cloudinary...`);

      const deletePromises = messagesWithImages.map(async (message) => {
        try {
          await cloudinary.uploader.destroy(message.imagePublicId!);
          console.log(`✅ Deleted image: ${message.imagePublicId}`);
        } catch (error) {
          console.error(`❌ Failed to delete image ${message.imagePublicId}:`, error);
          // Continue even if some images fail to delete
        }
      });

      await Promise.all(deletePromises);
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversationId: conversation._id });

    // Delete the conversation
    await Conversation.findByIdAndDelete(req.params.id);

    console.log(`🗑️  Deleted conversation ${req.params.id} and ${messagesWithImages.length} images`);

    res.json({ message: 'Conversation deleted' });
  } catch (error: any) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ message: 'Error deleting conversation', error: error.message });
  }
};
