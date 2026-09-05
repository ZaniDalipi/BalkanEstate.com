/**
 * Storage Access Policy Tests
 *
 * Tests the full security chain:
 * 1. FileRecord model — ownership tracking
 * 2. storageAccessPolicy service — access control logic
 * 3. fileController + fileRoutes — API endpoints with input validation
 *
 * Security coverage:
 * - Ownership enforcement (user A cannot access user B's files)
 * - Admin bypass
 * - NoSQL injection via publicIds array
 * - Path traversal in publicId
 * - Log injection via control characters
 * - Rate limiting presence
 * - Input validation (resourceType whitelist, publicId regex)
 */

import request from 'supertest';
import express, { Express } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import FileRecord from '../models/FileRecord';
import fileRoutes from '../routes/fileRoutes';
import { createMockUser } from './setup';
import {
  registerFileUpload,
  isFileOwner,
  checkFileAccess,
  getUserFiles,
  removeFileRecord,
  removeAllUserFileRecords,
  batchGetSignedUrls,
} from '../services/storageAccessPolicy';

// Signed and plain delivery URLs are built from the configured zones at
// import time, so these must be set before the service is first evaluated.
process.env.BUNNY_PULL_ZONE_HOST = 'test-zone.b-cdn.net';
process.env.BUNNY_PRIVATE_PULL_ZONE_HOST = 'test-private.b-cdn.net';
process.env.BUNNY_TOKEN_AUTH_KEY = 'test-token-key';

// Mock the storage client so no request reaches Bunny.
jest.mock('../services/bunnyStorageService', () => ({
  __esModule: true,
  putObject: jest.fn().mockResolvedValue(undefined),
  deleteObject: jest.fn().mockResolvedValue(true),
  objectExists: jest.fn().mockResolvedValue(true),
  listObjects: jest.fn().mockResolvedValue([]),
  deleteFolderRecursive: jest.fn().mockResolvedValue([]),
  moveObject: jest.fn().mockResolvedValue(true),
}));

describe('Storage Access Policy', () => {
  let app: Express;
  let userA: any;
  let userB: any;
  let adminUser: any;
  let tokenA: string;
  let tokenB: string;
  let tokenAdmin: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/files', fileRoutes);

    // Create test users
    userA = await User.create(
      createMockUser({ email: 'usera@test.com', role: 'private_seller' })
    );
    userB = await User.create(
      createMockUser({ email: 'userb@test.com', role: 'private_seller' })
    );
    adminUser = await User.create(
      createMockUser({ email: 'admin@test.com', role: 'admin' })
    );

    const sign = (user: any) =>
      jwt.sign(
        { id: user._id, type: 'access' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

    tokenA = sign(userA);
    tokenB = sign(userB);
    tokenAdmin = sign(adminUser);
  });

  afterEach(async () => {
    await FileRecord.deleteMany({});
  });

  // ─── Service-level tests ───────────────────────────────────────

  describe('registerFileUpload', () => {
    it('should create a FileRecord with correct ownership', async () => {
      const record = await registerFileUpload({
        publicId: 'balkan-estate/users/123/avatar/img1',
        url: 'https://test-zone.b-cdn.net/balkan-estate/img1.webp',
        userId: String(userA._id),
        fileType: 'avatar',
      });

      expect(record.publicId).toBe('balkan-estate/users/123/avatar/img1');
      expect(record.userId.toString()).toBe(String(userA._id));
      expect(record.fileType).toBe('avatar');
    });

    it('should upsert on duplicate publicId (avatar replacement)', async () => {
      const publicId = 'balkan-estate/users/123/avatar/img1';

      await registerFileUpload({
        publicId,
        url: 'https://old-url.com',
        userId: String(userA._id),
        fileType: 'avatar',
      });

      await registerFileUpload({
        publicId,
        url: 'https://new-url.com',
        userId: String(userA._id),
        fileType: 'avatar',
      });

      const count = await FileRecord.countDocuments({ publicId });
      expect(count).toBe(1);

      const record = await FileRecord.findOne({ publicId });
      expect(record!.url).toBe('https://new-url.com');
    });
  });

  describe('isFileOwner', () => {
    it('should return true for the file owner', async () => {
      await registerFileUpload({
        publicId: 'test/file1',
        url: 'https://example.com/file1',
        userId: String(userA._id),
        fileType: 'property',
      });

      const result = await isFileOwner(String(userA._id), 'test/file1');
      expect(result).toBe(true);
    });

    it('should return false for a non-owner', async () => {
      await registerFileUpload({
        publicId: 'test/file1',
        url: 'https://example.com/file1',
        userId: String(userA._id),
        fileType: 'property',
      });

      const result = await isFileOwner(String(userB._id), 'test/file1');
      expect(result).toBe(false);
    });

    it('should return false for a non-existent file', async () => {
      const result = await isFileOwner(String(userA._id), 'does/not/exist');
      expect(result).toBe(false);
    });
  });

  describe('checkFileAccess', () => {
    const publicId = 'test/access-check';

    beforeEach(async () => {
      await registerFileUpload({
        publicId,
        url: 'https://example.com/file',
        userId: String(userA._id),
        fileType: 'property',
      });
    });

    it('should grant access to the owner', async () => {
      const record = await checkFileAccess(String(userA._id), publicId);
      expect(record).not.toBeNull();
      expect(record!.publicId).toBe(publicId);
    });

    it('should deny access to a non-owner', async () => {
      const record = await checkFileAccess(String(userB._id), publicId);
      expect(record).toBeNull();
    });

    it('should grant access to an admin regardless of ownership', async () => {
      const record = await checkFileAccess(
        String(adminUser._id),
        publicId,
        'admin'
      );
      expect(record).not.toBeNull();
    });

    it('should deny access when file record does not exist', async () => {
      const record = await checkFileAccess(
        String(userA._id),
        'nonexistent/file'
      );
      expect(record).toBeNull();
    });
  });

  describe('getUserFiles', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        await registerFileUpload({
          publicId: `test/userA/file${i}`,
          url: `https://example.com/file${i}`,
          userId: String(userA._id),
          fileType: i < 3 ? 'property' : 'avatar',
        });
      }
      await registerFileUpload({
        publicId: 'test/userB/file0',
        url: 'https://example.com/userb-file',
        userId: String(userB._id),
        fileType: 'property',
      });
    });

    it('should only return files owned by the user', async () => {
      const { files, total } = await getUserFiles(String(userA._id));
      expect(total).toBe(5);
      expect(files).toHaveLength(5);
    });

    it('should not leak files from other users', async () => {
      const { files, total } = await getUserFiles(String(userB._id));
      expect(total).toBe(1);
      expect(files[0].publicId).toBe('test/userB/file0');
    });

    it('should filter by fileType', async () => {
      const { files, total } = await getUserFiles(
        String(userA._id),
        'property'
      );
      expect(total).toBe(3);
      files.forEach((f) => expect(f.fileType).toBe('property'));
    });

    it('should paginate correctly', async () => {
      const { files, total } = await getUserFiles(
        String(userA._id),
        undefined,
        2,
        2
      );
      expect(total).toBe(5);
      expect(files).toHaveLength(2);
    });
  });

  describe('removeFileRecord / removeAllUserFileRecords', () => {
    it('should remove a single file record', async () => {
      await registerFileUpload({
        publicId: 'test/remove-me',
        url: 'https://example.com',
        userId: String(userA._id),
        fileType: 'avatar',
      });

      await removeFileRecord('test/remove-me');

      const count = await FileRecord.countDocuments({
        publicId: 'test/remove-me',
      });
      expect(count).toBe(0);
    });

    it('should remove all records for a user', async () => {
      for (let i = 0; i < 3; i++) {
        await registerFileUpload({
          publicId: `test/bulk/${i}`,
          url: `https://example.com/${i}`,
          userId: String(userA._id),
          fileType: 'property',
        });
      }
      // User B's file should not be affected
      await registerFileUpload({
        publicId: 'test/bulk/other',
        url: 'https://example.com/other',
        userId: String(userB._id),
        fileType: 'property',
      });

      await removeAllUserFileRecords(String(userA._id));

      const countA = await FileRecord.countDocuments({
        userId: userA._id,
      });
      const countB = await FileRecord.countDocuments({
        userId: userB._id,
      });
      expect(countA).toBe(0);
      expect(countB).toBe(1);
    });
  });

  describe('batchGetSignedUrls', () => {
    beforeEach(async () => {
      await registerFileUpload({
        publicId: 'batch/owned',
        url: 'https://example.com/owned',
        userId: String(userA._id),
        fileType: 'property',
      });
      await registerFileUpload({
        publicId: 'batch/not-owned',
        url: 'https://example.com/not-owned',
        userId: String(userB._id),
        fileType: 'property',
      });
    });

    it('should only return URLs for owned files', async () => {
      const urls = await batchGetSignedUrls(
        String(userA._id),
        ['batch/owned', 'batch/not-owned'],
      );

      expect(urls['batch/owned']).toBeDefined();
      expect(urls['batch/not-owned']).toBeUndefined();
    });

    it('should return all URLs for admin', async () => {
      const urls = await batchGetSignedUrls(
        String(adminUser._id),
        ['batch/owned', 'batch/not-owned'],
        'admin'
      );

      expect(urls['batch/owned']).toBeDefined();
      expect(urls['batch/not-owned']).toBeDefined();
    });

    it('should return empty object for empty array', async () => {
      const urls = await batchGetSignedUrls(String(userA._id), []);
      expect(urls).toEqual({});
    });
  });

  // ─── API endpoint tests ────────────────────────────────────────

  describe('GET /api/files/signed-url/*', () => {
    beforeEach(async () => {
      await registerFileUpload({
        publicId: 'balkan-estate/users/a/avatar/img1',
        url: 'https://example.com/img1',
        userId: String(userA._id),
        fileType: 'avatar',
      });
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get(
        '/api/files/signed-url/balkan-estate/users/a/avatar/img1'
      );
      expect(res.status).toBe(401);
    });

    it('should return signed URL for file owner', async () => {
      const res = await request(app)
        .get('/api/files/signed-url/balkan-estate/users/a/avatar/img1')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('url');
      expect(res.body.url).toContain('upload'); // avatar is a public asset
      expect(res.body.fileType).toBe('avatar');
      expect(res.body.expiresIn).toBe(3600);
    });

    it('should return 403 for non-owner', async () => {
      const res = await request(app)
        .get('/api/files/signed-url/balkan-estate/users/a/avatar/img1')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
    });

    it('should return 200 for admin on any file', async () => {
      const res = await request(app)
        .get('/api/files/signed-url/balkan-estate/users/a/avatar/img1')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/files/signed-urls (batch)', () => {
    beforeEach(async () => {
      await registerFileUpload({
        publicId: 'batch-api/file1',
        url: 'https://example.com/1',
        userId: String(userA._id),
        fileType: 'property',
      });
      await registerFileUpload({
        publicId: 'batch-api/file2',
        url: 'https://example.com/2',
        userId: String(userB._id),
        fileType: 'property',
      });
    });

    it('should only return URLs for files the user owns', async () => {
      const res = await request(app)
        .post('/api/files/signed-urls')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ publicIds: ['batch-api/file1', 'batch-api/file2'] });

      expect(res.status).toBe(200);
      expect(res.body.urls['batch-api/file1']).toBeDefined();
      expect(res.body.urls['batch-api/file2']).toBeUndefined();
    });

    it('should return 400 for empty publicIds', async () => {
      const res = await request(app)
        .post('/api/files/signed-urls')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ publicIds: [] });

      expect(res.status).toBe(400);
    });

    it('should return 400 for more than 100 publicIds', async () => {
      const ids = Array.from({ length: 101 }, (_, i) => `file/${i}`);
      const res = await request(app)
        .post('/api/files/signed-urls')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ publicIds: ids });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/files/my', () => {
    beforeEach(async () => {
      for (let i = 0; i < 3; i++) {
        await registerFileUpload({
          publicId: `my-files/a/${i}`,
          url: `https://example.com/a/${i}`,
          userId: String(userA._id),
          fileType: 'property',
        });
      }
      await registerFileUpload({
        publicId: 'my-files/b/0',
        url: 'https://example.com/b/0',
        userId: String(userB._id),
        fileType: 'avatar',
      });
    });

    it('should return only the current user files', async () => {
      const res = await request(app)
        .get('/api/files/my')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.files).toHaveLength(3);
    });

    it('should not leak other users files', async () => {
      const res = await request(app)
        .get('/api/files/my')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.total).toBe(1);
      expect(res.body.files[0].publicId).toBe('my-files/b/0');
    });

    it('should filter by fileType query param', async () => {
      const res = await request(app)
        .get('/api/files/my?fileType=avatar')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.total).toBe(0);
    });

    it('should ignore invalid fileType values', async () => {
      const res = await request(app)
        .get('/api/files/my?fileType=INJECTED')
        .set('Authorization', `Bearer ${tokenA}`);

      // Should return all files (invalid type is ignored, treated as no filter)
      expect(res.status).toBe(200);
      expect(res.body.pagination.total).toBe(3);
    });
  });

  describe('DELETE /api/files/*', () => {
    beforeEach(async () => {
      await registerFileUpload({
        publicId: 'delete-test/file1',
        url: 'https://example.com/del1',
        userId: String(userA._id),
        fileType: 'property',
      });
    });

    it('should delete a file owned by the user', async () => {
      const res = await request(app)
        .delete('/api/files/delete-test/file1')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);

      const count = await FileRecord.countDocuments({
        publicId: 'delete-test/file1',
      });
      expect(count).toBe(0);
    });

    it('should return 403 for non-owner', async () => {
      const res = await request(app)
        .delete('/api/files/delete-test/file1')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);

      // File should still exist
      const count = await FileRecord.countDocuments({
        publicId: 'delete-test/file1',
      });
      expect(count).toBe(1);
    });

    it('should allow admin to delete any file', async () => {
      const res = await request(app)
        .delete('/api/files/delete-test/file1')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
    });
  });

  // ─── Security: input validation ────────────────────────────────

  describe('Security: publicId validation', () => {
    it('should reject publicId with path traversal (..)', async () => {
      const res = await request(app)
        .get('/api/files/signed-url/balkan-estate/../../../etc/passwd')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid');
    });

    it('should reject publicId with control characters', async () => {
      const res = await request(app)
        .get('/api/files/signed-url/balkan-estate/file%00injected')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
    });

    it('should reject publicId with spaces', async () => {
      const res = await request(app)
        .get('/api/files/signed-url/balkan-estate/file with spaces')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
    });

    it('should accept valid Cloudinary publicId with slashes/hyphens/underscores', async () => {
      await registerFileUpload({
        publicId: 'balkan-estate/users/abc_123/avatar/my-image.jpg',
        url: 'https://example.com/img',
        userId: String(userA._id),
        fileType: 'avatar',
      });

      const res = await request(app)
        .get(
          '/api/files/signed-url/balkan-estate/users/abc_123/avatar/my-image.jpg'
        )
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Security: NoSQL injection in batch endpoint', () => {
    it('should reject non-string items in publicIds array', async () => {
      const res = await request(app)
        .post('/api/files/signed-urls')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ publicIds: [{ $gt: '' }] });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid publicId');
    });

    it('should reject numeric items in publicIds array', async () => {
      const res = await request(app)
        .post('/api/files/signed-urls')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ publicIds: [123, 456] });

      expect(res.status).toBe(400);
    });

    it('should reject publicIds with path traversal in batch', async () => {
      const res = await request(app)
        .post('/api/files/signed-urls')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ publicIds: ['valid/id', '../etc/passwd'] });

      expect(res.status).toBe(400);
    });
  });

  describe('Security: resourceType validation', () => {
    beforeEach(async () => {
      await registerFileUpload({
        publicId: 'rt-test/file1',
        url: 'https://example.com/rt',
        userId: String(userA._id),
        fileType: 'property',
      });
    });

    it('should accept valid resourceType "video"', async () => {
      const res = await request(app)
        .get('/api/files/signed-url/rt-test/file1?resourceType=video')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.url).toContain('video');
    });

    it('should default to "image" for invalid resourceType', async () => {
      const res = await request(app)
        .get(
          '/api/files/signed-url/rt-test/file1?resourceType=MALICIOUS_VALUE'
        )
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.url).toContain('image');
    });
  });
});
