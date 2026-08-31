/// <reference types="vite/client" />
/// <reference types="@types/leaflet" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_MAPS_KEY?: string;
  readonly VITE_GOOGLE_MAPS_MAP_ID?: string;
  readonly VITE_FACEBOOK_APP_ID?: string;
  readonly VITE_APPLE_CLIENT_ID?: string;
  // Google AdSense — publisher id plus one slot id per placement. Any placement
  // left unset simply renders nothing (see src/features/ads/adsConfig.ts).
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_ADSENSE_SLOT_HOME_BILLBOARD?: string;
  readonly VITE_ADSENSE_SLOT_HOME_RAIL_LEFT?: string;
  readonly VITE_ADSENSE_SLOT_HOME_RAIL_RIGHT?: string;
  readonly VITE_ADSENSE_SLOT_HOME_IN_FEED?: string;
  readonly VITE_ADSENSE_SLOT_SEARCH_LIST?: string;
  readonly VITE_ADSENSE_SLOT_PROPERTY_IN_ARTICLE?: string;
  readonly VITE_ADSENSE_SLOT_PROPERTY_SIDEBAR?: string;
  readonly VITE_ADSENSE_SLOT_BLOG_LIST?: string;
  readonly VITE_ADSENSE_SLOT_BLOG_ARTICLE?: string;
  readonly VITE_ADSENSE_SLOT_GUIDES?: string;
  readonly VITE_ADSENSE_SLOT_CITY_DASHBOARD?: string;
  readonly VITE_ADSENSE_SLOT_ANCHOR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
