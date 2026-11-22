/**
 * /property-prices.csv — the price table as CSV, served from the site's own
 * host (the API builds it: GET /api/market-prices/csv), so the Dataset
 * JSON-LD on /:lang/property-prices can point at a download on this domain.
 */

const API_CSV = 'https://api.balkanestateai.com/api/market-prices/csv';

export const onRequest = async (): Promise<Response> => {
  try {
    const response = await fetch(API_CSV, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return new Response('The price table is temporarily unavailable. Please try again later.', { status: 503 });
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': response.headers.get('Content-Disposition') ?? 'attachment; filename="balkan-property-prices.csv"',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('The price table is temporarily unavailable. Please try again later.', { status: 503 });
  }
};
