// Suspense Components - Loading boundaries for async components
// Provides loading states for code-split components

import React, { ReactNode, Suspense as ReactSuspense } from 'react';

interface SuspenseProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Custom Suspense wrapper with default loading UI
 *
 * Usage:
 * ```tsx
 * <Suspense>
 *   <LazyComponent />
 * </Suspense>
 * ```
 */
export function Suspense({ children, fallback }: SuspenseProps) {
  return (
    <ReactSuspense fallback={fallback || <DefaultSuspenseFallback />}>
      {children}
    </ReactSuspense>
  );
}

/**
 * Default loading UI for Suspense
 */
function DefaultSuspenseFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Page-level loading UI
 */
export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-700 text-lg">Loading page...</p>
      </div>
    </div>
  );
}

/**
 * Feature-level loading UI (smaller)
 */
export function FeatureLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Component-level loading UI (smallest)
 */
export function ComponentLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

/**
 * Inline loading spinner
 */
export function InlineLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }[size];

  return (
    <div className={`animate-spin rounded-full border-b-2 border-primary ${sizeClass}`} />
  );
}

/**
 * Skeleton loader for lists
 */
export function SkeletonLoader({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

/**
 * Card skeleton loader
 */
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
      <div className="h-48 bg-gray-200 rounded mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-full"></div>
    </div>
  );
}
