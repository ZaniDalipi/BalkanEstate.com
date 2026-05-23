import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from '../api/config';

let globalSocket: Socket | null = null;
let socketClients = 0;

const getSocket = (): Socket => {
  if (!globalSocket) {
    const socketUrl = API_URL.replace(/\/api$/, '');
    globalSocket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
      credentials: 'include',
    });
  }
  return globalSocket;
};

export const useSocket = (): Socket | null => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current) return;
    registeredRef.current = true;

    try {
      const s = getSocket();
      socketClients++;
      setSocket(s);

      return () => {
        socketClients--;
        if (socketClients === 0 && globalSocket) {
          globalSocket.disconnect();
          globalSocket = null;
        }
      };
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      return undefined;
    }
  }, []);

  return socket;
};
