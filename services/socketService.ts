import { io, Socket } from 'socket.io-client';
import { Message } from '../types';

// Property event types for real-time updates
export interface PropertyEvent {
  property?: any;
  propertyId?: string;
  timestamp: string;
}

export interface PropertyStatusEvent extends PropertyEvent {
  status: string;
}

export interface PropertyBulkEvent {
  action: 'created' | 'updated' | 'deleted';
  count: number;
  timestamp: string;
}

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

  // Property real-time handlers
  private propertyCreatedHandlers: Set<(data: PropertyEvent) => void> = new Set();
  private propertyUpdatedHandlers: Set<(data: PropertyEvent) => void> = new Set();
  private propertyDeletedHandlers: Set<(data: PropertyEvent) => void> = new Set();
  private propertyStatusHandlers: Set<(data: PropertyStatusEvent) => void> = new Set();
  private propertyBulkHandlers: Set<(data: PropertyBulkEvent) => void> = new Set();

  connect(token: string, userId?: string) {
    if (this.socket?.connected) {
      return;
    }

    if (userId) {
      this.currentUserId = userId;
    }

    // Get server URL from environment, with validation
    let serverUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

    // Validate that the URL has a proper protocol prefix
    // If malformed or missing, use production fallback based on hostname
    if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
      if (typeof window !== 'undefined' && window.location.hostname.includes('balkanestateai.com')) {
        serverUrl = 'https://api.balkanestateai.com';
      } else {
        serverUrl = 'http://localhost:5001';
      }
    }

    // Connecting to WebSocket server

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
      // Connected to WebSocket server
    });

    this.socket.on('disconnect', (_reason) => {
      // Disconnected from WebSocket server
    });

    this.socket.on('connect_error', (_error) => {
      // WebSocket connection error - silent handling
    });

    // Handle incoming messages
    this.socket.on('message-received', (data: { conversationId: string; message: Message }) => {
      // Message received
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
      // New conversation received
      this.conversationHandlers.forEach(handler => handler(conversation));
    });

    // Handle conversation deletion
    this.socket.on('conversation-deleted', (conversationId: string) => {
      this.deleteHandlers.forEach(handler => handler(conversationId));
    });

    // Handle user updates (agency joins, profile changes, etc.)
    if (this.currentUserId) {
      this.socket.on(`user-update-${this.currentUserId}`, (data: any) => {
        // User update received
        this.userUpdateHandlers.forEach(handler => handler(data));
      });
    }

    // =========================================================================
    // PROPERTY REAL-TIME EVENTS - for instant listing updates
    // =========================================================================

    // Handle new property created
    this.socket.on('property:created', (data: PropertyEvent) => {
      this.propertyCreatedHandlers.forEach(handler => handler(data));
    });

    // Handle property updated
    this.socket.on('property:updated', (data: PropertyEvent) => {
      this.propertyUpdatedHandlers.forEach(handler => handler(data));
    });

    // Handle property deleted
    this.socket.on('property:deleted', (data: PropertyEvent) => {
      this.propertyDeletedHandlers.forEach(handler => handler(data));
    });

    // Handle property status changed (sold, available, etc.)
    this.socket.on('property:statusChanged', (data: PropertyStatusEvent) => {
      this.propertyStatusHandlers.forEach(handler => handler(data));
    });

    // Handle bulk property updates
    this.socket.on('property:bulkUpdate', (data: PropertyBulkEvent) => {
      this.propertyBulkHandlers.forEach(handler => handler(data));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Join a conversation room
  joinConversation(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join-conversation', conversationId);
    }
  }

  // Leave a conversation room
  leaveConversation(conversationId: string) {
    if (this.socket?.connected) {
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
        // User update received
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
          // Agency update received
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

  // =========================================================================
  // PROPERTY REAL-TIME SUBSCRIPTIONS
  // =========================================================================

  /**
   * Subscribe to new property created events
   * Use this to instantly show new listings in search results
   */
  onPropertyCreated(handler: (data: PropertyEvent) => void) {
    this.propertyCreatedHandlers.add(handler);
    return () => {
      this.propertyCreatedHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to property updated events
   * Use this to instantly reflect property edits
   */
  onPropertyUpdated(handler: (data: PropertyEvent) => void) {
    this.propertyUpdatedHandlers.add(handler);
    return () => {
      this.propertyUpdatedHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to property deleted events
   * Use this to instantly remove deleted listings
   */
  onPropertyDeleted(handler: (data: PropertyEvent) => void) {
    this.propertyDeletedHandlers.add(handler);
    return () => {
      this.propertyDeletedHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to property status change events (sold, available, etc.)
   */
  onPropertyStatusChanged(handler: (data: PropertyStatusEvent) => void) {
    this.propertyStatusHandlers.add(handler);
    return () => {
      this.propertyStatusHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to bulk property update events
   */
  onPropertyBulkUpdate(handler: (data: PropertyBulkEvent) => void) {
    this.propertyBulkHandlers.add(handler);
    return () => {
      this.propertyBulkHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to ALL property events at once
   * Convenience method for React Query cache invalidation
   */
  onAnyPropertyChange(handler: () => void) {
    const unsubCreated = this.onPropertyCreated(() => handler());
    const unsubUpdated = this.onPropertyUpdated(() => handler());
    const unsubDeleted = this.onPropertyDeleted(() => handler());
    const unsubStatus = this.onPropertyStatusChanged(() => handler());
    const unsubBulk = this.onPropertyBulkUpdate(() => handler());

    // Return combined unsubscribe function
    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubStatus();
      unsubBulk();
    };
  }
}

// Export singleton instance
export const socketService = new SocketService();
