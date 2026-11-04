import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { convertToUploadableImage } from '@/shared/utils/imageConversion';
import { useUploadBusinessBanner, useUploadBusinessLogo } from './useBusinessListings';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export type ImageFileCheck = { ok: true } | { ok: false; reason: 'type' | 'size' };

/** Can this file be uploaded as a banner or logo? */
export function checkImageFile(file: Pick<File, 'type' | 'size'>): ImageFileCheck {
  if (!ACCEPTED.includes(file.type)) return { ok: false, reason: 'type' };
  if (file.size > MAX_BYTES) return { ok: false, reason: 'size' };
  return { ok: true };
}

/** Banner and logo uploads for the owner, with hidden file inputs and one error line. */
export function useBusinessImageUploads(listing: BusinessListing) {
  const { t } = useTranslation('businessDirectory');
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { uploadBanner, isLoading: isBannerUploading } = useUploadBusinessBanner();
  const { uploadLogo, isLoading: isLogoUploading } = useUploadBusinessLogo();
  const [error, setError] = useState<string | null>(null);

  const handle = useCallback(
    (kind: 'banner' | 'logo') => async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      e.target.value = '';
      if (!selected) return;
      // iPhone HEIC/HEIF photos become JPEG so they upload and render everywhere.
      const file = await convertToUploadableImage(selected);
      const check = checkImageFile(file);
      if (check.ok === false) {
        setError(check.reason === 'type'
          ? t('form.bannerInvalidType', 'Please upload a JPEG, PNG, or WebP image')
          : t('form.bannerTooLarge', 'Image must be under 5MB'));
        return;
      }
      setError(null);
      try {
        if (kind === 'banner') await uploadBanner({ id: listing.id, file });
        else await uploadLogo({ id: listing.id, file });
      } catch {
        setError(kind === 'banner'
          ? t('form.bannerUploadError', 'Failed to upload banner. Please try again.')
          : t('form.logoUploadError', 'Failed to upload logo. Please try again.'));
      }
    },
    [listing.id, uploadBanner, uploadLogo, t],
  );

  return {
    bannerInputRef,
    logoInputRef,
    onBannerChange: handle('banner'),
    onLogoChange: handle('logo'),
    isBannerUploading,
    isLogoUploading,
    error,
    clearError: () => setError(null),
  };
}
