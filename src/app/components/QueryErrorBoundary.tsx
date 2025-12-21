// Query Error Boundary - Specialized error boundary for TanStack Query errors
// Handles query errors with retry and reset functionality

import React, { ReactNode } from 'react';
import { QueryErrorResetBoundary, useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from './ErrorBoundary';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * QueryErrorBoundary combines React error boundary with TanStack Query error reset
 *
 * Usage:
 * ```tsx
 * <QueryErrorBoundary>
 *   <MyComponent />
 * </QueryErrorBoundary>
 * ```
 *
 * Features:
 * - Catches React errors
 * - Resets TanStack Query errors on retry
 * - Provides retry button for failed queries
 */
export function QueryErrorBoundary({ children, fallback }: Props) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onError={(error, errorInfo) => {
            // Log error
            console.error('Query error:', error, errorInfo);
          }}
          fallback={
            fallback || (
              <QueryErrorFallback
                onReset={reset}
              />
            )
          }
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

interface FallbackProps {
  onReset: () => void;
}

/**
 * Default fallback for query errors
 */
function QueryErrorFallback({ onReset }: FallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to load data
        </h3>

        <p className="text-gray-600 mb-4">
          We couldn't load the requested data. This might be a temporary network issue.
        </p>

        <button
          onClick={() => {
            onReset();
            window.location.reload();
          }}
          className="bg-primary text-white py-2 px-6 rounded-lg hover:bg-primary-dark transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

/**
 * Hook to use query error reset boundary
 */
export function useQueryErrorReset() {
  return useQueryErrorResetBoundary();
}
