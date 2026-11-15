import React from 'react';
import { useTranslation } from 'react-i18next';
import { countdownParts } from '../utils/eventFormat';

interface CountdownProps {
  target: string;
  now: Date;
}

/**
 * "2d 4h 10m" until the event. Ticks are shown, never announced: a screen
 * reader gets the same text once, through the label.
 */
const Countdown: React.FC<CountdownProps> = ({ target, now }) => {
  const { t } = useTranslation('property');
  const p = countdownParts(target, now);
  if (p.done) return null;
  const units: [number, string][] = [
    [p.days, t('listingEvents.unitDays', { defaultValue: 'd' })],
    [p.hours, t('listingEvents.unitHours', { defaultValue: 'h' })],
    [p.minutes, t('listingEvents.unitMinutes', { defaultValue: 'm' })],
  ];
  // Under an hour the seconds matter; beyond a day the minutes don't.
  if (p.days === 0 && p.hours === 0) units.push([p.seconds, t('listingEvents.unitSeconds', { defaultValue: 's' })]);
  const shown = p.days > 0 ? units.slice(0, 2) : units.filter(([n], i) => n > 0 || i >= 1);
  const text = shown.map(([n, u]) => `${n}${u}`).join(' ');

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-0.5 font-mono text-sm font-semibold tabular-nums text-neutral-900" aria-live="off">
      <span className="sr-only">{t('listingEvents.startsIn', { defaultValue: 'Starts in' })} </span>
      {text}
    </span>
  );
};

export default Countdown;
