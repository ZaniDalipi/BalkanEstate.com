import React from 'react';
import { useTranslation } from 'react-i18next';
import type { HintGroup } from '../utils/hintGroups';

/** One group of tips in the Tips panel. */
const HintGroupList: React.FC<{ group: HintGroup }> = ({ group }) => {
  const { t } = useTranslation('common');
  const titles = {
    property: t('hints.groups.property', 'On a listing'),
    search: t('hints.groups.search', 'In search'),
    global: t('hints.groups.global', 'Everywhere'),
  };
  const title = group.current && group.page !== 'global' ? t('hints.groups.current', 'On this page') : titles[group.page];
  return (
    <section className="py-2">
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
      <ul className="space-y-2">
        {group.hints.map((h) => (
          <li key={h.id} className="flex gap-2 text-sm leading-snug text-neutral-700">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            <span>{t(h.key, h.text)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default HintGroupList;
