import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glass';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary/90 focus-visible:ring-primary/50 active:bg-primary-dark',
  secondary: 'bg-secondary text-white hover:bg-secondary/90 focus-visible:ring-secondary/50 active:bg-orange-600',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-300 active:bg-gray-100',
  ghost: 'text-gray-600 hover:bg-gray-100 focus-visible:ring-gray-300 active:bg-gray-200',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/50 active:bg-red-800',
  glass: 'bg-white/70 backdrop-blur-xl text-neutral-800 border border-white/30 shadow-lg shadow-black/5 hover:bg-white/80 focus-visible:ring-white/50 active:bg-white/90',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3 py-1.5 text-sm sm:min-h-[32px]',
  md: 'min-h-[44px] px-4 py-2.5 text-base sm:min-h-[40px] sm:py-2',
  lg: 'min-h-[52px] px-6 py-3 text-lg sm:min-h-[48px]',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  'aria-label': ariaLabel,
  ...props
}) => {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        touch-manipulation select-none
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-label={ariaLabel}
      {...props}
    >
      {isLoading ? (
        <span
          className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"
          role="status"
          aria-label="Loading"
        />
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0" aria-hidden="true">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0" aria-hidden="true">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
