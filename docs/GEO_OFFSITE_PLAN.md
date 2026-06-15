# BalkanEstateAI — Off-Site GEO / PR Action Plan

> **Why this doc exists:** On-site GEO (structured data, prerendering, native landing
> pages, `llms.txt`) is now largely done — that work made the site *eligible* to be
> cited by ChatGPT, Gemini, Perplexity, etc. But AI engines decide *who to cite*
> mostly from signals **off** your own domain: third-party mentions, reviews,
> directories, and backlinks. This is where the remaining ranking gains are.
>
> **Honest expectation:** None of this guarantees "first" in an AI answer — that is
> not a controllable rank. The goal is to become the most-mentioned, most-trusted,
> easiest-to-cite source for "property in [Balkan country]", which is what raises the
> probability of being surfaced.

---

## How AI engines actually pick sources (the model to optimize for)

1. **Training data** — what the model already absorbed about you (mentions across the web).
2. **Live retrieval** — when the engine searches the web mid-answer (ChatGPT Search /
   OAI-SearchBot, Gemini grounding, Perplexity). Here, classic SEO + being on pages the
   engine retrieves matters a lot.
3. **Entity trust** — does the model recognize "BalkanEstateAI" as a real, described
   entity? (Knowledge graph, Wikidata, consistent `sameAs`, reviews.)
4. **Corroboration** — the same fact stated on multiple independent sites (e.g. "the only
   platform covering all 10 Balkan countries") gets repeated by the model.

Everything below targets one of those four.

---

## Priority 1 — Entity & knowledge-graph presence (do first, highest leverage)

These make AI engines *recognize you as an entity*, which is a prerequisite for confident citation.

- [ ] **Wikidata item** — create a Wikidata entry for BalkanEstateAI (company, founded
      2024, country coverage, official site, social profiles). Wikidata feeds many AI
      knowledge graphs directly. Free, high impact.
- [ ] **Google Business Profile** + **Bing Places** for the company.
- [ ] **Crunchbase** profile (startups; frequently retrieved by AI for company facts).
- [ ] **LinkedIn Company Page** — keep description identical to `llms.txt` wording.
- [ ] **Consistent NAP + description** everywhere — name, contact, and the one-line
      pitch must match the site's `sameAs`/Organization schema exactly. Inconsistency
      weakens entity confidence.
- [ ] **Get listed on G2 / Trustpilot / Sitejabber** and collect real reviews — review
      platforms are heavily cited by AI for "is X legit / best X" questions.

## Priority 2 — Get cited in "best of" / comparison content

AI loves to quote listicles when answering "best site to buy property in X".

- [ ] Pitch to **expat & relocation sites** covering the Balkans (e.g. expat forums,
      "moving to Montenegro/Albania" blogs, digital-nomad sites) for inclusion in their
      "where to find property" sections.
- [ ] Outreach to **real-estate / proptech roundups** ("best European property portals",
      "best Balkan real estate websites") asking to be added.
- [ ] Publish your own **comparison page** (you already have the angle: only platform
      covering all 10 countries vs. Realitica/Indomio) — and get it referenced elsewhere.
- [ ] **Reddit / Quora presence** — genuinely answer questions in r/Albania, r/Serbia,
      r/digitalnomad, r/expats, Quora "buying property in [country]" threads. Perplexity
      and ChatGPT Search retrieve these constantly. (Be helpful, not spammy — link only
      where it adds value.)

## Priority 3 — Digital PR & corroborated facts

- [ ] **Press release** on the "only AI platform for all 10 Balkan countries" angle to
      regional tech/real-estate press (in EN + key local languages).
- [ ] **Original data report** — e.g. "Balkan Property Price Index 2026" using your
      listing data. Data journalism earns backlinks and gets quoted verbatim by AI. This
      is the single best content investment for citations.
- [ ] **Guest posts / interviews** on regional business & expat outlets.
- [ ] Pitch **local-language real-estate news** (you already aggregate news — turn
      relationships into mentions).

## Priority 4 — Directories & backlinks

- [ ] Real-estate portal aggregators and proptech directories.
- [ ] Country-specific business directories (one per market).
- [ ] Startup directories (Product Hunt ✅ already; add BetaList, etc.).
- [ ] Partnerships with local agencies/agents who link back from their sites.

---

## Country-by-country quick targets

For each market, the fastest wins are: (a) the country's biggest expat/relocation blog,
(b) the country subreddit, (c) one local real-estate news outlet, (d) one local business
directory. Assign an owner per country and track in the table below.

| Country | Expat/relocation outreach | Forum/community | Local press / directory | Owner | Status |
|---|---|---|---|---|---|
| Albania | | r/Albania | | | |
| Kosovo | | r/kosovo | | | |
| North Macedonia | | r/macedonia | | | |
| Serbia | | r/serbia | | | |
| Montenegro | | r/montenegro | | | |
| Croatia | | r/croatia | | | |
| Bosnia | | r/bih | | | |
| Bulgaria | | r/bulgaria | | | |
| Romania | | r/Romania | | | |
| Greece | | r/greece | | | |

---

## Measurement — how to know it's working

There is no "AI rank tracker" that's fully reliable, so measure proxies:

1. **Manual prompt panel (do monthly):** ask ChatGPT, Gemini, Perplexity, and Copilot
   the same set of questions and log whether BalkanEstateAI appears + is cited:
   - "Best website to buy property in [Albania/Serbia/Montenegro/…]"
   - "Where can I find apartments for sale in [Tirana/Belgrade/Budva]?"
   - "Sites to buy property in the Balkans as a foreigner"
   - The native-language versions (the queries the client provided).
2. **Referral traffic from AI** — track referrers like `chatgpt.com`, `perplexity.ai`,
   `gemini.google.com` in analytics.
3. **Crawler hits** — watch server logs for `OAI-SearchBot`, `PerplexityBot`,
   `ClaudeBot`, `Google-Extended` to confirm they're fetching the new pages.
4. **Brand search volume** — rising "BalkanEstateAI" searches = growing entity strength.
5. **Backlink count & referring domains** (Search Console / any backlink tool).

---

## Suggested 90-day sequence

- **Weeks 1–2:** Wikidata, Crunchbase, GBP/Bing, Trustpilot/G2 setup; baseline the
  monthly prompt panel.
- **Weeks 3–6:** Reddit/Quora answering cadence; expat-blog outreach; ship the
  comparison page.
- **Weeks 6–10:** Publish the "Balkan Property Price Index 2026" data report + press push.
- **Weeks 10–12:** Directory submissions, agency backlink partnerships; re-run the
  prompt panel and compare to baseline.
