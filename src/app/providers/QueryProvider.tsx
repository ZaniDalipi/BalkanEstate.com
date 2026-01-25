// Query Provider - Wraps app with TanStack Query
// Provides query client and dev tools

import React, { ReactNode, lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../config/queryClient';

// Lazy load devtools - only in development
// This ensures devtools code is never included in production bundle
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((mod) => ({
        default: mod.ReactQueryDevtools,
      }))
    )
  : () => null;

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * QueryProvider wraps the app with TanStack Query
 *
 * Features:
 * - Provides query client to all components
 * - Includes dev tools in development mode (lazy loaded)
 * - Handles query state management
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Dev tools only in development - lazy loaded */}
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <ReactQueryDevtools
            initialIsOpen={false}
            position="bottom-right"
          />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
