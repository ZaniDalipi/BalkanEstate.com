import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { askAboutProperty, askErrorKind, MAX_QUESTION_CHARS, type AskErrorKind, type AskTurn } from './askProperty';

/**
 * The conversation about one listing: the turns so far, the follow-ups the
 * assistant suggested, and `ask`. A failed question stays in the box (it is
 * not added to the conversation), with the reason as `errorKind`.
 */
export function useAskProperty(propertyId: string) {
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: ({ question, history }: { question: string; history: AskTurn[] }) =>
      askAboutProperty(propertyId, question, history),
    onSuccess: (data, { question }) => {
      setTurns((prev) => [...prev, { sender: 'user', text: question }, { sender: 'ai', text: data.answer }]);
      setFollowUps(data.followUps);
    },
  });

  const ask = useCallback((raw: string): boolean => {
    const question = raw.trim();
    if (!question || question.length > MAX_QUESTION_CHARS || mutation.isPending) return false;
    mutation.mutate({ question, history: turns });
    return true;
  }, [mutation, turns]);

  const errorKind: AskErrorKind | null = mutation.isError ? askErrorKind(mutation.error) : null;
  return { turns, followUps, ask, isAsking: mutation.isPending, pendingQuestion: mutation.isPending ? mutation.variables?.question ?? null : null, errorKind };
}

export type AskChat = ReturnType<typeof useAskProperty>;
