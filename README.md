<div align="center">

<img src="public/icons/BalkanEstateAILogo.svg" alt="BalkanEstateAI logo" width="96" />

# BalkanEstateAI

**One map. Ten countries. Ten languages. Every home in the Balkans.**

The AI-powered real estate marketplace for buying, renting and selling property across the whole Balkan peninsula, from the Adriatic coast to the Black Sea.

[![Live site](https://img.shields.io/badge/live-balkanestateai.com-0ea5e9?style=for-the-badge)](https://balkanestateai.com)

![React](https://img.shields.io/badge/React_18-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript_5.8-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-06B6D4?logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=socketdotio&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare_Pages_+_R2-F38020?logo=cloudflare&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa&logoColor=white)

</div>

---

## Why BalkanEstateAI?

Property search in the Balkans is split up: one portal per country, a different language on each, and listings spread across agencies that don't talk to each other. BalkanEstateAI puts all of it on one platform.

| | |
|---|---|
| 🌍 **10 countries** | Serbia · Montenegro · Croatia · Bosnia & Herzegovina · North Macedonia · Albania · Kosovo · Bulgaria · Romania · Greece |
| 🗣️ **10 languages** | English, Albanian, Serbian, Bulgarian, Croatian, Bosnian, Macedonian, Montenegrin, Romanian, Greek, each with its own URL prefix (`/en/…`, `/sq/…`) |
| 🤖 **AI search** | Describe the home you want in plain words (*"sea-view 2-bed in Budva under €200k"*) and get results |
| 🗺️ **Map first** | Clustered markers, heatmaps, cadastre layers and neighbourhood insights |

## ✨ Features

### For buyers and renters
- **Natural-language search** powered by Google Gemini, plus classic filters that are saved between visits
- **Interactive maps** built on MapLibre and Leaflet, with clustering, heatmaps, saved map areas and cadastre overlays
- **AI property valuation**: a free price estimate for any Balkan property
- **Calculators** for mortgage payments, affordability and rental yield
- **Compare** listings side by side, **save** homes, searches, agents and cities
- **City guides** and country-specific **buying guides for foreigners**
- **AI room styler** to picture a space redecorated
- **Real-time messaging** with sellers and agents over WebSockets, plus web push notifications

### For sellers, agents and agencies
- **Listing editor** with photo compression, HEIC support, video and floor plans with photo-spot markers
- **Agent profiles** and **agency pages** with team invitations, join requests and a dedicated **agency dashboard**
- **View stats and analytics**, including weekly performance emails
- **Promotions and featured listings** with subscription plans, coupons and discount codes
- **Inquiries inbox** and lead management

### Platform
- **Installable PWA** with offline support and layouts tuned for phones in portrait and landscape
- **SEO built in**: prerendered pages, dynamic sitemaps, Open Graph images rendered at the edge, and `llms.txt`
- **Admin console** for content, users, ad bookings and moderation
- **Security**: in-memory access tokens, rotating httpOnly refresh cookies, CSRF double-submit, encrypted responses on sensitive endpoints, DOMPurify sanitisation

## 🏗️ Architecture

```
Browser
  └── React SPA (Vite, PWA)
        ├── React Router 7           the URL decides the page, under /:lang
        ├── TanStack Query           server state
        ├── Zustand                  filters & UI state
        ├── react-i18next            10 languages
        └── Feature slices  ──HTTP / WebSocket──►  Express API (Node.js, TypeScript)
                                                     ├── MongoDB (Mongoose)
                                                     ├── Socket.io (messaging)
                                                     ├── Gemini (AI search & valuation)
                                                     ├── Cloudflare R2 (media)
                                                     ├── Resend (email)
                                                     └── Paysera (payments)

Cloudflare Pages Functions ── OG images, sitemaps, SEO for shared links
```

The frontend uses **feature-sliced design**: each feature in `src/features/<name>/` owns its `api`, `components`, `hooks` and `types`. See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the details.

## 📁 Project structure

```
.
├── src/
│   ├── app/            router, providers, stores, error boundaries
│   ├── features/       ~40 feature slices (search, map, property-details, messaging, valuation, …)
│   ├── components/     shared UI (property, map, search, seo, ui)
│   ├── shared/         httpClient, query keys, validation, utilities
│   └── i18n/           i18n setup
├── backend/
│   └── src/            Express routes, controllers, models, services, sockets, cron jobs
├── functions/          Cloudflare Pages Functions (OG tags, sitemaps)
├── public/             static assets, locales, icons, llms.txt
├── e2e/                Playwright end-to-end tests
├── docs/               guides, API docs, setup and integration notes
└── docker-compose.yml  local MongoDB + backend
```

## 🚀 Getting started

### Prerequisites
- **Node.js 20+** and npm
- **MongoDB 7** (local install, Atlas, or the bundled Docker Compose)

### 1. Clone and install

```bash
git clone https://github.com/ZaniDalipi/BalkanEstate.com.git
cd BalkanEstate.com
npm install
(cd backend && npm install)
```

### 2. Configure the environment

```bash
cp .env.example .env                    # frontend (only VITE_* vars, never secrets)
cp backend/.env.example backend/.env    # backend: database, auth, media, email, AI keys
```

Without map API keys the app uses keyless OpenStreetMap tiles, so you can start with no keys at all.

### 3. Run it

```bash
# Option A: MongoDB + backend in Docker
docker compose up -d

# Option B: run the backend yourself
cd backend && npm run setup:db && npm run dev    # API on http://localhost:5001

# Then the frontend
npm run dev                                       # app on http://localhost:3000
```

Seed demo data with `cd backend && npm run seed:all`.

## 🧪 Testing

```bash
npm test                 # Vitest unit tests (watch)
npm run test:run         # Vitest, single run
npm run test:coverage    # coverage report
npm run test:e2e         # Playwright end-to-end tests
npm run test:all         # everything

cd backend && npm test   # Jest + in-memory MongoDB
```

More in [`TESTING.md`](TESTING.md).

## 📦 Build and deploy

```bash
npm run build      # production build + prerendered pages in dist/
npm run preview    # serve the build locally
```

Pushes to `main` run [GitHub Actions](.github/workflows/deploy.yml), which builds the app and deploys the frontend to **Cloudflare Pages**. The API is deployed separately (Railway or Render). Hosting options and costs are compared in [`docs/TECH_STACK_AND_HOSTING.md`](docs/TECH_STACK_AND_HOSTING.md).

## 📚 Documentation

| Doc | What's inside |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | System design, routing, state management |
| [`DOCUMENTATION.md`](DOCUMENTATION.md) | Full project documentation |
| [`TESTING.md`](TESTING.md) | Test strategy and tooling |
| [`backend/README.md`](backend/README.md) | API server setup and endpoints |
| [`docs/`](docs/README.md) | Payments, subscriptions, media storage, translations, SEO and more |

---

<div align="center">

Built for the Balkans 🇷🇸 🇲🇪 🇭🇷 🇧🇦 🇲🇰 🇦🇱 🇽🇰 🇧🇬 🇷🇴 🇬🇷

**[balkanestateai.com](https://balkanestateai.com)**

</div>
