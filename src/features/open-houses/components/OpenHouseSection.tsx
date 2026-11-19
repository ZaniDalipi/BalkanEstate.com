import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOpenHouses } from '../hooks/useOpenHouses';
import { useRsvp } from '../hooks/useOpenHouseMutations';
import { formatOpenHouseWindow } from '../utils/openHouseFormat';
import { buildOpenHouseIcs, downloadIcs } from '../utils/openHouseIcs';
import { openHouseErrorKey } from '../utils/openHouseErrorKey';
import type { OpenHouse, RsvpInput } from '../types';
import OpenHouseSlot from './OpenHouseSlot';
import RsvpDialog from './RsvpDialog';
import { TurnstileWidget, useTurnstile } from '@/src/shared/captcha';

interface OpenHouseSectionProps {
  property: { id: string; title?: string; address?: string; city?: string; country?: string };
  viewer: RsvpInput & { isSignedIn: boolean };
  /** Opens the private viewing scheduler, when the listing takes viewings. */
  onRequestViewing?: () => void;
  /** Otherwise: write to the seller. */
  onAskSeller: () => void;
}


/**
 * The listing's upcoming open houses. Open houses are optional, so when the
 * owner hasn't planned one (or they can't be loaded) this renders nothing.
 */
const OpenHouseSection: React.FC<OpenHouseSectionProps> = ({ property, viewer, onRequestViewing, onAskSeller }) => {
  const { t, i18n } = useTranslation('property');
  const { data: openHouses } = useOpenHouses(property.id);
  const { join, leave } = useRsvp(property.id, viewer.isSignedIn);
  const [selected, setSelected] = useState<OpenHouse | null>(null);
  const captcha = useTurnstile('open_house_rsvp');
  const [captchaBlock, setCaptchaBlock] = useState<string | null>(null);

  if (!openHouses || openHouses.length === 0) return null;

  const errorMessage = (e: unknown): string => {
    const captchaMessage = captcha.errorMessage(e);
    if (captchaMessage) return captchaMessage;
    const { key, defaultValue } = openHouseErrorKey(e);
    return t(key, { defaultValue });
  };

  const label = (oh: OpenHouse) => {
    const { day, time } = formatOpenHouseWindow(oh.startsAt, oh.endsAt, i18n.language);
    return `${day} · ${time}`;
  };
  const fallback = onRequestViewing
    ? { label: t('openHouse.requestViewing', { defaultValue: 'Request a private viewing' }), onClick: onRequestViewing }
    : { label: t('openHouse.askSeller', { defaultValue: 'Ask the seller for another time' }), onClick: onAskSeller };

  const addToCalendar = (oh: OpenHouse) => {
    const title = t('openHouse.calendarTitle', { title: property.title ?? '', defaultValue: 'Open house: {{title}}' });
    const location = [property.address, property.city, property.country].filter(Boolean).join(', ');
    downloadIcs('open-house.ics', buildOpenHouseIcs({
      id: oh.id, title, location, url: window.location.href, startsAt: oh.startsAt, endsAt: oh.endsAt, description: oh.note,
    }));
  };

  return (
    <section data-open-house-section aria-labelledby={`open-house-${property.id}`} className="scroll-mt-24 rounded-xl border border-emerald-200 bg-white p-4 shadow-lg">
      <h3 id={`open-house-${property.id}`} className="text-base font-bold text-neutral-900">
        {t('openHouse.title', { defaultValue: 'Open house' })}
      </h3>
      <p className="mt-0.5 text-sm text-neutral-600">
        {t('openHouse.subtitle', { defaultValue: 'Drop by and see it in person — no appointment needed.' })}
      </p>
      <ul className="mt-3 space-y-2">
        {openHouses.map((oh) => (
          <OpenHouseSlot
            key={oh.id}
            openHouse={oh}
            busy={(join.isPending && join.variables?.openHouseId === oh.id) || (leave.isPending && leave.variables?.openHouseId === oh.id)}
            onRsvp={() => { join.reset(); setCaptchaBlock(null); setSelected(oh); }}
            onCancelRsvp={() => leave.mutate({ openHouseId: oh.id, rsvpId: oh.myRsvpId })}
            onAddToCalendar={() => addToCalendar(oh)}
            fallback={fallback}
          />
        ))}
      </ul>
      {leave.isError && <p role="alert" className="mt-2 text-sm text-red-600">{errorMessage(leave.error)}</p>}

      {selected && (
        <RsvpDialog
          key={selected.id}
          open
          whenLabel={label(selected)}
          defaults={{ name: viewer.name, email: viewer.email, phone: viewer.phone }}
          submitting={join.isPending}
          serverError={captchaBlock ?? (join.isError ? errorMessage(join.error) : null)}
          captcha={<TurnstileWidget {...captcha.widgetProps} />}
          onSubmit={(input) => {
            const blocked = captcha.blockReason();
            setCaptchaBlock(blocked);
            if (blocked) return;
            join.mutate(
              { openHouseId: selected.id, input, headers: captcha.headers },
              { onSuccess: () => setSelected(null), onSettled: captcha.reset }
            );
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
};

export default OpenHouseSection;
