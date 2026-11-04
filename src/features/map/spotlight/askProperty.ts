/**
 * The property assistant API (POST /api/ai/ask-property) and how its failures
 * read to a visitor.
 */
import { apiRequest } from '@/src/shared/api/httpClient';

export interface AskTurn { sender: 'user' | 'ai'; text: string }
export interface AskAnswer { answer: string; followUps: string[] }

export const MAX_QUESTION_CHARS = 500;

export function askAboutProperty(propertyId: string, question: string, history: AskTurn[]): Promise<AskAnswer> {
  return apiRequest<AskAnswer>('/ai/ask-property', {
    method: 'POST',
    requiresAuth: true,
    body: { propertyId, question, history: history.slice(-10) },
  });
}

/** What went wrong, in terms of what the visitor can do next. */
export type AskErrorKind = 'login' | 'limit' | 'unavailable' | 'invalid' | 'generic';

export function askErrorKind(error: unknown): AskErrorKind {
  const status = (error as { statusCode?: number } | null)?.statusCode;
  if (status === 401 || status === 403) return 'login';
  if (status === 429) return 'limit';
  if (status === 503) return 'unavailable';
  if (status === 400 || status === 404) return 'invalid';
  return 'generic';
}
