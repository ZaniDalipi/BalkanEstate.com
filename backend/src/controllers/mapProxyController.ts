/**
 * Map Proxy Controller
 *
 * Proxies requests to external tile/WMS services (OpenWeatherMap, NASA FIRMS)
 * so that API keys stay on the server and are never exposed to the frontend.
 */

import { Request, Response } from 'express';
import { apiLogger } from '../utils/logger';

const OWM_API_KEY = process.env.OWM_API_KEY || '';
const FIRMS_MAP_KEY = process.env.FIRMS_MAP_KEY || '';

/** Allowed OWM tile layers to prevent the proxy from being used for arbitrary OWM endpoints */
const ALLOWED_OWM_LAYERS = new Set(['wind_new', 'temp_new']);

/**
 * @desc    Proxy OpenWeatherMap tile requests
 * @route   GET /api/map/weather-tile/:layer/:z/:x/:y
 * @access  Public
 */
export const proxyWeatherTile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!OWM_API_KEY) {
      res.status(503).json({ error: 'Weather tile service not configured' });
      return;
    }

    const layer = String(req.params.layer);
    const z = String(req.params.z);
    const x = String(req.params.x);
    const y = String(req.params.y);

    if (!ALLOWED_OWM_LAYERS.has(layer)) {
      res.status(400).json({ error: 'Invalid tile layer' });
      return;
    }

    // Validate tile coordinates are integers
    const zNum = parseInt(z, 10);
    const xNum = parseInt(x, 10);
    const yNum = parseInt(y, 10);
    if (isNaN(zNum) || isNaN(xNum) || isNaN(yNum) || zNum < 0 || zNum > 19) {
      res.status(400).json({ error: 'Invalid tile coordinates' });
      return;
    }

    const upstreamUrl = `https://tile.openweathermap.org/map/${layer}/${zNum}/${xNum}/${yNum}.png?appid=${OWM_API_KEY}`;

    const response = await fetch(upstreamUrl, {
      headers: { 'User-Agent': 'BalkanEstate/1.0' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      res.status(502).json({ error: 'Upstream tile error' });
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=600'); // 10 min cache
    res.send(buffer);
  } catch (error: any) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      res.status(504).json({ error: 'Upstream tile timeout' });
      return;
    }
    apiLogger.error('Weather tile proxy error:', error?.message);
    res.status(500).json({ error: 'Internal proxy error' });
  }
};

/**
 * @desc    Proxy NASA FIRMS WMS requests
 * @route   GET /api/map/firms-wms
 * @access  Public
 */
export const proxyFirmsWms = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!FIRMS_MAP_KEY) {
      res.status(503).json({ error: 'FIRMS service not configured' });
      return;
    }

    // Forward allowed WMS parameters
    const { LAYERS, STYLES, FORMAT, TRANSPARENT, SRS, BBOX, WIDTH, HEIGHT, VERSION } = req.query;

    // Validate required WMS parameters
    if (!BBOX || !WIDTH || !HEIGHT) {
      res.status(400).json({ error: 'Missing required WMS parameters' });
      return;
    }

    // Only allow the fires layer
    const layers = String(LAYERS || 'fires_viirs_24');
    if (!layers.startsWith('fires_')) {
      res.status(400).json({ error: 'Invalid FIRMS layer' });
      return;
    }

    const params = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: String(VERSION || '1.1.1'),
      REQUEST: 'GetMap',
      LAYERS: layers,
      STYLES: String(STYLES || ''),
      FORMAT: String(FORMAT || 'image/png'),
      TRANSPARENT: String(TRANSPARENT || 'true'),
      SRS: String(SRS || 'EPSG:3857'),
      BBOX: String(BBOX),
      WIDTH: String(WIDTH),
      HEIGHT: String(HEIGHT),
    });

    const upstreamUrl = `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/${FIRMS_MAP_KEY}/?${params.toString()}`;

    const response = await fetch(upstreamUrl, {
      headers: { 'User-Agent': 'BalkanEstate/1.0' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      res.status(502).json({ error: 'Upstream WMS error' });
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min cache
    res.send(buffer);
  } catch (error: any) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      res.status(504).json({ error: 'Upstream WMS timeout' });
      return;
    }
    apiLogger.error('FIRMS WMS proxy error:', error?.message);
    res.status(500).json({ error: 'Internal proxy error' });
  }
};

/**
 * @desc    Check which map proxy services are available
 * @route   GET /api/map/available
 * @access  Public
 */
export const getAvailableServices = (_req: Request, res: Response): void => {
  res.json({
    owm: !!OWM_API_KEY,
    firms: !!FIRMS_MAP_KEY,
  });
};
