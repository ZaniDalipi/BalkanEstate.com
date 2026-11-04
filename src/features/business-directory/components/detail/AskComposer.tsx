import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp } from 'lucide-react';

interface AskComposerProps {
  name: string;
  disabled: boolean;
  onAsk: (question: string) => void;
  inputRef: React.Ref<HTMLInputElement>;
}

const MAX = 500;

/** The question field: Enter or the arrow sends; empty and over-long questions can't be sent. */
export const AskComposer: React.FC<AskComposerProps> = ({ name, disabled, onAsk, inputRef }) => {
  const { t } = useTranslation('businessDirectory');
  const [text, setText] = useState('');
  const canSend = !disabled && text.trim().length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    onAsk(text);
    setText('');
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-4 shadow-sm ring-1 ring-black/[0.08] focus-within:ring-2 focus-within:ring-primary/40">
      <label htmlFor="ask-business-input" className="sr-only">{t('detail.ask.inputLabel', { name, defaultValue: 'Your question for {{name}}' })}</label>
      <input
        id="ask-business-input"
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX}
        autoComplete="off"
        enterKeyHint="send"
        placeholder={t('detail.ask.placeholder', 'Ask anything about them…')}
        className="min-w-0 flex-1 bg-transparent text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label={t('detail.ask.send', 'Send')}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-dark active:scale-95 disabled:bg-neutral-200 disabled:text-neutral-400"
      >
        <ArrowUp className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
      </button>
    </form>
  );
};
