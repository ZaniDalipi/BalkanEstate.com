import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type Toast = { tone: 'ok' | 'error'; text: string } | null;

/**
 * Share the page (the system share sheet where there is one, the clipboard
 * otherwise) and copy text, each confirmed by a short toast.
 */
export function useShareAndCopy(title: string) {
  const { t } = useTranslation('businessDirectory');
  const [toast, setToast] = useState<Toast>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((next: NonNullable<Toast>) => {
    window.clearTimeout(timer.current);
    setToast(next);
    timer.current = window.setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async (text: string, okText?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      show({ tone: 'ok', text: okText ?? t('detail.copied', 'Copied') });
    } catch {
      show({ tone: 'error', text: t('detail.copyFailed', 'Couldn’t copy — select the text instead') });
    }
  }, [show, t]);

  const share = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return; // the person closed the sheet
      }
    }
    await copy(url, t('detail.linkCopied', 'Link copied to clipboard!'));
  }, [title, copy, t]);

  return { toast, share, copy };
}
