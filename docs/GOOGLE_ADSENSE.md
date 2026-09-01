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

**Do not use the "AdSense code snippet" method** — the option selected by
default. That method needs the AdSense script in the `<head>` of every page,
but this site only injects it after the visitor accepts marketing cookies, so
Google's verifier will not reliably find it.

Use **"Ads.txt snippet"** instead. `public/ads.txt` is already committed with
your publisher id:

```
google.com, pub-8280125236799216, DIRECT, f08c47fec0942fa0
```

Deploy, confirm `https://balkanestateai.com/ads.txt` returns that line, then
pick the Ads.txt radio button and press Verify.

(`ads.txt` is required anyway — AdSense will not fill inventory without it.)

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

```dotenv
VITE_ADSENSE_CLIENT=ca-pub-8280125236799216
VITE_ADSENSE_SLOT_LEADERBOARD=<leaderboard unit id>
VITE_ADSENSE_SLOT_SIDEBAR=<sidebar unit id>

# Optional. The bottom bar stays off entirely unless this is set — it is the
# most intrusive unit on the site, so it never turns itself on.
VITE_ADSENSE_SLOT_STICKY=<sticky unit id>

# Optional fallback used by any slot whose specific id above is unset.
VITE_ADSENSE_SLOT=<any unit id>
```

These are read at **build time**, so a change needs a rebuild and redeploy.
With `VITE_ADSENSE_CLIENT` unset, no AdSense script is ever requested and every
empty slot falls straight through to the "Your Ad Here" placeholder.

## 4. Request review

Once ads.txt verifies and the units are live, use **Request review** in the
AdSense console.

## Consent

`NetworkAd` gates on `marketing` consent from
`src/shared/utils/cookieConsent.ts`: until the visitor opts in, no AdSense
script is injected and no unit renders. That is what the site's cookie policy
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
