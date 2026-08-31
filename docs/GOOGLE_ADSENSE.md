# AdSense network fill

Ad slots on this site are filled in three steps, in order:

1. **A directly-sold banner**, booked through the admin and served from the
   backend (`src/features/ads/api/adBannerApi.ts`), with impression and click
   tracking.
2. **Google AdSense**, as network fill for slots with nothing booked — this is
   what earns revenue on unsold inventory (`components/NetworkAd.tsx`).
3. **The "Your Ad Here" placeholder**, which sends the visitor to the contact
   form as an advertising lead.

This document covers step 2. Steps 1 and 3 are configured in the admin, not in
env.

## Setup

```dotenv
# Publisher id from AdSense → Account → Settings. Required; with it unset,
# no AdSense script is ever requested and slots fall straight through to the
# "Your Ad Here" placeholder.
VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX

# Ad unit ids (AdSense → Ads → By ad unit)
VITE_ADSENSE_SLOT_LEADERBOARD=...   # horizontal units (billboard, leaderboard, rectangle)
VITE_ADSENSE_SLOT_SIDEBAR=...       # tall units (skyscraper, half-page)
VITE_ADSENSE_SLOT=...               # fallback used when the two above are unset
```

These are read at build time, so a change needs a rebuild and redeploy.

`ads.txt` is also required before AdSense will fill inventory. Add
`public/ads.txt` containing your own publisher id:

```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

It is deliberately not committed, since the id belongs to whoever runs the site.

## Consent

`NetworkAd` gates on `marketing` consent from
`src/shared/utils/cookieConsent.ts`. Until the visitor opts in, the AdSense
script is never injected and no unit is rendered — which is what the site's
cookie policy promises. `useNetworkAdFill()` exposes that decision so `AdSlot`
can choose between network fill and the placeholder.

Directly-sold banners are unaffected: they are first-party and set no
advertising cookies, so they serve regardless of consent.

## Sizing

`AdSlot` reserves a standard IAB unit for every slot before anything loads
(`AD_FORMATS`: billboard 970x250, leaderboard 728x90, rectangle 300x250,
skyscraper 160x600, half-page 300x600), and the AdSense `<ins>` fills that
reserved box exactly.

`data-full-width-responsive` is deliberately **off**. That flag lets AdSense
ignore the reserved box and size the unit to the screen instead, which is how
banners end up oversized and drawn over the content beside them. Leave it off,
and create the AdSense units as **Display ad → Fixed size** rather than
"Responsive" so the console does not fight the same setting.

## Unfilled slots

AdSense marks a slot it has no ad for with `data-ad-status="unfilled"`.
`NetworkAd` reports that back through `onUnfilled`, and `AdSlot` then falls
through to the "Your Ad Here" placeholder — so an unsold slot becomes a sales
lead rather than an empty grey box.

## Site verification

The tag is injected by the app after consent rather than hard-coded in
`index.html`. If AdSense asks you to verify the domain, use the **Meta tag** or
**Ads.txt snippet** method rather than the "AdSense code snippet" one.
