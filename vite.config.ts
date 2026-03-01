import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const env = loadEnv(mode, process.cwd(), '');

    // Determine API target based on environment
    const apiTarget = env.VITE_API_URL || 'http://localhost:5001';
    const wsTarget = env.VITE_WS_URL || 'ws://localhost:5001';
    const isProduction = mode === 'production';

    // Only log in development
    if (mode === 'development') {
      console.log(`🚀 Starting Vite in ${mode} mode`);
      console.log(`📡 API Target: ${apiTarget}`);
    }

    // Security headers for development server
    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: [
          'localhost',
          '127.0.0.1',
          '.balkanestate.com',
          '.balkanestateai.com',
          '.ngrok-free.dev',
          '.ngrok.io',
        ],
        headers: securityHeaders,
        proxy: mode === 'development' ? {
          '/api': {
            target: apiTarget,
            changeOrigin: true,
            secure: false,
          },
          '/socket.io': {
            target: apiTarget,
            changeOrigin: true,
            secure: false,
            ws: true,
          },
        } : undefined, // No proxy in staging/production (direct API calls)
      },
      plugins: [
        tailwindcss(),
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icons/*.svg', 'icons/*.png', 'og-image.png', 'og-image.svg', 'robots.txt'],
          manifest: {
            name: 'BalkanEstateAI',
            short_name: 'BalkanEstate',
            description: 'Find your dream property in the Balkans with AI. Browse houses, apartments, and villas for sale across Serbia, Montenegro, Croatia, Bosnia, North Macedonia, and Albania.',
            start_url: '/',
            id: '/',
            display: 'standalone',
            display_override: ['standalone', 'minimal-ui'],
            background_color: '#ffffff',
            theme_color: '#0252CD',
            orientation: 'any',
            scope: '/',
            lang: 'en',
            dir: 'ltr',
            categories: ['real estate', 'property', 'housing', 'business'],
            prefer_related_applications: false,
            launch_handler: {
              client_mode: ['navigate-existing', 'auto']
            },
            icons: [
              {
                src: '/icons/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any'
              },
              {
                src: '/icons/icon-72x72.png',
                sizes: '72x72',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/icons/icon-96x96.png',
                sizes: '96x96',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/icons/icon-128x128.png',
                sizes: '128x128',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/icons/icon-144x144.png',
                sizes: '144x144',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/icons/icon-152x152.png',
                sizes: '152x152',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/icons/icon-384x384.png',
                sizes: '384x384',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/icons/icon-maskable-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable'
              },
              {
                src: '/icons/icon-maskable-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
              }
            ],
            shortcuts: [
              {
                name: 'Search Properties',
                short_name: 'Search',
                description: 'Search for properties in the Balkans',
                url: '/search',
                icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }]
              },
              {
                name: 'Find Agents',
                short_name: 'Agents',
                description: 'Find verified real estate agents',
                url: '/agents',
                icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }]
              },
              {
                name: 'Saved Properties',
                short_name: 'Saved',
                description: 'View your saved properties',
                url: '/saved-properties',
                icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }]
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB limit
            // Exclude API routes from service worker interception
            // API calls (especially payments) should always be live, not cached
            // Exclude OAuth callback: Safari throws "Response served by service worker
            // has redirections" (WebKitInternal:0) when the SW intercepts a navigation
            // that arrived via a server-side 302 redirect (e.g. /api/auth/google/callback
            // → /auth/callback?token=...). The SW's response.redirected===true causes
            // WebKit to reject it. Excluding the path lets the CDN serve index.html
            // directly so React picks up the ?token= query params normally.
            navigateFallbackDenylist: [/^\/api\//, /^\/auth\/callback/],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gstatic-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'cloudinary-images-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                  },
                  cacheableResponse: {
                    // Only cache proper CORS responses (not opaque)
                    // This prevents canvas taint errors when annotating images
                    statuses: [200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'unsplash-images-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              }
              // NOTE: API routes are NOT cached by service worker
              // Payment verification and other API calls must always be fresh
            ],
            skipWaiting: true,
            clientsClaim: true
          },
          devOptions: {
            enabled: false
          }
        })
      ],
      css: {
        // Disable Vite's built-in PostCSS processing - let @tailwindcss/vite handle it
        postcss: {
          plugins: [],
        },
      },
      define: {
        // SECURITY: Never expose API keys in frontend bundle
        // AI operations must go through backend API routes for security
        '__APP_ENV__': JSON.stringify(mode),
      },
      resolve: {
        alias: {
          // Folders in src/
          '@/shared': path.resolve(__dirname, 'src/shared'),
          '@/features': path.resolve(__dirname, 'src/features'),
          '@/hooks': path.resolve(__dirname, 'src/hooks'),
          '@/lib': path.resolve(__dirname, 'src/lib'),
          '@/domain': path.resolve(__dirname, 'src/domain'),
          '@/app': path.resolve(__dirname, 'src/app'),
          '@/data': path.resolve(__dirname, 'src/data'),
          '@/i18n': path.resolve(__dirname, 'src/i18n'),
          '@/presentation': path.resolve(__dirname, 'src/presentation'),
          // Folders at root level (most utils, context, components are here)
          '@/utils': path.resolve(__dirname, 'utils'),
          '@/context': path.resolve(__dirname, 'context'),
          '@/components': path.resolve(__dirname, 'components'),
          '@/constants': path.resolve(__dirname, 'constants'),
          '@/config': path.resolve(__dirname, 'config'),
          // Fallback for anything else
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Output directory based on environment
        outDir: isProduction ? 'dist' : `dist-${mode}`,
        // No sourcemaps in production for security
        sourcemap: !isProduction,
        // Minify in production
        minify: isProduction ? 'esbuild' : false,
        rollupOptions: {
          output: {
            // Use content-based hash for cache busting
            entryFileNames: `assets/[name].[hash].js`,
            chunkFileNames: `assets/[name].[hash].js`,
            assetFileNames: `assets/[name].[hash].[ext]`,
            manualChunks(id) {
              // ============================================================
              // VENDOR CHUNKS - Third-party libraries split by functionality
              // ============================================================
              if (id.includes('node_modules')) {
                // Core React - must load first, keep separate and small
                if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
                  return 'react-vendor';
                }
                // React Query - data fetching (used by most pages)
                if (id.includes('@tanstack/react-query')) {
                  return 'react-query';
                }
                // Map functionality - lazy loaded only on map pages
                if (id.includes('leaflet') || id.includes('react-leaflet')) {
                  return 'leaflet';
                }
                // 3D Map (MapLibre) - very large, lazy loaded
                if (id.includes('maplibre-gl')) {
                  return 'maplibre';
                }
                // Internationalization - needed early but separate
                if (id.includes('i18next') || id.includes('react-i18next')) {
                  return 'i18n';
                }
                // Animation library - lazy loaded
                if (id.includes('framer-motion')) {
                  return 'animation';
                }
                // NOTE: socket.io removed from manual chunks due to circular dep with vendor
                // AI/Gemini - only for AI features
                if (id.includes('@google/genai') || id.includes('@google/generative-ai')) {
                  return 'ai';
                }
                // Image compression - only for uploads
                if (id.includes('browser-image-compression')) {
                  return 'image-utils';
                }
                // Form handling
                if (id.includes('react-hook-form') || id.includes('@hookform')) {
                  return 'forms';
                }
                // Zustand state management
                if (id.includes('zustand')) {
                  return 'state';
                }
                // Helmet for SEO
                if (id.includes('react-helmet')) {
                  return 'seo';
                }
                // Date handling
                if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) {
                  return 'date-utils';
                }
                // All other node_modules
                return 'vendor';
              }

              // ============================================================
              // APPLICATION CHUNKS - Only truly standalone features
              // Let Rollup handle features with cross-dependencies
              // ============================================================

              // Auth features (standalone, no deps on other features)
              if (id.includes('/features/auth/')) {
                return 'auth';
              }
              // Legal pages - each page separate for better code splitting
              if (id.includes('/features/legal/components/PrivacyPolicyPage')) {
                return 'legal-privacy';
              }
              if (id.includes('/features/legal/components/TermsOfServicePage')) {
                return 'legal-terms';
              }
              if (id.includes('/features/legal/components/CookiePolicyPage')) {
                return 'legal-cookies';
              }
              if (id.includes('/features/legal/components/RefundPolicyPage')) {
                return 'legal-refund';
              }
              // Onboarding (standalone)
              if (id.includes('/features/onboarding/')) {
                return 'onboarding';
              }
              // i18n language bundles - each language in its own chunk (loaded on demand)
              if (id.includes('/i18n/locales/') && id.includes('/bundle')) {
                const langMatch = id.match(/\/locales\/([a-z]{2})\/bundle/);
                if (langMatch && langMatch[1] !== 'en') {
                  return `i18n-${langMatch[1]}`;
                }
              }

              // NOTE: Let Rollup handle these automatically to avoid circular deps:
              // - admin (circular with payments)
              // - payments/pricing (circular with admin)
              // - messaging (depends on shared components)
              // - analytics (depends on shared hooks)
              // - search, property-details, agents, seller, saved, cities, tools

              // Let Rollup handle remaining code splitting automatically
            },
          },
        },
        // Improve chunk loading
        chunkSizeWarningLimit: 500,
        // Enable tree-shaking for better dead code elimination
        treeshake: {
          moduleSideEffects: 'no-external',
          propertyReadSideEffects: false,
        },
        // Optimize CSS code splitting
        cssCodeSplit: true,
        // Security: Clear console logs in production build
        target: 'es2020',
        // Ensure hashes change only when content changes
        assetsInlineLimit: 4096, // Inline assets smaller than 4kb
      },
      esbuild: {
        // Drop console.log and debugger in production
        drop: isProduction ? ['console', 'debugger'] : [],
      },
      // Preview server configuration (for testing builds locally)
      preview: {
        port: 3001,
        host: '0.0.0.0',
        headers: securityHeaders,
      },
      // Optimize dependencies for faster dev startup
      optimizeDeps: {
        include: ['maplibre-gl'],
      },
    };
});
