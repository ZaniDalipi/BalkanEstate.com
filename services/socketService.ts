import { io, Socket } from 'socket.io-client';
import { Message } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private messageHandlers: Map<string, Set<(message: Message) => void>> = new Map();
  private typingHandlers: Map<string, Set<(data: { userId: string; isTyping: boolean }) => void>> = new Map();
  private readHandlers: Map<string, Set<(data: { messageIds: string[]; readBy: string }) => void>> = new Map();
  private conversationHandlers: Set<(conversation: any) => void> = new Set();
  private deleteHandlers: Set<(conversationId: string) => void> = new Set();
  private userUpdateHandlers: Set<(data: any) => void> = new Set();
  private agencyUpdateHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private currentUserId: string | null = null;

  connect(token: string, userId?: string) {
    if (this.socket?.connected) {
      console.log('✅ Socket already connected');
      return;
    }

    if (userId) {
      this.currentUserId = userId;
    }

    const serverUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';

    console.log('🔌 Connecting to WebSocket server:', serverUrl);

    this.socket = io(serverUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from WebSocket server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
    });

    // Handle incoming messages
    this.socket.on('message-received', (data: { conversationId: string; message: Message }) => {
      console.log('💬 Message received:', data);
      const handlers = this.messageHandlers.get(data.conversationId);
      if (handlers) {
        handlers.forEach(handler => handler(data.message));
      }
    });

    // Handle typing indicators
    this.socket.on('user-typing', (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      const handlers = this.typingHandlers.get(data.conversationId);
      if (handlers) {
        handlers.forEach(handler => handler({ userId: data.userId, isTyping: data.isTyping }));
      }
    });

    // Handle read receipts
    this.socket.on('messages-read', (data: { conversationId: string; messageIds: string[]; readBy: string }) => {
      const handlers = this.readHandlers.get(data.conversationId);
      if (handlers) {
        handlers.forEach(handler => handler({ messageIds: data.messageIds, readBy: data.readBy }));
      }
    });

    // Handle new conversations
    this.socket.on('new-conversation', (conversation: any) => {
      console.log('📧 New conversation:', conversation);
      this.conversationHandlers.forEach(handler => handler(conversation));
    });

    // Handle conversation deletion
    this.socket.on('conversation-deleted', (conversationId: string) => {
      console.log('🗑️ Conversation deleted:', conversationId);
      this.deleteHandlers.forEach(handler => handler(conversationId));
    });

    // Handle user updates (agency joins, profile changes, etc.)
    if (this.currentUserId) {
      this.socket.on(`user-update-${this.currentUserId}`, (data: any) => {
        console.log('👤 User update received:', data);
        this.userUpdateHandlers.forEach(handler => handler(data));
      });
    }
  }

  disconnect() {
    if (this.socket) {
      console.log('👋 Disconnecting from WebSocket server');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Join a conversation room
  joinConversation(conversationId: string) {
    if (this.socket?.connected) {
      console.log('👥 Joining conversation:', conversationId);
      this.socket.emit('join-conversation', conversationId);
    }
  }

  // Leave a conversation room
  leaveConversation(conversationId: string) {
    if (this.socket?.connected) {
      console.log('👋 Leaving conversation:', conversationId);
      this.socket.emit('leave-conversation', conversationId);
    }
  }

  // Send a new message event
  sendMessage(conversationId: string, message: Message) {
    if (this.socket?.connected) {
      this.socket.emit('new-message', { conversationId, message });
    }
  }

  // Send typing indicator
  sendTyping(conversationId: string, isTyping: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('typing', { conversationId, isTyping });
    }
  }

  // Mark messages as read
  markAsRead(conversationId: string, messageIds: string[]) {
    if (this.socket?.connected) {
      this.socket.emit('mark-read', { conversationId, messageIds });
    }
  }

  // Subscribe to messages in a conversation
  onMessage(conversationId: string, handler: (message: Message) => void) {
    if (!this.messageHandlers.has(conversationId)) {
      this.messageHandlers.set(conversationId, new Set());
    }
    this.messageHandlers.get(conversationId)?.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.get(conversationId)?.delete(handler);
    };
  }

  // Subscribe to typing indicators
  onTyping(conversationId: string, handler: (data: { userId: string; isTyping: boolean }) => void) {
    if (!this.typingHandlers.has(conversationId)) {
      this.typingHandlers.set(conversationId, new Set());
    }
    this.typingHandlers.get(conversationId)?.add(handler);

    return () => {
      this.typingHandlers.get(conversationId)?.delete(handler);
    };
  }

  // Subscribe to read receipts
  onRead(conversationId: string, handler: (data: { messageIds: string[]; readBy: string }) => void) {
    if (!this.readHandlers.has(conversationId)) {
      this.readHandlers.set(conversationId, new Set());
    }
    this.readHandlers.get(conversationId)?.add(handler);

    return () => {
      this.readHandlers.get(conversationId)?.delete(handler);
    };
  }

  // Subscribe to new conversations
  onNewConversation(handler: (conversation: any) => void) {
    this.conversationHandlers.add(handler);

    return () => {
      this.conversationHandlers.delete(handler);
    };
  }

  // Subscribe to conversation deletions
  onConversationDeleted(handler: (conversationId: string) => void) {
    this.deleteHandlers.add(handler);

    return () => {
      this.deleteHandlers.delete(handler);
    };
  }

  // Subscribe to user updates
  onUserUpdate(handler: (data: any) => void) {
    this.userUpdateHandlers.add(handler);

    return () => {
      this.userUpdateHandlers.delete(handler);
    };
  }

  // Set current user ID (for listening to user-specific events)
  setCurrentUserId(userId: string) {
    this.currentUserId = userId;

    // If already connected, start listening for user-specific events
    if (this.socket?.connected && userId) {
      this.socket.on(`user-update-${userId}`, (data: any) => {
        console.log('👤 User update received:', data);
        this.userUpdateHandlers.forEach(handler => handler(data));
      });
    }
  }

  // Subscribe to agency updates
  onAgencyUpdate(agencyId: string, handler: (data: any) => void) {
    if (!this.agencyUpdateHandlers.has(agencyId)) {
      this.agencyUpdateHandlers.set(agencyId, new Set());

      // Start listening to this agency's events if socket is connected
      if (this.socket?.connected) {
        this.socket.on(`agency-update-${agencyId}`, (data: any) => {
          console.log('🏢 Agency update received:', data);
          const handlers = this.agencyUpdateHandlers.get(agencyId);
          if (handlers) {
            handlers.forEach(h => h(data));
          }
        });
      }
    }
    this.agencyUpdateHandlers.get(agencyId)?.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.agencyUpdateHandlers.get(agencyId);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.agencyUpdateHandlers.delete(agencyId);
          // Stop listening to this agency's events
          if (this.socket?.connected) {
            this.socket.off(`agency-update-${agencyId}`);
          }
        }
      }
    };
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const socketService = new SocketService();
