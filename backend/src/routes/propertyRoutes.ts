import express from 'express';
import {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getMyListings,
  uploadImages,
  markAsSold,
  markAsRented,
  markAsAvailable,
  renewProperty,
  addRentalHistoryEntry,
  deleteRentalHistoryEntry,
} from '../controllers/propertyController';
import { protect } from '../middleware/auth';
import { upload } from '../utils/upload';
import { mutationRateLimiter } from '../middleware/security';

const router = express.Router();

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: Get all properties with filtering
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *           enum: [apartment, house, land, commercial, other]
 *         description: Filter by property type
 *       - in: query
 *         name: listingType
 *         schema:
 *           type: string
 *           enum: [sale, rent]
 *         description: Filter by listing type (sale/rent)
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price
 *       - in: query
 *         name: bedrooms
 *         schema:
 *           type: integer
 *         description: Minimum bedrooms
 *       - in: query
 *         name: bathrooms
 *         schema:
 *           type: integer
 *         description: Minimum bathrooms
 *     responses:
 *       200:
 *         description: List of properties
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 properties:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Property'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/', getProperties);

/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     summary: Get a single property by ID
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID
 *     responses:
 *       200:
 *         description: Property details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Property'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', getProperty);

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Create a new property listing
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - price
 *               - propertyType
 *               - listingType
 *               - location
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               propertyType:
 *                 type: string
 *                 enum: [apartment, house, land, commercial, other]
 *               listingType:
 *                 type: string
 *                 enum: [sale, rent]
 *               location:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                   city:
 *                     type: string
 *                   country:
 *                     type: string
 *               features:
 *                 type: object
 *                 properties:
 *                   bedrooms:
 *                     type: integer
 *                   bathrooms:
 *                     type: integer
 *                   area:
 *                     type: number
 *     responses:
 *       201:
 *         description: Property created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Property'
 *       400:
 *         description: Invalid input
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/', protect, mutationRateLimiter, createProperty);
router.put('/:id', protect, mutationRateLimiter, updateProperty);
router.delete('/:id', protect, mutationRateLimiter, deleteProperty);
router.get('/my/listings', protect, getMyListings);
// Upload images - can be used with or without propertyId
router.post('/upload-images', protect, mutationRateLimiter, upload.array('images', 30), uploadImages);
router.post('/:propertyId/upload-images', protect, mutationRateLimiter, upload.array('images', 30), uploadImages);
router.patch('/:id/mark-sold', protect, mutationRateLimiter, markAsSold);
router.patch('/:id/mark-rented', protect, mutationRateLimiter, markAsRented);
router.patch('/:id/mark-available', protect, mutationRateLimiter, markAsAvailable);
router.patch('/:id/renew', protect, mutationRateLimiter, renewProperty);
router.post('/:id/rental-history', protect, mutationRateLimiter, addRentalHistoryEntry);
router.delete('/:id/rental-history/:entryId', protect, mutationRateLimiter, deleteRentalHistoryEntry);

export default router;
