import React from 'react';
import { LogoLoader } from './LogoLoader';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'gray';
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
};

const colorClasses: Record<string, string> = {
  primary: 'border-primary border-t-transparent',
  white: 'border-white border-t-transparent',
  gray: 'border-gray-300 border-t-gray-600',
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  return (
    <div
      className={`
        animate-spin rounded-full
        ${sizeClasses[size]}
        ${colorClasses[color]}
        ${className}
      `}
    />
  );
};

export interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  fullScreen?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Loading...',
  fullScreen = false,
}) => {
  if (!isLoading) return null;

  return (
    <div
      className={`
        ${fullScreen ? 'fixed inset-0' : 'absolute inset-0'}
        flex flex-col items-center justify-center
        bg-white/80 backdrop-blur-sm z-50
      `}
    >
      <LogoLoader size="md" showText={false} />
      {message && <p className="mt-4 text-gray-600 font-medium">{message}</p>}
    </div>
  );
};
