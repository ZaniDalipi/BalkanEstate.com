/**
 * A guest (not signed in) gets their sign-up id back when they RSVP. Keeping it
 * in this browser lets the page show "You're going" and let them cancel.
 * Storage can be missing or blocked, so every access is guarded; without it
 * the guest can still sign up, they just won't see it remembered.
 */

const KEY = 'balkanestate.openHouseRsvps';

type Store = Record<string, string>; // openHouseId → rsvpId

function read(): Store {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable — nothing to remember */
  }
}

export const getGuestRsvp = (openHouseId: string): string | undefined => read()[openHouseId];

export function rememberGuestRsvp(openHouseId: string, rsvpId: string): void {
  write({ ...read(), [openHouseId]: rsvpId });
}

export function forgetGuestRsvp(openHouseId: string): void {
  const { [openHouseId]: _gone, ...rest } = read();
  write(rest);
}
