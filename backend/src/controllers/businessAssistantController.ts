import { Request, Response } from 'express';
import BusinessListing from '../models/BusinessListing';
import { apiLogger } from '../utils/logger';
import { getParam } from '../utils/validateParams';
import { resolveId } from '../utils/idObfuscation';
import { validateAskBody, type ListingFacts } from '../services/businessAssistant/businessAssistant';
import { askBusinessAssistant, AssistantUnavailableError } from '../services/businessAssistant/askBusinessAssistant';

/** Public profile fields only — the owner and internal fields never reach the model. */
const FACT_FIELDS =
  'name listingType category customCategory description services contactPhone contactEmail whatsapp viber website address city country latitude longitude languages yearEstablished licenseNumber serviceAreas priceRange paymentMethods businessHours isVerified isActive';

/**
 * POST /api/business-listings/:id/ask  { question, history? }
 * Answers a visitor's question from the business's profile. Public, rate
 * limited per IP. 503 when the assistant is off or failing, so the page can
 * offer the contact buttons instead.
 */
export const askBusinessListing = async (req: Request, res: Response): Promise<void> => {
  const parsed = validateAskBody(req.body);
  if (parsed.isValid === false) {
    res.status(400).json({ message: parsed.error });
    return;
  }
  if (!process.env.GOOGLE_AI_API_KEY) {
    res.status(503).json({ message: 'The assistant is not available right now' });
    return;
  }

  try {
    const idOrSlug = getParam(req, 'id');
    const id = idOrSlug ? resolveId(idOrSlug) : null;
    const listing =
      (id && (await BusinessListing.findById(id).select(FACT_FIELDS).lean())) ||
      (idOrSlug && (await BusinessListing.findOne({ slug: idOrSlug.toLowerCase() }).select(FACT_FIELDS).lean()));
    if (!listing || listing.isActive === false) {
      res.status(404).json({ message: 'Business listing not found' });
      return;
    }

    const reply = await askBusinessAssistant(listing as unknown as ListingFacts, parsed.value);
    res.json(reply);
  } catch (error) {
    // The question itself is not logged: it is the visitor's own words.
    const reason = error instanceof AssistantUnavailableError ? error.message : error instanceof Error ? error.message : 'unknown';
    apiLogger.warn(`Business assistant failed: ${reason}`);
    res.status(503).json({ message: 'The assistant is not available right now' });
  }
};
