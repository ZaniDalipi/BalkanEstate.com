# AdSense setup

Publisher id for this site: **`ca-pub-8280125236799216`**

## How a slot decides what to show

Every ad slot fills in this order, and the first one that works wins:

1. **A banner booked in the admin** for that page + placement — served from the
   backend, with impression and click tracking. Uploading one here replaces
   whatever the slot was showing.
2. **Google AdSense**, when the slot has nothing booked. This is what earns
   money on unsold space.
3. **The "Your Ad Here" placeholder**, which sends the visitor to the contact
   form as an advertising lead — shown when AdSense has no ad either.

So an admin upload always wins, and an empty slot is never wasted.

The one exception is the sticky bottom bar: it has no placeholder state, so
when nothing is booked and AdSense has nothing, it renders nothing at all
rather than pinning an empty bar over the page.

## 1. Verify the site

Either method works — the tag and ads.txt are both in place.

**AdSense code snippet** — the tag is in `index.html`, on every one of the 531
prerendered pages:

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8280125236799216"
     crossorigin="anonymous"></script>
```

**Ads.txt snippet** — `public/ads.txt` is committed with the same publisher id:

```
google.com, pub-8280125236799216, DIRECT, f08c47fec0942fa0
```

`ads.txt` is required regardless of how you verify: AdSense will not fill
inventory without it. Deploy first, confirm
`https://balkanestateai.com/ads.txt` returns that line, then Verify.

### Why the tag loads but ads still wait for consent

The line above the tag in `index.html` matters:

```html
<script>
  (window.adsbygoogle = window.adsbygoogle || []).pauseAdRequests = 1;
</script>
```

Loading the tag and *requesting an ad* are two different things, and only the
second sets advertising cookies. Pausing on load means Google's verifier and
crawler always find the tag, while no ad is requested until the visitor accepts
marketing cookies — `NetworkAd` releases the pause at that moment. Removing
that line would start requesting ads on page load, before anyone has consented.

## 2. Create the ad units

In AdSense → **Ads → By ad unit → Display ad**, choose **Fixed size** (not
Responsive — the app picks the size itself). Create:

| Unit | Size | Used for |
|---|---|---|
| Leaderboard | 728x90 | in-content banners |
| Sidebar | 300x600 | side rails, property sidebar |
| Sticky *(optional)* | 728x90 | the bottom bar |

## 3. Set the environment variables

There is no `.env` in the repo (they are all gitignored), so add these wherever
the deploy builds from:

The publisher id is already the built-in default and is in the tag in
`index.html`, so only the unit ids are actually required:

```dotenv
VITE_ADSENSE_SLOT_LEADERBOARD=<leaderboard unit id>
VITE_ADSENSE_SLOT_SIDEBAR=<sidebar unit id>

# Only needed to point the app at a different AdSense property; it does not
# change the tag in index.html, so change both together if you ever do.
# VITE_ADSENSE_CLIENT=ca-pub-8280125236799216

# Optional. The bottom bar stays off entirely unless this is set — it is the
# most intrusive unit on the site, so it never turns itself on.
VITE_ADSENSE_SLOT_STICKY=<sticky unit id>

# Optional fallback used by any slot whose specific id above is unset.
VITE_ADSENSE_SLOT=<any unit id>
```

These are read at **build time**, so a change needs a rebuild and redeploy.
Until a format has a unit id, its slots fall straight through to the "Your Ad
Here" placeholder and no ad is requested for them.

## 4. Request review

Once ads.txt verifies and the units are live, use **Request review** in the
AdSense console.

## Consent

`NetworkAd` gates on `marketing` consent from
`src/shared/utils/cookieConsent.ts`: until the visitor opts in, ad requests
stay paused and no unit renders. That is what the site's cookie policy
promises.

Two consequences worth knowing:

- **A visitor who declines marketing cookies sees the "Your Ad Here"
  placeholder**, not an ad. Banners booked in the admin are first-party and set
  no advertising cookies, so those keep serving either way.
- **For EEA traffic Google requires a certified CMP.** The current banner is
  a homegrown one. If a meaningful share of traffic is European, check whether
  AdSense accepts it or whether a certified CMP is needed before review.

## Sizing

`AdSlot` reserves a standard IAB unit before anything loads (`AD_FORMATS`:
billboard 970x250, leaderboard 728x90, rectangle 300x250, skyscraper 160x600,
half-page 300x600) and the AdSense `<ins>` fills that reserved box exactly.

`data-full-width-responsive` is deliberately **off**. That flag lets AdSense
ignore the reserved box and size the unit to the screen instead, which is how
banners end up oversized and drawn over the content beside them.

Side rails pick the widest unit that fits the space actually available —
half-page on an ultra-wide screen, stepping down to a skyscraper on Full-HD —
and are hidden entirely when neither fits, or when the section is too short to
contain one.
