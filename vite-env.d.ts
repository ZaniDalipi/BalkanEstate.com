/// <reference types="vite/client" />
/// <reference types="@types/leaflet" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_MAPS_KEY?: string;
  readonly VITE_GOOGLE_MAPS_MAP_ID?: string;
  readonly VITE_FACEBOOK_APP_ID?: string;
  readonly VITE_APPLE_CLIENT_ID?: string;
  // Google AdSense network fill. Without VITE_ADSENSE_CLIENT nothing is ever
  // requested from Google; see docs/GOOGLE_ADSENSE.md.
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_ADSENSE_SLOT?: string;
  readonly VITE_ADSENSE_SLOT_LEADERBOARD?: string;
  readonly VITE_ADSENSE_SLOT_SIDEBAR?: string;
  readonly VITE_ADSENSE_SLOT_STICKY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
