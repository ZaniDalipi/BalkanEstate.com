import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { useAskBusiness } from '../../hooks/useAskBusiness';
import { askSuggestions } from '../../utils/askSuggestions';
import type { ContactChannel } from '../../utils/contactChannels';
import { AskComposer } from './AskComposer';
import { AskActionLink, AskMessageList } from './AskMessageList';
import { DetailSection } from './DetailSection';

interface BusinessAskSectionProps {
  listing: BusinessListing;
  channels: ContactChannel[];
  inputRef: React.Ref<HTMLInputElement>;
}

/**
 * "Ask about them": a short chat answered from this profile only. Suggested
 * questions to start, a tappable next step under answers, and a way to the
 * business itself whenever the profile doesn't know.
 */
export const BusinessAskSection: React.FC<BusinessAskSectionProps> = ({ listing, channels, inputRef }) => {
  const { t } = useTranslation('businessDirectory');
  const { messages, ask, isAsking, canAsk, coolingDown, remaining } = useAskBusiness(listing.slug || listing.id);
  const fallback = channels.find((c) => c.id === 'whatsapp') ?? channels.find((c) => c.id === 'call');
  const suggestions = askSuggestions(listing);

  return (
    <DetailSection
      id="business-ask"
      icon="chat"
      title={t('detail.ask.title', { name: listing.name, defaultValue: 'Ask about {{name}}' })}
      aside={
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-primary/10 to-sky-400/10 px-2.5 py-1 text-[12px] font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {t('detail.ask.badge', 'AI')}
        </span>
      }
    >
      <AskMessageList messages={messages} isAsking={isAsking} channels={channels} />

      {messages.length === 0 && (
        <ul className="mb-3 flex flex-wrap gap-2" aria-label={t('detail.ask.suggestions', 'Suggested questions')}>
          {suggestions.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => ask(t(s.key, s.defaultValue))}
                disabled={!canAsk}
                className="min-h-[40px] rounded-full bg-primary/[0.07] px-3.5 text-sm font-medium text-primary-dark transition hover:bg-primary/[0.12] active:scale-[0.98] disabled:opacity-50"
              >
                {t(s.key, s.defaultValue)}
              </button>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 ? (
        <>
          <AskComposer name={listing.name} disabled={!canAsk} onAsk={ask} inputRef={inputRef} />
          {remaining <= 3 && (
            <p className="mt-2 text-[12px] font-medium text-neutral-600" aria-live="polite">
              {t('detail.ask.remaining', { count: remaining, defaultValue: '{{count}} questions left for this visit' })}
            </p>
          )}
          {coolingDown && !isAsking && <span className="sr-only" role="status">{t('detail.ask.cooldown', 'You can ask again in a moment.')}</span>}
        </>
      ) : (
        <div role="status" className="rounded-2xl bg-primary/[0.06] px-4 py-3 text-[15px] text-neutral-700">
          {t('detail.ask.visitLimit', 'That’s the question limit for this visit — the business can answer the rest directly.')}
          {fallback && <AskActionLink channel={fallback} />}
        </div>
      )}
      <p className="mt-2.5 text-[12px] leading-snug text-neutral-500">
        {t('detail.ask.disclaimer', 'Answers come only from this profile and may be incomplete — confirm important details with the business.')}
      </p>
    </DetailSection>
  );
};
