import { Type } from '@google/genai';
import { getGeminiClient, retryWithBackoff } from '../geminiService';
import {
  ASSISTANT_ACTIONS,
  buildSystemPrompt,
  sanitizeReply,
  type AskInput,
  type AssistantReply,
  type ListingFacts,
} from './businessAssistant';

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    answer: { type: Type.STRING, description: 'The reply to the visitor, in their language.' },
    action: { type: Type.STRING, enum: [...ASSISTANT_ACTIONS], description: 'The most useful next step.' },
  },
  required: ['answer', 'action'],
};

export class AssistantUnavailableError extends Error {}

/** Ask Gemini, grounded in the listing's facts. Throws AssistantUnavailableError on any model failure. */
export async function askBusinessAssistant(listing: ListingFacts, input: AskInput, now = new Date()): Promise<AssistantReply> {
  const contents = [
    ...input.history.map((t) => ({ role: t.role === 'user' ? 'user' : 'model', parts: [{ text: t.text }] })),
    { role: 'user', parts: [{ text: input.question }] },
  ];
  try {
    const result = await retryWithBackoff(
      () =>
        getGeminiClient().models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            systemInstruction: buildSystemPrompt(listing, now),
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.3,
            maxOutputTokens: 400,
          },
        }),
      2,
      1000,
    );
    const reply = sanitizeReply(JSON.parse(result.text?.trim() || '{}'), listing);
    if (!reply) throw new AssistantUnavailableError('Empty reply');
    return reply;
  } catch (error) {
    if (error instanceof AssistantUnavailableError) throw error;
    throw new AssistantUnavailableError(error instanceof Error ? error.message : 'Model call failed');
  }
}
