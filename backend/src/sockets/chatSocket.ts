import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';


interface AuthenticatedSocket extends Socket {
  userId?: string;
}

// Store active user connections (userId -> socketId mapping)
const userSockets = new Map<string, string>();

// Store conversation room memberships (conversationId -> Set of userIds)
const conversationRooms = new Map<string, Set<string>>();

export const setupChatSocket = (io: Server) => {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { id: string };

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

    console.log(`✅ User connected to chat: ${userId}`);

    // Store user's socket connection
    userSockets.set(userId, socket.id);

    // Join conversation rooms
    socket.on('join-conversation', (conversationId: string) => {
      socket.join(conversationId);

      // Track user in conversation room
      if (!conversationRooms.has(conversationId)) {
        conversationRooms.set(conversationId, new Set());
      }
      conversationRooms.get(conversationId)?.add(userId);

      console.log(`👥 User ${userId} joined conversation ${conversationId}`);
    });

    // Leave conversation room
    socket.on('leave-conversation', (conversationId: string) => {
      socket.leave(conversationId);
      conversationRooms.get(conversationId)?.delete(userId);

      console.log(`👋 User ${userId} left conversation ${conversationId}`);
    });

    // Handle new message
    socket.on('new-message', (data: { conversationId: string; message: any }) => {
      // Broadcast to all users in the conversation room except sender
      socket.to(data.conversationId).emit('message-received', {
        conversationId: data.conversationId,
        message: data.message,
      });

      console.log(`💬 Message sent in conversation ${data.conversationId}`);
    });

    // Handle typing indicator
    socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
      socket.to(data.conversationId).emit('user-typing', {
        conversationId: data.conversationId,
        userId,
        isTyping: data.isTyping,
      });
    });

    // Handle message read status
    socket.on('mark-read', (data: { conversationId: string; messageIds: string[] }) => {
      socket.to(data.conversationId).emit('messages-read', {
        conversationId: data.conversationId,
        messageIds: data.messageIds,
        readBy: userId,
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected from chat: ${userId}`);

      // Remove user from all conversation rooms
      conversationRooms.forEach((users, conversationId) => {
        users.delete(userId);
      });

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
