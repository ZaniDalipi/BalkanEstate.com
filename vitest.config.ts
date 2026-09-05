/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // @ts-expect-error vitest test config types may differ across versions
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    // Image URLs are built against the configured CDN host, which is read from
    // import.meta.env when config/imageConfig.ts is first loaded. Without a
    // value here every URL looks external, so srcSet comes back empty and the
    // responsive-image tests assert against a code path production never
    // takes. Must match the host the tests use in their fixtures.
    env: {
      VITE_CDN_HOST: 'test-zone.b-cdn.net',
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
      ],
    },
    // Mock browser APIs
    server: {
      deps: {
        inline: ['@tanstack/react-query'],
      },
    },
  },
  resolve: {
    alias: {
      '@/shared': path.resolve(__dirname, 'src/shared'),
      '@/features': path.resolve(__dirname, 'src/features'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/domain': path.resolve(__dirname, 'src/domain'),
      '@/app': path.resolve(__dirname, 'src/app'),
      '@/data': path.resolve(__dirname, 'src/data'),
      '@/i18n': path.resolve(__dirname, 'src/i18n'),
      '@/presentation': path.resolve(__dirname, 'src/presentation'),
      '@/utils': path.resolve(__dirname, 'utils'),
      '@/context': path.resolve(__dirname, 'context'),
      '@/components': path.resolve(__dirname, 'components'),
      '@/constants': path.resolve(__dirname, 'constants'),
      '@/config': path.resolve(__dirname, 'config'),
      '@': path.resolve(__dirname, '.'),
    },
  },
});
