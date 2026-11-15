/** Something dated happening at a listing: an open house or an auction. */
export type ListingEvent =
  | { kind: 'openHouse'; startsAt: string; endsAt: string }
  | {
      kind: 'auction';
      startsAt: string;
      endsAt?: string;
      mode: 'online' | 'in_person';
      startingPrice?: number;
      location?: string;
      url?: string;
      depositNote?: string;
    };

/** The few listing fields the event helpers read. */
export interface EventSource {
  nextOpenHouse?: { startsAt: string; endsAt: string };
  auction?: {
    startsAt: string;
    endsAt?: string;
    mode: 'online' | 'in_person';
    startingPrice?: number;
    location?: string;
    url?: string;
    depositNote?: string;
  } | null;
}
