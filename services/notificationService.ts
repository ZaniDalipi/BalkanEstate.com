// Browser notification service for new messages

class NotificationService {
  private hasPermission: boolean = false;

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.hasPermission = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      return this.hasPermission;
    }

    return false;
  }

  showNotification(title: string, options?: NotificationOptions): void {
    if (!this.hasPermission || !('Notification' in window)) {
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/logo.png', // Update with your app icon path
        badge: '/badge.png', // Update with your badge icon path
        ...options,
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  showNewMessageNotification(senderName: string, messagePreview: string, propertyAddress: string): void {
    this.showNotification(`New message from ${senderName}`, {
      body: `${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}\n\nProperty: ${propertyAddress}`,
      tag: 'new-message', // Prevents duplicate notifications
      requireInteraction: false,
    });
  }

  async initialize(): Promise<void> {
    // Request permission on initialization
    await this.requestPermission();
  }
}

export const notificationService = new NotificationService();
