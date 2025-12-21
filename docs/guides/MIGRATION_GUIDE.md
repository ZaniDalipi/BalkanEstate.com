# Auth Feature Migration Guide

## Overview

This guide shows how to migrate from the old Context API approach to the new TanStack Query + Zustand approach.

## Key Benefits

### Before (Context API)
- ❌ Manual state management with reducers
- ❌ No automatic caching or refetching
- ❌ Re-renders on any state change
- ❌ Manual error handling
- ❌ ~300+ lines of reducer code

### After (TanStack Query + Zustand)
- ✅ Automatic caching and background refetching
- ✅ Optimized re-renders with selectors
- ✅ Built-in error and loading states
- ✅ ~60% less code
- ✅ Better TypeScript support

## Migration Examples

### 1. Getting Current User

**Before (AppContext):**
```tsx
import { useAppContext } from '../context/AppContext';

function MyComponent() {
  const { state, checkAuth } = useAppContext();
  const { currentUser, isAuthenticating, isAuthenticated } = state;

  useEffect(() => {
    checkAuth();
  }, []);

  if (isAuthenticating) return <div>Loading...</div>;

  return <div>Hello {currentUser?.name}</div>;
}
```

**After (TanStack Query):**
```tsx
import { useCurrentUser } from '../features/auth/hooks';

function MyComponent() {
  const { user, isLoading, isAuthenticated } = useCurrentUser();

  if (isLoading) return <div>Loading...</div>;

  return <div>Hello {user?.name}</div>;
}
```

### 2. Login

**Before (AppContext):**
```tsx
import { useAppContext } from '../context/AppContext';

function LoginForm() {
  const { dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const user = await api.login(email, password);
      dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: true, user } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleLogin(email, password);
    }}>
      {/* form fields */}
    </form>
  );
}
```

**After (TanStack Query):**
```tsx
import { useLogin } from '../features/auth/hooks';
import { useAuthModal } from '../app/store/uiStore';

function LoginForm() {
  const { login, isLoading, error } = useLogin();
  const { close } = useAuthModal();

  const handleLogin = async (email: string, password: string) => {
    try {
      await login({ emailOrPhone: email, password });
      close(); // Close modal on success
    } catch (err) {
      // Error is automatically handled by the hook
      console.error('Login failed');
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleLogin(email, password);
    }}>
      {/* form fields */}
      {error && <div className="error">{error.message}</div>}
    </form>
  );
}
```

### 3. Logout

**Before (AppContext):**
```tsx
import { useAppContext } from '../context/AppContext';

function LogoutButton() {
  const { dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await api.logout();
      dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: false, user: null } });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return <button onClick={handleLogout} disabled={loading}>Logout</button>;
}
```

**After (TanStack Query):**
```tsx
import { useLogout } from '../features/auth/hooks';

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

**Before (AppContext):**
```tsx
import { useAppContext } from '../context/AppContext';

function SignupForm() {
  const { dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);

  const handleSignup = async (data) => {
    setLoading(true);
    try {
      const user = await api.signup(data.email, data.password, { name: data.name });
      dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: true, user } });
    } finally {
      setLoading(false);
    }
  };

  return <form onSubmit={handleSignup}>{/* fields */}</form>;
}
```

**After (TanStack Query):**
```tsx
import { useSignup } from '../features/auth/hooks';

function SignupForm() {
  const { signup, isLoading } = useSignup();

  const handleSignup = async (data) => {
    await signup({
      email: data.email,
      password: data.password,
      name: data.name,
    });
  };

  return <form onSubmit={handleSignup}>{/* fields */}</form>;
}
```

### 5. UI State (Modals)

**Before (AppContext - mixed concerns):**
```tsx
const { state, dispatch } = useAppContext();

// Open auth modal
dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });

// Check if open
const isOpen = state.isAuthModalOpen;
```

**After (Zustand - separated UI state):**
```tsx
import { useAuthModal } from '../app/store/uiStore';

const { isOpen, view, open, close, setView } = useAuthModal();

// Open auth modal
open('login');

// Close auth modal
close();
```

## State Management Strategy

### TanStack Query (Server State - 75%)
Use for:
- ✅ Current user data
- ✅ User profile
- ✅ Authentication status

### Zustand (Client State - 20%)
Use for:
- ✅ Modal open/closed state
- ✅ Active modal view (login/signup/forgot password)
- ✅ UI preferences

### useState (Component State - 5%)
Use for:
- ✅ Form input values
- ✅ Local validation errors
- ✅ Temporary UI state

## Files to Update

### Components Using Auth
1. `components/AuthModal.tsx` - Update to use new hooks
2. `components/Header.tsx` - Update user display
3. `pages/AccountPage.tsx` - Update profile display
4. Any component checking `isAuthenticated`

### App Setup
1. Wrap app with `QueryProvider` (already created)
2. Keep `UIStore` for modal state (already created)
3. Remove old `AppContext` provider (after migration complete)

## Benefits Summary

| Feature | Before (Context) | After (TanStack Query) |
|---------|------------------|------------------------|
| Code Lines | ~300+ (reducer) | ~120 (hooks) |
| Caching | Manual | Automatic |
| Refetching | Manual | Automatic |
| Loading States | Manual useState | Built-in |
| Error Handling | Manual try/catch | Built-in + retry |
| TypeScript | Partial | Full |
| Performance | Re-renders on any change | Optimized selectors |
| DevTools | None | React Query DevTools |

## Next Steps

1. ✅ Auth hooks created
2. ⏳ Update App.tsx to use QueryProvider
3. ⏳ Update auth components to use new hooks
4. ⏳ Test authentication flow
5. ⏳ Remove old AppContext code (after all features migrated)
