import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

interface AnalyticsProps {
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  hotjarId?: string;
}

// Extend window for analytics globals
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    fbq: (...args: any[]) => void;
    hj: (...args: any[]) => void;
    _hjSettings: { hjid: number; hjsv: number };
  }
}

/**
 * Analytics Component
 * Integrates Google Analytics 4, Facebook Pixel, and Hotjar
 *
 * Usage:
 * <Analytics
 *   googleAnalyticsId="G-XXXXXXXXXX"
 *   facebookPixelId="123456789"
 *   hotjarId={123456}
 * />
 */
export const Analytics: React.FC<AnalyticsProps> = ({
  googleAnalyticsId,
  facebookPixelId,
  hotjarId,
}) => {
    // Patch pushState/replaceState to emit a custom event so SPA navigations
  // are captured in addition to browser back/forward (popstate).
  useEffect(() => {
    const NAVIGATION_EVENT = 'spa-navigation';

    function patchHistoryMethod(method: 'pushState' | 'replaceState') {
      const original = window.history[method].bind(window.history);
      window.history[method] = function (...args: Parameters<History[typeof method]>) {
        original(...args);
        window.dispatchEvent(new Event(NAVIGATION_EVENT));
      };
      return original;
    }

    const origPush = patchHistoryMethod('pushState');
    const origReplace = patchHistoryMethod('replaceState');

    const handleRouteChange = () => {
      if (googleAnalyticsId && window.gtag) {
        window.gtag('config', googleAnalyticsId, {
          page_path: window.location.pathname,
          page_title: document.title,
        });
      }
      if (facebookPixelId && window.fbq) {
        window.fbq('track', 'PageView');
      }
    };

    // Initial page view
    handleRouteChange();

    window.addEventListener(NAVIGATION_EVENT, handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener(NAVIGATION_EVENT, handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
      // Restore originals
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
    };
  }, [googleAnalyticsId, facebookPixelId]);

  return (
    <Helmet>
      {/* Google Analytics 4 */}
      {googleAnalyticsId && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`} />
          <script>
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAnalyticsId}', {
                page_path: window.location.pathname,
                anonymize_ip: true,
                cookie_flags: 'SameSite=None;Secure'
              });
            `}
          </script>
        </>
      )}

      {/* Facebook Pixel */}
      {facebookPixelId && (
        <script>
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${facebookPixelId}');
            fbq('track', 'PageView');
          `}
        </script>
      )}

      {/* Hotjar */}
      {hotjarId && (
        <script>
          {`
            (function(h,o,t,j,a,r){
              h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
              h._hjSettings={hjid:${hotjarId},hjsv:6};
              a=o.getElementsByTagName('head')[0];
              r=o.createElement('script');r.async=1;
              r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
              a.appendChild(r);
            })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
          `}
        </script>
      )}
    </Helmet>
  );
};

/**
 * Track custom events across all analytics platforms
 */
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', eventName, eventParams);
  }

  // Facebook Pixel
  if (window.fbq) {
    window.fbq('trackCustom', eventName, eventParams);
  }

  // Console log in development
  if (import.meta.env.DEV) {
    // Log removed
  }
};

/**
 * Track e-commerce events
 */
export const trackEcommerce = {
  viewItem: (property: {
    id: string;
    name: string;
    price: number;
    category?: string;
    city?: string;
  }) => {
    // Google Analytics
    if (window.gtag) {
      window.gtag('event', 'view_item', {
        currency: 'EUR',
        value: property.price,
        items: [{
          item_id: property.id,
          item_name: property.name,
          item_category: property.category || 'Property',
          item_category2: property.city,
          price: property.price,
        }],
      });
    }

    // Facebook Pixel
    if (window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_ids: [property.id],
        content_type: 'property',
        content_name: property.name,
        value: property.price,
        currency: 'EUR',
      });
    }
  },

  addToWishlist: (property: {
    id: string;
    name: string;
    price: number;
  }) => {
    if (window.gtag) {
      window.gtag('event', 'add_to_wishlist', {
        currency: 'EUR',
        value: property.price,
        items: [{
          item_id: property.id,
          item_name: property.name,
          price: property.price,
        }],
      });
    }

    if (window.fbq) {
      window.fbq('track', 'AddToWishlist', {
        content_ids: [property.id],
        content_name: property.name,
        value: property.price,
        currency: 'EUR',
      });
    }
  },

  contact: (property: {
    id: string;
    name: string;
  }) => {
    if (window.gtag) {
      window.gtag('event', 'generate_lead', {
        item_id: property.id,
        item_name: property.name,
      });
    }

    if (window.fbq) {
      window.fbq('track', 'Contact', {
        content_ids: [property.id],
        content_name: property.name,
      });
    }
  },

  search: (searchParams: {
    query?: string;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    propertyType?: string;
  }) => {
    if (window.gtag) {
      window.gtag('event', 'search', {
        search_term: searchParams.query || searchParams.city || 'browse',
        ...searchParams,
      });
    }

    if (window.fbq) {
      window.fbq('track', 'Search', searchParams);
    }
  },

  subscribe: (plan: string, value: number) => {
    if (window.gtag) {
      window.gtag('event', 'purchase', {
        currency: 'EUR',
        value: value,
        items: [{
          item_id: plan,
          item_name: `${plan} Subscription`,
          price: value,
        }],
      });
    }

    if (window.fbq) {
      window.fbq('track', 'Subscribe', {
        value: value,
        currency: 'EUR',
        predicted_ltv: value * 12,
      });
    }
  },
};

export default Analytics;
