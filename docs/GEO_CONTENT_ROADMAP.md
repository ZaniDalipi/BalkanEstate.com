# BalkanEstateAI — Native-Language Landing Page Roadmap & Review Pack

> **Purpose:** scale the native-language, high-intent landing pages from the current
> ~20 (10 capitals × sale/rent) to full coverage of every major Balkan city — **without
> shipping grammatically-wrong native text**, which would hurt credibility with both
> users and AI engines.
>
> **Process:** a native speaker reviews/corrects the drafts in this doc → we paste the
> approved strings into `scripts/seo-landing-pages.mjs` → next build generates them.
> Nothing here is live until reviewed and merged.

---

## How a landing page is defined (engine recap)

Each entry in `scripts/seo-landing-pages.mjs` is data-only — no code change needed to
add cities. Shape (validated at build time):

```js
{
  path: '/search?country=Albania&city=Durres', // must use params the SPA already routes
  en: { title, description },                   // English fallback for other languages
  loc: { sq: { title, description, h1, faqs: [{ q, a }] } } // native, primary language only
}
```

`path` for **sale** = `/search?country=<C>&city=<City>`, for **rent** =
`/rentals?country=<C>&city=<City>`.

---

## Part A — Sign-off on the 20 pages already LIVE

These are already in `seo-landing-pages.mjs` and generating. Please confirm each is
grammatically correct (✅) or note a correction. Primary-language strings are in the file.

| Country | City | Lang | Sale page | Rent page | Reviewer OK? |
|---|---|---|---|---|---|
| Albania | Tirana | sq | ✅ live | ✅ live | ☐ |
| Kosovo | Pristina | sq | ✅ live | ✅ live | ☐ |
| North Macedonia | Skopje | mk | ✅ live | ✅ live | ☐ |
| Serbia | Belgrade | sr | ✅ live | ✅ live | ☐ |
| Montenegro | Budva | me | ✅ live | ✅ live | ☐ |
| Croatia | Zagreb | hr | ✅ live | ✅ live | ☐ |
| Bosnia | Sarajevo | bs | ✅ live | ✅ live | ☐ |
| Bulgaria | Sofia | bg | ✅ live | ✅ live | ☐ |
| Romania | Bucharest | ro | ✅ live | ✅ live | ☐ |
| Greece | Athens | el | ✅ live | ✅ live | ☐ |

### Grammar risk notes per language (where to look hardest)
- **mk / bg / ro**: analytic languages, no case declension on city names ("во Скопје",
  "в София", "în București") — low risk.
- **sr / hr / bs / me**: locative case on city names ("u Beogradu", "u Zagrebu",
  "u Sarajevu", "u Budvi") — verify each new city's locative form.
- **sq (Albanian)**: definite/indefinite + locative ("në Tiranë", "në Durrës") — verify
  each city form; this is the highest-risk language for declension.
- **el (Greek)**: article + accusative ("στην Αθήνα", "στη Θεσσαλονίκη") — verify gender
  and article for each city.

---

## Part B — Next-tier cities to add (DRAFT — needs native review)

Below are the next cities per country, with the **English** ready to ship and the
**native city locative/phrase the reviewer must confirm**. Fill the "Native sale H1" and
"Native rent H1" columns (or ✅ if the suggested form is correct); we'll generate full
title/description/FAQ from the approved pattern.

**Suggested native sale pattern** (per language), `{cityLoc}` = correct local form:
- sq (Albania): `Apartamente në shitje në {cityLoc}` · (Kosovo uses `Banesa` not `Apartamente`)
- mk: `Станови на продажба во {city}`
- sr/me: `Stanovi na prodaju u {cityLoc}`
- hr: `Stanovi na prodaju u {cityLoc}`
- bs: `Stanovi na prodaju u {cityLoc}`
- bg: `Апартаменти за продажба в {city}`
- ro: `Apartamente de vânzare în {city}`
- el: `Διαμερίσματα προς πώληση {cityAcc}`

| Country | City | Lang | Suggested native city form | Native sale H1 (confirm/fix) | Reviewer |
|---|---|---|---|---|---|
| Albania | Durrës | sq | në Durrës | Apartamente në shitje në Durrës | ☐ |
| Albania | Vlorë | sq | në Vlorë | Apartamente në shitje në Vlorë | ☐ |
| Albania | Sarandë | sq | në Sarandë | Apartamente në shitje në Sarandë | ☐ |
| Albania | Shkodër | sq | në Shkodër | Apartamente në shitje në Shkodër | ☐ |
| Kosovo | Prizren | sq | në Prizren | Banesa në shitje në Prizren | ☐ |
| Kosovo | Pejë | sq | në Pejë | Banesa në shitje në Pejë | ☐ |
| Kosovo | Ferizaj | sq | në Ferizaj | Banesa në shitje në Ferizaj | ☐ |
| North Macedonia | Ohrid | mk | во Охрид | Станови на продажба во Охрид | ☐ |
| North Macedonia | Bitola | mk | во Битола | Станови на продажба во Битола | ☐ |
| Serbia | Novi Sad | sr | u Novom Sadu | Stanovi na prodaju u Novom Sadu | ☐ |
| Serbia | Niš | sr | u Nišu | Stanovi na prodaju u Nišu | ☐ |
| Montenegro | Kotor | me | u Kotoru | Stanovi na prodaju u Kotoru | ☐ |
| Montenegro | Tivat | me | u Tivtu | Stanovi na prodaju u Tivtu | ☐ |
| Montenegro | Podgorica | me | u Podgorici | Stanovi na prodaju u Podgorici | ☐ |
| Croatia | Split | hr | u Splitu | Stanovi na prodaju u Splitu | ☐ |
| Croatia | Dubrovnik | hr | u Dubrovniku | Stanovi na prodaju u Dubrovniku | ☐ |
| Croatia | Rijeka | hr | u Rijeci | Stanovi na prodaju u Rijeci | ☐ |
| Bosnia | Mostar | bs | u Mostaru | Stanovi na prodaju u Mostaru | ☐ |
| Bosnia | Banja Luka | bs | u Banjoj Luci | Stanovi na prodaju u Banjoj Luci | ☐ |
| Bosnia | Tuzla | bs | u Tuzli | Stanovi na prodaju u Tuzli | ☐ |
| Bulgaria | Plovdiv | bg | в Пловдив | Апартаменти за продажба в Пловдив | ☐ |
| Bulgaria | Varna | bg | във Варна | Апартаменти за продажба във Варна | ☐ |
| Bulgaria | Burgas | bg | в Бургас | Апартаменти за продажба в Бургас | ☐ |
| Romania | Cluj-Napoca | ro | în Cluj-Napoca | Apartamente de vânzare în Cluj-Napoca | ☐ |
| Romania | Brașov | ro | în Brașov | Apartamente de vânzare în Brașov | ☐ |
| Romania | Timișoara | ro | în Timișoara | Apartamente de vânzare în Timișoara | ☐ |
| Greece | Thessaloniki | el | στη Θεσσαλονίκη | Διαμερίσματα προς πώληση στη Θεσσαλονίκη | ☐ |
| Greece | Crete (Heraklion) | el | στο Ηράκλειο | Διαμερίσματα προς πώληση στο Ηράκλειο | ☐ |

> ⚠️ Forms most worth double-checking: **Tivat → u Tivtu**, **Banja Luka → u Banjoj Luci**,
> **Varna → във Варна** (the "във" form), and all the Albanian locatives.

---

## Part C — English long-tail intent pages (SAFE to ship, no translation risk)

These target the cross-country long-tail queries the client listed. They only need to map
to search params the SPA already supports — confirm the param names before we wire them
(e.g. `maxPrice`, `propertyType`, `features`). Low risk, high intent.

| Intent page | Suggested path | Notes |
|---|---|---|
| Apartments under €100,000 | `/search?propertyType=apartment&maxPrice=100000` | confirm `maxPrice` param |
| New construction apartments | `/search?propertyType=apartment&condition=new` | confirm `condition`/`isNew` param |
| Villas with sea view | `/search?propertyType=villa&feature=sea-view` | confirm feature param |
| Cheap apartments in the Balkans | `/search?propertyType=apartment&sort=price-asc` | |
| Luxury apartments | `/search?propertyType=apartment&minPrice=300000` | |
| Land / building plots | `/search?propertyType=land` | already exists |

> If these intents aren't expressible as existing SPA routes, they need real content pages
> (with app routing) — a small dev task, not just prerender. Flag which params exist and
> we'll ship the ones that do.

---

## Part D — Editorial guide pages (highest-effort, highest-citation potential)

These are the pages AI engines love to cite for "how do I…" questions. They are **new
content pages** (need app routes + real editorial copy), so they're a separate workstream
from the search landing pages.

- "How to Buy Property in [Country] as a Foreigner" (×10 countries)
- "How to Buy Property in [Country] from the Diaspora / from Germany / from the UK"
- "Average Apartment Prices in Every Balkan City (2026)" — pairs with the data report in
  the off-site plan; this is the strongest single citation magnet.
- "Best Neighborhoods for Families in [City]"
- "Property Taxes & Buying Costs in [Country]"

---

## Definition of done for scaling

1. Reviewer signs off Part A and fills Part B.
2. We paste approved native strings into `scripts/seo-landing-pages.mjs` (build-time
   validation enforces the required shape).
3. `npm run build` regenerates; spot-check a few pages in Google Rich Results Test.
4. Resubmit `sitemap.xml` and update it to include the new city/intent paths.
