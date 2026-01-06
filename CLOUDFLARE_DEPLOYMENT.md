# Deploying BalkanEstate to Cloudflare

This guide explains how to deploy BalkanEstate to production using Cloudflare Pages (frontend) and a Node.js hosting provider (backend).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    balkanestateai.com                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐       ┌──────────────────────┐       │
│  │   Cloudflare Pages   │       │   Railway / Render   │       │
│  │   (Frontend - SPA)   │──────▶│   (Backend - API)    │       │
│  │                      │       │                      │       │
│  │  React + Vite        │       │  Express.js          │       │
│  │  balkanestateai.com  │       │  api.balkanestateai.com      │
│  └──────────────────────┘       └──────────┬───────────┘       │
│                                            │                    │
│                                            ▼                    │
│                                 ┌──────────────────────┐       │
│                                 │   MongoDB Atlas      │       │
│                                 │   (Database)         │       │
│                                 └──────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Part 1: Frontend Deployment (Cloudflare Pages)

### Option A: Deploy via Cloudflare Dashboard (Recommended)

1. **Create a Cloudflare account** at https://dash.cloudflare.com/sign-up

2. **Go to Pages** in the Cloudflare Dashboard

3. **Create a new project**:
   - Click "Create a project"
   - Select "Connect to Git"
   - Authorize Cloudflare to access your GitHub repository
   - Select the `BalkanEstate.com` repository

4. **Configure build settings**:
   ```
   Framework preset: None (or Vite)
   Build command: npm run build
   Build output directory: dist
   Root directory: / (leave empty)
   ```

5. **Set environment variables** (in Cloudflare Dashboard > Pages > Settings > Environment Variables):
   ```
   VITE_API_URL = https://api.balkanestateai.com
   VITE_WS_URL = wss://api.balkanestateai.com
   VITE_GA_ID = your-google-analytics-id (optional)
   VITE_FB_PIXEL_ID = your-facebook-pixel-id (optional)
   ```

6. **Deploy** - Cloudflare will automatically build and deploy your site

7. **Add custom domain**:
   - Go to Pages > Your Project > Custom domains
   - Add `balkanestateai.com`
   - Add `www.balkanestateai.com`
   - Cloudflare will automatically configure DNS if your domain is on Cloudflare

### Option B: Deploy via Wrangler CLI

1. **Install Wrangler**:
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Deploy to Pages**:
   ```bash
   wrangler pages deploy dist --project-name=balkanestateai
   ```

### Option C: GitHub Actions (Automated CI/CD)

The repository includes a GitHub Actions workflow for automated deployments. Set these secrets in your GitHub repository:

```
CLOUDFLARE_API_TOKEN - Create at Cloudflare Dashboard > My Profile > API Tokens
CLOUDFLARE_ACCOUNT_ID - Found in Cloudflare Dashboard URL or Overview page
```

---

## Part 2: Backend Deployment

Since Express.js requires a full Node.js runtime, use one of these platforms:

### Option A: Railway (Recommended)

1. **Create account** at https://railway.app

2. **Create new project** from GitHub:
   - Connect your repository
   - Select the `backend` directory as root

3. **Configure environment variables** in Railway Dashboard:
   ```
   PORT=5001
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   FRONTEND_URL=https://balkanestateai.com
   BACKEND_URL=https://api.balkanestateai.com
   ALLOWED_ORIGINS=https://balkanestateai.com,https://www.balkanestateai.com
   # Add all other env vars from backend/.env.example
   ```

4. **Add custom domain**: `api.balkanestateai.com`

### Option B: Render

1. **Create account** at https://render.com

2. **Create new Web Service**:
   - Connect GitHub repository
   - Root directory: `backend`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

3. **Configure environment variables** (same as Railway)

4. **Add custom domain**: `api.balkanestateai.com`

### Option C: Fly.io

1. **Install flyctl**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login and launch**:
   ```bash
   cd backend
   fly launch
   fly deploy
   ```

---

## Part 3: Database (MongoDB Atlas)

1. **Create account** at https://www.mongodb.com/cloud/atlas

2. **Create a free cluster** (M0 tier is free forever)

3. **Configure network access**:
   - Add `0.0.0.0/0` to allow connections from any IP (for Railway/Render)
   - Or add specific IP addresses for better security

4. **Create database user** with read/write permissions

5. **Get connection string**:
   ```
   mongodb+srv://username:password@cluster.xxxxx.mongodb.net/balkanestate?retryWrites=true&w=majority
   ```

6. **Add to backend environment variables** as `MONGODB_URI`

---

## Part 4: Domain Configuration (Cloudflare DNS)

If your domain `balkanestateai.com` is registered elsewhere, transfer DNS to Cloudflare:

1. **Add site to Cloudflare**:
   - Go to Cloudflare Dashboard
   - Click "Add a Site"
   - Enter `balkanestateai.com`
   - Select Free plan

2. **Update nameservers** at your domain registrar to Cloudflare's nameservers

3. **Configure DNS records**:
   ```
   Type  | Name | Content                      | Proxy
   ------|------|------------------------------|-------
   CNAME | @    | balkanestateai.pages.dev     | Proxied
   CNAME | www  | balkanestateai.pages.dev     | Proxied
   CNAME | api  | your-backend.railway.app     | Proxied
   ```

4. **Enable SSL/TLS**:
   - Go to SSL/TLS settings
   - Set encryption mode to "Full (strict)"

---

## Part 5: Environment Variables Reference

### Frontend (Cloudflare Pages)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://api.balkanestateai.com` |
| `VITE_WS_URL` | WebSocket URL | `wss://api.balkanestateai.com` |
| `VITE_GA_ID` | Google Analytics ID | `G-XXXXXXXXXX` |
| `VITE_FB_PIXEL_ID` | Facebook Pixel ID | `123456789` |
| `GEMINI_API_KEY` | Google Gemini AI API | `AIza...` |

### Backend (Railway/Render)

See `backend/.env.example` for the complete list. Critical variables:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `FRONTEND_URL` | Frontend URL for CORS |
| `ALLOWED_ORIGINS` | Comma-separated allowed origins |
| `CLOUDINARY_*` | Image hosting credentials |
| `STRIPE_*` | Payment processing credentials |
| `RESEND_API_KEY` | Email service API key |

---

## Part 6: Post-Deployment Checklist

- [ ] Frontend loads at `https://balkanestateai.com`
- [ ] API responds at `https://api.balkanestateai.com/api/health`
- [ ] SSL certificates are active (green lock icon)
- [ ] User registration/login works
- [ ] Image uploads work (Cloudinary)
- [ ] Payments work (Stripe - test mode first)
- [ ] Emails are sent (Resend)
- [ ] WebSocket connections work (real-time features)
- [ ] Maps load correctly (Leaflet)
- [ ] All translations load

---

## Troubleshooting

### Frontend Issues

**Blank page after deployment**
- Check browser console for errors
- Verify `VITE_API_URL` is set correctly
- Check `_redirects` file is in the build output

**API requests fail (CORS)**
- Verify `ALLOWED_ORIGINS` includes your frontend URL
- Check API URL doesn't have trailing slash

### Backend Issues

**Connection refused**
- Check `PORT` environment variable
- Verify service is running in Railway/Render logs

**Database connection fails**
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas IP whitelist
- Ensure database user has correct permissions

### DNS Issues

**Domain not resolving**
- Wait 24-48 hours for DNS propagation
- Verify nameservers are updated at registrar
- Check Cloudflare DNS records

---

## Cost Estimate (Monthly)

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Cloudflare Pages | Unlimited sites, 500 builds/month | - |
| Railway | $5 credit/month | ~$5-20/month |
| Render | 750 hours/month | ~$7-25/month |
| MongoDB Atlas | 512MB storage | ~$9+/month |
| **Total** | **~$0-5/month** | **~$20-50/month** |

---

## Quick Deploy Commands

```bash
# Build frontend
npm run build

# Deploy to Cloudflare Pages (after wrangler login)
wrangler pages deploy dist --project-name=balkanestateai

# Check deployment status
wrangler pages deployment list --project-name=balkanestateai
```
