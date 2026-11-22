import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Translate } from '../utils/marketPageText';

/**
 * i18next's `t` in the shape the shared text builders take, and the current
 * URL language — the same builders write the crawler HTML in the Pages
 * Function, so both say the same thing.
 */
export function useMarketText(): { t: Translate; lang: string } {
  const { t, i18n } = useTranslation(['marketPages', 'common']);
  const lang = (i18n.language || 'en').split('-')[0];
  const translate = useMemo<Translate>(() => (key, options) => String(t(key, options ?? {})), [t]);
  return { t: translate, lang };
}
