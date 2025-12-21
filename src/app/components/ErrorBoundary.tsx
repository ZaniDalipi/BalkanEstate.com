// Error Boundary - Catches and handles React errors gracefully
// Prevents entire app from crashing on component errors

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'app' | 'route' | 'feature';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component to catch React errors
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary level="app">
 *   <App />
 * </ErrorBoundary>
 * ```
 *
 * With custom fallback:
 * ```tsx
 * <ErrorBoundary
 *   level="feature"
 *   fallback={<div>Something went wrong</div>}
 * >
 *   <MyFeature />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Log to error reporting service (Sentry, LogRocket, etc.)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI based on level
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
          level={this.props.level}
        />
      );
    }

    return this.props.children;
  }
}

interface FallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  level?: 'app' | 'route' | 'feature';
}

/**
 * Default error fallback UI
 */
function ErrorFallback({ error, errorInfo, onReset, level = 'app' }: FallbackProps) {
  const isAppLevel = level === 'app';
  const isRouteLevel = level === 'route';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {isAppLevel ? 'Something went wrong' : 'Error loading content'}
        </h1>

        {/* Description */}
        <p className="text-gray-600 text-center mb-6">
          {isAppLevel
            ? "We're sorry, but something unexpected happened. Please try refreshing the page."
            : 'We encountered an error loading this section. Please try again.'}
        </p>

        {/* Error details (development only) */}
        {import.meta.env.DEV && error && (
          <div className="mb-6">
            <details className="bg-gray-100 rounded p-4">
              <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
                Error Details (Dev Only)
              </summary>
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Error:</p>
                  <p className="text-sm text-red-600 font-mono">{error.message}</p>
                </div>
                {error.stack && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Stack Trace:</p>
                    <pre className="text-xs text-gray-600 overflow-auto max-h-40 mt-1">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Component Stack:</p>
                    <pre className="text-xs text-gray-600 overflow-auto max-h-40 mt-1">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!isAppLevel && (
            <button
              onClick={onReset}
              className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors"
            >
              Try Again
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className={`flex-1 ${
              isAppLevel
                ? 'bg-primary text-white hover:bg-primary-dark'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } py-2 px-4 rounded-lg transition-colors`}
          >
            Refresh Page
          </button>
        </div>

        {/* Help text */}
        {isAppLevel && (
          <p className="text-sm text-gray-500 text-center mt-6">
            If this problem persists, please contact support.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to reset error boundary programmatically
 * (For future use with react-error-boundary library)
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}
