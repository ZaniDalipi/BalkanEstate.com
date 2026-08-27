/**
 * Load-test scenarios — modelled on what the SPA actually requests.
 *
 * A scenario is a sequence of steps run by one virtual user, in order, with
 * think time between them. Steps can stash data on `ctx` (property ids, auth
 * token) for later steps, which is what makes the traffic realistic: the
 * detail hit uses an id that came out of a real listing response.
 *
 * `req(ctx)` returns null to skip a step (e.g. no id captured yet).
 */

const CITIES = [
  'Pristina', 'Prizren', 'Peja', 'Gjilan', 'Mitrovica', 'Ferizaj',
  'Tirana', 'Durres', 'Vlore', 'Shkoder', 'Sarajevo', 'Mostar',
  'Belgrade', 'Novi Sad', 'Skopje', 'Ohrid', 'Podgorica', 'Budva',
  'Zagreb', 'Split', 'Dubrovnik',
];
const COUNTRIES = ['Kosovo', 'Albania', 'Serbia', 'North Macedonia', 'Montenegro', 'Croatia'];
const TYPES = ['apartment', 'house', 'villa', 'land', 'luxury-villa'];
const SORTS = ['newest', 'price-asc', 'price-desc'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const between = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Pulls property ids out of a list response, tolerating shape changes. */
const idsFrom = (json) => {
  const list = json?.properties || json?.data?.properties || [];
  return list.map((p) => p?.id).filter(Boolean);
};

/**
 * A random filter combination. Every distinct combination is a distinct cache
 * key and a distinct database query, so this is what search traffic really
 * costs — a fixed query would just measure the response cache.
 */
function randomSearchQuery() {
  const params = new URLSearchParams({ limit: '20', page: '1' });
  if (Math.random() < 0.7) params.set('city', pick(CITIES));
  if (Math.random() < 0.3) params.set('country', pick(COUNTRIES));
  if (Math.random() < 0.6) params.set('propertyType', pick(TYPES));
  if (Math.random() < 0.5) params.set('listingType', Math.random() < 0.75 ? 'sale' : 'rent');
  if (Math.random() < 0.5) {
    const min = between(0, 12) * 25000;
    params.set('minPrice', String(min));
    params.set('maxPrice', String(min + between(1, 8) * 50000));
  }
  if (Math.random() < 0.4) params.set('beds', String(between(1, 5)));
  if (Math.random() < 0.25) params.set('baths', String(between(1, 3)));
  if (Math.random() < 0.5) params.set('sortBy', pick(SORTS));
  return params.toString();
}

export const scenarios = {
  /** Anonymous visitor: landing page data, a listing page, one property. */
  browse: {
    description: 'Anonymous visitor — homepage data, listings page 1, one property detail',
    weight: 40,
    steps: [
      {
        label: 'GET /api/properties (page 1)',
        req: () => ({ path: '/api/properties?limit=20&page=1&listingType=sale', parse: true }),
        after: (ctx, json) => { ctx.ids = idsFrom(json); },
      },
      { label: 'GET /api/city-showcase', req: () => ({ path: '/api/city-showcase' }) },
      { label: 'GET /api/promotion-plans', req: () => ({ path: '/api/promotion-plans' }) },
      {
        label: 'GET /api/properties/:id',
        req: (ctx) => (ctx.ids?.length ? { path: `/api/properties/${pick(ctx.ids)}` } : null),
      },
      {
        label: 'GET /api/properties/:id/price-history',
        req: (ctx) => (ctx.ids?.length ? { path: `/api/properties/${pick(ctx.ids)}/price-history` } : null),
      },
    ],
  },

  /** Filter-heavy search: the realistic worst case for the listing query. */
  search: {
    description: 'Search traffic — random filter combinations, page 1 then page 2',
    weight: 30,
    steps: [
      {
        label: 'GET /api/properties (filtered)',
        req: (ctx) => {
          ctx.lastQuery = randomSearchQuery();
          return { path: `/api/properties?${ctx.lastQuery}`, parse: true };
        },
        after: (ctx, json) => { ctx.ids = idsFrom(json); },
      },
      {
        label: 'GET /api/properties (filtered, page 2)',
        req: (ctx) => {
          if (!ctx.lastQuery) return null;
          const params = new URLSearchParams(ctx.lastQuery);
          params.set('page', '2');
          return { path: `/api/properties?${params.toString()}` };
        },
      },
      {
        label: 'GET /api/properties/:id',
        req: (ctx) => (ctx.ids?.length ? { path: `/api/properties/${pick(ctx.ids)}` } : null),
      },
    ],
  },

  /** Directory pages: agents, agencies, testimonials. */
  directory: {
    description: 'Agent/agency directory browsing',
    weight: 10,
    steps: [
      { label: 'GET /api/agents', req: () => ({ path: '/api/agents?limit=20&page=1' }) },
      { label: 'GET /api/agencies', req: () => ({ path: '/api/agencies?limit=20&page=1' }) },
      { label: 'GET /api/testimonials', req: () => ({ path: '/api/testimonials' }) },
      { label: 'GET /api/articles', req: () => ({ path: '/api/articles?limit=10' }) },
    ],
  },

  /**
   * One listing goes viral. Every request to a property detail writes
   * ($inc views on the property + on the seller's user doc), so this is a
   * write hotspot on two single documents, not just a read test.
   */
  hotListing: {
    description: 'Viral listing — all users hitting the same property detail',
    weight: 10,
    steps: [
      {
        label: 'GET /api/properties (find hot id)',
        req: (ctx) => (ctx.shared.hotId ? null : { path: '/api/properties?limit=1', parse: true }),
        after: (ctx, json) => {
          const ids = idsFrom(json);
          if (ids.length && !ctx.shared.hotId) ctx.shared.hotId = ids[0];
        },
      },
      {
        label: 'GET /api/properties/:hotId',
        req: (ctx) => (ctx.shared.hotId ? { path: `/api/properties/${ctx.shared.hotId}` } : null),
      },
      {
        label: 'GET /api/properties/:hotId (repeat)',
        req: (ctx) => (ctx.shared.hotId ? { path: `/api/properties/${ctx.shared.hotId}` } : null),
      },
    ],
  },

  /**
   * Signed-in session. Requires --email/--password (or --token); the runner
   * drops this scenario when no credentials are supplied.
   */
  auth: {
    description: 'Signed-in user — login, profile, favorites, conversations, notifications',
    weight: 10,
    requiresAuth: true,
    steps: [
      { label: 'GET /api/auth/me', req: (ctx) => (ctx.token ? { path: '/api/auth/me', auth: true } : null) },
      { label: 'GET /api/favorites', req: (ctx) => (ctx.token ? { path: '/api/favorites', auth: true } : null) },
      { label: 'GET /api/conversations', req: (ctx) => (ctx.token ? { path: '/api/conversations', auth: true } : null) },
      { label: 'GET /api/notifications', req: (ctx) => (ctx.token ? { path: '/api/notifications', auth: true } : null) },
      {
        label: 'GET /api/properties (authed)',
        req: (ctx) => (ctx.token ? { path: '/api/properties?limit=20&page=1', auth: true } : null),
      },
    ],
  },

  /**
   * Hostile-but-legal input. Not included in the default mix — run it with
   * --scenario abuse to check that a single client cannot amplify its cost:
   * huge page sizes, deep offsets, and a malformed cursor.
   */
  abuse: {
    description: 'Input amplification — oversized limit, deep pagination, malformed cursor',
    weight: 0,
    steps: [
      { label: 'ABUSE limit=5000', req: () => ({ path: '/api/properties?limit=5000' }) },
      { label: 'ABUSE limit=100000', req: () => ({ path: '/api/properties?limit=100000' }) },
      { label: 'ABUSE deep page=500', req: () => ({ path: '/api/properties?limit=100&page=500' }) },
      { label: 'ABUSE limit=abc', req: () => ({ path: '/api/properties?limit=abc&page=abc' }) },
      {
        label: 'ABUSE malformed cursor',
        req: () => ({ path: `/api/properties?cursor=undefined&cursorCreatedAt=${encodeURIComponent(new Date().toISOString())}` }),
      },
      { label: 'ABUSE text search', req: () => ({ path: `/api/properties?query=${'a'.repeat(200)}` }) },
    ],
  },
};

export const defaultMix = ['browse', 'search', 'directory', 'hotListing', 'auth'];
