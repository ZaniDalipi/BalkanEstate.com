import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { hasAnyHours } from './businessHours';

export interface AskSuggestion {
  key: string;
  defaultValue: string;
}

/**
 * Starter questions for the chat, picked from what the profile can actually
 * answer, plus one it usually can't (a quote) — which shows the visitor how
 * the assistant hands over to the business. At most four.
 */
export function askSuggestions(l: BusinessListing): AskSuggestion[] {
  const list: AskSuggestion[] = [];
  if (hasAnyHours(l.businessHours)) list.push({ key: 'detail.ask.suggest.weekend', defaultValue: 'Are they open on Saturday?' });
  if (l.serviceAreas?.length) list.push({ key: 'detail.ask.suggest.areas', defaultValue: 'Which areas do they cover?' });
  if (l.languages?.length) list.push({ key: 'detail.ask.suggest.languages', defaultValue: 'Do they speak English?' });
  if (l.paymentMethods?.length) list.push({ key: 'detail.ask.suggest.payment', defaultValue: 'How can I pay?' });
  if (l.services.length) list.push({ key: 'detail.ask.suggest.services', defaultValue: 'What services do they offer?' });
  return [...list.slice(0, 3), { key: 'detail.ask.suggest.quote', defaultValue: 'How do I get a quote?' }];
}
