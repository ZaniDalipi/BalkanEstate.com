# BalkanEstate.com — Architecture

## System Overview

```
Browser
  └── React SPA (Vite)
        ├── AppContext (useReducer — global state)
        ├── react-i18next (10 languages)
        ├── React Router v6
        └── Feature modules
              └── HTTP / WebSocket
                    └── Express API (Node.js)
                          └── MongoDB (Mongoose)
                                └── Cloudinary (image CDN)
```

---

## Frontend Architecture

### Feature-Sliced Design
Code is organised by **feature**, not by type. Each feature owns its components, hooks, and API calls.

```
src/features/
├── property-details/     # Single property view (orchestrator page)
├── properties/           # List views, search, hooks
├── rental/               # Rent-specific modals and calculators
├── messaging/            # Real-time inbox
├── agents/               # Agent profiles and directory
├── home/                 # Homepage sections
├── calculators/          # Mortgage & affordability
└── ...

src/components/property/  # Shared property UI (used by multiple features)
├── PropertyGallery.tsx   # Image carousel + video + street view
├── PropertyInfo.tsx      # Stats grid + description + amenities
├── PropertyContact.tsx   # Seller sidebar (desktop) + contact actions
├── PropertyPhotos.tsx    # Thumbnail strip
├── PropertyMapLink.tsx
└── NeighborhoodInsights.tsx
```

### Global State
`AppContext` (React Context + `useReducer`) holds:
- `currentUser` / `user`
- `savedHomes`, `comparisonList`
- Active view / selected property / agent / agency
- Alert / notification queue

### Data Fetching
- Custom hooks in `src/features/*/hooks/` (e.g. `useProperty`, `useRealtimeProperties`)
- Direct `apiService.ts` calls for mutations
- WebSocket for real-time property updates

---

## Property Gallery — Dynamic Aspect Ratio

**Problem**: fixed-height containers cause dark letterbox bars or cropped images when the image aspect ratio doesn't match.

**Solution**: the container height is derived from each image's actual pixel dimensions.

```
ImageRatiosRef (useRef<Record<url, ratio>>)
    │
    ├── populated by: img onLoad → naturalWidth / naturalHeight
    ├── populated by: callback ref (handles already-cached images)
    └── read by: container style={{ aspectRatio: ratio ?? '16/9' }}
```

Key decisions:
- **Never reset ratio to null** when navigating — keeps previous ratio until new one loads (avoids flash to 16/9).
- **Cache by URL** — navigating back to a seen image applies ratio instantly.
- **`max-h: 90vh`** prevents portrait images from overflowing the viewport.
- `object-contain` ensures the full image is always visible; LQIP blurred background fills any bars.

---

## Sticky Bottom Action Bar

Mobile-only companion to the desktop `PropertyContact` sidebar.

```
PropertyDetailsPage (mobile viewport)
  └── Fixed bottom bar [lg:hidden]
        ├── Agent avatar  ← onError fallback to initials + ripple-ring animation
        ├── Call button   ← tel: link
        └── Schedule Tour ← opens own ScheduleViewingModal instance
```

Visibility rules:
- Hidden when `isOwner === true`
- Hidden when `property.status === 'sold'`
- Hidden on `lg:` and above (sidebar takes over)

---

## Internationalisation (i18n)

**Library**: `react-i18next`
**Locales**: `src/i18n/locales/{lang}/{namespace}.json`

| Language | Code |
|----------|------|
| English  | `en` |
| Albanian | `sq` |
| Bosnian  | `bs` |
| Bulgarian | `bg` |
| Croatian | `hr` |
| Greek    | `el` |
| Macedonian | `mk` |
| Montenegrin | `me` |
| Romanian | `ro` |
| Serbian  | `sr` |

### Naming Convention — property stats
| Label | Correct key | Deprecated key |
|-------|-------------|----------------|
| Bedrooms | `features.bedrooms` | ~~`features.beds`~~ |
| Bathrooms | `features.bathrooms` | ~~`features.baths`~~ |
| Living Rooms | `features.livingRooms` | — |
| Area | `features.area` | — |

**Rule**: every new translation key must be added to all 10 locales simultaneously.

---

## Icon System (`constants/icons.ts`)

All icons are stroke-based SVG components built with `React.createElement` (the file uses `.ts` extension, not `.tsx`).

```ts
// Base wrappers
const Icon      // stroke icons  (fill="none", strokeWidth=1.5)
const SolidIcon // filled icons  (fill="currentColor")

// Property stat icons (24×24 viewBox, multiple <path> children)
BedIcon         // bed: headboard post, mattress, pillows, footboard
BathIcon        // bathtub: tub body, faucet pipe, drain legs
LivingRoomIcon  // sofa: backrest, armrests, cushion, divider, legs
SqftIcon        // expand arrows (area/m²)
```

---

## Schedule Viewing Modal

3-step wizard:

```
Step 1: datetime
  ├── Date grid (next 21 days, filtered by seller's allowed days)
  └── Time pills (horizontal scroll, 12h AM/PM format, booked slots disabled)

Step 2: contact details
  └── Name*, Email*, Phone (optional)

Step 3: confirm
  └── Summary + Add to Calendar (.ics download)
```

Availability source priority:
1. `GET /viewings/availability/{propertyId}` (includes booked slots)
2. `property.visitAvailability` (local config, no booked-slot info)
3. Default: Mon–Fri, 09:00–18:00, 30-min slots

---

## Cloudinary Image Pipeline

```
Raw URL → optimizeCloudinaryUrl(url, { width, quality }) → <img src>
                                                          → cloudinarySrcSet([480,768,1200,1920])
```

- LQIP (Low-Quality Image Placeholder): `width: 40, quality: 'auto:eco'` loaded immediately
- Full image: `width: 1200, quality: 'auto'` with srcSet for responsive delivery
- Avatar thumbnails: `width: 80-96, quality: 'auto', crop: 'fill'`
- Never use raw Cloudinary URLs — always go through the helper.

---

## Google AdSense Integration

```
src/features/ads/
├── types/index.ts          # AdSlot interface + AD_SLOTS registry
├── hooks/useAdSense.ts     # Script loader (singleton) + shouldShowAds gate
├── components/
│   ├── AdUnit.tsx          # Core <ins> renderer — calls adsbygoogle.push once per mount
│   ├── AdBanner.tsx        # Horizontal leaderboard / footer strip
│   ├── AdInFeed.tsx        # Native in-feed unit between property cards
│   ├── AdSidebar.tsx       # 300×250 rectangle for detail page sidebar
│   └── AdInArticle.tsx     # In-article unit between content sections
└── __tests__/
    ├── useAdSense.test.ts
    └── AdUnit.test.tsx
```

### Ad visibility gate

| User state | Sees ads? |
|------------|-----------|
| Unauthenticated | Yes |
| `subscription.tier === 'free'` | Yes |
| `tier === 'buyer'` (€3/month — ad-free is a feature) | No |
| `tier === 'pro'` | No |
| `tier === 'agency_owner'` / `agency_agent` | No |
| Auth loading | No (avoids flash) |

### Script loading strategy

`useAdSense` uses a **module-level singleton** (`scriptState` + `listeners` Set) so the AdSense `<script>` tag is injected into `<head>` exactly once regardless of how many ad components are mounted simultaneously. The script is loaded **lazily** — only when a component eligible to show ads first mounts — so paid users never trigger the network request.

### Environment

`VITE_ADSENSE_PUBLISHER_ID` — if absent, all components return `null` silently (local dev / tests pass without any AdSense account).

---

## Security Notes
- All API mutations use CSRF cookie (`credentials: 'include'`)
- JWT stored in httpOnly cookies (not localStorage)
- Input sanitisation on the Express layer
- Image uploads validated by Cloudinary (type + size limits on the backend)
