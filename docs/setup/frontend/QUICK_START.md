# Frontend Quick Start

Get the Balkan Estate frontend running in 5 minutes.

## Prerequisites

- Node.js 18+
- npm or yarn
- Git

## Installation

### 1. Clone & Install

```bash
# Clone repository
git clone <repository-url>
cd BalkanEstateWebVersion

# Install dependencies
npm install
```

### 2. Environment Setup

Create `.env` file:

```env
# API
VITE_API_URL=http://localhost:5000/api

# Cloudinary (for images)
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset

# OAuth (optional)
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_FACEBOOK_APP_ID=your_facebook_app_id

# Features
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_SOCIAL_LOGIN=true
```

### 3. Start Development Server

```bash
npm run dev
```

App runs at `http://localhost:5173`

## Project Structure

```
src/
├── app/                    # App configuration
│   ├── config/            # Query client, etc.
│   ├── providers/         # React providers
│   ├── store/             # Zustand stores
│   └── components/        # Error boundaries, loading
├── features/              # Feature modules
│   ├── auth/             # Authentication
│   ├── properties/       # Property management
│   ├── agencies/         # Agency management
│   ├── conversations/    # Messaging
│   └── saved/            # Saved items
├── components/           # Shared components
├── utils/               # Utilities
└── types/               # TypeScript types
```

## Key Technologies

- **React 18** - UI library
- **TypeScript** - Type safety
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## Using the New Hooks

### Properties

```tsx
import { useProperties, useProperty } from '@/features/properties/hooks';

function PropertyList() {
  const { properties, isLoading } = useProperties();

  if (isLoading) return <div>Loading...</div>;

  return properties.map(p => <PropertyCard key={p.id} property={p} />);
}

function PropertyDetails({ id }) {
  const { property, isLoading } = useProperty(id);

  return <div>{property?.title}</div>;
}
```

### Authentication

```tsx
import { useCurrentUser, useLogin } from '@/features/auth/hooks';

function Header() {
  const { user, isAuthenticated } = useCurrentUser();
  const { login, isLoading } = useLogin();

  const handleLogin = async () => {
    await login({ emailOrPhone: email, password });
  };

  return <div>Welcome {user?.name}</div>;
}
```

### Favorites

```tsx
import { useToggleFavorite } from '@/features/properties/hooks';

function FavoriteButton({ property }) {
  const { toggleFavorite, isToggling } = useToggleFavorite();

  return (
    <button
      onClick={() => toggleFavorite(property)}
      disabled={isToggling}
    >
      ♥
    </button>
  );
}
```

## Common Tasks

### Adding a New Feature

1. Create folder in `src/features/[feature-name]/`
2. Create query keys: `api/[feature]Keys.ts`
3. Create hooks: `hooks/use[Feature].ts`
4. Export from `hooks/index.ts`

### Using UI State

```tsx
import { useAuthModal } from '@/app/store/uiStore';

function LoginButton() {
  const { open } = useAuthModal();

  return <button onClick={() => open('login')}>Login</button>;
}
```

### Handling Errors

```tsx
import { ErrorBoundary } from '@/app/components';

function App() {
  return (
    <ErrorBoundary level="route">
      <MyPage />
    </ErrorBoundary>
  );
}
```

## Development Workflow

### Hot Module Replacement
Changes reload instantly in browser.

### TypeScript
Full type checking:
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### Building
```bash
npm run build
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5173
npx kill-port 5173
```

### Install Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### API Connection Issues
Check `VITE_API_URL` in `.env` matches backend URL.

## Next Steps

- [Environment Setup](./ENVIRONMENT.md) - Detailed env vars
- [Architecture Guide](../../architecture/FRONTEND_ARCHITECTURE.md) - How it works
- [State Management](../../guides/STATE_MANAGEMENT.md) - Using hooks
- [Component Guidelines](../../guides/COMPONENT_GUIDELINES.md) - Best practices

## Useful Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run linter
npm run type-check   # Check TypeScript
```

## DevTools

- **React Query DevTools** - Bottom right corner (dev only)
- **React DevTools** - Browser extension
- **Redux DevTools** - For Zustand (browser extension)

## Getting Help

- Check [Troubleshooting Guide](../../guides/TROUBLESHOOTING.md)
- Read [API Reference](../../api/API_REFERENCE.md)
- See [Migration Guide](../../guides/MIGRATION_GUIDE.md)

---

**Ready to develop!** Open `http://localhost:5173` and start coding. 🚀
