import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { askBusiness, type AskAction, type AskTurn } from '../api/businessExtrasApi';

export type AskMessage =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'assistant'; text: string; action: AskAction }
  /** The assistant couldn't answer: `reason` picks the wording, the page offers direct contact. */
  | { id: number; role: 'error'; reason: 'limited' | 'unavailable' };

const HISTORY_TURNS = 8;

/** Turn the conversation so far into the history the server accepts (errors left out). */
export const toHistory = (messages: AskMessage[]): AskTurn[] =>
  messages
    .filter((m): m is Extract<AskMessage, { role: 'user' | 'assistant' }> => m.role !== 'error')
    .map((m) => ({ role: m.role, text: m.text }))
    .slice(-HISTORY_TURNS);

/** A short chat with the business's profile. */
export function useAskBusiness(listingId: string) {
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const nextId = useRef(1);
  const id = () => nextId.current++;

  const mutation = useMutation({
    mutationFn: ({ question, history }: { question: string; history: AskTurn[] }) => askBusiness(listingId, question, history),
    retry: false,
  });

  const ask = useCallback(
    (raw: string) => {
      const question = raw.trim().slice(0, 500);
      if (!question || mutation.isPending) return;
      const history = toHistory(messages);
      setMessages((prev) => [...prev, { id: id(), role: 'user', text: question }]);
      mutation.mutate(
        { question, history },
        {
          onSuccess: (reply) => setMessages((prev) => [...prev, { id: id(), role: 'assistant', text: reply.answer, action: reply.action }]),
          onError: (error: unknown) => {
            const status = (error as { statusCode?: number })?.statusCode;
            setMessages((prev) => [...prev, { id: id(), role: 'error', reason: status === 429 ? 'limited' : 'unavailable' }]);
          },
        },
      );
    },
    [messages, mutation],
  );

  return { messages, ask, isAsking: mutation.isPending };
}
