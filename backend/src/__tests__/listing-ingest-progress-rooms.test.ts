/**
 * Feed sync progress names the listings being imported, so it must reach the
 * feed's owner only (admins, for a system feed). Runs a real Socket.IO server
 * with the production middleware and real clients; only the user lookup is
 * mocked.
 */
process.env.SKIP_TEST_DB = 'true';

import { createServer } from 'http';
import type { AddressInfo } from 'net';
import { Types } from 'mongoose';
import { Server } from 'socket.io';
import { io as connectClient, type Socket as ClientSocket } from 'socket.io-client';
import { setupChatSocket } from '../sockets/chatSocket';
import { emitListingIngestProgress, setupPropertySocket } from '../sockets/propertySocket';
import { userRoom } from '../sockets/socketRooms';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { encodeId } from '../utils/idObfuscation';

const mockRoles = new Map<string, string>();
jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findById: (id: string) => ({
      select: () => ({
        lean: async () => (mockRoles.has(id) ? { role: mockRoles.get(id) } : null),
      }),
    }),
  },
}));

const newUser = (role: string): string => {
  const id = new Types.ObjectId().toString();
  mockRoles.set(id, role);
  return id;
};

let io: Server;
let url: string;
const clients: ClientSocket[] = [];

beforeAll(async () => {
  const httpServer = createServer();
  io = new Server(httpServer);
  setupChatSocket(io);
  setupPropertySocket(io);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
});

afterEach(() => {
  clients.splice(0).forEach((client) => client.disconnect());
});

afterAll(async () => {
  await new Promise<void>((resolve) => io.close(() => resolve()));
});

const open = (auth: Record<string, unknown>): ClientSocket => {
  const client = connectClient(url, { auth, transports: ['websocket'], reconnection: false, forceNew: true });
  clients.push(client);
  return client;
};

/** A connected socket for `userId`, recording every ingest progress event it gets. */
const connectAs = async (userId: string): Promise<{ client: ClientSocket; events: unknown[] }> => {
  const client = open({ token: generateAccessToken(userId) });
  const events: unknown[] = [];
  client.on('listing:ingestProgress', (event: unknown) => events.push(event));
  await new Promise<void>((resolve, reject) => {
    client.once('connect', resolve);
    client.once('connect_error', reject);
  });
  return { client, events };
};

const refusal = (auth: Record<string, unknown>): Promise<string> =>
  new Promise((resolve, reject) => {
    const client = open(auth);
    client.once('connect', () => reject(new Error('the server accepted the socket')));
    client.once('connect_error', (err: Error) => resolve(err.message));
  });

/**
 * Wait until everything the server sent `client` so far has arrived: a
 * connection delivers in order, so an event sent before the sentinel cannot
 * still be on its way once the sentinel is here.
 */
const drain = (client: ClientSocket, userId: string): Promise<void> =>
  new Promise((resolve) => {
    client.once('test:sentinel', () => resolve());
    io.to(userRoom(userId)).emit('test:sentinel');
  });

const progress = { fetched: 3, processed: 1, imported: 1, updated: 0, failed: 0 };

describe('listing ingest progress over Socket.IO', () => {
  it("sends a user's feed progress to every socket of the owner and to nobody else", async () => {
    const ownerId = newUser('private_seller');
    const otherId = newUser('agent');
    const adminId = newUser('admin');
    const ownerTab = await connectAs(ownerId);
    const ownerPhone = await connectAs(ownerId);
    const other = await connectAs(otherId);
    const admin = await connectAs(adminId);

    const sourceId = new Types.ObjectId();
    emitListingIngestProgress(
      { _id: sourceId, userId: new Types.ObjectId(ownerId) },
      { ...progress, currentItem: { id: 'x1', title: 'Private flat', url: 'https://example.com/x1' } }
    );

    await Promise.all([
      drain(ownerTab.client, ownerId),
      drain(ownerPhone.client, ownerId),
      drain(other.client, otherId),
      drain(admin.client, adminId),
    ]);

    expect(ownerTab.events).toEqual([
      expect.objectContaining({
        sourceId: encodeId(sourceId.toString()),
        processed: 1,
        currentItem: { id: 'x1', title: 'Private flat', url: 'https://example.com/x1' },
      }),
    ]);
    expect(ownerPhone.events).toHaveLength(1);
    expect(other.events).toEqual([]);
    expect(admin.events).toEqual([]);
  });

  it('sends a system feed\'s progress to admins only', async () => {
    const userId = newUser('agent');
    const adminId = newUser('admin');
    const superAdminId = newUser('super_admin');
    const user = await connectAs(userId);
    const admin = await connectAs(adminId);
    const superAdmin = await connectAs(superAdminId);

    emitListingIngestProgress({ _id: new Types.ObjectId(), userId: undefined }, progress);

    await Promise.all([
      drain(user.client, userId),
      drain(admin.client, adminId),
      drain(superAdmin.client, superAdminId),
    ]);

    expect(user.events).toEqual([]);
    expect(admin.events).toHaveLength(1);
    expect(superAdmin.events).toHaveLength(1);
  });

  it('refuses a socket without an access token', async () => {
    await expect(refusal({})).resolves.toBe('Authentication error: No token provided');
    await expect(refusal({ token: null })).resolves.toBe('Authentication error: No token provided');
  });

  it('refuses a refresh token, a forged token and a deleted user', async () => {
    const userId = newUser('agent');
    const goneId = new Types.ObjectId().toString();

    await expect(refusal({ token: generateRefreshToken(userId) })).resolves.toBe('Authentication error: Invalid token');
    await expect(refusal({ token: 'not-a-jwt' })).resolves.toBe('Authentication error: Invalid token');
    await expect(refusal({ token: generateAccessToken(goneId) })).resolves.toBe('Authentication error: Invalid token');
  });
});
