import { Request, Response } from 'express';
import BusinessListing from '../models/BusinessListing';
import { apiLogger } from '../utils/logger';
import { getParam } from '../utils/validateParams';
import { resolveId } from '../utils/idObfuscation';
import { validateAskBody, type AssistantReply, type ListingFacts } from '../services/businessAssistant/businessAssistant';
import { askBusinessAssistant, AssistantUnavailableError } from '../services/businessAssistant/askBusinessAssistant';
import { AskGuard, askGuard, type AskBlock } from '../services/businessAssistant/askGuard';

/** Public profile fields only — the owner and internal fields never reach the model. */
const FACT_FIELDS =
  'name listingType category customCategory description services contactPhone contactEmail whatsapp viber website address city country latitude longitude languages yearEstablished licenseNumber serviceAreas priceRange paymentMethods businessHours isVerified isActive updatedAt';

const BLOCK_MESSAGES: Record<Extract<AskBlock, { blocked: true }>['reason'], string> = {
  burst: 'Please wait a moment before asking again.',
  hourly: 'You have asked a lot of questions — please try again later, or contact the business directly.',
  daily: 'You have reached today’s question limit — please contact the business directly.',
  listing: 'This business has had a lot of questions today — please contact them directly.',
  busy: 'The assistant is busy right now — please contact the business directly.',
};

/** 429 for visitor/business limits (with Retry-After), 503 when the site-wide budget is spent. */
function sendBlocked(res: Response, block: Extract<AskBlock, { blocked: true }>): void {
  res.set('Retry-After', String(block.retryAfterSeconds));
  res.status(block.reason === 'busy' ? 503 : 429).json({ message: BLOCK_MESSAGES[block.reason], reason: block.reason, retryAfterSeconds: block.retryAfterSeconds });
}

/**
 * POST /api/business-listings/:id/ask  { question, history? }
 * Answers a visitor's question from the business's profile. Public; guarded
 * per IP, per business and site-wide (see askGuard), with repeated opening
 * questions served from a cache. 503 when the assistant is off or failing,
 * so the page can offer the contact buttons instead.
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

  // Cheapest first: an over-eager visitor is turned away before any database read.
  const visitor = askGuard.admitVisitor(req.ip || 'unknown');
  if (visitor.blocked) {
    sendBlocked(res, visitor);
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

    const listingId = String(listing._id);
    const version = listing.updatedAt ? new Date(listing.updatedAt).getTime().toString(36) : '0';
    const cacheKey = AskGuard.cacheKey(listingId, version, parsed.value.question, parsed.value.history.length);
    const cached = askGuard.cached<AssistantReply>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const budget = askGuard.admitModelCall(listingId);
    if (budget.blocked) {
      sendBlocked(res, budget);
      return;
    }

    const reply = await askBusinessAssistant(listing as unknown as ListingFacts, parsed.value);
    askGuard.remember(cacheKey, reply);
    res.json(reply);
  } catch (error) {
    // The question itself is not logged: it is the visitor's own words.
    const reason = error instanceof AssistantUnavailableError ? error.message : error instanceof Error ? error.message : 'unknown';
    apiLogger.warn(`Business assistant failed: ${reason}`);
    res.status(503).json({ message: 'The assistant is not available right now' });
  }
};
