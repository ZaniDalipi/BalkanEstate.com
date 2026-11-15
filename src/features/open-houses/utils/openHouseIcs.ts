/** A one-event calendar file so a visitor can add the open house to their calendar. */

const icsDate = (iso: string): string => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const escapeIcs = (s: string): string => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export interface IcsEvent {
  id: string;
  title: string;
  location: string;
  url: string;
  startsAt: string;
  endsAt: string;
  description?: string;
}

export function buildOpenHouseIcs(e: IcsEvent, now: Date = new Date()): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BalkanEstate//Open house//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:open-house-${e.id}@balkanestateai.com`,
    `DTSTAMP:${icsDate(now.toISOString())}`,
    `DTSTART:${icsDate(e.startsAt)}`,
    `DTEND:${icsDate(e.endsAt)}`,
    `SUMMARY:${escapeIcs(e.title)}`,
    `LOCATION:${escapeIcs(e.location)}`,
    `DESCRIPTION:${escapeIcs([e.description, e.url].filter(Boolean).join('\n'))}`,
    `URL:${e.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

/** Hand the file to the browser as a download. */
export function downloadIcs(filename: string, ics: string): void {
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
