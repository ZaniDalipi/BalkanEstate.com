import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '@/src/shared/api';

type PushPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

interface PushNotificationState {
  isSupported: boolean;
  permission: PushPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UsePushNotificationsReturn extends PushNotificationState {
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

/** Convert a URL-safe base64 VAPID key to a Uint8Array for the Push API */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Hook for managing Web Push notification subscriptions.
 *
 * Handles:
 * - Feature detection (SW + Push API support)
 * - VAPID key fetching
 * - Browser permission requests
 * - Push subscription creation/removal
 * - Backend sync (subscribe/unsubscribe API calls)
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'unsupported',
    isSubscribed: false,
    isLoading: true,
    error: null,
  });

  const vapidKeyRef = useRef<string | null>(null);

  // Check support and current subscription status on mount
  useEffect(() => {
    const checkStatus = async () => {
      // Feature detection
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setState({
          isSupported: false,
          permission: 'unsupported',
          isSubscribed: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      const permission = Notification.permission as PushPermissionState;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        setState({
          isSupported: true,
          permission,
          isSubscribed: !!subscription,
          isLoading: false,
          error: null,
        });
      } catch {
        setState({
          isSupported: true,
          permission,
          isSubscribed: false,
          isLoading: false,
          error: null,
        });
      }
    };

    checkStatus();
  }, []);

  /** Fetch the VAPID public key from the server (cached in ref) */
  const getVapidKey = useCallback(async (): Promise<string> => {
    if (vapidKeyRef.current) return vapidKeyRef.current;

    const data = await apiRequest<{ publicKey: string }>('/push/vapid-public-key');
    if (!data.publicKey) {
      throw new Error('Push notifications are not configured on the server');
    }
    vapidKeyRef.current = data.publicKey;
    return data.publicKey;
  }, []);

  /** Subscribe to push notifications */
  const subscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState((prev) => ({
          ...prev,
          permission: permission as PushPermissionState,
          isLoading: false,
          error: null,
        }));
        return false;
      }

      // Get VAPID key and create push subscription
      const vapidKey = await getVapidKey();
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Send subscription to backend
      const subJson = subscription.toJSON();
      await apiRequest('/push/subscribe', {
        method: 'POST',
        body: {
          subscription: {
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys?.p256dh,
              auth: subJson.keys?.auth,
            },
          },
        },
        requiresAuth: true,
      });

      setState({
        isSupported: true,
        permission: 'granted',
        isSubscribed: true,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (err: any) {
      const message = err?.message || 'Failed to subscribe to push notifications';
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      return false;
    }
  }, [getVapidKey]);

  /** Unsubscribe from push notifications */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Notify backend first
        await apiRequest('/push/unsubscribe', {
          method: 'POST',
          body: { endpoint: subscription.endpoint },
          requiresAuth: true,
        }).catch(() => {
          // Backend cleanup is best-effort; proceed with local unsubscribe
        });

        await subscription.unsubscribe();
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
        error: null,
      }));
      return true;
    } catch (err: any) {
      const message = err?.message || 'Failed to unsubscribe from push notifications';
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      return false;
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}

export default usePushNotifications;
