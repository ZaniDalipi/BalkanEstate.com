import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Sparkles } from 'lucide-react';

/** "Ask anything about …" under the action row: jumps to the chat and puts the cursor in it. */
export const AskEntryButton: React.FC<{ name: string; onClick: () => void }> = ({ name, onClick }) => {
  const { t } = useTranslation('businessDirectory');
  return (
    <button
      type="button"
      onClick={onClick}
      className="group mt-2.5 flex min-h-[48px] w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-primary/[0.08] via-sky-400/[0.08] to-violet-500/[0.08] px-4 text-left ring-1 ring-primary/10 transition hover:ring-primary/25 active:scale-[0.99]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-sky-400 text-white shadow-sm" aria-hidden="true">
        <Sparkles className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-neutral-800">
        {t('detail.ask.entry', { name, defaultValue: 'Ask anything about {{name}}' })}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-primary transition group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
  );
};
