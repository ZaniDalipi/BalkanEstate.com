import express from 'express';
import {
  trackView,
  updateViewDuration,
  getEntityStats,
  getMyPropertiesStats,
  getMyAgentStats,
  getMyAgencyStats,
  getComparisonStats,
} from '../controllers/viewStatsController';
import { protect, optionalAuth } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/view-stats/track:
 *   post:
 *     summary: Track a page view
 *     tags: [View Statistics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entityType
 *               - entityId
 *             properties:
 *               entityType:
 *                 type: string
 *                 enum: [property, agent, agency]
 *               entityId:
 *                 type: string
 *               sessionId:
 *                 type: string
 *               referrer:
 *                 type: string
 *               duration:
 *                 type: number
 *     responses:
 *       201:
 *         description: View tracked successfully
 */
router.post('/track', optionalAuth, trackView);

/**
 * @swagger
 * /api/view-stats/{viewId}/duration:
 *   patch:
 *     summary: Update view duration
 *     tags: [View Statistics]
 *     parameters:
 *       - in: path
 *         name: viewId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               duration:
 *                 type: number
 *     responses:
 *       200:
 *         description: Duration updated
 */
router.patch('/:viewId/duration', updateViewDuration);

/**
 * @swagger
 * /api/view-stats/my-properties:
 *   get:
 *     summary: Get view statistics for user's properties
 *     tags: [View Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, all]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Properties statistics
 */
router.get('/my-properties', protect, getMyPropertiesStats);

/**
 * @swagger
 * /api/view-stats/my-agent-profile:
 *   get:
 *     summary: Get view statistics for agent's profile
 *     tags: [View Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, all]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Agent profile statistics
 */
router.get('/my-agent-profile', protect, getMyAgentStats);

/**
 * @swagger
 * /api/view-stats/my-agency:
 *   get:
 *     summary: Get view statistics for user's agency
 *     tags: [View Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, all]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Agency statistics
 */
router.get('/my-agency', protect, getMyAgencyStats);

/**
 * @swagger
 * /api/view-stats/comparison:
 *   get:
 *     summary: Get comparison statistics (week over week, month over month)
 *     tags: [View Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Comparison statistics
 */
router.get('/comparison', protect, getComparisonStats);

/**
 * @swagger
 * /api/view-stats/{entityType}/{entityId}:
 *   get:
 *     summary: Get view statistics for a specific entity
 *     tags: [View Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [property, agent, agency]
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, all]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Entity statistics
 */
router.get('/:entityType/:entityId', protect, getEntityStats);

export default router;
