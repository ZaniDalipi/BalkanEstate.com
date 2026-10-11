# AdSense "Low value content" — audit and remediation

Site: https://balkanestateai.com · Branch: `balkanestateai-zd-/tender-curie-kclxjd` · Audit date: 2026-10-11

## Summary

AdSense judges a site largely by what Google's crawlers can read and how much of it is
original and useful. Before this branch, Google could read very little of BalkanEstateAI:

1. **Every listing, article, agent and agency URL served Googlebot an empty page** with a
   meta-refresh and a JavaScript redirect — on `/{lang}/…` URLs, a redirect to itself.
2. **Every route without its own prerendered file was served the homepage HTML** with the
   homepage canonical, and pages declared canonicals that were only redirects. To Google,
   most of the site looked like duplicates of the home page.
3. **The ~60 "country/city landing pages" in the sitemap were never actually served**
   (Cloudflare Pages ignores the query string when picking a file); their templated FAQ
   copy and unsourced price figures were doorway-style content anyway.
4. **robots.txt exempted Googlebot from every `Disallow` rule.**
5. **Pages were dotted with "Your Ad Here" boxes**, and the privacy policy lacked the
   disclosures every AdSense publisher must make.
6. **Some displayed "market data" was not real data** (AI-generated or randomised
   statistics, and hard-coded city statistics stamped "updated just now").

This branch fixes the technical causes, removes or relabels content that was not authentic,
adds trust pages and real editorial content, and documents what still needs a business
decision. **No developer can guarantee approval**; section E lists what must be done
before requesting a review.

Nothing has been deployed. Production deploys run automatically when `main` changes
(`.github/workflows/deploy.yml`), so merging this branch is the deploy decision.

---

## A. Problems found

Severity: **Critical** = likely cause of the rejection or a policy breach · **High** =
significantly lowers perceived quality or indexing · **Medium** / **Low** = worth fixing.

Evidence notes: the live site and API were not reachable from the audit environment
(egress blocked), so evidence comes from the code, a local production build
(`npm run build`) served with Cloudflare-style SPA fallback, Chromium, and Lighthouse 12.6.

| # | Sev. | Problem | Where | Evidence |
|---|------|---------|-------|----------|
| 1 | Critical | Crawlers (incl. **Googlebot, Bingbot**) got an empty page with `<meta http-equiv="refresh">` + `location.replace()` for every listing, article, agent and agency. On `/{lang}/…` URLs the redirect target was the same URL (loop). | `functions/_og-utils.ts`, `functions/**` | `CRAWLER_USER_AGENTS` contained `Googlebot`, `bingbot`; `buildOgHtml` etc. returned redirect stubs with `canonicalUrl = /${lang}/…`. |
| 2 | Critical | Routes without a prerendered file fell back to the **homepage HTML and homepage canonical** (`/en/search`, `/en/guides`, `/en/property/*`, `/en/privacy`, …). Only `dist/en/index.html` existed under `/en`. | `scripts/prerender.mjs`, `index.html` | Before build: `dist/en/` contained only `index.html`; canonical in that file `https://balkanestateai.com/`. |
| 3 | Critical | Conflicting canonical/hreflang signals: prerender declared unprefixed canonicals (`/search`) that the SPA redirects to `/{lang}/…`; hreflang `en` pointed to `/en/search`; index.html's static canonical stayed in the DOM next to Helmet's (two canonicals); a site-wide `<SEO key={pathname}/>` re-mounted on navigation and could override pages' own tags. | `index.html`, `src/components/seo/SEO.tsx`, `App.tsx`, `prerender.mjs` | Lighthouse SEO before: `canonical` and `hreflang` audits failing on `/en`, `/en/guides`, `/en/search` (score 77). |
| 4 | Critical | 60 query-string landing pages (`/search?country=…&city=…`) listed in the sitemap and prerendered to `dist/search/country/X/…`, a path no visitor or crawler requests; the real URL served the generic search HTML whose canonical was `/search`. Their copy was templated (FAQ text with the country name swapped in) with unsourced prices. | `scripts/prerender.mjs`, `scripts/seo-landing-pages.mjs`, `public/sitemap.xml` | 531 prerendered files before, most unreachable; sitemap had 73 URLs, 63 with query strings, none language-prefixed. |
| 5 | Critical | Privacy policy lacked AdSense's required disclosures (third-party vendors incl. Google use cookies to serve ads; how to opt out). Cookie policy did not list Google's ad cookies. | `PrivacyPolicyPage.tsx`, `CookiePolicyPage.tsx` | Only Google Analytics was named. |
| 6 | Critical | City "market data": growth, demand, rental yield, investment score and trend come from a Gemini prompt ("provide realistic market data…") or a fallback using `Math.random()`. The frontend also padded API results with hard-coded city statistics stamped `lastUpdated: new Date()` (shown as "updated just now"). | `backend/src/services/cityMarketDataService.ts`, `src/features/cities/data/staticCities.ts` | See `generateFallbackCityData`, `mergeWithStaticFallback`. |
| 7 | High | Imported/scraped listings (system feeds) are published as `active` with the source site's text and hot-linked photos, and were indexable and ad-bearing. | `backend/src/services/listingIngestService.ts`, `listingNormalizerService.ts` | `status: 'active'` on upsert; `source`/`sourceUrl` set. Count unknown (no DB access). |
| 8 | High | "Your Ad Here" placeholder boxes on home (2 + side rails), property pages (3), guides, blog, agents and directory whenever no banner was booked. | `src/features/promo/components/Slot.tsx` | Placeholder branch rendered for every unbooked slot. |
| 9 | High | AdSense units could render **over listing photos** (gallery overlay with network fill); a lone close button floated on the photo when nothing was booked. | `PropertyGallery.tsx` | `hidePlaceholder` still allowed network fill. |
| 10 | High | Sticky ad bar shown over full-screen map/search pages and on legal, contact, pricing and saved-list pages. | `App.tsx` (`adPage`) | `default: return 'all'`. |
| 11 | High | `robots.txt`: `User-agent: Googlebot` group with only `Allow: /`, so Googlebot ignored all `Disallow` lines (crawlers obey only their most specific group). | `public/robots.txt` | — |
| 12 | High | Unknown URLs redirected to the home page (soft 404s). | `src/app/router/routes.tsx` | `page('*', …, <Redirect to={paths.home()}/>)` |
| 13 | High | A listing that failed to load for network/server reasons showed **"404 Not Found"**; the retry check read `error.response.status`, which the HTTP client never sets (so even real 404s were retried twice). Same in the agency route. | `src/app/router/routeElements.tsx` | Reproduced with the API unreachable. |
| 14 | High | No About page; footer links were `<button>`s (crawlers cannot follow them); no way to report a listing; no statement on whether listings are verified. | `components/shared/Footer.tsx`, legal footer | — |
| 15 | High | Site-wide `FAQPage` JSON-LD on every URL with answers not visible on the page, containing unverifiable claims ("the only platform…", competitor comparisons) and invented yields/prices. Structured data must match visible content. | `App.tsx`, `HomePage.tsx`, `FAQSchema.tsx` | — |
| 16 | High | Buying guides contained outdated or unsupported statements, e.g. Greek Golden Visa at €250k (raised to €400k/€800k in 2023–24), "Croatia: no annual property tax" (municipal tax since 2025), Romania "0% transfer tax since 2023", Bulgarian "EGN" for foreigners, Albania's renamed cadastre (ZRPP → ASHK), unsourced price/yield ranges; no date, author, sources or disclaimer. | `BuyingGuidesPage.tsx` | — |
| 17 | Medium | Filtered search/rental/villa URLs were self-canonical with their query string (infinite indexable combinations, often empty). | `SearchPage.tsx`, `RentalSearchPage.tsx`, `VillaSearchPage.tsx` | — |
| 18 | Medium | Private routes declared `noindex` in the route table, but a page's own `<SEO>` could switch them back to `index`. | `App.tsx`, `SEO.tsx` | Helmet: innermost instance wins. |
| 19 | Medium | `hreflang="me"` and `<html lang="me">` are invalid (`me` is a country code). | prerender, `SEO.tsx`, `src/i18n` | Lighthouse `hreflang` audit: "Unexpected language code". |
| 20 | Medium | After visiting one language, `/en/…` URLs could render in the previous language: i18n loaded the remembered language asynchronously and then switched to it, overriding the URL. | `src/i18n/index.ts` | Reproduced: `/sq/…` then `/en/property/x` rendered Albanian. |
| 21 | Medium | Backend sitemap: unprefixed URLs, raw Mongo ids (site links use encoded ids), included imported listings, agencies queried on a field that does not exist (`isActive`, so none were included), no articles; not referenced from the site's robots.txt. | `backend/src/routes/sitemapRoutes.ts` | — |
| 22 | Medium | Explore Cities showed "No city data — will be updated soon" when the API failed (an error presented as an empty state, no retry). | `CityRecommendations.tsx` | Screenshot with API unreachable. |
| 23 | Medium | `API_CONFIG.BASE_URL` fell back to `localhost:5001` (no production fallback, unlike the shared resolver) — agency pages break on any build made without `VITE_API_URL`. | `src/shared/constants/app.constants.ts` | — |
| 24 | Medium | Google Fonts stylesheet render-blocking; hero decoration anchored to the bottom of a growing section caused the largest layout shift on the home page (CLS up to 0.24 in Lighthouse). | `index.html`, `HeroSection.tsx` | Lighthouse `layout-shifts`. |
| 25 | Medium | Several pages had no `<SEO>` and ended up titled just "BalkanEstateAI" after JS ran (privacy, terms, cookies, refund, contact, mortgage calculator); search page had no `<h1>`; sidebar logo was an `<h1>` on every page. | various | Browser check. |
| 26 | Low | Meta descriptions printed `0m²` / `undefined` for incomplete listings; card alt text "undefined bed, 0 bath". 404 page hot-linked a Dribbble GIF. Listing description could be published with any length ≥ 1 character. | `PropertyDetailsPage.tsx`, `PropertyCard.tsx`, `not-found-2.tsx`, `ListingFormHelpers.tsx` | — |
| 27 | Low | Organization JSON-LD described the site as "The leading AI-powered real estate platform" (unverifiable). Meta keywords stuffing. | `index.html` | — |

Reviewed and found acceptable: `ads.txt` (`google.com, pub-8280125236799216, DIRECT, f08c47fec0942fa0`
matches the tag's client id), AdSense requests paused until marketing consent, test-mode ads in
development, `X-Frame-Options`/security headers, chunk-load recovery middleware for stale
`/assets/*`, mobile layouts (no horizontal scroll at 390 px on 16 public routes).

---

## B. Fixes implemented

### Crawlability and indexing

| Fix | Files |
|-----|-------|
| Detail-page functions now return the **SPA shell with the record's real content** (title, price, facts present on the listing, full description, photos, seller, source attribution, breadcrumbs), proper head tags and JSON-LD, and **404** for missing records. Same document a visitor gets, with content filled in; humans are passed straight to the static SPA (no API latency, no extra view counts). Crawler list now includes Google's AdSense/inspection crawlers and AI search bots. | `functions/_og-utils.ts`, `scripts/lib/page-shell.mjs` |
| `index.html` marks a per-page head region and a body region; all head tags carry `data-rh` so react-helmet-async takes them over (no duplicate canonical/robots). The root shell — Cloudflare's fallback for every URL — has **no canonical**. | `index.html` |
| Prerender rewritten: 26 real pages × 10 languages written under their language prefix as `dist/{lang}/{page}.html` (a `…/index.html` directory file is only served at the trailing-slash URL, so Cloudflare 308-redirected every canonical URL — verified with `wrangler pages dev`), plus unprefixed English copies whose canonical points at `/en/…`. Each has page-specific crawlable content. Query-string landing pages and their templated copy removed. | `scripts/prerender.mjs`; removed `scripts/seo-landing-pages.mjs` |
| `SEO` component: canonicals always `https://balkanestateai.com/{lang}/path` (normalises unprefixed callers), hreflang derived from the canonical, `x-default` → English, optional `alternates={false}` for single-language pages, generic `jsonLd` prop, route-level `noindex` can no longer be overridden. Removed the site-wide `<SEO key={pathname}>` and site-wide FAQ schema; the page outlet mounts a default `<SEO>` *before* the page. | `src/components/seo/SEO.tsx`, `App.tsx`, `HomePage.tsx` |
| Sitemaps: `dist/sitemap.xml` generated at build (152 canonical URLs with hreflang); `/sitemap-listings.xml` (Pages Function proxying the API) lists active, non-imported listings with a description (encoded ids), agencies by slug, published articles — all `/en/…`. | `scripts/prerender.mjs`, `functions/sitemap-listings.xml.ts`, `backend/src/routes/sitemapRoutes.ts`; removed `public/sitemap.xml` |
| robots.txt rewritten: one rule set for all crawlers (prefixed and unprefixed private paths), AdSense crawlers explicitly allowed, both sitemaps listed. API host robots now blocks `/api/`. | `public/robots.txt`, `backend/src/routes/sitemapRoutes.ts` |
| Unknown URLs render a `noindex` 404 page instead of redirecting home. | `src/app/router/routes.tsx` |
| `noindex`: filtered search/rental/villa URLs, imported listings, off-market listings, city dashboards with < 3 listings, load-error states, agent/agency profiles with no bio and no listings (server-rendered). | search pages, `PropertyDetailsPage.tsx`, `CityDashboard.tsx`, `routeElements.tsx`, `_og-utils.ts` |
| Montenegrin hreflang / `<html lang>` = `sr-ME` (URLs stay `/me/…`). | `page-shell.mjs`, `SEO.tsx`, `src/i18n/index.ts`, `AiSearch.tsx` |
| Backend skips listing view counting for server-render fetches (`x-be-prerender`). | `backend/src/controllers/propertyController.ts` |

### Content, trust and ads

| Fix | Files |
|-----|-------|
| Country guides are now **10 separate pages** (`/guides/{country}`) with byline, last-updated date, foreign-ownership/tax/residency facts, step-by-step process, "check before you buy" cautions, links to city pages and listings, **official registries cited**, and a not-legal-advice notice. Outdated/unsupported claims corrected or removed (see A16); unsourced price-per-m² and yield ranges removed. English-only content declares the English canonical. | `src/features/guides/data/countryGuides.js`, `BuyingGuidesPage.tsx`, `CountryGuideArticle.tsx` |
| **About page** (`/about`): operator (`BalkanEstate AI DOOEL`, from the existing contact config), contacts, platform features, where listings come from, what is and is not checked, how to report a listing, how the site is funded, visible FAQ with matching FAQPage markup. No invented addresses, numbers or testimonials. | `AboutPage.tsx`, `FAQSchema.tsx` |
| **Privacy policy**: "Advertising and Google AdSense" section with the required disclosures and opt-out links (My Ad Center, aboutads.info, youronlinechoices.eu, Google partner-sites page); Google AdSense, Microsoft Clarity and Sentry listed as processors. **Cookie policy**: Google ad cookies listed. Dates updated. | `PrivacyPolicyPage.tsx`, `CookiePolicyPage.tsx` |
| Footer and legal footer links are real `<a href>`s (new `AppLink`), with About, Buying Guides, Mortgage Calculator, Contact and Advertise; country chips link to the country guides. | `Footer.tsx`, `LegalFooter.tsx`, `src/app/router/AppLink.tsx` |
| "Report it to us" link on every listing → contact form pre-filled with the listing URL. | `PropertyDetailsPage.tsx`, `ContactUsPage.tsx` |
| Ad slots: no "Your Ad Here" outside admin preview; never AdSense over listing photos (overlay only for booked banners, close button only then); no ads on imported listings; no ads on legal, contact, about, pricing, saved pages; no sticky bar over map/search pages. | `Slot.tsx`, `PropertyGallery.tsx`, `App.tsx` |
| City data: removed hard-coded statistics padding; visible notice that growth/demand/yield/investment figures are AI estimates; SEO snippets quote only sourced figures; backend fallback no longer randomises. | `CityRecommendations.tsx`, `CityDashboard.tsx`, `cityMarketDataService.ts`; removed `staticCities.ts` |
| Listing quality gate: description ≥ 50 characters (in addition to existing title, price, photo and map-location requirements). | `ListingFormHelpers.tsx` |
| Incomplete listings: meta descriptions and card alt text omit missing facts instead of printing `0`/`undefined`. | `PropertyDetailsPage.tsx`, `PropertyCard.tsx` |
| Blog articles show an "Updated" date when edited after publication. | `ArticlePage.tsx` |
| Toned-down unverifiable claims in Organization JSON-LD; removed meta keywords. | `index.html` |

### Loading and UX

| Fix | Files |
|-----|-------|
| Listing/agency pages distinguish "does not exist" (404 page) from network/server errors (retryable error, `noindex`); real 404s are no longer retried. | `routeElements.tsx` |
| URL language always wins over the remembered language. | `src/i18n/index.ts` |
| `API_CONFIG.BASE_URL` uses the shared resolver (production fallback). | `app.constants.ts` |
| Google Fonts load without blocking first paint; hero decoration no longer shifts layout. | `index.html`, `HeroSection.tsx` |
| Explore Cities shows an error with retry when the API fails. | `CityRecommendations.tsx` |
| Pages titled correctly (legal pages, contact, calculator), search page `<h1>`, sidebar logo no longer an `<h1>`. | various |

Tests added/updated: `src/tests/seo-crawlable-pages.test.ts` (15 tests: no redirect stubs,
content present, missing facts omitted, canonical, imported/off-market noindex, escaping,
crawler detection, shell rendering, canonical normalisation, robots.txt rules); a short-description
case in `listing-validation.test.ts`; fixtures in `construction-status` and
`type-attribute-round-trip` tests given realistic descriptions.

---

## C. Content improvements

**Improved / new pages:** `/guides` (index) and 10 country guides · `/about` · `/privacy` ·
`/cookies` · listing pages (crawlable content, report link, honest snippets) · city pages
(estimates labelled) · all prerendered pages carry page-specific text instead of one
template.

**Marked `noindex`:** filtered search/rentals/villas URLs · imported listings · sold/rented/draft/pending
listings · city dashboards with < 3 listings · private/account routes (now enforced) · 404 and
load-error states · server-rendered agent/agency profiles with neither a bio nor listings.

**Removed:** 60 query-string landing pages with templated copy · site-wide invisible FAQ markup ·
hard-coded city statistics · "Your Ad Here" boxes.

**Need original information from you** (I did not invent any of it):
- Country guides: review each guide's facts with a local lawyer/notary and add practical examples
  from your own market experience; consider native-language versions (currently English with
  an English canonical).
- City pages: replace AI-generated metrics with sourced data (official statistics offices, BIS,
  or your own listing data with enough volume), or remove those panels — see E2.
- Blog: I could not read the articles (database not accessible). Check each for author, date,
  sources and originality; unpublish or rewrite thin or AI-mass-produced posts.
- About page: add verified registration number, registered address and team information if you
  want them shown.
- Long new legal/editorial paragraphs are English in all languages (short UI labels are translated
  into all 10); legal translations should be done by a qualified translator.

---

## D. Performance

Measured on a local production build with Lighthouse 12.6 (mobile, simulated throttling) and
Chromium. **The audit environment blocks external hosts** (Google Fonts, Cloudinary, the API,
AdSense), so every external request fails and absolute timings (FCP ≈ 15 s everywhere) are not
representative of production. Use them only to compare before/after.

| Page | SEO before → after | Perf before → after | Accessibility | CLS before → after |
|------|-------------------|---------------------|---------------|--------------------|
| `/en` | 77 → **92** | 26 → 23 | 96 → 96 | 0.007–0.238 (varies) → 0.126 |
| `/en/guides` | 77 → **92** | 44 → 48 | 96 → 96 | 0.001 → 0.001 |
| `/en/guides/albania` | (did not exist) → **92** | — → 48 | — → 96 | — → 0.001 |
| `/en/search` | 77 → **92** | 34 → 36 | 84 → 83 | 0.001 → 0.001 |

- SEO: `canonical` and `hreflang` audits now pass everywhere; remaining failure is `link-text`
  (generic "Learn more"-style links in existing components).
- Home CLS: the baseline's largest shift (hero decoration, up to 0.238) is fixed. The remaining
  0.126 is the home city gallery collapsing because **the API is unreachable in this sandbox**
  (skeleton → nothing); it does not happen with a working API. Re-measure in production.
- INP could not be measured meaningfully without real data; TBT on `/en` went 2,780 → 1,880 ms
  in the measured runs (noisy).
- Largest remaining costs (recommendations, not changed): render-blocking CSS bundle **568 KB**
  (`dist/assets/index.*.css`) — check Tailwind `content` globs and split rarely used styles;
  `heic-converter` (1.35 MB), `maplibre` (1.05 MB) and `vendor` (750 KB) chunks — confirm they
  load only on the pages that need them (maps are already lazy).

Run PageSpeed Insights on the deployed site for real numbers (field data from CrUX once there is
enough traffic).

---

## E. Remaining issues (need your decision, data, or production access)

| # | Sev. | Item | What to do |
|---|------|------|------------|
| E1 | Critical | **Consent management for EEA/UK users.** Croatia, Bulgaria, Romania and Greece are EU; Google requires a **Google-certified CMP** (IAB TCF v2.2) to serve ads to EEA/UK users. The site's own banner is not certified. | In AdSense → *Privacy & messaging* → create a GDPR message (Google's own CMP), or adopt a certified CMP, and wire its consent to `pauseAdRequests`/Consent Mode v2. |
| E2 | Critical | **AI-generated city statistics** (growth, demand, yield, investment score, trend) are now labelled as estimates but are still shown. | Decide: source real figures, compute from your own listings when volume allows, or remove those panels. |
| E3 | High | **Imported/scraped listings.** They are now noindex and ad-free, but they are still published with third-party text and hot-linked photos. | Confirm you have permission from each source (or only import feeds that agencies own). Count them: `db.properties.countDocuments({status:'active', source:{$exists:true, $ne:''}})` vs. all active. If they dominate the site, the site will still look thin. |
| E4 | High | **Deploy the backend before the frontend.** Until the new backend is live, `/sitemap-listings.xml` proxies the *old* API sitemap (unprefixed URLs, raw ids, imported listings). | Deploy backend, then check `https://api.balkanestateai.com/sitemap.xml`. |
| E5 | High | **Content volume and originality** of listings and blog: unknown without DB access. | Check how many active listings have photos and a real description, and what share are original. Ensure the blog has a set of genuinely useful, original articles. |
| E6 | Medium | Verify Facebook (`facebook.com/balkanestateai`) and Product Hunt links in the footer/JSON-LD point to real, active profiles; remove if not. | — |
| E7 | Medium | Ad unit ids (`VITE_ADSENSE_SLOT*`) are not set in this repo; without them no AdSense units render (fine for review; needed afterwards). | Create units after approval and set the env vars in the deploy secrets. |
| E8 | Medium | Pre-existing: 80 TypeScript errors outside the files changed here; `src/tests/listing-form-total-area.test.ts` fails on the unmodified baseline too; `npm audit` reports vulnerabilities in both packages. | Separate clean-up. |
| E9 | Low | End-to-end Playwright suite not run (needs a running backend). | Run `npm run test:e2e` against staging. |

---

## F. AdSense readiness checklist

| Check | Status | Evidence |
|-------|--------|----------|
| AdSense code on site, correct publisher id | **Pass** | `index.html` tag + `google-adsense-account` meta, `ca-pub-8280125236799216` |
| `ads.txt` present and matching | **Pass** | `public/ads.txt` |
| Crawlers can read real content on public pages | **Pass** (after deploy) | prerendered pages + server-rendered detail pages; `seo-crawlable-pages.test.ts` |
| One canonical, language-prefixed, per page; valid hreflang | **Pass** | browser check of 16 routes; Lighthouse canonical/hreflang pass |
| Sitemaps with canonical, indexable URLs only | **Pass** (static) / **Needs review** (listings, after backend deploy) | `dist/sitemap.xml`; E4 |
| robots.txt does not block Google or AdSense crawlers | **Pass** | `public/robots.txt` |
| No soft 404s; missing records return 404 | **Pass** | catch-all 404 route; functions return 404 |
| Privacy policy with Google advertising disclosures | **Pass** | `/privacy#advertising` |
| About / Contact / Terms / Privacy / Cookies reachable from footer (crawlable links) | **Pass** | `Footer.tsx`, `LegalFooter.tsx` |
| Who runs the site, listing verification, how to report | **Pass** | `/about`, report link on listings |
| No ads on pages without publisher content | **Pass** | `App.tsx` `adPage` |
| No ads overlaying content or interfering with map/search | **Pass** | gallery overlay, sticky bar changes |
| No placeholder ad boxes | **Pass** | `Slot.tsx` |
| Certified CMP for EEA/UK | **Fail** | E1 |
| Authentic information (no fabricated statistics) | **Needs review** | E2 — labelled, not removed |
| Original content (not copied from other sites) | **Needs review** | E3 |
| Enough useful content and genuine user interest | **Needs review** | E5; cannot be measured from code |
| Mobile usability | **Pass** | 16 routes at 390 px, no horizontal scroll |
| Site builds; tests pass | **Pass** (except pre-existing E8) | `npm run build`; `vitest run`: 1302 passed, 13 failed (all in the pre-existing failing file) |

---

## G. Resubmission instructions

Do these in order, after reviewing and merging this branch.

1. **Deploy the backend** (sitemap + view-count change), then open
   `https://api.balkanestateai.com/sitemap.xml` and check that URLs look like
   `https://balkanestateai.com/en/property/<16-char id>`.
2. **Merge to `main`** to deploy the frontend (the workflow deploys `main` to Cloudflare Pages).
3. **Spot-check production**:
   - `curl -A "Googlebot" https://balkanestateai.com/en/property/<id>` → HTTP 200, the listing's
     title and description in the HTML, no `http-equiv="refresh"`.
   - `curl -A "Googlebot" -o /dev/null -w "%{http_code}" https://balkanestateai.com/en/property/doesnotexist` → `404`.
   - `https://balkanestateai.com/robots.txt`, `/sitemap.xml`, `/sitemap-listings.xml`, `/ads.txt` load.
   - View source of `/en/guides/albania`: one canonical, page content inside `#root`.
4. **Fix E1** (certified CMP) in AdSense → *Privacy & messaging*, publish the GDPR message, and
   confirm the banner appears for an EU visitor.
5. **Decide E2 and E3** and act on them. If imported listings make up most of the site, add
   original listings/content first — reapplying while the site is mostly third-party content is
   likely to be rejected again.
6. **Google Search Console**: submit `sitemap.xml` and `sitemap-listings.xml`; use *URL
   Inspection → Test live URL* on the home page, a guide, a listing and an agency to confirm
   Google renders the content; request indexing for the main pages. Wait until the *Pages*
   report shows the important pages indexed (typically days to a few weeks).
7. Run **PageSpeed Insights** on the home, a guide and a listing page; fix anything flagged red.
8. In **AdSense → Sites → balkanestateai.com**, confirm the code is detected, tick the
   confirmation that you have fixed the issues, and click **Request review**. Reviews usually take
   from a few days to several weeks.
9. While waiting: do not click your own ads, do not buy traffic, do not change the AdSense code or
   `ads.txt`, and keep publishing original listings and articles.
