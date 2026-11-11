/**
 * Socket.IO room names. Every authenticated socket joins its user's room, and
 * admins also join ADMIN_ROOM, so a service reaches all of one user's tabs and
 * devices without knowing their socket ids.
 */

/** All sockets of one signed-in user. */
export const userRoom = (userId: string): string => `user:${userId}`;

/** Sockets of admins and super admins. */
export const ADMIN_ROOM = 'admins';

/**
 * Who watches a feed sync: the feed's owner. A system feed has no owner and is
 * run by admins, so its progress goes to the admin room. Never everyone: the
 * events carry the titles and URLs of the listings being imported.
 */
export const listingIngestRoom = (ownerId: { toString(): string } | null | undefined): string =>
  ownerId ? userRoom(String(ownerId)) : ADMIN_ROOM;
