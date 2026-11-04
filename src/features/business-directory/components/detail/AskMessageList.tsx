import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import type { AskMessage } from '../../hooks/useAskBusiness';
import type { ContactChannel } from '../../utils/contactChannels';
import { CHANNEL_META, channelLinkProps } from './channelMeta';

interface AskMessageListProps {
  messages: AskMessage[];
  isAsking: boolean;
  channels: ContactChannel[];
}

/** One tappable next step under an answer: "WhatsApp them", "Get directions"… */
export const AskActionLink: React.FC<{ channel: ContactChannel }> = ({ channel }) => {
  const { t } = useTranslation('businessDirectory');
  const meta = CHANNEL_META[channel.id];
  return (
    <a href={channel.href} {...channelLinkProps(channel.external)} className="mt-2 inline-flex min-h-[40px] items-center gap-2 rounded-full bg-white px-3.5 text-sm font-semibold text-primary shadow-sm ring-1 ring-black/[0.06] transition hover:bg-primary/5">
      <meta.Icon className={`h-4 w-4 ${meta.tint}`} />
      {t(meta.actionKey, meta.actionDefault)}
    </a>
  );
};

const Bot: React.FC = () => (
  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-sky-400 text-white shadow-sm" aria-hidden="true">
    <Sparkles className="h-3.5 w-3.5" />
  </span>
);

/** The conversation: visitor on the right in blue, assistant on the left on glass, with a next step when useful. */
export const AskMessageList: React.FC<AskMessageListProps> = ({ messages, isAsking, channels }) => {
  const { t } = useTranslation('businessDirectory');
  const end = useRef<HTMLDivElement>(null);
  const fallback = channels.find((c) => c.id === 'whatsapp') ?? channels.find((c) => c.id === 'call');

  // Keep the newest message in view inside the list (not the whole page).
  useEffect(() => {
    const el = end.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isAsking]);

  if (messages.length === 0 && !isAsking) return null;

  return (
    <div className="mb-3 max-h-[360px] space-y-3 overflow-y-auto overscroll-contain pr-1" aria-live="polite" aria-relevant="additions">
      {messages.map((m) =>
        m.role === 'user' ? (
          <p key={m.id} className="ml-auto w-fit max-w-[85%] rounded-[20px] rounded-br-md bg-primary px-4 py-2.5 text-[15px] text-white">
            {m.text}
          </p>
        ) : (
          <div key={m.id} className="flex max-w-[92%] items-start gap-2">
            <Bot />
            <div className="min-w-0">
              <p className="rounded-[20px] rounded-tl-md bg-white px-4 py-2.5 text-[15px] leading-relaxed text-neutral-800 shadow-sm ring-1 ring-black/[0.05]">
                {m.role === 'assistant'
                  ? m.text
                  : m.reason === 'wait'
                    ? t('detail.ask.wait', { seconds: m.retryAfterSeconds ?? 30, defaultValue: 'One moment — you can ask again in {{seconds}} s.' })
                    : m.reason === 'limited'
                      ? t('detail.ask.limited', 'That’s a lot of questions for now — the business can answer the rest directly.')
                      : t('detail.ask.unavailable', 'I can’t answer right now — the business can tell you directly.')}
              </p>
              {m.role === 'assistant' && m.action !== 'none' && channels.some((c) => c.id === m.action) && (
                <AskActionLink channel={channels.find((c) => c.id === m.action)!} />
              )}
              {m.role === 'error' && m.reason !== 'wait' && fallback && <AskActionLink channel={fallback} />}
            </div>
          </div>
        ),
      )}
      {isAsking && (
        <div className="flex items-center gap-2" role="status">
          <Bot />
          <span className="flex gap-1 rounded-[20px] bg-white px-4 py-3.5 shadow-sm ring-1 ring-black/[0.05]">
            <span className="sr-only">{t('detail.ask.thinking', 'Thinking…')}</span>
            {[0, 150, 300].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: `${d}ms` }} aria-hidden="true" />)}
          </span>
        </div>
      )}
      <div ref={end} />
    </div>
  );
};
