import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
      plugins: [react()],
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
            manualChunks: {
              vendor: ['react', 'react-dom'],
              leaflet: ['leaflet', 'react-leaflet'],
              i18n: ['i18next', 'react-i18next'],
            },
          },
        },
        // Security: Clear console logs in production build
        target: 'es2020',
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
