// App Providers - Combines all context providers
// Provides all application contexts in the correct order

import React, { ReactNode } from 'react';
import { AuthProvider } from '../features/auth/state/AuthContext';
import { PropertyProvider } from '../features/property/state/PropertyContext';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * AppProviders combines all feature contexts
 * This replaces the monolithic AppContext with focused, domain-specific contexts
 *
 * Order matters:
 * 1. AuthProvider - Must be first as other features depend on auth state
 * 2. PropertyProvider - Property browsing and management
 * 3. Additional providers will be added here (Conversation, UI, etc.)
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <PropertyProvider>
        {children}
      </PropertyProvider>
    </AuthProvider>
  );
};
