import express from 'express';
import {
  getSignedUrl,
  getBatchSignedUrls,
  getMyFiles,
  deleteFile,
} from '../controllers/fileController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All file access routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/files/my:
 *   get:
 *     summary: List current user's uploaded files
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fileType
 *         schema:
 *           type: string
 *           enum: [property, floorplan, avatar, license, credential, agency-logo, agency-cover, conversation, video, other]
 *         description: Filter by file type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of files with pagination
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/my', getMyFiles);

/**
 * @swagger
 * /api/files/signed-urls:
 *   post:
 *     summary: Get signed URLs for multiple files (batch)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - publicIds
 *             properties:
 *               publicIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 100
 *     responses:
 *       200:
 *         description: Map of publicId to signed URL
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/signed-urls', getBatchSignedUrls);

/**
 * @swagger
 * /api/files/signed-url/{publicId}:
 *   get:
 *     summary: Get a signed URL for a file (ownership verified)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cloudinary public ID (URL-encoded)
 *       - in: query
 *         name: resourceType
 *         schema:
 *           type: string
 *           enum: [image, video, raw]
 *           default: image
 *     responses:
 *       200:
 *         description: Signed URL with expiry
 *       403:
 *         description: Access denied - not the file owner
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/signed-url/*', getSignedUrl);

/**
 * @swagger
 * /api/files/{publicId}:
 *   delete:
 *     summary: Delete a file (ownership verified)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cloudinary public ID (URL-encoded)
 *     responses:
 *       200:
 *         description: File deleted
 *       403:
 *         description: Access denied - not the file owner
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.delete('/*', deleteFile);

export default router;
