import React from 'react';
import { cn } from '@/src/lib/utils';

/** Skeleton rows while a list loads. */
export const LoadingState: React.FC<{ rows?: number; className?: string }> = ({ rows = 3, className }) => (
  <div className={cn('space-y-3', className)} aria-busy="true" aria-live="polite">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
    ))}
  </div>
);

/** Neutral empty state with an optional action. */
export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, description, action, className }) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center',
      className
    )}
  >
    <p className="text-base font-medium text-foreground">{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/** Error state with an optional retry. Message is already localised by caller. */
export const ErrorState: React.FC<{ message: string; onRetry?: () => void; retryLabel?: string }> = ({
  message,
  onRetry,
  retryLabel,
}) => (
  <div
    role="alert"
    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
  >
    <p>{message}</p>
    {onRetry && (
      <button type="button" onClick={onRetry} className="mt-2 font-medium underline underline-offset-2">
        {retryLabel ?? 'Retry'}
      </button>
    )}
  </div>
);
