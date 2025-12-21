import { Server } from 'socket.io';

let io: Server | null = null;

export const setSocketInstance = (socketInstance: Server) => {
  io = socketInstance;
};

export const getSocketInstance = (): Server | null => {
  return io;
};
