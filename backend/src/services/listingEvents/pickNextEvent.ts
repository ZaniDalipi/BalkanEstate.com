/** Which upcoming events a listing has — pure, so it is unit-tested directly. */

export interface EventWindow {
  startsAt: Date;
  endsAt: Date;
}

export interface NextEventDates {
  nextOpenHouseAt?: Date;
  nextEventAt?: Date;
}

/**
 * `openHouses` are the listing's scheduled ones. An open house still running
 * counts (people can still drop by); an auction counts until it ends, or for
 * a day after its start when no end was given.
 */
export function pickNextEvent(
  openHouses: EventWindow[],
  auction: { startsAt: Date; endsAt?: Date } | undefined,
  now: Date,
): NextEventDates {
  const upcoming = openHouses
    .filter((o) => o.endsAt.getTime() > now.getTime())
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const nextOpenHouseAt = upcoming[0]?.startsAt;

  const auctionEnd = auction ? (auction.endsAt ?? new Date(auction.startsAt.getTime() + 24 * 60 * 60 * 1000)) : undefined;
  const auctionAt = auction && auctionEnd && auctionEnd.getTime() > now.getTime() ? auction.startsAt : undefined;

  const candidates = [nextOpenHouseAt, auctionAt].filter((d): d is Date => !!d);
  const nextEventAt = candidates.sort((a, b) => a.getTime() - b.getTime())[0];
  return { nextOpenHouseAt, nextEventAt };
}
