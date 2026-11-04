import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { askBusiness, type AskAction, type AskTurn } from '../api/businessExtrasApi';

export type AskMessage =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'assistant'; text: string; action: AskAction }
  /** The assistant couldn't answer: `reason` picks the wording, the page offers direct contact. */
  | { id: number; role: 'error'; reason: 'limited' | 'unavailable' | 'wait'; retryAfterSeconds?: number };

const HISTORY_TURNS = 6;
/** Questions one visit may ask — the server has its own, firmer limits. */
export const MAX_QUESTIONS_PER_VISIT = 10;
/** Pause after each question, so a double tap or a held Enter can't fire a burst. */
export const ASK_COOLDOWN_MS = 4000;

/** Turn the conversation so far into the history the server accepts (errors left out). */
export const toHistory = (messages: AskMessage[]): AskTurn[] =>
  messages
    .filter((m): m is Extract<AskMessage, { role: 'user' | 'assistant' }> => m.role !== 'error')
    .map((m) => ({ role: m.role, text: m.text }))
    .slice(-HISTORY_TURNS);

/** Read the server's refusal: wait a moment (burst), limit reached, or unavailable. */
export function errorReason(error: unknown): { reason: 'limited' | 'unavailable' | 'wait'; retryAfterSeconds?: number } {
  const e = error as { statusCode?: number; details?: { reason?: string; retryAfterSeconds?: number } };
  if (e?.statusCode !== 429) return { reason: 'unavailable' };
  return e.details?.reason === 'burst'
    ? { reason: 'wait', retryAfterSeconds: e.details.retryAfterSeconds ?? 30 }
    : { reason: 'limited' };
}

/** A short chat with the business's profile, paced and capped per visit. */
export function useAskBusiness(listingId: string) {
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [coolingDown, setCoolingDown] = useState(false);
  const nextId = useRef(1);
  const id = () => nextId.current++;
  const asked = messages.filter((m) => m.role === 'user').length;
  const remaining = Math.max(0, MAX_QUESTIONS_PER_VISIT - asked);

  const mutation = useMutation({
    mutationFn: ({ question, history }: { question: string; history: AskTurn[] }) => askBusiness(listingId, question, history),
    retry: false,
  });

  // End the pause after each question.
  useEffect(() => {
    if (!coolingDown) return undefined;
    const timer = window.setTimeout(() => setCoolingDown(false), ASK_COOLDOWN_MS);
    return () => window.clearTimeout(timer);
  }, [coolingDown]);

  const canAsk = !mutation.isPending && !coolingDown && remaining > 0;

  const ask = useCallback(
    (raw: string) => {
      const question = raw.trim().slice(0, 500);
      if (!question || !canAsk) return;
      const history = toHistory(messages);
      setCoolingDown(true);
      setMessages((prev) => [...prev, { id: id(), role: 'user', text: question }]);
      mutation.mutate(
        { question, history },
        {
          onSuccess: (reply) => setMessages((prev) => [...prev, { id: id(), role: 'assistant', text: reply.answer, action: reply.action }]),
          onError: (error: unknown) => setMessages((prev) => [...prev, { id: id(), role: 'error', ...errorReason(error) }]),
        },
      );
    },
    [messages, mutation, canAsk],
  );

  return { messages, ask, isAsking: mutation.isPending, canAsk, coolingDown, remaining };
}
