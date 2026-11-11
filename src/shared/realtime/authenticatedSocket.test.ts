import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { io } from 'socket.io-client';
import { tokenService } from '../api/tokenService';
import { useSocket } from '../hooks/useSocket';
import { acquireSocket, releaseSocket } from './authenticatedSocket';

type Listener = (...args: unknown[]) => void;
type AuthCallback = (send: (data: object) => void) => void;

const fake = vi.hoisted(() => {
  /** Mirrors socket.io-client: `active` until we disconnect or the server refuses. */
  class FakeSocket {
    active = false;
    connected = false;
    readonly listeners = new Map<string, Listener[]>();
    connect = vi.fn(() => {
      this.active = true;
      return this;
    });
    disconnect = vi.fn(() => {
      this.active = false;
      this.connected = false;
      return this;
    });
    on(event: string, listener: Listener) {
      this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
      return this;
    }
    /** The server answered the handshake with CONNECT_ERROR. */
    refuse(message: string) {
      this.active = false;
      this.listeners.get('connect_error')?.forEach((listener) => listener(new Error(message)));
    }
  }
  return { FakeSocket, sockets: [] as FakeSocket[] };
});

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    const socket = new fake.FakeSocket();
    fake.sockets.push(socket);
    return socket;
  }),
}));

const encode = (part: object): string =>
  btoa(JSON.stringify(part)).replace(/\+/g, '-').replace(/\//g, '_');

/** An access token shaped like the backend's: `{ id, type, exp }`. `n` tells rotations apart. */
const accessToken = (userId: string, n = 1): string =>
  `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    id: userId,
    type: 'access',
    n,
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.signature`;

const latestSocket = () => fake.sockets[fake.sockets.length - 1];

/** Run the handshake auth the way socket.io-client does, and return what it sends. */
const handshakeAuth = (): unknown => {
  const { auth } = vi.mocked(io).mock.lastCall![1] as { auth: AuthCallback };
  let sent: unknown;
  auth((data) => {
    sent = data;
  });
  return sent;
};

let holds = 0;
const acquire = () => {
  holds++;
  return acquireSocket();
};

afterEach(() => {
  for (; holds > 0; holds--) releaseSocket();
  tokenService.clearTokens();
  vi.mocked(io).mockClear();
});

describe('authenticated socket', () => {
  it('sends the in-memory access token in the handshake, and the new one after a refresh', () => {
    const first = accessToken('u1', 1);
    const rotated = accessToken('u1', 2);
    tokenService.setAccessToken(first);
    acquire();

    expect(io).toHaveBeenCalledTimes(1);
    expect(vi.mocked(io).mock.lastCall![1]).toMatchObject({ autoConnect: false, auth: expect.any(Function) });
    expect(handshakeAuth()).toEqual({ token: first });

    tokenService.setAccessToken(rotated);
    expect(handshakeAuth()).toEqual({ token: rotated });

    const stored = Array.from({ length: localStorage.length }, (_, i) => localStorage.getItem(localStorage.key(i)!));
    expect(stored.join(' ')).not.toContain(rotated);
  });

  it('connects only once someone is signed in', () => {
    acquire();
    expect(latestSocket().connect).not.toHaveBeenCalled();

    tokenService.setAccessToken(accessToken('u1'));
    expect(latestSocket().connect).toHaveBeenCalledTimes(1);
  });

  it('comes back after refresh-token rotation when the server refused the expired token', () => {
    tokenService.setAccessToken(accessToken('u1', 1));
    const socket = acquire() as unknown as InstanceType<typeof fake.FakeSocket>;
    handshakeAuth();

    socket.refuse('Authentication error: Invalid token');
    expect(socket.connect).toHaveBeenCalledTimes(1); // the same token would be refused again

    tokenService.setAccessToken(accessToken('u1', 2));
    expect(socket.connect).toHaveBeenCalledTimes(2);
    expect(handshakeAuth()).toEqual({ token: accessToken('u1', 2) });
  });

  it('retries at once when the rotation landed while the refused handshake was in flight', () => {
    tokenService.setAccessToken(accessToken('u1', 1));
    const socket = acquire() as unknown as InstanceType<typeof fake.FakeSocket>;
    handshakeAuth();

    tokenService.setAccessToken(accessToken('u1', 2));
    expect(socket.connect).toHaveBeenCalledTimes(1); // the handshake is still pending

    socket.refuse('Authentication error: Invalid token');
    expect(socket.connect).toHaveBeenCalledTimes(2);
    expect(handshakeAuth()).toEqual({ token: accessToken('u1', 2) });
  });

  it('leaves socket.io to retry a network failure itself', () => {
    tokenService.setAccessToken(accessToken('u1'));
    const socket = acquire() as unknown as InstanceType<typeof fake.FakeSocket>;
    handshakeAuth();

    socket.listeners.get('connect_error')?.forEach((listener) => listener(new Error('xhr poll error')));
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  it("moves to another account's rooms, and leaves on sign-out", () => {
    tokenService.setAccessToken(accessToken('u1'));
    const socket = acquire() as unknown as InstanceType<typeof fake.FakeSocket>;
    handshakeAuth();

    tokenService.setAccessToken(accessToken('u2'));
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(socket.connect).toHaveBeenCalledTimes(2);
    expect(handshakeAuth()).toEqual({ token: accessToken('u2') });

    tokenService.clearTokens();
    expect(socket.disconnect).toHaveBeenCalledTimes(2);
  });
});

describe('useSocket', () => {
  it('shares one socket and closes it after the last user unmounts', () => {
    tokenService.setAccessToken(accessToken('u1'));
    const dock = renderHook(() => useSocket());
    const modal = renderHook(() => useSocket());

    expect(io).toHaveBeenCalledTimes(1);
    expect(dock.result.current).toBe(modal.result.current);

    dock.unmount();
    expect(latestSocket().disconnect).not.toHaveBeenCalled();
    modal.unmount();
    expect(latestSocket().disconnect).toHaveBeenCalledTimes(1);
  });
});
