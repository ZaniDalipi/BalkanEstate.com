import express from 'express';
import {
  generateVideo,
  startAsyncVideoGeneration,
  getJobStatus,
  deleteVideo,
  addVideoToListing,
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
 *     summary: Generate a property showcase video (synchronous)
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
 *                 description: Include BalkanEstateAI.com watermark
 *               musicStyle:
 *                 type: string
 *                 enum: [elegant, upbeat, calm, modern]
 *                 default: elegant
 *                 description: Background music style
 *     responses:
 *       200:
 *         description: Video generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 video:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     publicId:
 *                       type: string
 *                     duration:
 *                       type: number
 *                     format:
 *                       type: string
 *                     width:
 *                       type: integer
 *                     height:
 *                       type: integer
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

/**
 * @swagger
 * /api/videos/generate-async/{propertyId}:
 *   post:
 *     summary: Start async video generation job (for larger videos)
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
 *               duration:
 *                 type: integer
 *                 minimum: 2
 *                 maximum: 10
 *                 default: 3
 *               includeWatermark:
 *                 type: boolean
 *                 default: true
 *               musicStyle:
 *                 type: string
 *                 enum: [elegant, upbeat, calm, modern]
 *                 default: elegant
 *     responses:
 *       202:
 *         description: Video generation started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 jobId:
 *                   type: string
 *                 statusUrl:
 *                   type: string
 *       400:
 *         description: Bad request
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Not authorized
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/generate-async/:propertyId', protect, startAsyncVideoGeneration);

/**
 * @swagger
 * /api/videos/status/{jobId}:
 *   get:
 *     summary: Get video generation job status
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID returned from generate-async endpoint
 *     responses:
 *       200:
 *         description: Job status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 propertyId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, processing, completed, failed]
 *                 progress:
 *                   type: integer
 *                 result:
 *                   type: object
 *                 error:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Job not found
 */
router.get('/status/:jobId', protect, getJobStatus);

/**
 * @swagger
 * /api/videos/{propertyId}:
 *   delete:
 *     summary: Delete generated video for a property
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
 *     responses:
 *       200:
 *         description: Video deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Not authorized
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:propertyId', protect, deleteVideo);

/**
 * @swagger
 * /api/videos/{propertyId}/add-to-listing:
 *   patch:
 *     summary: Add generated video to listing (replaces existing YouTube/Instagram URL)
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
 *               videoUrl:
 *                 type: string
 *                 description: Optional video URL to use (defaults to generated video)
 *     responses:
 *       200:
 *         description: Video added to listing
 *       400:
 *         description: No generated video found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Not authorized
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:propertyId/add-to-listing', protect, addVideoToListing);

export default router;
