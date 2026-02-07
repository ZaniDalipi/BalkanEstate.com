import { Request, Response } from 'express';
import { apiLogger } from '../utils/logger';

// Allowed WMS base URLs to prevent open proxy abuse
const ALLOWED_WMS_HOSTS = new Set([
  'inspire.cadastre.bg',
  'api.uredjenazemlja.hr',
  'geoportal.asig.gov.al',
  'ossp.katastar.gov.mk',
  'gis.ktimanet.gr',
  'geoportal.ancpi.ro',
  'katastar.ba',
  'ogc4u.geosrbija.rs',
  'geoportal.co.me',
]);

// @desc    Proxy WMS GetFeatureInfo requests to avoid CORS issues
// @route   GET /api/cadastre/feature-info
// @access  Public
export const getCadastreFeatureInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'Missing url parameter' });
      return;
    }

    // Validate the URL is from an allowed WMS host
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      res.status(400).json({ error: 'Invalid URL' });
      return;
    }

    if (!ALLOWED_WMS_HOSTS.has(parsedUrl.hostname)) {
      res.status(403).json({ error: 'WMS host not allowed' });
      return;
    }

    // Ensure it's a GetFeatureInfo request
    const request = parsedUrl.searchParams.get('REQUEST') || parsedUrl.searchParams.get('request') || '';
    if (request.toLowerCase() !== 'getfeatureinfo') {
      res.status(400).json({ error: 'Only GetFeatureInfo requests are allowed' });
      return;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BalkanEstate/1.0',
        'Accept': 'application/json, application/geo+json, application/vnd.ogc.gml, text/xml, */*',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      apiLogger.warn(`Cadastre GetFeatureInfo failed: ${response.status} for ${parsedUrl.hostname}`);
      res.status(502).json({ error: `Upstream WMS error: ${response.status}` });
      return;
    }

    const contentType = response.headers.get('content-type') || 'application/json';
    const body = await response.text();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(body);
  } catch (error: any) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      res.status(504).json({ error: 'WMS server timeout' });
      return;
    }
    apiLogger.error('Cadastre proxy error:', error?.message);
    res.status(500).json({ error: 'Internal proxy error' });
  }
};
