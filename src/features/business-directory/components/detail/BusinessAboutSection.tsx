import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { DetailSection } from './DetailSection';

/** Past this many characters the description folds, with "Read more". */
export const ABOUT_FOLD_CHARS = 360;

/** The owner's description and the services they offer. */
export const BusinessAboutSection: React.FC<{ listing: BusinessListing }> = ({ listing }) => {
  const { t } = useTranslation('businessDirectory');
  const [expanded, setExpanded] = useState(false);
  const textId = useId();
  const description = listing.description?.trim() ?? '';
  const services = listing.services.filter((s) => s.trim());
  if (!description && services.length === 0) return null;
  const folds = description.length > ABOUT_FOLD_CHARS;

  return (
    <DetailSection id="business-about" icon="clipboard" title={t('detail.about', 'About')} subtitle={t('detail.aboutSubtitle', 'Who we are & what we do')}>
      {description && (
        <>
          <p
            id={textId}
            className={`whitespace-pre-line break-words text-[15px] leading-relaxed text-neutral-700 sm:text-base ${folds && !expanded ? 'line-clamp-5' : ''}`}
            style={{ overflowWrap: 'anywhere' }}
          >
            {description}
          </p>
          {folds && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-controls={textId}
              className="mt-2 min-h-[44px] text-[15px] font-semibold text-primary hover:underline"
            >
              {expanded ? t('detail.readLess', 'Show less') : t('detail.readMore', 'Read more')}
            </button>
          )}
        </>
      )}
      {services.length > 0 && (
        <div className={description ? 'mt-5 border-t border-black/[0.06] pt-5' : ''}>
          <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-neutral-500">{t('detail.services', 'Services Offered')}</h3>
          <ul className="flex flex-wrap gap-2">
            {services.map((s) => (
              <li key={s} className="rounded-full bg-primary/[0.07] px-3.5 py-2 text-sm font-medium text-primary-dark">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </DetailSection>
  );
};
