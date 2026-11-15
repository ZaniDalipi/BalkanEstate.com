import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { localizePath } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { generateBusinessSlug } from '@/utils/slug';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { drawShareCard } from '../utils/shareCard/drawShareCard';
import { cardFileName, placeOf, toneFor } from '../utils/shareCard/shareCardData';

export type ShareCardState =
  | { status: 'making' }
  | { status: 'ready'; blob: Blob; previewUrl: string }
  | { status: 'error' };

/**
 * Builds a listing's share card (badge + QR code to its page on our site)
 * while `enabled`, and shares or saves it.
 */
export function useShareCard(listing: BusinessListing, enabled: boolean) {
  const { t } = useTranslation('businessDirectory');
  const [state, setState] = useState<ShareCardState>({ status: 'making' });
  const [attempt, setAttempt] = useState(0);

  const role = listing.customCategory || t(`categories.${listing.category}`);
  const url = useMemo(
    () => `${window.location.origin}${localizePath(paths.businessListing(generateBusinessSlug(listing)))}`,
    [listing],
  );
  const text = `${listing.name} – ${role}`;
  const scanLabel = t('shareCard.scan', 'Scan to view on BalkanEstate');

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let previewUrl = '';
    setState({ status: 'making' });
    const photo = listing.logoUrl || listing.owner?.avatarUrl;
    drawShareCard({
      name: listing.name,
      role,
      place: placeOf(listing),
      url,
      imageUrl: photo ? optimizeImageUrl(photo, { width: 320, height: 320 }) : undefined,
      tone: toneFor(listing.id),
      scanLabel,
      site: window.location.host,
    })
      .then((blob) => {
        if (cancelled) return;
        previewUrl = URL.createObjectURL(blob);
        setState({ status: 'ready', blob, previewUrl });
      })
      .catch(() => { if (!cancelled) setState({ status: 'error' }); });
    return () => {
      cancelled = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // Strings, not `t`, as dependencies: the card is redrawn only when what it prints changes.
  }, [enabled, listing, role, url, scanLabel, attempt]);

  const file = state.status === 'ready' ? new File([state.blob], cardFileName(listing.name), { type: 'image/png' }) : null;
  const canShareFile = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  const download = useCallback(() => {
    if (state.status !== 'ready') return;
    const a = document.createElement('a');
    a.href = state.previewUrl;
    a.download = cardFileName(listing.name);
    a.click();
  }, [state, listing.name]);

  /** The phone's share sheet with the card image attached (Instagram, WhatsApp, …). */
  const shareFile = useCallback(async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: listing.name, text: `${text}\n${url}` });
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') download();
    }
  }, [file, listing.name, text, url, download]);

  return { state, url, text, canShareFile, shareFile, download, retry: () => setAttempt((n) => n + 1) };
}
