/**
 * Paddle.js Integration Hook
 *
 * Provides Paddle checkout functionality for non-EU Balkan countries.
 * Paddle is a Merchant of Record (MoR) handling VAT/tax compliance.
 *
 * Supported countries: Serbia, Albania, Bosnia, N. Macedonia, Montenegro, Kosovo
 */

import { useEffect, useState, useCallback } from 'react';
import { API_URL } from '@/shared/api/config';
import { isCurrentDomainApproved, getPaddleEnvironmentForDomain, PADDLE_REQUIRED_LEGAL_PAGES } from '@/config/paddleConfig';

// Paddle environment types
type PaddleEnvironment = 'sandbox' | 'production';

// Paddle checkout open options
interface PaddleCheckoutOptions {
  items: Array<{
    priceId: string;
    quantity?: number;
  }>;
  customer?: {
    email?: string;
    id?: string;
  };
  customData?: Record<string, string>;
  settings?: {
    displayMode?: 'overlay' | 'inline';
    theme?: 'light' | 'dark';
    locale?: string;
    frameTarget?: string;
    frameInitialHeight?: number;
    frameStyle?: string;
    successUrl?: string;
  };
}

// Paddle event types
interface PaddleEventData {
  data?: {
    id?: string;
    status?: string;
    customer_id?: string;
    transaction_id?: string;
    subscription_id?: string;
    items?: any[];
    totals?: {
      total?: string;
      tax?: string;
      subtotal?: string;
    };
  };
}

// Paddle checkout events
type PaddleEventType =
  | 'checkout.loaded'
  | 'checkout.customer.created'
  | 'checkout.completed'
  | 'checkout.closed'
  | 'checkout.error'
  | 'checkout.warning'
  | 'checkout.payment.initiated'
  | 'checkout.payment.failed'
  | 'checkout.payment.selected';

interface PaddleEventCallback {
  (event: { name?: string; data?: any }): void;
}

// Paddle SDK interface
interface PaddleInstance {
  Environment: {
    set: (env: PaddleEnvironment) => void;
  };
  Initialize: (options: {
    token: string;
    eventCallback?: PaddleEventCallback;
    checkout?: {
      settings?: {
        displayMode?: 'overlay' | 'inline';
        theme?: 'light' | 'dark';
        locale?: string;
      };
    };
  }) => void;
  Checkout: {
    open: (options: PaddleCheckoutOptions) => void;
    close: () => void;
  };
  Status: {
    libraryVersion: string;
  };
  Initialized: boolean;
}

// Extend window to include Paddle
declare global {
  interface Window {
    Paddle?: PaddleInstance;
  }
}

interface UsePaddleConfig {
  onCheckoutComplete?: (data: PaddleEventData) => void;
  onCheckoutClosed?: () => void;
  onCheckoutError?: (error: any) => void;
}

interface UsePaddleReturn {
  isLoaded: boolean;
  isInitialized: boolean;
  error: string | null;
  openCheckout: (options: {
    priceId: string;
    email?: string;
    userId?: string;
    productId?: string;
    successUrl?: string;
  }) => void;
  closeCheckout: () => void;
}

// Track global Paddle script loading state
let paddleScriptLoading = false;
let paddleScriptLoaded = false;
let paddleScriptError: string | null = null;
let paddleInitPromise: Promise<void> | null = null;

/**
 * Load Paddle.js script dynamically
 */
function loadPaddleScript(): Promise<void> {
  if (paddleScriptLoaded && window.Paddle) {
    return Promise.resolve();
  }

  if (paddleInitPromise) {
    return paddleInitPromise;
  }

  paddleInitPromise = new Promise((resolve, reject) => {
    if (paddleScriptLoading) {
      // Wait for existing load to complete
      const checkInterval = setInterval(() => {
        if (paddleScriptLoaded) {
          clearInterval(checkInterval);
          resolve();
        } else if (paddleScriptError) {
          clearInterval(checkInterval);
          reject(new Error(paddleScriptError));
        }
      }, 100);
      return;
    }

    paddleScriptLoading = true;

    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;

    script.onload = () => {
      paddleScriptLoaded = true;
      paddleScriptLoading = false;
      resolve();
    };

    script.onerror = () => {
      paddleScriptError = 'Failed to load Paddle.js';
      paddleScriptLoading = false;
      reject(new Error(paddleScriptError));
    };

    document.head.appendChild(script);
  });

  return paddleInitPromise;
}

/**
 * Hook for Paddle.js integration
 */
export function usePaddle(config: UsePaddleConfig = {}): UsePaddleReturn {
  const [isLoaded, setIsLoaded] = useState(paddleScriptLoaded);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Paddle on mount
  useEffect(() => {
    let mounted = true;

    const initializePaddle = async () => {
      try {
        // Check if current domain is approved for Paddle checkout
        if (!isCurrentDomainApproved()) {
          console.warn(
            '⚠️ Paddle Domain Warning: Current domain may not be approved for Paddle checkout.\n' +
            'Please ensure your domain is submitted and approved in the Paddle dashboard:\n' +
            'https://vendors.paddle.com/checkout-settings\n\n' +
            'Required legal pages for approval:\n' +
            `- Terms of Service: ${PADDLE_REQUIRED_LEGAL_PAGES.termsOfService.path}\n` +
            `- Privacy Policy: ${PADDLE_REQUIRED_LEGAL_PAGES.privacyPolicy.path}\n` +
            `- Refund Policy: ${PADDLE_REQUIRED_LEGAL_PAGES.refundPolicy.path}`
          );
        }

        // Load the script
        await loadPaddleScript();

        if (!mounted) return;
        setIsLoaded(true);

        // Fetch client token from backend
        const response = await fetch(`${API_URL}/payments/paddle/config`);
        const data = await response.json();

        if (!response.ok || !data.clientToken) {
          console.warn('Paddle not configured on backend, skipping initialization');
          return;
        }

        if (!window.Paddle) {
          throw new Error('Paddle SDK not available');
        }

        // Set environment - use domain config as fallback, backend config takes priority
        const domainEnv = getPaddleEnvironmentForDomain();
        const environment = data.environment || domainEnv || 'sandbox';
        window.Paddle.Environment.set(environment);
        console.log(`🏦 Paddle initialized with ${environment} environment for domain: ${window.location.host}`);

        // Initialize Paddle
        window.Paddle.Initialize({
          token: data.clientToken,
          eventCallback: (event) => {
            console.log('Paddle event:', event.name, event.data);

            switch (event.name) {
              case 'checkout.completed':
                config.onCheckoutComplete?.({ data: event.data });
                break;
              case 'checkout.closed':
                config.onCheckoutClosed?.();
                break;
              case 'checkout.error':
              case 'checkout.payment.failed':
                config.onCheckoutError?.(event.data);
                break;
            }
          },
          checkout: {
            settings: {
              displayMode: 'overlay',
              theme: 'light',
              locale: navigator.language?.split('-')[0] || 'en',
            },
          },
        });

        if (mounted) {
          setIsInitialized(true);
        }
      } catch (err: any) {
        console.error('Paddle initialization error:', err);
        if (mounted) {
          setError(err.message);
        }
      }
    };

    initializePaddle();

    return () => {
      mounted = false;
    };
  }, []);

  // Open Paddle checkout
  const openCheckout = useCallback((options: {
    priceId: string;
    email?: string;
    userId?: string;
    productId?: string;
    successUrl?: string;
  }) => {
    if (!window.Paddle || !isInitialized) {
      console.error('Paddle not initialized');
      config.onCheckoutError?.({ message: 'Paddle not initialized' });
      return;
    }

    const baseUrl = window.location.origin;

    window.Paddle.Checkout.open({
      items: [{ priceId: options.priceId, quantity: 1 }],
      customer: options.email ? { email: options.email } : undefined,
      customData: {
        user_id: options.userId || '',
        product_id: options.productId || '',
      },
      settings: {
        displayMode: 'overlay',
        theme: 'light',
        locale: navigator.language?.split('-')[0] || 'en',
        successUrl: options.successUrl || `${baseUrl}/payment/success?provider=paddle`,
      },
    });
  }, [isInitialized, config]);

  // Close Paddle checkout
  const closeCheckout = useCallback(() => {
    if (window.Paddle && isInitialized) {
      window.Paddle.Checkout.close();
    }
  }, [isInitialized]);

  return {
    isLoaded,
    isInitialized,
    error,
    openCheckout,
    closeCheckout,
  };
}

export default usePaddle;
