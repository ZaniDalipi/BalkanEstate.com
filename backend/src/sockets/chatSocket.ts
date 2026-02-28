import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Conversation from '../models/Conversation';

const isProduction = process.env.NODE_ENV === 'production';

// Get JWT secret - MUST be set in environment variables
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('CRITICAL: JWT_SECRET environment variable is not set.');
  }
  return secret;
};

interface AuthenticatedSocket extends Socket {
  userId?: string;
  // Track which conversations this socket has been authorized for
  authorizedConversations?: Set<string>;
}

// Store active user connections (userId -> socketId mapping)
const userSockets = new Map<string, string>();

// Store conversation room memberships (conversationId -> Set of userIds)
const conversationRooms = new Map<string, Set<string>>();

/**
 * Per-socket rate limiter to prevent message/event spam.
 * Returns true if the event should be allowed, false if rate-limited.
 */
const socketRateLimits = new Map<string, { count: number; resetAt: number }>();
const SOCKET_RATE_WINDOW_MS = 10_000; // 10-second window
const SOCKET_RATE_MAX_EVENTS = 30;    // Max 30 events per window (3/sec avg)

function checkSocketRateLimit(socketId: string): boolean {
  const now = Date.now();
  const entry = socketRateLimits.get(socketId);

  if (!entry || now > entry.resetAt) {
    socketRateLimits.set(socketId, { count: 1, resetAt: now + SOCKET_RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= SOCKET_RATE_MAX_EVENTS) {
    return false;
  }

  entry.count++;
  return true;
}

export const setupChatSocket = (io: Server) => {
  // Transport security middleware — reject unencrypted connections in production
  io.use((socket: AuthenticatedSocket, next) => {
    if (isProduction && !socket.handshake.secure) {
      return next(new Error('Security error: Encrypted connection (wss://) required'));
    }
    next();
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, getJwtSecret()) as { id: string };

      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId;

    if (!userId) {
      socket.disconnect();
      return;
    }


    // Store user's socket connection
    userSockets.set(userId, socket.id);

    // Initialize authorized conversations set for this socket
    socket.authorizedConversations = new Set();

    // Join conversation rooms - WITH AUTHORIZATION CHECK
    socket.on('join-conversation', async (conversationId: string) => {
      try {
        // Check if already authorized for this conversation (cached)
        if (socket.authorizedConversations?.has(conversationId)) {
          socket.join(conversationId);
          return;
        }

        // Validate that this user is a participant in the conversation
        const conversation = await Conversation.findById(conversationId).select('buyerId sellerId');

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        const isBuyer = String(conversation.buyerId) === userId;
        const isSeller = String(conversation.sellerId) === userId;

        if (!isBuyer && !isSeller) {
          socket.emit('error', { message: 'Not authorized to join this conversation' });
          return;
        }

        // User is authorized - cache this and join the room
        socket.authorizedConversations?.add(conversationId);
        socket.join(conversationId);

        // Track user in conversation room
        if (!conversationRooms.has(conversationId)) {
          conversationRooms.set(conversationId, new Set());
        }
        conversationRooms.get(conversationId)?.add(userId);
      } catch {
        socket.emit('error', { message: 'Error joining conversation' });
      }
    });

    // Leave conversation room
    socket.on('leave-conversation', (conversationId: string) => {
      socket.leave(conversationId);
      conversationRooms.get(conversationId)?.delete(userId);
      // Keep authorization cached in case they rejoin
    });

    // Handle new message - only broadcast if sender is authorized
    socket.on('new-message', (data: { conversationId: string; message: any }) => {
      // Rate limit: prevent message spam / DoS
      if (!checkSocketRateLimit(socket.id)) {
        socket.emit('error', { message: 'Too many messages. Please slow down.' });
        return;
      }

      // Verify the sender is authorized for this conversation
      if (!socket.authorizedConversations?.has(data.conversationId)) {
        socket.emit('error', { message: 'Not authorized to send messages in this conversation' });
        return;
      }

      // Verify the message senderId matches the socket user
      if (data.message.senderId && String(data.message.senderId) !== userId &&
          String(data.message.senderId?._id) !== userId) {
        socket.emit('error', { message: 'Sender ID mismatch' });
        return;
      }

      // Broadcast to all users in the conversation room except sender
      socket.to(data.conversationId).emit('message-received', {
        conversationId: data.conversationId,
        message: data.message,
      });
    });

    // Handle typing indicator - only if authorized
    socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
      if (!checkSocketRateLimit(socket.id)) return;
      if (!socket.authorizedConversations?.has(data.conversationId)) {
        return; // Silently ignore if not authorized
      }

      socket.to(data.conversationId).emit('user-typing', {
        conversationId: data.conversationId,
        userId,
        isTyping: data.isTyping,
      });
    });

    // Handle message read status - only if authorized
    socket.on('mark-read', (data: { conversationId: string; messageIds: string[] }) => {
      if (!socket.authorizedConversations?.has(data.conversationId)) {
        return; // Silently ignore if not authorized
      }

      socket.to(data.conversationId).emit('messages-read', {
        conversationId: data.conversationId,
        messageIds: data.messageIds,
        readBy: userId,
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      // Clean up rate limit entry
      socketRateLimits.delete(socket.id);

      // Remove user from all conversation rooms
      conversationRooms.forEach((users, conversationId) => {
        users.delete(userId);
      });

      // Clear authorized conversations
      socket.authorizedConversations?.clear();

      // Remove socket mapping
      userSockets.delete(userId);
    });
  });
};

// Export function to emit events from API endpoints
export const getIO = (io: Server) => {
  return {
    // Notify users of new conversation
    notifyNewConversation: (userIds: string[], conversation: any) => {
      userIds.forEach(userId => {
        const socketId = userSockets.get(userId);
        if (socketId) {
          io.to(socketId).emit('new-conversation', conversation);
        }
      });
    },

    // Notify conversation deleted
    notifyConversationDeleted: (conversationId: string, userIds: string[]) => {
      userIds.forEach(userId => {
        const socketId = userSockets.get(userId);
        if (socketId) {
          io.to(socketId).emit('conversation-deleted', conversationId);
        }
      });
    },
  };
};
