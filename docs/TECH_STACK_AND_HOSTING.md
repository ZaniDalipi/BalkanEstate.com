# BalkanEstate.com - Tech Stack & Hosting Guide

## Tech Stack Overview

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2 | UI framework |
| TypeScript | 5.8 | Type safety |
| Vite | 6.2 | Build tool & dev server |
| Tailwind CSS | 3.x | Styling |
| i18next | 25.x | Multi-language support (Balkan countries) |
| Leaflet | - | Interactive property maps |
| Socket.io Client | - | Real-time messaging |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 5.1 | API server |
| TypeScript | 5.x | Type safety |
| MongoDB | - | Database |
| Mongoose | 8.19 | MongoDB ODM |
| Socket.io | 4.8 | Real-time messaging |
| Passport.js | 0.7 | Authentication (Google, Facebook, Apple) |
| (Pending) | - | Payment provider (see PAYMENT_OPTIONS_2026.md) |
| Resend | 6.6 | Email notifications |
| Nodemailer | 7.0 | SMTP email fallback |
| Cloudinary | - | Image uploads & optimization |
| node-cron | - | Scheduled jobs (weekly stats emails) |

### Database
| Technology | Purpose |
|------------|---------|
| MongoDB | Primary database |
| Mongoose | ODM with schemas |

---

## Hosting Recommendations

### Option 1: Vercel + Railway (Recommended for Starting)
**Total Cost: ~$5-7/month**

| Component | Service | Cost | Notes |
|-----------|---------|------|-------|
| Frontend | Vercel | Free | Auto-deploy from GitHub, global CDN |
| Backend | Railway | $5/mo | Easy Node.js hosting, auto-scaling |
| Database | MongoDB Atlas | Free | 512MB free tier |
| Domain | Porkbun | $10/year | Flat pricing, free privacy |
| Emails | Resend | Free | 3,000 emails/month |

**Pros:**
- Easiest setup
- Auto-deployments from GitHub
- Great for starting out
- Can scale as needed

### Option 2: Render (All-in-One)
**Total Cost: ~$7/month**

| Component | Service | Cost |
|-----------|---------|------|
| Frontend | Render Static | Free |
| Backend | Render Web Service | $7/mo |
| Database | MongoDB Atlas | Free |

**Pros:**
- Single platform
- Simple dashboard
- Good documentation

### Option 3: DigitalOcean Droplet
**Total Cost: ~$6-12/month**

| Component | Service | Cost |
|-----------|---------|------|
| Everything | Droplet | $6-12/mo |
| Database | Same droplet or Atlas | Free-$15/mo |

**Pros:**
- Full control
- Can run everything on one server
- Good for learning DevOps

### Option 4: Hetzner VPS (Cheapest)
**Total Cost: ~€4-8/month**

| Component | Service | Cost |
|-----------|---------|------|
| Everything | Hetzner Cloud | €4.50/mo |

**Pros:**
- Cheapest option
- European servers (good for Balkans)
- Great performance/price ratio

**Cons:**
- Requires server setup knowledge
- Manual deployments (unless you set up CI/CD)

---

## Domain Registration

### Recommended Registrars

| Registrar | .com Price | Renewal | Free Privacy |
|-----------|-----------|---------|--------------|
| **Porkbun** | $10.37/yr | $10.37/yr | Yes |
| **Cloudflare** | $10.44/yr | $10.44/yr | Yes |
| **Namecheap** | $9.98/yr | $14.98/yr | Yes |

**Recommendation:** Porkbun or Cloudflare for flat pricing

### Domain: balkanestateai.com

---

## Email Setup (Resend)

### Configuration
```env
# In backend/.env
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=Balkan Estate <onboarding@resend.dev>
```

### Testing Without Verified Domain
- Use `onboarding@resend.dev` as sender
- Can only send to your Resend account email

### Production Setup
1. Purchase domain (balkanestateai.com)
2. Add domain to Resend dashboard
3. Add DNS records (DKIM, SPF)
4. Update EMAIL_FROM:
```env
EMAIL_FROM=noreply@balkanestateai.com
```

---

## Deployment Checklist

### Before Going Live
- [ ] Purchase domain (balkanestateai.com)
- [ ] Set up hosting (Vercel + Railway recommended)
- [ ] Configure MongoDB Atlas (or Railway database)
- [ ] Set up Resend with verified domain
- [ ] Configure payment provider (see PAYMENT_OPTIONS_2026.md)
- [ ] Set up Cloudinary for images
- [ ] Configure OAuth providers (Google, Facebook, Apple)
- [ ] Set environment variables on hosting platform
- [ ] Test all features in staging
- [ ] Set up error monitoring (Sentry - optional)

### Environment Variables Needed
```env
# Server
NODE_ENV=production
PORT=5001

# Database
MONGODB_URI=mongodb+srv://...

# Authentication
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Frontend URL
FRONTEND_URL=https://balkanestateai.com
BACKEND_URL=https://api.balkanestateai.com

# Payments (configure when provider is selected)
# PAYMENT_PROVIDER_API_KEY=...
# PAYMENT_PROVIDER_WEBHOOK_SECRET=...

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@balkanestateai.com

# Images
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## Quick Start Commands

### Development
```bash
# Frontend
npm run dev

# Backend
cd backend && npm run dev
```

### Production Build
```bash
# Frontend
npm run build

# Backend
cd backend && npm run build
```

### Test Email
```bash
cd backend
npx ts-node scripts/test-email.ts your@email.com
```

---

## Support & Resources

- **Vercel Docs:** https://vercel.com/docs
- **Railway Docs:** https://docs.railway.app
- **MongoDB Atlas:** https://www.mongodb.com/atlas
- **Resend Docs:** https://resend.com/docs
- **Payment Options:** See PAYMENT_OPTIONS_2026.md

---

*Generated for BalkanEstate.com - January 2026*
