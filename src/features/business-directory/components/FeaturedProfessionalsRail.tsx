import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import TeamLanyardRail from '@/src/components/ui/team-lanyard-rail';
import { PlusIcon } from '@/constants';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { localizePath, navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { generateBusinessSlug } from '@/utils/slug';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { toLanyardMembers } from '../utils/lanyardMembers';

interface FeaturedProfessionalsRailProps {
  /** Listings on screen; individuals among them hang on the rail. */
  listings: BusinessListing[];
  /** "Offer your services": starts a new listing (sign-in guarded by the page). */
  onListYourself: () => void;
}

const profilePath = (l: BusinessListing) => paths.businessListing(generateBusinessSlug(l));

/**
 * Featured professionals as ID badges on lanyards: hover or tap to meet
 * someone, pull a badge down, click to flip it for their bio and contacts.
 */
const FeaturedProfessionalsRail: React.FC<FeaturedProfessionalsRailProps> = ({ listings, onListYourself }) => {
  const { t } = useTranslation('businessDirectory');

  const members = useMemo(() => toLanyardMembers(listings, {
    roleOf: (l) => t(`categories.${l.category}`),
    imageOf: (l) => optimizeImageUrl(l.logoUrl || l.owner?.avatarUrl, { width: 240, height: 240 }),
    profileHrefOf: (l) => localizePath(profilePath(l)),
    labels: {
      profile: t('individuals.profile', 'View profile'),
      email: t('individuals.email', 'Email'),
      call: t('individuals.call', 'Call'),
      verified: t('verified', 'Verified'),
    },
  }), [listings, t]);

  // The badges' profile links are plain <a href>: open them in the app
  // (no full reload) unless the visitor asked for a new tab.
  const routes = useMemo(
    () => new Map(listings.map((l) => [localizePath(profilePath(l)), profilePath(l)])),
    [listings],
  );
  const openInApp = useCallback((e: React.MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const href = (e.target as Element).closest('a')?.getAttribute('href');
    const path = href ? routes.get(href) : undefined;
    if (!path) return;
    e.preventDefault();
    navigate(path);
  }, [routes]);

  if (members.length === 0) return null;

  return (
    <div
      className="mb-6 overflow-hidden rounded-[28px] border border-white/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.14),0_28px_60px_-32px_rgba(15,23,42,0.28)] sm:mb-8"
      onClick={openInApp}
    >
      <TeamLanyardRail
        items={members}
        eyebrow={t('individuals.eyebrow', 'Meet the professionals')}
        heading={t('individuals.title', 'Featured Professionals')}
        caption={t('individuals.subtitle', 'Connect with skilled individuals offering expertise across the real estate sector')}
        autoplay
        labels={{
          flip: t('individuals.flip', 'Click or press Enter to flip the badge'),
          back: t('individuals.back', 'Click again or press Esc to turn it back'),
          show: t('individuals.show', 'Show'),
        }}
        action={(
          <button
            type="button"
            onClick={onListYourself}
            className="liquid-tint inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            <PlusIcon className="h-4 w-4" />
            {t('individuals.cta', 'Offer your services')}
          </button>
        )}
      />
    </div>
  );
};

export default FeaturedProfessionalsRail;
