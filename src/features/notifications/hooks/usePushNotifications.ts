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

interface VapidKeyResponse {
  publicKey?: string;
}

/**
 * Convert a URL-safe base64 VAPID key to a Uint8Array for the Push API
 * @throws {Error} If the key format is invalid
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  if (!base64String || typeof base64String !== 'string') {
    throw new Error('Invalid VAPID key: must be a non-empty string');
  }

  try {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (err) {
    throw new Error('Invalid VAPID key: failed to decode base64');
  }
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

  // Check support, VAPID availability, and current subscription status on mount
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

      // Check if server has VAPID configured (cache key for subsequent subscribe calls)
      try {
        const data = await apiRequest<VapidKeyResponse>('/push/vapid-public-key');
        if (!data?.publicKey) {
          setState({ isSupported: false, permission: 'unsupported', isSubscribed: false, isLoading: false, error: null });
          return;
        }
        vapidKeyRef.current = data.publicKey;
      } catch {
        // Server not configured or unreachable — hide the toggle silently
        setState({ isSupported: false, permission: 'unsupported', isSubscribed: false, isLoading: false, error: null });
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
    if (vapidKeyRef.current) {
      return vapidKeyRef.current;
    }

    try {
      const data = await apiRequest<VapidKeyResponse>('/push/vapid-public-key');
      if (!data?.publicKey) {
        throw new Error('Push notifications are not configured on the server');
      }
      vapidKeyRef.current = data.publicKey;
      return data.publicKey;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch VAPID key';
      throw new Error(`VAPID Key Error: ${message}`);
    }
  }, []);

  /** Subscribe to push notifications */
  const subscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Validate service worker support
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Service Worker or Push API not supported in this browser');
      }

      // Request notification permission
      let permission: string;
      try {
        permission = await Notification.requestPermission();
      } catch (err) {
        throw new Error('Permission request failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }

      if (permission !== 'granted') {
        setState((prev) => ({
          ...prev,
          permission: permission as PushPermissionState,
          isLoading: false,
          error: permission === 'denied' ? 'Notifications disabled by user' : null,
        }));
        return false;
      }

      // Get VAPID key
      const vapidKey = await getVapidKey();

      // Get service worker registration
      let registration: ServiceWorkerContainer['ready'];
      try {
        registration = await navigator.serviceWorker.ready;
      } catch (err) {
        throw new Error('Service Worker registration failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }

      if (!registration) {
        throw new Error('Service Worker registration not available');
      }

      // Convert VAPID key to Uint8Array
      let applicationServerKey: Uint8Array;
      try {
        applicationServerKey = urlBase64ToUint8Array(vapidKey);
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to process VAPID key');
      }

      // Create push subscription
      let subscription: PushSubscription;
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      } catch (err) {
        throw new Error('Push subscription failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }

      if (!subscription || !subscription.endpoint) {
        throw new Error('Push subscription created but endpoint is missing');
      }

      // Validate subscription data
      const subJson = subscription.toJSON();
      if (!subJson.endpoint) {
        throw new Error('Invalid subscription: missing endpoint');
      }

      if (!subJson.keys?.p256dh || !subJson.keys?.auth) {
        throw new Error('Invalid subscription: missing encryption keys');
      }

      // Send subscription to backend
      try {
        await apiRequest('/push/subscribe', {
          method: 'POST',
          body: {
            subscription: {
              endpoint: subJson.endpoint,
              keys: {
                p256dh: subJson.keys.p256dh,
                auth: subJson.keys.auth,
              },
            },
          },
          requiresAuth: true,
        });
      } catch (err) {
        // Backend sync failed - cleanup local subscription
        try {
          await subscription.unsubscribe();
        } catch {
          // Ignore cleanup errors
        }
        throw new Error('Failed to register subscription with server: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }

      // Success
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
      // Validate support
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Service Worker or Push API not supported');
      }

      let registration: ServiceWorkerContainer['ready'];
      try {
        registration = await navigator.serviceWorker.ready;
      } catch (err) {
        throw new Error('Service Worker registration failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }

      if (!registration) {
        throw new Error('Service Worker registration not available');
      }

      let subscription: PushSubscription | null;
      try {
        subscription = await registration.pushManager.getSubscription();
      } catch (err) {
        throw new Error('Failed to get push subscription: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }

      if (!subscription) {
        // Not currently subscribed, treat as success
        setState((prev) => ({
          ...prev,
          isSubscribed: false,
          isLoading: false,
          error: null,
        }));
        return true;
      }

      // Notify backend first (best-effort)
      try {
        if (subscription.endpoint) {
          await apiRequest('/push/unsubscribe', {
            method: 'POST',
            body: { endpoint: subscription.endpoint },
            requiresAuth: true,
          });
        }
      } catch (err) {
        // Backend cleanup is best-effort; log but proceed with local unsubscribe
        console.debug('Backend unsubscribe failed (non-fatal):', err instanceof Error ? err.message : 'Unknown error');
      }

      // Remove local subscription
      try {
        await subscription.unsubscribe();
      } catch (err) {
        throw new Error('Failed to unsubscribe locally: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
