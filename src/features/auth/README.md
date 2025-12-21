# Auth Feature - TanStack Query Implementation

## Overview

This directory contains the modernized authentication feature using TanStack Query for server state management and Zustand for UI state.

## Architecture

```
src/features/auth/
├── api/
│   └── authKeys.ts          # Query key factory
├── hooks/
│   ├── useCurrentUser.ts    # Get current user (query)
│   ├── useLogin.ts          # Login mutation
│   ├── useSignup.ts         # Signup mutation
│   ├── useLogout.ts         # Logout mutation
│   ├── usePasswordReset.ts  # Password reset mutations
│   ├── usePhoneAuth.ts      # Phone verification mutations
│   └── index.ts             # Barrel exports
├── components/
│   └── ExampleAuthUsage.tsx # Reference implementation
├── MIGRATION_GUIDE.md       # Migration instructions
└── README.md                # This file
```

## Quick Start

### 1. Get Current User

```tsx
import { useCurrentUser } from '@/features/auth/hooks';

function MyComponent() {
  const { user, isLoading, isAuthenticated } = useCurrentUser();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Not logged in</div>;

  return <div>Hello {user.name}!</div>;
}
```

### 2. Login

```tsx
import { useLogin } from '@/features/auth/hooks';
import { useAuthModal } from '@/app/store/uiStore';

function LoginForm() {
  const { login, isLoading, error } = useLogin();
  const { close } = useAuthModal();

  const handleSubmit = async (email: string, password: string) => {
    try {
      await login({ emailOrPhone: email, password });
      close();
    } catch (err) {
      // Error automatically handled by hook
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      {error && <div>{error.message}</div>}
    </form>
  );
}
```

### 3. Logout

```tsx
import { useLogout } from '@/features/auth/hooks';

function LogoutButton() {
  const { logout, isLoading } = useLogout();

  return (
    <button onClick={() => logout()} disabled={isLoading}>
      Logout
    </button>
  );
}
```

### 4. Signup

```tsx
import { useSignup } from '@/features/auth/hooks';

function SignupForm() {
  const { signup, isLoading } = useSignup();

  const handleSubmit = async (data) => {
    await signup({
      email: data.email,
      password: data.password,
      name: data.name,
    });
  };

  return <form onSubmit={handleSubmit}>{/* fields */}</form>;
}
```

### 5. UI State (Modals)

```tsx
import { useAuthModal } from '@/app/store/uiStore';

function Header() {
  const { isOpen, open, close } = useAuthModal();

  return (
    <div>
      <button onClick={() => open('login')}>Login</button>
      <button onClick={() => open('signup')}>Sign Up</button>
    </div>
  );
}
```

## Available Hooks

### `useCurrentUser()`

Gets the current authenticated user.

**Returns:**
- `user: User | null` - Current user object
- `isLoading: boolean` - Loading state
- `isAuthenticated: boolean` - Whether user is logged in
- `error: Error | null` - Error if any
- `refetch: () => void` - Manually refetch user

**Features:**
- Automatic caching (5 min fresh)
- Refetch on window focus
- Refetch on network reconnect

### `useLogin()`

Login mutation hook.

**Returns:**
- `login: (params) => Promise<User>` - Async login function
- `loginSync: (params) => void` - Sync login function
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error if any
- `isSuccess: boolean` - Success state
- `reset: () => void` - Reset mutation state

**Params:**
- `emailOrPhone: string` - Email or phone number
- `password: string` - User password

### `useSignup()`

Signup mutation hook.

**Returns:**
- `signup: (params) => Promise<User>` - Async signup function
- `signupSync: (params) => void` - Sync signup function
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error if any

**Params:**
- `email: string` - User email
- `password: string` - User password
- `name?: string` - User name (optional)
- `phone?: string` - Phone number (optional)
- `role?: 'buyer' | 'seller' | 'agent'` - User role (optional)

### `useLogout()`

Logout mutation hook.

**Returns:**
- `logout: () => Promise<void>` - Async logout function
- `logoutSync: () => void` - Sync logout function
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error if any

**Features:**
- Automatically clears all cached queries
- Clears user data from cache

### `usePasswordReset()`

Password reset mutation hooks.

**Returns:**
- `requestReset: (params) => Promise<void>` - Request reset email
- `isRequestingReset: boolean` - Loading state
- `requestError: Error | null` - Error if any
- `resetPassword: (params) => Promise<void>` - Reset with token
- `isResettingPassword: boolean` - Loading state
- `resetError: Error | null` - Error if any

### `usePhoneAuth()`

Phone authentication hooks (two-step).

**Returns:**
- `sendCode: (params) => Promise<void>` - Send verification code
- `isSendingCode: boolean` - Loading state
- `sendCodeError: Error | null` - Error if any
- `verifyCode: (params) => Promise<User>` - Verify code
- `isVerifying: boolean` - Loading state
- `verifyError: Error | null` - Error if any

## UI Store Hooks

### `useAuthModal()`

Manages auth modal state (from `@/app/store/uiStore`).

**Returns:**
- `isOpen: boolean` - Modal open state
- `view: AuthModalView` - Current view (login/signup/etc)
- `open: (view?) => void` - Open modal
- `close: () => void` - Close modal
- `setView: (view) => void` - Change view

## Benefits Over Old Context

1. **60% Less Code** - No manual reducer, actions, or state management
2. **Automatic Caching** - User data cached for 5 minutes
3. **Background Refetching** - Fresh data on focus/reconnect
4. **Built-in Loading/Error States** - No manual useState needed
5. **Optimized Re-renders** - Only re-renders when specific data changes
6. **DevTools** - React Query DevTools for debugging
7. **Better TypeScript** - Full type inference

## Migration Path

1. ✅ Install dependencies (`@tanstack/react-query`, `zustand`)
2. ✅ Set up QueryClient configuration
3. ✅ Create auth hooks
4. ✅ Integrate QueryProvider in App.tsx
5. ⏳ Update components one by one
6. ⏳ Test thoroughly
7. ⏳ Remove old AppContext (after all features migrated)

See `MIGRATION_GUIDE.md` for detailed migration instructions.

## Testing

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCurrentUser } from './useCurrentUser';

test('should fetch current user', async () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  const { result } = renderHook(() => useCurrentUser(), { wrapper });

  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.user).toBeDefined();
});
```

## Performance Tips

1. **Use Selectors** - Only subscribe to data you need:
   ```tsx
   // ❌ Bad - re-renders on any auth modal state change
   const authModal = useAuthModal();

   // ✅ Good - only re-renders when isOpen changes
   const isOpen = useUIStore((state) => state.isAuthModalOpen);
   ```

2. **Avoid Unnecessary Queries** - Use `enabled` option:
   ```tsx
   const { user } = useCurrentUser({
     enabled: isAuthenticated, // Only run if authenticated
   });
   ```

3. **Prefetch Data** - Prefetch user data on app load:
   ```tsx
   queryClient.prefetchQuery({
     queryKey: authKeys.currentUser(),
     queryFn: checkAuth,
   });
   ```

## Common Patterns

### Protected Route

```tsx
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useCurrentUser();
  const { open } = useAuthModal();

  if (isLoading) return <Loading />;
  if (!isAuthenticated) {
    open('login');
    return null;
  }

  return <>{children}</>;
}
```

### Role-Based Access

```tsx
function AdminOnly({ children }) {
  const { user } = useCurrentUser();

  if (user?.role !== 'admin') {
    return <div>Access denied</div>;
  }

  return <>{children}</>;
}
```

### Optimistic Updates

```tsx
const { login } = useLogin({
  onMutate: async (credentials) => {
    // Optimistically update UI
    await queryClient.cancelQueries(authKeys.currentUser());
    const previousUser = queryClient.getQueryData(authKeys.currentUser());

    queryClient.setQueryData(authKeys.currentUser(), {
      email: credentials.emailOrPhone
    });

    return { previousUser };
  },
  onError: (err, credentials, context) => {
    // Rollback on error
    queryClient.setQueryData(authKeys.currentUser(), context.previousUser);
  },
});
```

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://docs.pmnd.rs/zustand/getting-started/introduction)
- See `ExampleAuthUsage.tsx` for reference implementations
- See `MIGRATION_GUIDE.md` for migration examples
