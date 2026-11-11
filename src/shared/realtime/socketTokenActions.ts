/**
 * What the shared authenticated socket does when the access token changes or
 * the server refuses a handshake. Pure, so the rules are tested on their own;
 * authenticatedSocket.ts applies them.
 */

export type SocketTokenAction = 'connect' | 'reconnect' | 'disconnect' | 'none';

export interface SocketTokenState {
  /**
   * Connected, or socket.io is still trying to. False before the first
   * connect, after we disconnected, and after the server refused a handshake:
   * socket.io never retries a refusal by itself.
   */
  active: boolean;
  /** User the latest handshake was sent for; null when none since the last disconnect. */
  handshakeUserId: string | null;
}

/**
 * - Signed out: leave, so the socket no longer sits in the user's rooms.
 * - Idle or refused, and a token is here: connect. This is how a socket that
 *   was refused for an expired token comes back after refresh-token rotation.
 * - Another account's token: a fresh handshake, so the socket moves to that
 *   user's rooms.
 * - The same user while connected or retrying: nothing. Every (re)connection
 *   attempt reads the token as it is at that moment.
 */
export const socketActionForToken = (
  state: SocketTokenState,
  tokenUserId: string | null
): SocketTokenAction => {
  if (!tokenUserId) return state.active ? 'disconnect' : 'none';
  if (!state.active) return 'connect';
  if (state.handshakeUserId !== null && state.handshakeUserId !== tokenUserId) return 'reconnect';
  return 'none';
};

/**
 * After the server refused a handshake: try again only with a token it has not
 * seen, as when a refresh-token rotation landed while the refused handshake
 * was in flight. Resending the refused token would only be refused again.
 */
export const shouldRetryRefusedHandshake = (
  refusedToken: string | null,
  currentToken: string | null
): boolean => currentToken !== null && currentToken !== refusedToken;
