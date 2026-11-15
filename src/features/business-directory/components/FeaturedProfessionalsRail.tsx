import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TeamLanyardRail from '@/src/components/ui/team-lanyard-rail';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { localizePath, navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { generateBusinessSlug } from '@/utils/slug';
import { SoftIcon } from '@/src/shared/illustrations';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { toLanyardMembers } from '../utils/lanyardMembers';
import { categoryLabel } from '../utils/categoryStyle';
import { useShareAndCopy } from '../hooks/useShareAndCopy';
import RailActions from './RailActions';
import ShareCardDialog from './share/ShareCardDialog';
import { DetailToast } from './detail/DetailToast';

interface FeaturedProfessionalsRailProps {
  /** Listings on screen; individuals among them hang on the rail. */
  listings: BusinessListing[];
  /** "Offer your services": starts a new listing (sign-in guarded by the page). */
  onListYourself: () => void;
  /** Spacing around the card, from the page that places it. */
  className?: string;
  /** With nobody to show: an invitation to be the first (true) or nothing (false). */
  showWhenEmpty?: boolean;
}

const CARD = 'overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.14),0_28px_60px_-32px_rgba(15,23,42,0.28)]';
const profilePath = (l: BusinessListing) => paths.businessListing(generateBusinessSlug(l));

/**
 * Featured professionals as ID badges on lanyards: hover or tap to meet
 * someone, pull a badge down, click to flip it for their bio and contacts;
 * open or share whoever is up front from the buttons underneath.
 */
const FeaturedProfessionalsRail: React.FC<FeaturedProfessionalsRailProps> = ({ listings, onListYourself, className = '', showWhenEmpty = false }) => {
  const { t } = useTranslation('businessDirectory');
  const people = useMemo(() => listings.filter((l) => l.listingType === 'individual'), [listings]);
  const [active, setActive] = useState<number | null>(null);
  const [flipped, setFlipped] = useState<number | null>(null);
  const [sharing, setSharing] = useState<BusinessListing | null>(null);
  const { toast, copy } = useShareAndCopy('');

  const members = useMemo(() => toLanyardMembers(people, {
    roleOf: (l) => categoryLabel(l, t),
    imageOf: (l) => optimizeImageUrl(l.logoUrl || l.owner?.avatarUrl, { width: 240, height: 240 }),
    profileHrefOf: (l) => localizePath(profilePath(l)),
    labels: {
      profile: t('individuals.profile', 'View profile'),
      email: t('individuals.email', 'Email'),
      call: t('individuals.call', 'Call'),
      verified: t('verified', 'Verified'),
    },
    facts: {
      locatedIn: (role, place) => t('individuals.facts.locatedIn', { role, place, defaultValue: '{{role}} in {{place}}.' }),
      serves: (areas) => t('individuals.facts.serves', { areas, defaultValue: 'Serves {{areas}}.' }),
      speaks: (languages) => t('individuals.facts.speaks', { languages, defaultValue: 'Speaks {{languages}}.' }),
      established: (year) => t('detail.established', { year, defaultValue: 'Est. {{year}}' }),
      memberSince: (year) => t('individuals.facts.memberSince', { year, defaultValue: 'Member since {{year}}' }),
    },
  }), [people, t]);

  // Badge links are plain <a href>: open our own pages in the app (no reload)
  // unless the visitor asked for a new tab.
  const routes = useMemo(() => new Map(people.map((l) => [localizePath(profilePath(l)), profilePath(l)])), [people]);
  const openInApp = useCallback((e: React.MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const href = (e.target as Element).closest('a')?.getAttribute('href');
    const path = href ? routes.get(href) : undefined;
    if (!path) return;
    e.preventDefault();
    navigate(path);
  }, [routes]);

  const current = flipped ?? active;
  const person = current === null ? null : people[current] ?? null;
  const actions = (
    <RailActions person={person} onOpen={(l) => navigate(profilePath(l))} onShare={setSharing} onListYourself={onListYourself} />
  );

  if (members.length === 0) {
    if (!showWhenEmpty) return null;
    return (
      <div className={`${CARD} flex flex-col items-center gap-3 px-6 py-10 text-center ${className}`}>
        <SoftIcon name="users" className="h-14 w-14" />
        <h2 className="text-2xl font-medium tracking-tight text-neutral-900">{t('individuals.title', 'Featured Professionals')}</h2>
        <p className="max-w-md text-sm text-neutral-500">{t('individuals.empty', 'No professionals listed yet. Offer your services and be the first badge on the rail.')}</p>
        {actions}
      </div>
    );
  }

  return (
    <div className={`${CARD} ${className}`} onClick={openInApp}>
      <TeamLanyardRail
        items={members}
        eyebrow={t('individuals.eyebrow', 'Meet the professionals')}
        heading={t('individuals.title', 'Featured Professionals')}
        caption={t('individuals.subtitle', 'Connect with skilled individuals offering expertise across the real estate sector')}
        autoplay
        onActiveChange={setActive}
        onFlippedChange={setFlipped}
        labels={{
          flip: t('individuals.flip', 'Click or press Enter to flip the badge'),
          back: t('individuals.back', 'Click again or press Esc to turn it back'),
          show: t('individuals.show', 'Show'),
        }}
        action={actions}
      />
      {sharing && <ShareCardDialog listing={sharing} onClose={() => setSharing(null)} onCopy={copy} />}
      <DetailToast toast={toast} />
    </div>
  );
};

export default FeaturedProfessionalsRail;
