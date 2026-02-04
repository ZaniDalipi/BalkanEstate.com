/**
 * Test Utilities
 * Custom render functions and helpers for testing React components
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Create a new QueryClient for testing
 * Configured with no retries and immediate garbage collection
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component that provides all necessary providers for testing
 */
interface AllProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

function AllProviders({ children, queryClient }: AllProvidersProps): ReactElement {
  const client = queryClient ?? createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Custom render function that wraps components with all necessary providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
): ReturnType<typeof render> {
  const { queryClient, ...renderOptions } = options ?? {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders queryClient={queryClient}>{children}</AllProviders>
    ),
    ...renderOptions,
  });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';

// Override render with our custom render
export { customRender as render };

/**
 * Wait for loading states to resolve
 */
export async function waitForLoadingToFinish(): Promise<void> {
  // Wait for any pending promises
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create a mock fetch response
 */
export function createMockFetchResponse<T>(data: T, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: () => createMockFetchResponse(data, status),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    bytes: async () => new Uint8Array(),
  } as Response;
}

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides = {}) {
  return {
    _id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'buyer',
    isSubscribed: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock property for testing
 */
export function createMockProperty(overrides = {}) {
  return {
    _id: 'property-123',
    title: 'Test Property',
    description: 'A beautiful test property',
    price: 100000,
    currency: 'EUR',
    propertyType: 'apartment',
    status: 'active',
    city: 'Belgrade',
    country: 'Serbia',
    address: '123 Test Street',
    lat: 44.8176,
    lng: 20.4633,
    bedrooms: 2,
    bathrooms: 1,
    area: 75,
    images: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Simulate typing with delay (for more realistic tests)
 */
export async function typeWithDelay(
  element: HTMLElement,
  text: string,
  delay = 50
): Promise<void> {
  const { userEvent } = await import('@testing-library/user-event');
  const user = userEvent.setup({ delay });
  await user.type(element, text);
}
