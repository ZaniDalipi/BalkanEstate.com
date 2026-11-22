import { Request, Response } from 'express';
import { apiLogger } from '../utils/logger';
import { parseMarketParams } from '../services/marketPages/marketPlaces';
import { getMarketHub, getMarketPage } from '../services/marketPages/marketPageService';

/**
 * GET /api/market-pages/:deal — every country with its biggest cities.
 */
export const getMarketHubController = async (req: Request, res: Response): Promise<void> => {
  const parsed = parseMarketParams({ deal: req.params.deal });
  if (parsed.ok === false) {
    res.status(400).json({ message: parsed.error });
    return;
  }
  try {
    res.json(await getMarketHub(parsed.value.deal));
  } catch (error) {
    apiLogger.error('Market overview failed:', error);
    res.status(500).json({ message: 'Could not load the property overview. Please try again.' });
  }
};

/**
 * GET /api/market-pages/:deal/:country[/:city] — one landing page.
 *
 * 400: the deal, country or city is not a valid value.
 * 404: no such country, or no live listing names that city; the body says
 *      which (`error`) and, for a city, the country page to offer instead.
 */
export const getMarketPageController = async (req: Request, res: Response): Promise<void> => {
  const parsed = parseMarketParams({ deal: req.params.deal, country: req.params.country, city: req.params.city });
  if (parsed.ok === false) {
    res.status(400).json({ message: parsed.error });
    return;
  }
  try {
    const result = await getMarketPage(parsed.value);
    if (result.ok === false) {
      if (result.error === 'unknown-city') {
        res.status(404).json({ message: 'No listings in this city right now', error: result.error, country: result.country });
      } else {
        res.status(404).json({ message: 'Unknown country', error: result.error });
      }
      return;
    }
    res.json(result.page);
  } catch (error) {
    apiLogger.error('Market page failed:', error);
    res.status(500).json({ message: 'Could not load this page. Please try again.' });
  }
};
