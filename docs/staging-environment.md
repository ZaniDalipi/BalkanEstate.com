# Staging Environment

This document describes the staging environment setup for BalkanEstateAI.

## Overview

The staging environment mirrors production but uses separate databases, API keys (test mode), and is accessible at a different URL. It's designed for QA testing and pre-production validation.

| Component | Staging URL | Production URL |
|-----------|------------|----------------|
| Frontend  | https://staging.balkanestateai.com | https://balkanestateai.com |
| Backend API | https://staging-api.balkanestateai.com | https://api.balkanestateai.com |
| Cloudflare Preview | https://staging.balkanestateai.pages.dev | https://balkanestateai.pages.dev |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Staging Environment                │
│                                                      │
│  ┌──────────────┐     ┌──────────────────────────┐  │
│  │  Cloudflare   │     │  Railway / Docker Host    │  │
│  │  Pages        │────▶│  Backend API              │  │
│  │  (Frontend)   │     │  (Node.js + Express)      │  │
│  └──────────────┘     └──────────┬───────────────┘  │
│                                   │                   │
│                        ┌──────────▼───────────────┐  │
│                        │  MongoDB Atlas            │  │
│                        │  (staging database)       │  │
│                        └──────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### Local Staging (Docker)

```bash
# 1. Copy and configure backend staging env
cp backend/.env.staging.example backend/.env.staging
# Edit backend/.env.staging with your values

# 2. Build and run staging containers
docker compose -f docker-compose.staging.yml up -d

# 3. Access
# Frontend: http://localhost:3000
# Backend:  http://localhost:5001
```

### Local Staging (Development Server)

```bash
# Frontend (staging mode)
npm run dev:staging

# Backend (staging mode)
cd backend && npm run dev:staging
```

## Deployment

### Automatic (CI/CD)

Staging deploys automatically when:
- Code is pushed to the `develop` or `staging` branch
- A pull request is opened against `main`
- The workflow is manually triggered

See `.github/workflows/deploy-staging.yml` for the full pipeline.

### Manual Deployment

```bash
# Deploy frontend to Cloudflare Pages staging
npm run build:staging
npx wrangler pages deploy dist-staging --project-name=balkanestateai --branch=staging

# Deploy backend via Docker
docker compose -f docker-compose.staging.yml up -d --build backend
```

### Via GitHub Actions

Go to **Actions** → **Deploy** → **Run workflow** → Select **staging**.

## Environment Variables

### Frontend (`.env.staging`)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Staging backend API URL | Yes |
| `VITE_WS_URL` | Staging WebSocket URL | Yes |
| `VITE_ENVIRONMENT` | Set to `staging` | Yes |
| `VITE_SENTRY_DSN` | Sentry DSN for staging | No |
| `VITE_GA_ID` | Google Analytics (usually disabled) | No |

### Backend (`backend/.env.staging`)

See `backend/.env.staging.example` for the full list. Key differences from production:

- **Database**: Uses a separate `balkanestate-staging` database
- **Stripe**: Uses **test mode** keys (`sk_test_...`, `pk_test_...`)
- **CORS**: Allows staging frontend origins
- **Email**: Uses staging sender address

### GitHub Secrets (for CI/CD)

Add these secrets to your GitHub repository for staging deployments:

| Secret | Description |
|--------|-------------|
| `STAGING_VITE_API_URL` | Staging API URL |
| `STAGING_SENTRY_DSN` | Staging Sentry DSN |
| `STAGING_RAILWAY_TOKEN` | Railway deploy token (if using Railway) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (shared with production) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID (shared with production) |

## Key Differences from Production

| Aspect | Staging | Production |
|--------|---------|------------|
| Database | `balkanestate-staging` | `balkanestate` |
| Stripe | Test mode keys | Live mode keys |
| Analytics | Disabled | Enabled |
| Source maps | Enabled | Disabled |
| Console logs | Visible | Stripped |
| Minification | Disabled | Enabled |
| Staging banner | Visible (yellow bar) | Hidden |
| Robots | `noindex, nofollow` | `index, follow` |

## Staging Banner

When the frontend is built in staging mode, a yellow "STAGING ENVIRONMENT" banner appears at the top of every page. This is implemented in `src/app/components/StagingBanner.tsx` and only renders when `VITE_ENVIRONMENT=staging`.

## Build Outputs

| Mode | Command | Output Directory |
|------|---------|-----------------|
| Development | `npm run dev` | N/A (dev server) |
| Staging | `npm run build:staging` | `dist-staging/` |
| Production | `npm run build` | `dist/` |

## Troubleshooting

### Frontend not connecting to staging API

Check that `VITE_API_URL` is set correctly in `.env.staging` and that the staging backend is running and accessible.

### CORS errors

Ensure the staging backend's `ALLOWED_ORIGINS` includes the staging frontend URL (e.g., `https://staging.balkanestateai.com`).

### Staging banner not showing

Verify `VITE_ENVIRONMENT=staging` is set in the environment when building.
