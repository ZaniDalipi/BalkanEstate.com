/// <reference types="vite/client" />
/// <reference types="@types/leaflet" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_ENVIRONMENT?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_MAPS_KEY?: string;
  readonly VITE_GOOGLE_MAPS_MAP_ID?: string;
  readonly VITE_FACEBOOK_APP_ID?: string;
  readonly VITE_APPLE_CLIENT_ID?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_GA_ID?: string;
  readonly VITE_FB_PIXEL_ID?: string;
  readonly VITE_CLARITY_PROJECT_ID?: string;
  readonly VITE_WS_URL?: string;
}

declare const __APP_ENV__: string;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
