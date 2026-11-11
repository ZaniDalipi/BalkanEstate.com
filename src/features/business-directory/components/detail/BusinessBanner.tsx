import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Loader2, MoveVertical } from 'lucide-react';
import { optimizeImageUrl, imageSrcSet } from '@/config/mediaConfig';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { useBannerReposition } from '../../hooks/useBannerReposition';
import { useBusinessImageUploads } from '../../hooks/useBusinessImageUploads';
import { categoryGradient } from '../../utils/categoryStyle';
import { BannerCustomizeMenu } from './BannerCustomizeMenu';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';
const PILL = 'min-h-[44px] rounded-full px-5 text-sm font-semibold shadow-lg transition active:scale-[0.97]';
/** Frosted pill on the photo — same look as the customise button. */
const PILL_GLASS = 'liquid-dark min-h-[44px] items-center gap-1 rounded-full px-4 text-sm font-semibold transition active:scale-[0.97]';

/**
 * The cover photo (or the category colour when there is none). Inset with
 * rounded corners from the tablet up, edge to edge on phones. Carries the
 * page's back button from md up, and for owners the customise menu (edit,
 * banner, logo) and drag-to-reposition.
 */
interface BusinessBannerProps {
  listing: BusinessListing;
  isOwner: boolean;
  /** History-aware back (the page's own, shown from md up). */
  onBack: () => void;
  onEdit: () => void;
}

export const BusinessBanner: React.FC<BusinessBannerProps> = ({ listing, isOwner, onBack, onEdit }) => {
  const { t } = useTranslation('businessDirectory');
  const banner = useBannerReposition(listing);
  const uploads = useBusinessImageUploads(listing);
  const uploading = uploads.isBannerUploading || uploads.isLogoUploading;
  const error = uploads.error ?? banner.error;

  return (
    <div
      className={`relative h-44 overflow-hidden bg-gradient-to-br sm:h-60 sm:rounded-[32px] lg:h-80 landscape:h-36 ${categoryGradient(listing.category)} ${banner.isRepositioning ? 'cursor-grab touch-none select-none active:cursor-grabbing' : ''}`}
      {...(banner.isRepositioning ? banner.pointerHandlers : {})}
    >
      {listing.bannerUrl ? (
        <img
          src={optimizeImageUrl(listing.bannerUrl, { width: 1280 }) || listing.bannerUrl}
          srcSet={imageSrcSet(listing.bannerUrl) || undefined}
          sizes="(min-width: 1152px) 1152px, 100vw"
          alt=""
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
          style={{ objectPosition: `center ${banner.positionY}%` }}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_45%),radial-gradient(circle_at_85%_70%,rgba(255,255,255,0.2),transparent_40%)]" />
      )}
      {/* Soft fade so the floating card reads against any photo. */}
      {!banner.isRepositioning && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent" />}

      {!banner.isRepositioning && (
        <div className="absolute left-3 top-3 z-20 flex items-center gap-2 sm:left-4 sm:top-4">
          {/* Phones go back with the app bar's own back button; from md up the page carries one. */}
          <button type="button" onClick={onBack} className={`${PILL_GLASS} hidden md:inline-flex`}>
            <ChevronLeft className="-ml-1 h-5 w-5" aria-hidden="true" />
            {t('common:back', 'Back')}
          </button>
          {isOwner && (
            <>
              <input ref={uploads.bannerInputRef} type="file" accept={ACCEPT} onChange={uploads.onBannerChange} className="hidden" />
              <input ref={uploads.logoInputRef} type="file" accept={ACCEPT} onChange={uploads.onLogoChange} className="hidden" />
              <BannerCustomizeMenu
                hasBanner={!!listing.bannerUrl}
                hasLogo={!!listing.logoUrl}
                busy={uploading}
                onEdit={onEdit}
                onChangeBanner={() => uploads.bannerInputRef.current?.click()}
                onReposition={banner.start}
                onChangeLogo={() => uploads.logoInputRef.current?.click()}
              />
            </>
          )}
        </div>
      )}

      {banner.isRepositioning && (
        <div className="absolute inset-0 z-20 ring-2 ring-inset ring-white/70 sm:rounded-[32px]">
          <p className="absolute inset-x-0 top-3 mx-auto flex w-fit items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
            <MoveVertical className="h-4 w-4" aria-hidden="true" />
            {t('banner.dragToReposition', 'Drag to reposition')}
          </p>
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
            <button type="button" onClick={banner.cancel} className={`${PILL} bg-white/90 text-neutral-800 backdrop-blur-md`}>
              {t('common:cancel', 'Cancel')}
            </button>
            <button type="button" onClick={banner.save} disabled={banner.isSaving} className={`${PILL} bg-primary text-white disabled:opacity-60`}>
              {t('common:save', 'Save')}
            </button>
          </div>
        </div>
      )}

      {uploading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30" role="status">
          <span className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2.5 text-sm font-medium text-neutral-800 shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            {uploads.isBannerUploading ? t('form.bannerUploading', 'Uploading banner...') : t('form.logoUploading', 'Uploading logo...')}
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="absolute inset-x-4 bottom-4 z-30 mx-auto w-fit rounded-full bg-rose-600/90 px-4 py-2 text-xs font-semibold text-white">
          {error}
        </p>
      )}
    </div>
  );
};
