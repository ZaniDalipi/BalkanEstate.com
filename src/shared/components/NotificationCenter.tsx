import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell, X, CheckCheck, Home, TrendingDown, MessageSquare, AlertCircle,
  Building2, UserPlus, UserMinus, Ticket, Star, TrendingUp, Calendar,
  CheckCircle, XCircle,
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useNavigationDirection } from '@/src/components/ui/ViewTransition';
import { apiRequest } from '@/src/shared/api';
import { socketService } from '@/services/socketService';
import { notificationService } from '@/services/notificationService';

interface NotificationData {
  propertyId?: string;
  propertyTitle?: string;
  previousPrice?: number;
  newPrice?: number;
  conversationId?: string;
  agencyId?: string;
  agencySlug?: string;
  agencyName?: string;
  actionUrl?: string;
  actionLabel?: string;
  [key: string]: any;
}

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: NotificationData;
}

const NotificationCenter: React.FC = () => {
  const { t } = useTranslation(['common']);
  const { state, dispatch, checkAuthStatus } = useAppContext();
  const { setDirection } = useNavigationDirection();
  const { isAuthenticated } = state;

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use ref for isAuthenticated to keep callbacks stable across renders
  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  const checkAuthStatusRef = useRef(checkAuthStatus);
  checkAuthStatusRef.current = checkAuthStatus;

  // Check if any new notifications require user data refresh (e.g., listing_limit_increased)
  // Only runs once per session to avoid infinite refresh loops
  const hasCheckedForRefresh = useRef(false);
  const checkForUserDataRefresh = useCallback(async () => {
    if (!isAuthenticatedRef.current || hasCheckedForRefresh.current) return;
    hasCheckedForRefresh.current = true;
    try {
      const data = await apiRequest<{ notifications: Notification[] }>('/notifications?limit=5', {
        requiresAuth: true,
        encryptResponse: true,
      });
      const recentNotifications = data.notifications || [];
      // If any unread notification is a listing_limit_increased type, refresh user data and mark as read
      const limitChangeNotif = recentNotifications.find(
        (n) => !n.isRead && n.type === 'listing_limit_increased'
      );
      if (limitChangeNotif) {
        await checkAuthStatusRef.current();
        // Mark the notification as read so it doesn't trigger refresh again
        await apiRequest(`/notifications/${limitChangeNotif._id}/read`, {
          method: 'PATCH',
          requiresAuth: true,
        });
      }
    } catch (error) {
      // Silently handle error
    }
  }, []);

  // Fetch unread count - stable callback that doesn't change across renders
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticatedRef.current) return;
    if (document.hidden) return; // Skip when tab is not visible

    try {
      const data = await apiRequest<{ count: number }>('/notifications/unread-count', {
        requiresAuth: true,
        encryptResponse: true,
      });
      const newCount = data.count || 0;
      setUnreadCount(newCount);
    } catch (error) {
      // Silently handle error - unread count will remain unchanged
    }
  }, []);

  // Fetch notifications - stable callback
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticatedRef.current) return;

    setLoading(true);
    try {
      const data = await apiRequest<{ notifications: Notification[] }>('/notifications?limit=20', {
        requiresAuth: true,
        encryptResponse: true,
      });
      setNotifications(data.notifications || []);
    } catch (error) {
      // Silently handle error
    } finally {
      setLoading(false);
    }
  }, []); // Stable: uses ref for isAuthenticated

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await apiRequest(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
        requiresAuth: true,
      });

      setNotifications(prev =>
        prev.map(n => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      // Silently handle error
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await apiRequest('/notifications/read-all', {
        method: 'PATCH',
        requiresAuth: true,
      });

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      // Silently handle error
    }
  };

  // Handle notification click - mark as read and navigate
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    const data = notification.data;
    if (!data) return;

    // Navigate to agency detail page for join request (opens join requests view)
    if (data.agencyId && notification.type === 'agency_join_request') {
      setIsOpen(false);
      setDirection('up');
      dispatch({ type: 'SET_SELECTED_AGENCY', payload: data.agencySlug || data.agencyId });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencyDetail' });
      return;
    }

    // Navigate to agency detail page
    if (data.agencyId && (
      notification.type === 'agent_joined_agency' ||
      notification.type === 'agent_left_agency' ||
      notification.type === 'agency_join_welcome' ||
      notification.type === 'agency_coupon_redeemed'
    )) {
      setIsOpen(false);
      setDirection('up');
      dispatch({ type: 'SET_SELECTED_AGENCY', payload: data.agencySlug || data.agencyId });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencyDetail' });
      return;
    }

    // Navigate to viewing requests tab for viewing-related notifications
    if (
      notification.type === 'new_viewing' ||
      notification.type === 'viewing_approved' ||
      notification.type === 'viewing_declined'
    ) {
      setIsOpen(false);
      setDirection('morph');
      dispatch({ type: 'SET_ACCOUNT_TAB', payload: 'viewings' });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
      return;
    }

    // Navigate to property detail
    if (data.propertyId) {
      setIsOpen(false);
      setDirection('up');
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: data.propertyId });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'property-details' });
      return;
    }

    // Navigate to conversations
    if (data.conversationId) {
      setIsOpen(false);
      setDirection('morph');
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'inbox' });
      return;
    }
  };

  // Fetch on mount and poll every 5 minutes
  // Also pause polling when tab is hidden and resume when visible
  // Check for user data refresh on initial mount only
  useEffect(() => {
    fetchUnreadCount();
    checkForUserDataRefresh();
    const interval = setInterval(fetchUnreadCount, 300000); // 5 minutes

    // Fetch when tab becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchUnreadCount();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUnreadCount, checkForUserDataRefresh]);

  // Real-time notification updates via socket
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = socketService.onNewNotification((data: Notification) => {
      // Increment badge
      setUnreadCount(prev => prev + 1);

      // Prepend to list if panel is open
      setNotifications(prev => {
        if (prev.some(n => n._id === data._id)) return prev;
        return [data, ...prev];
      });

      // Browser notification — always show if permission granted and tab is not focused
      if (Notification.permission === 'granted' && document.hidden) {
        notificationService.showNotification(data.title, {
          body: data.message,
          tag: `notif-${data._id}`,
          requireInteraction: false,
        });
      }
    });

    return () => { unsubscribe(); };
  }, [isAuthenticated]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_listing':
        return <Home className="w-4 h-4 text-green-500" />;
      case 'price_drop':
        return <TrendingDown className="w-4 h-4 text-blue-500" />;
      case 'new_message':
      case 'new_inquiry':
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'listing_milestone':
      case 'listing_trending':
        return <TrendingUp className="w-4 h-4 text-orange-500" />;
      case 'promotion_suggestion':
      case 'promotion_success':
        return <Star className="w-4 h-4 text-yellow-500" />;
      case 'agency_join_request':
        return <UserPlus className="w-4 h-4 text-blue-600" />;
      case 'agent_joined_agency':
      case 'agency_join_welcome':
        return <UserPlus className="w-4 h-4 text-green-600" />;
      case 'agent_left_agency':
        return <UserMinus className="w-4 h-4 text-red-500" />;
      case 'agency_coupon_redeemed':
        return <Ticket className="w-4 h-4 text-indigo-500" />;
      case 'new_viewing':
        return <Calendar className="w-4 h-4 text-amber-500" />;
      case 'viewing_approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'viewing_declined':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'listing_limit_increased':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // Check if notification is clickable (has a navigation target)
  const isClickable = (notification: Notification): boolean => {
    if (
      notification.type === 'new_viewing' ||
      notification.type === 'viewing_approved' ||
      notification.type === 'viewing_declined'
    ) return true;
    const data = notification.data;
    if (!data) return false;
    return !!(data.agencyId || data.propertyId || data.conversationId);
  };

  // Format relative time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return t('common:time.justNow', 'Just now');
    if (minutes < 60) return t('common:time.minutesAgo', '{{count}}m ago', { count: minutes });
    if (hours < 24) return t('common:time.hoursAgo', '{{count}}h ago', { count: hours });
    if (days < 7) return t('common:time.daysAgo', '{{count}}d ago', { count: days });
    return date.toLocaleDateString();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-neutral-600 hover:text-primary hover:bg-neutral-100 rounded-full transition-colors"
        aria-label={t('common:notifications', 'Notifications')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/10 border border-white/30 z-[999] max-h-[70vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/20 bg-white/50">
            <h3 className="font-semibold text-gray-900">
              {t('common:notifications', 'Notifications')}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:text-primary-dark flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {t('common:markAllRead', 'Mark all read')}
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Bell className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">{t('common:noNotifications', 'No notifications yet')}</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification._id}
                  className={`px-4 py-3 border-b border-white/10 hover:bg-white/40 cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!notification.isRead ? 'font-semibold' : ''} text-gray-900 line-clamp-1`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-400">
                          {formatTime(notification.createdAt)}
                        </p>
                        {isClickable(notification) && notification.data?.actionLabel && (
                          <span className="text-xs text-primary font-medium">
                            {notification.data.actionLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-white/20 bg-white/50">
              <button
                onClick={() => {
                  setIsOpen(false);
                }}
                className="text-sm text-primary hover:text-primary-dark w-full text-center"
              >
                {t('common:viewAll', 'View all notifications')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
