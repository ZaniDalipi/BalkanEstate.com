process.env.SKIP_TEST_DB = 'true';

import express from 'express';
import multer from 'multer';
import request from 'supertest';
import { withUploadErrors, uploadErrorHandler } from '../middleware/uploadErrors';

/**
 * Multer aborts a multipart request with LIMIT_UNEXPECTED_FILE ("Unexpected
 * field") both for an unknown field name and for one file more than the route's
 * maxCount. Without translation that error carries no statusCode and surfaces
 * as a 500 — which is how "AI Generation Failed: Unexpected field" reached the
 * listing form when a user attached more images than /api/ai/generate-description
 * accepted.
 */
describe('upload error handling', () => {
  const MAX_FILES = 3;
  const MAX_FILE_SIZE = 1024;

  const buildApp = () => {
    const app = express();
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    });

    app.post(
      '/wrapped',
      withUploadErrors(upload.array('images', MAX_FILES), {
        field: 'images',
        maxFiles: MAX_FILES,
        maxFileSizeBytes: MAX_FILE_SIZE,
      }),
      (req, res) => {
        res.json({ count: (req.files as Express.Multer.File[]).length });
      }
    );

    app.post('/unwrapped', upload.array('images', MAX_FILES), (req, res) => {
      res.json({ count: (req.files as Express.Multer.File[]).length });
    });

    app.use(uploadErrorHandler);
    app.use((_err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ message: 'Internal server error' });
    });

    return app;
  };

  const attachImages = (req: request.Test, count: number, bytes = 10): request.Test => {
    for (let i = 0; i < count; i++) {
      req.attach('images', Buffer.alloc(bytes, 1), `photo-${i}.jpg`);
    }
    return req;
  };

  it('accepts an upload at the file limit', async () => {
    const res = await attachImages(request(buildApp()).post('/wrapped'), MAX_FILES);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(MAX_FILES);
  });

  it('returns 400 with an actionable message when there are too many files', async () => {
    const res = await attachImages(request(buildApp()).post('/wrapped'), MAX_FILES + 1);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('LIMIT_UNEXPECTED_FILE');
    expect(res.body.message).toContain(String(MAX_FILES));
    expect(res.body.message).not.toBe('Unexpected field');
  });

  it('returns 400 when files arrive under an unexpected field name', async () => {
    const res = await request(buildApp())
      .post('/wrapped')
      .attach('photos', Buffer.alloc(10, 1), 'photo.jpg');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('LIMIT_UNEXPECTED_FILE');
  });

  it('returns 413 when a single file exceeds the size limit', async () => {
    const res = await attachImages(request(buildApp()).post('/wrapped'), 1, MAX_FILE_SIZE * 2);
    expect(res.status).toBe(413);
    expect(res.body.code).toBe('LIMIT_FILE_SIZE');
  });

  it('translates multer errors on routes that are not wrapped', async () => {
    const res = await attachImages(request(buildApp()).post('/unwrapped'), MAX_FILES + 1);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('LIMIT_UNEXPECTED_FILE');
  });
});
