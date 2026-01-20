import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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
      plugins: [tailwindcss(), react()],
      css: {
        // Disable Vite's built-in PostCSS processing - let @tailwindcss/vite handle it
        postcss: {
          plugins: [],
        },
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
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
              // Core React - always needed
              if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
                return 'vendor';
              }
              // Map functionality - only loaded when map is visible
              if (id.includes('leaflet') || id.includes('react-leaflet')) {
                return 'leaflet';
              }
              // Internationalization
              if (id.includes('i18next') || id.includes('react-i18next')) {
                return 'i18n';
              }
              // Animation library - defer loading
              if (id.includes('framer-motion')) {
                return 'animation';
              }
              // Real-time messaging - only for inbox
              if (id.includes('socket.io')) {
                return 'realtime';
              }
              // Data fetching
              if (id.includes('@tanstack/react-query')) {
                return 'query';
              }
              // State management
              if (id.includes('zustand')) {
                return 'state';
              }
              // Icons library - large, load separately
              if (id.includes('lucide-react')) {
                return 'icons';
              }
              // AI/Gemini - only needed for AI features
              if (id.includes('@google/genai') || id.includes('@google/generative-ai')) {
                return 'ai';
              }
              // Error tracking - defer loading
              if (id.includes('@sentry')) {
                return 'sentry';
              }
              // Helmet for SEO
              if (id.includes('react-helmet-async')) {
                return 'helmet';
              }
              // Image compression - only for uploads
              if (id.includes('browser-image-compression')) {
                return 'image-utils';
              }
              // Virtualization - for long lists
              if (id.includes('react-window')) {
                return 'virtualization';
              }
              // Property utilities - shared across features
              if (id.includes('/utils/propertyUtils') || id.includes('/utils/balkanLocations')) {
                return 'propertyUtils';
              }
              // Services - shared across features
              if (id.includes('/services/geminiService') || id.includes('/services/osmService')) {
                return 'services';
              }
              if (id.includes('/services/apiService')) {
                return 'api';
              }
              // Split large feature modules
              if (id.includes('/src/features/admin/')) {
                return 'admin';
              }
              if (id.includes('/src/features/seller/')) {
                return 'seller';
              }
              if (id.includes('/src/features/agents/')) {
                return 'agents';
              }
              if (id.includes('/src/features/property-details/')) {
                return 'property-details';
              }
              if (id.includes('/src/features/map/')) {
                return 'map-features';
              }
              if (id.includes('/src/features/messaging/')) {
                return 'messaging';
              }
              if (id.includes('/src/features/saved/')) {
                return 'saved';
              }
              if (id.includes('/src/features/search/')) {
                return 'search';
              }
              // Large shared components - split individually
              if (id.includes('/components/shared/MyAccountPage')) {
                return 'account';
              }
              if (id.includes('/components/shared/HowItWorksPage')) {
                return 'how-it-works';
              }
              if (id.includes('/components/AgencyDetailPage') || id.includes('/components/AgenciesListPage')) {
                return 'agencies';
              }
              // Keep other node_modules separate
              if (id.includes('node_modules')) {
                return 'vendor-misc';
              }
            },
          },
        },
        // Improve chunk loading
        chunkSizeWarningLimit: 500,
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
    };
});
