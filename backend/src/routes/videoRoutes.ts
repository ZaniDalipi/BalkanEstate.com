import express from 'express';
import {
  generateVideo,
  getVideoPreview,
  resolveTikTokShortLink,
} from '../controllers/videoController';
import { protect } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Videos
 *   description: Property video generation endpoints
 */

/**
 * @swagger
 * /api/videos/resolve-tiktok-short-link:
 *   post:
 *     summary: Resolve TikTok short link to get video ID and username
 *     tags: [Videos]
 *     description: Follows a TikTok short link redirect to extract the video ID and username
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: TikTok short link (vm.tiktok.com, vt.tiktok.com, or tiktok.com/t/)
 *                 example: https://vm.tiktok.com/ZM2Rp4pyJ/
 *     responses:
 *       200:
 *         description: Successfully resolved TikTok link
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 videoId:
 *                   type: string
 *                   description: Numeric video ID
 *                 username:
 *                   type: string
 *                   description: TikTok username
 *                 fullUrl:
 *                   type: string
 *                   description: Resolved full TikTok URL
 *       400:
 *         description: Invalid short link or unable to extract video ID
 *       502:
 *         description: Failed to follow redirect
 */
router.post('/resolve-tiktok-short-link', resolveTikTokShortLink);

/**
 * @swagger
 * /api/videos/preview/{propertyId}:
 *   get:
 *     summary: Get video generation preview with estimated duration and size
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [vertical, horizontal, square]
 *           default: vertical
 *         description: Video format
 *       - in: query
 *         name: duration
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Duration per image in seconds
 *     responses:
 *       200:
 *         description: Video preview information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 imageCount:
 *                   type: integer
 *                 estimatedDuration:
 *                   type: number
 *                 estimatedSizeMB:
 *                   type: number
 *                 formats:
 *                   type: object
 *                 musicStyles:
 *                   type: object
 *                 existingVideo:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/preview/:propertyId', protect, getVideoPreview);

/**
 * @swagger
 * /api/videos/generate/{propertyId}:
 *   post:
 *     summary: Render a property showcase video and return it as a download
 *     description: >
 *       The MP4 (video/mp4) is streamed to the caller and deleted from the
 *       server — it is never stored. Sellers post it to TikTok/YouTube/Instagram
 *       and paste that link into the listing. Headers X-Video-Duration,
 *       X-Video-Width and X-Video-Height describe the file.
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [vertical, horizontal, square]
 *                 default: vertical
 *                 description: Video format (vertical for reels, horizontal for YouTube)
 *               duration:
 *                 type: integer
 *                 minimum: 2
 *                 maximum: 10
 *                 default: 3
 *                 description: Duration per image in seconds
 *               includeWatermark:
 *                 type: boolean
 *                 default: true
 *                 description: Include BalkanEstateAI watermark
 *               musicStyle:
 *                 type: string
 *                 enum: [elegant, upbeat, calm, modern]
 *                 default: elegant
 *                 description: Background music style
 *     responses:
 *       200:
 *         description: The rendered video file
 *         content:
 *           video/mp4:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bad request (no images or invalid format)
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Not authorized (not property owner)
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/generate/:propertyId', protect, generateVideo);

export default router;
