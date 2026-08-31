# Google AdSense

Ads are served through Google AdSense from `src/features/ads`. Nothing renders
until the environment is configured **and** the visitor has consented to
marketing cookies, so a build with no AdSense env vars behaves exactly as the
site did before — no script request, no reserved space, no empty boxes.

## Setup

### 1. Publisher and slot ids

Set the publisher id plus one slot id per placement you want live. Any placement
left unset renders nothing, so you can switch them on one at a time.

```dotenv
# Publisher id from AdSense → Account → Settings
VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX

# One "Display ad" unit per placement (AdSense → Ads → By ad unit)
VITE_ADSENSE_SLOT_HOME_BILLBOARD=...      # home: between the hero stats and the showcase
VITE_ADSENSE_SLOT_HOME_RAIL_LEFT=...      # home: left skyscraper beside the podium sections
VITE_ADSENSE_SLOT_HOME_RAIL_RIGHT=...     # home: right skyscraper beside the podium sections
VITE_ADSENSE_SLOT_HOME_IN_FEED=...        # home: banner further down the page
VITE_ADSENSE_SLOT_SEARCH_LIST=...         # search results, under the cards
VITE_ADSENSE_SLOT_PROPERTY_IN_ARTICLE=... # property page, between the details and the map
VITE_ADSENSE_SLOT_PROPERTY_SIDEBAR=...    # property page, under the contact card
VITE_ADSENSE_SLOT_BLOG_LIST=...           # blog index sidebar
VITE_ADSENSE_SLOT_BLOG_ARTICLE=...        # end of a blog article
VITE_ADSENSE_SLOT_GUIDES=...              # buying guides, before the call to action
VITE_ADSENSE_SLOT_CITY_DASHBOARD=...      # city page, between market data and AI analysis
VITE_ADSENSE_SLOT_ANCHOR=...              # dismissible bar at the bottom of the viewport
```

These are read at build time, so a change needs a rebuild and redeploy.

When you create each unit in AdSense, pick **Display ad → Fixed size**. The app
chooses the size itself (see below) and passes `data-full-width-responsive="false"`;
a unit set to "Responsive" in the AdSense console will fight that.

### 2. `ads.txt`

AdSense will not fill inventory without it. Add `public/ads.txt` containing your
own publisher id:

```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

It is deliberately not committed, since the id belongs to whoever runs the site.

### 3. Site verification

Verify the domain in the AdSense console. The tag is injected by the app after
consent (`src/features/ads/useAdSense.ts`) rather than hard-coded in
`index.html`, so if AdSense asks for a verification snippet in the page head,
use the "Meta tag" or "Ads.txt snippet" verification method instead of the
"AdSense code snippet" one.

## How sizes are chosen

`AdSlot` measures the space it actually has and picks the largest standard IAB
unit that fits — 970x250 → 970x90 → 728x90 → 468x60 → 320x100 for banners,
336x280 → 300x250 → 250x250 for blocks, 300x600 → 160x600 → 120x600 for rails.

This is why the units render at familiar sizes rather than being stretched to
the width of whatever contains them, and why the slot can reserve the right
height before the ad arrives. If not even the smallest unit fits, the slot draws
nothing rather than squeezing a banner in.

## How overlap is prevented

- **In-flow banners** (`AdBanner`) take a row of their own inside the content
  column, so they can only ever sit *between* two sections.
- **Side rails** (`AdRailFrame`) live in the gutter left over beside a centred
  content column — `calc((100% - 72rem) / 2)` — and only above 1536px, where
  that gutter is wide enough to hold one. A section shorter than the rail
  (including one that renders nothing) gets no rails at all, which is what stops
  two rails from stacking on each other.
- **The anchor bar** (`AnchorAd`) is a single claim: a second instance stands
  down instead of drawing over the first. It sits *above* whatever already owns
  the bottom edge (the mobile BottomNav) and publishes its height as
  `--anchor-ad-height`, which `<main>` adds to its bottom padding so the end of
  a page can always be scrolled clear of it. It is dismissible for the session.
- **Unfilled slots collapse.** AdSense marks a slot it cannot fill with
  `data-ad-status="unfilled"`; the slot then removes itself rather than leaving
  a gap.

## Where ads do and don't appear

Ads are kept off private and transactional views — admin, the agency dashboard,
analytics, the inbox, account, listing creation, agency signup and payment,
pricing, and the password-reset / email-verification pages. The list lives in
`AD_FREE_VIEWS` in `src/features/ads/adsConfig.ts`.

They are also suppressed on full-height views (search/map, inbox, property
details) for the anchor bar specifically, since those own the bottom of the
screen with their own bars.

## Consent

`useAdSense` gates everything on `marketing` consent from
`src/shared/utils/cookieConsent.ts`. Until the visitor opts in, the AdSense
script is never requested. Withdrawing consent stops new slots from rendering;
a reload clears the ones already on the page.
