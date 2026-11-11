import { io, type Socket } from 'socket.io-client';
import { API_URL } from '../api/config';
import { getTokenUserId, tokenService } from '../api/tokenService';
import { shouldRetryRefusedHandshake, socketActionForToken } from './socketTokenActions';

/**
 * The authenticated Socket.IO connection behind useSocket(). The server only
 * accepts a handshake that carries an access token, so the socket connects
 * while someone is signed in and leaves when they sign out.
 *
 * The token is the in-memory one httpClient sends (tokenService), never one
 * from storage. `auth` is a callback, so each (re)connection attempt reads the
 * token as it is then, after a refresh-token rotation included.
 */

let socket: Socket | null = null;
let holders = 0;
let stopWatchingToken: (() => void) | null = null;
/** Token the latest handshake carried: tells a refused token from a rotated one. */
let handshakeToken: string | null = null;

const createSocket = (): Socket => {
  const created = io(API_URL.replace(/\/api$/, ''), {
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    // No attempt cap: while the server is away (a deploy) socket.io keeps
    // trying, so the socket is never left "active" but given up.
    transports: ['websocket', 'polling'],
    auth: (send) => {
      handshakeToken = tokenService.getAccessToken();
      send({ token: handshakeToken });
    },
  });

  created.on('connect_error', () => {
    // A network failure is retried by socket.io itself; a refusal is not.
    if (created.active) return;
    if (shouldRetryRefusedHandshake(handshakeToken, tokenService.getAccessToken())) {
      created.connect();
    }
  });

  return created;
};

const applyToken = (token: string | null): void => {
  if (!socket) return;
  const action = socketActionForToken(
    { active: socket.active, handshakeUserId: getTokenUserId(handshakeToken) },
    getTokenUserId(token)
  );
  if (action === 'disconnect' || action === 'reconnect') {
    socket.disconnect();
    handshakeToken = null;
  }
  if (action === 'connect' || action === 'reconnect') {
    socket.connect();
  }
};

/** Take a hold on the shared socket, created on first use. Pair with releaseSocket(). */
export const acquireSocket = (): Socket => {
  if (!socket) {
    socket = createSocket();
    stopWatchingToken = tokenService.onAccessTokenChange(applyToken);
    applyToken(tokenService.getAccessToken());
  }
  holders++;
  return socket;
};

/** Drop a hold; the last one closes the connection. */
export const releaseSocket = (): void => {
  holders = Math.max(0, holders - 1);
  if (holders > 0 || !socket) return;
  stopWatchingToken?.();
  stopWatchingToken = null;
  socket.disconnect();
  socket = null;
  handshakeToken = null;
};
