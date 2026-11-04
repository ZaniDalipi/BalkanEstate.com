import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import AskMessages from './AskMessages';
import { MAX_QUESTION_CHARS } from './askProperty';
import type { AskChat } from './useAskProperty';

interface SpotlightAskProps {
  /** Kept by the spotlight, so the conversation survives switching tabs. */
  chat: AskChat;
  isAuthenticated: boolean;
  onSignIn: () => void;
}

/** Ask the AI about this listing; answers come from the listing's own facts. */
const SpotlightAsk: React.FC<SpotlightAskProps> = ({ chat, isAuthenticated, onSignIn }) => {
  const { t } = useTranslation(['search']);
  const [draft, setDraft] = useState('');
  const tooLong = draft.trim().length > MAX_QUESTION_CHARS;

  const suggestions = chat.followUps.length > 0 ? chat.followUps : [
    t('search:spotlight.ask.suggest.parking', 'Is there parking?'),
    t('search:spotlight.ask.suggest.family', 'Is it good for a family?'),
    t('search:spotlight.ask.suggest.area', "What's the neighbourhood like?"),
    t('search:spotlight.ask.suggest.seller', 'What should I ask the seller?'),
  ];

  const send = (text: string) => {
    if (!isAuthenticated) return onSignIn();
    if (chat.ask(text)) setDraft('');
  };

  const errorText = {
    login: t('search:spotlight.ask.errors.login', 'Sign in to ask the AI about this home.'),
    limit: t('search:spotlight.ask.errors.limit', "You've used this month's AI questions."),
    unavailable: t('search:spotlight.ask.errors.unavailable', 'The AI assistant is unavailable right now. Try again later.'),
    invalid: t('search:spotlight.ask.errors.invalid', "This listing can't be asked about right now."),
    generic: t('search:spotlight.ask.errors.generic', "Couldn't get an answer. Try again."),
  };

  return (
    <div className="flex flex-col gap-3">
      {chat.turns.length === 0 && !chat.pendingQuestion && (
        <p className="flex items-start gap-2 text-sm text-neutral-600">
          <SoftIcon name="sparkles" className="h-5 w-5 flex-none" />
          {t('search:spotlight.ask.intro', 'Ask anything about this home. Answers come from the listing.')}
        </p>
      )}
      <AskMessages turns={chat.turns} pendingQuestion={chat.pendingQuestion} thinkingLabel={t('search:spotlight.ask.thinking', 'Thinking…')} />

      {chat.errorKind && (
        <div role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
          {errorText[chat.errorKind]}{' '}
          {chat.errorKind === 'login' && <button type="button" onClick={onSignIn} className="font-semibold underline">{t('search:spotlight.ask.signIn', 'Sign in')}</button>}
          {chat.errorKind === 'limit' && <button type="button" onClick={() => navigate(paths.pricing())} className="font-semibold underline">{t('search:spotlight.ask.seePlans', 'See plans')}</button>}
        </div>
      )}

      {!chat.isAsking && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => send(s)}
              className="min-h-[36px] rounded-full bg-white px-3 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/30 hover:bg-primary/5">{s}</button>
          ))}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(draft); }} className="flex items-end gap-2">
        <label htmlFor="spotlight-ask" className="sr-only">{t('search:spotlight.ask.placeholder', 'Ask about this home…')}</label>
        <input id="spotlight-ask" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={chat.isAsking}
          aria-invalid={tooLong} aria-describedby={tooLong ? 'spotlight-ask-error' : undefined}
          placeholder={t('search:spotlight.ask.placeholder', 'Ask about this home…')}
          className="min-h-[44px] flex-1 rounded-xl border border-neutral-300 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <button type="submit" disabled={chat.isAsking || !draft.trim() || tooLong}
          className="min-h-[44px] rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-40">
          {t('search:spotlight.ask.send', 'Send')}
        </button>
      </form>
      {tooLong && <p id="spotlight-ask-error" role="alert" className="text-xs text-red-600">{t('search:spotlight.ask.tooLong', 'Keep it under {{max}} characters.', { max: MAX_QUESTION_CHARS })}</p>}
      <p className="text-[11px] text-neutral-400">{t('search:spotlight.ask.disclaimer', 'AI answers can be wrong. Check important details with the seller.')}</p>
    </div>
  );
};

export default SpotlightAsk;
