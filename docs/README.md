# Balkan Estate - Documentation

Complete documentation for the Balkan Estate web application.

## 📚 Documentation Structure

```
docs/
├── setup/                  # Setup & Configuration
│   ├── frontend/          # Frontend setup guides
│   └── backend/           # Backend setup guides
├── architecture/          # Architecture & Design
├── guides/               # Feature & Integration Guides
└── api/                  # API Documentation
```

## 🚀 Quick Start

### Frontend Setup
1. [Frontend Quick Start](./setup/frontend/QUICK_START.md) - Get started in 5 minutes
2. [Frontend Architecture](./architecture/FRONTEND_ARCHITECTURE.md) - Modern React setup
3. [State Management](./guides/STATE_MANAGEMENT.md) - TanStack Query + Zustand

### Backend Setup
1. [Backend Quick Start](./setup/backend/QUICK_START.md) - Server setup
2. [Database Setup](./setup/backend/DATABASE_SETUP.md) - MongoDB configuration
3. [API Reference](./api/API_REFERENCE.md) - Complete API docs

## 📖 Documentation Sections

### 🔧 Setup & Configuration

#### Frontend
- [Frontend Quick Start](./setup/frontend/QUICK_START.md)
- [Environment Variables](./setup/frontend/ENVIRONMENT.md)
- [Dependencies](./setup/frontend/DEPENDENCIES.md)

#### Backend
- [Backend Quick Start](./setup/backend/QUICK_START.md)
- [Database Setup](./setup/backend/DATABASE_SETUP.md)
- [OAuth Setup](./setup/backend/OAUTH_SETUP.md)
- [Cloudinary Setup](./setup/backend/CLOUDINARY_SETUP.md)
- [Payment Integration](./setup/backend/PAYMENT_SETUP.md)
- [Subscription Setup](./setup/backend/SUBSCRIPTION_SETUP.md)

### 🏗️ Architecture

- [Frontend Architecture](./architecture/FRONTEND_ARCHITECTURE.md) - React + TypeScript + TanStack Query
- [Backend Architecture](./architecture/BACKEND_ARCHITECTURE.md) - Node.js + Express + MongoDB
- [Folder Structure](./architecture/FOLDER_STRUCTURE.md) - Project organization
- [Refactoring Plan](./architecture/REFACTORING_PLAN.md) - Component decomposition strategy

### 📘 Guides

#### Features
- [State Management Guide](./guides/STATE_MANAGEMENT.md) - Using hooks
- [Authentication](./guides/AUTHENTICATION.md) - Login/Signup flows
- [Messaging](./guides/MESSAGING.md) - Real-time conversations
- [Image Upload](./guides/IMAGE_UPLOAD.md) - Optimization techniques

#### Integrations
- [Cadastre Integration](./guides/CADASTRE_INTEGRATION.md) - Property data
- [OAuth Integration](./guides/OAUTH_INTEGRATION.md) - Social login
- [Payment Integration](./guides/PAYMENT_INTEGRATION.md) - Stripe/PayPal
- [Subscription System](./guides/SUBSCRIPTION_GUIDE.md) - Pricing plans

#### Migration
- [Context API → TanStack Query](./guides/MIGRATION_GUIDE.md) - Migration examples
- [Old → New Patterns](./guides/MIGRATION_PATTERNS.md) - Code examples

### 🔌 API

- [API Reference](./api/API_REFERENCE.md) - Complete endpoint documentation
- [Authentication API](./api/AUTH_API.md) - Auth endpoints
- [Properties API](./api/PROPERTIES_API.md) - Property endpoints
- [Agencies API](./api/AGENCIES_API.md) - Agency endpoints
- [Conversations API](./api/CONVERSATIONS_API.md) - Messaging endpoints

## 🎯 Common Tasks

### For Developers

**Starting Development:**
```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
npm install
npm start
```

**Using New Hooks:**
```tsx
import { useProperties } from '@/features/properties/hooks';

function MyComponent() {
  const { properties, isLoading } = useProperties();
  // Auto-cached, auto-refetched!
}
```

**Adding New Features:**
1. Create hooks in `src/features/[feature]/hooks/`
2. Follow existing patterns
3. Use TanStack Query for server state
4. Use Zustand for client state

### For DevOps

**Deployment:**
- [Frontend Deployment](./setup/frontend/DEPLOYMENT.md)
- [Backend Deployment](./setup/backend/DEPLOYMENT.md)
- [Environment Configuration](./setup/ENVIRONMENT.md)

**Monitoring:**
- [Error Tracking](./guides/ERROR_TRACKING.md)
- [Performance Monitoring](./guides/PERFORMANCE.md)

## 📊 Project Status

- ✅ **Phase 1 Complete:** Foundation (TanStack Query + Zustand)
- ✅ **Phase 2 Complete:** All feature hooks migrated (39 hooks)
- 🔄 **Phase 3 In Progress:** Component decomposition
- ⏳ **Phase 4 Pending:** Backend refactoring

See [PROGRESS_REPORT.md](./PROGRESS_REPORT.md) for detailed status.

## 🤝 Contributing

1. Read the [Architecture Guide](./architecture/FRONTEND_ARCHITECTURE.md)
2. Follow [Code Patterns](./guides/CODE_PATTERNS.md)
3. Use [Component Guidelines](./guides/COMPONENT_GUIDELINES.md)
4. Write tests

## 🆘 Need Help?

- **Setup Issues:** Check [Troubleshooting](./guides/TROUBLESHOOTING.md)
- **API Questions:** See [API Reference](./api/API_REFERENCE.md)
- **Architecture Questions:** Read [Architecture Docs](./architecture/)
- **Migration Help:** Check [Migration Guide](./guides/MIGRATION_GUIDE.md)

## 📝 Recent Updates

- **2025-11-28:** Complete architecture refactoring with TanStack Query
- **2025-11-28:** All 39 feature hooks migrated
- **2025-11-28:** Error boundaries and loading states added
- **2025-11-28:** Comprehensive documentation created

## 🔗 Quick Links

- [Getting Started (Frontend)](./setup/frontend/QUICK_START.md)
- [Getting Started (Backend)](./setup/backend/QUICK_START.md)
- [Architecture Overview](./architecture/FRONTEND_ARCHITECTURE.md)
- [API Documentation](./api/API_REFERENCE.md)
- [Migration Guide](./guides/MIGRATION_GUIDE.md)
- [Progress Report](./PROGRESS_REPORT.md)

---

**Need something specific? Use the search or browse by category above.**
