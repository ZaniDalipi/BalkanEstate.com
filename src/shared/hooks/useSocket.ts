import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { acquireSocket, releaseSocket } from '../realtime/authenticatedSocket';

/**
 * The shared authenticated socket. It is connected only while someone is
 * signed in; listeners added to it stay across reconnects and sign-ins.
 */
export const useSocket = (): Socket | null => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    setSocket(acquireSocket());
    return releaseSocket;
  }, []);

  return socket;
};
