import request from 'supertest';
import mongoose from 'mongoose';
import express, { Express } from 'express';
import path from 'path';
import fs from 'fs';
import Property from '../models/Property';
import User from '../models/User';
import propertyRoutes from '../routes/propertyRoutes';
import { protect } from '../middleware/auth';
import jwt from 'jsonwebtoken';
import { createMockUser } from './setup';

// The delivery URL is built from the configured pull zone at import time.
process.env.BUNNY_PULL_ZONE_HOST = 'test-zone.b-cdn.net';
process.env.BUNNY_STORAGE_ZONE = 'test-zone';
process.env.BUNNY_STORAGE_PASSWORD = 'test-password';

// Mock the storage client so no bytes leave the test run.
jest.mock('../services/bunnyStorageService', () => ({
  __esModule: true,
  putObject: jest.fn().mockResolvedValue(undefined),
  getObject: jest.fn().mockResolvedValue(Buffer.from('mock-image-data')),
  deleteObject: jest.fn().mockResolvedValue(true),
  objectExists: jest.fn().mockResolvedValue(true),
  listObjects: jest.fn().mockResolvedValue([]),
  deleteFolderRecursive: jest.fn().mockResolvedValue([]),
  moveObject: jest.fn().mockResolvedValue(true),
}));

// Mock Sharp for image processing. `toBuffer` resolves with an object because
// the upload path asks for `{ resolveWithObject: true }` — it needs the encoded
// dimensions back, which a bare Buffer cannot carry.
jest.mock('sharp', () => {
  return jest.fn(() => ({
    metadata: jest.fn().mockResolvedValue({ width: 1920, height: 1080, format: 'jpeg' }),
    rotate: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    composite: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue({
      data: Buffer.from('mock-image-data'),
      info: { width: 1920, height: 1080, size: 15 },
    }),
  }));
});

describe('Property Image Upload', () => {
  let app: Express;
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    // Setup Express app (MongoDB connection is handled by global setup.ts)
    app = express();
    app.use(express.json());
    app.use('/api/properties', propertyRoutes);

    // Create test user
    testUser = await User.create(createMockUser({
      email: 'test@example.com',
      phone: '+1234567890',
      role: 'private_seller',
      isSubscribed: false,
      subscriptionPlan: 'free',
      listingsCount: 0,
      totalListingsCreated: 0,
    }));

    // Generate auth token
    authToken = jwt.sign(
      { id: testUser._id, type: 'access' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    // Clean up properties after each test
    await Property.deleteMany({});
  });

  describe('POST /api/properties/upload-images', () => {
    it('should upload images to storage successfully', async () => {
      const response = await request(app)
        .post('/api/properties/upload-images')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('images', Buffer.from('fake-image-data'), 'test-image1.jpg')
        .attach('images', Buffer.from('fake-image-data'), 'test-image2.jpg');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('images');
      expect(Array.isArray(response.body.images)).toBe(true);
      expect(response.body.images.length).toBe(2);

      // Check that each uploaded image has the required fields
      response.body.images.forEach((img: any) => {
        expect(img).toHaveProperty('url');
        expect(img).toHaveProperty('publicId');
        expect(img).toHaveProperty('tag');
        expect(img.url).toContain('test-zone.b-cdn.net');
        expect(img.publicId).toContain('balkan-estate/users/');
      });
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/properties/upload-images')
        .attach('images', Buffer.from('fake-image-data'), 'test-image.jpg');

      expect(response.status).toBe(401);
    });

    it('should fail when no images are provided', async () => {
      const response = await request(app)
        .post('/api/properties/upload-images')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('No files uploaded');
    });

    it('should upload images with propertyId for organized folder structure', async () => {
      // First create a property
      const property = await Property.create({
        sellerId: testUser._id,
        createdByName: testUser.name,
        createdByEmail: testUser.email,
        status: 'active',
        price: 150000,
        address: 'Test Street 123',
        city: 'Pristina',
        country: 'Kosovo',
        beds: 3,
        baths: 2,
        livingRooms: 1,
        sqft: 100,
        yearBuilt: 2020,
        parking: 1,
        description: 'Test property',
        imageUrl: 'https://example.com/image.jpg',
        images: [],
        lat: 42.6629,
        lng: 21.1655,
        propertyType: 'house',
        specialFeatures: [],
        materials: [],
      });

      const response = await request(app)
        .post(`/api/properties/${property._id}/upload-images`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('images', Buffer.from('fake-image-data'), 'test-image.jpg');

      expect(response.status).toBe(200);
      expect(response.body.images[0].publicId).toContain(`listing-${property._id}`);
    });
  });

  describe('POST /api/properties - Create Property with Images', () => {
    it('should create a property with user identification fields', async () => {
      const propertyData = {
        price: 200000,
        address: 'Main Street 456',
        city: 'Pristina',
        country: 'Kosovo',
        beds: 4,
        baths: 3,
        livingRooms: 2,
        sqft: 150,
        yearBuilt: 2021,
        parking: 2,
        description: 'Beautiful property with great views',
        imageUrl: 'https://test-zone.b-cdn.net/balkan-estate/test.webp',
        images: [
          {
            url: 'https://test-zone.b-cdn.net/balkan-estate/test1.webp',
            publicId: 'balkan-estate/properties/user-123/listing-456/img1',
            tag: 'exterior',
          },
        ],
        lat: 42.6629,
        lng: 21.1655,
        propertyType: 'house',
        specialFeatures: ['garage', 'garden'],
        materials: ['brick', 'wood'],
      };

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send(propertyData);

      expect(response.status).toBe(201);
      expect(response.body.property).toHaveProperty('_id');
      expect(response.body.property.sellerId).toBe(String(testUser._id));

      // Check user identification fields
      expect(response.body.property.createdByName).toBe(testUser.name);
      expect(response.body.property.createdByEmail).toBe(testUser.email);

      // Verify property was saved to database
      const savedProperty = await Property.findById(response.body.property._id);
      expect(savedProperty).toBeTruthy();
      expect(savedProperty!.createdByName).toBe(testUser.name);
      expect(savedProperty!.createdByEmail).toBe(testUser.email);
      expect(savedProperty!.images.length).toBe(1);
      expect(savedProperty!.images[0].url).toContain('test-zone.b-cdn.net');
      expect(savedProperty!.images[0].publicId).toBeTruthy();
    });

    it('should enforce listing limits for free tier users', async () => {
      // Create 3 properties (free tier limit)
      for (let i = 0; i < 3; i++) {
        await Property.create({
          sellerId: testUser._id,
          createdByName: testUser.name,
          createdByEmail: testUser.email,
          status: 'active',
          price: 100000 + i * 10000,
          address: `Test Street ${i}`,
          city: 'Pristina',
          country: 'Kosovo',
          beds: 2,
          baths: 1,
          livingRooms: 1,
          sqft: 80,
          yearBuilt: 2020,
          parking: 1,
          description: `Test property ${i}`,
          imageUrl: 'https://example.com/image.jpg',
          images: [],
          lat: 42.6629,
          lng: 21.1655,
          propertyType: 'apartment',
          specialFeatures: [],
          materials: [],
        });

        testUser.listingsCount += 1;
        await testUser.save();
      }

      // Try to create a 4th property
      const propertyData = {
        price: 250000,
        address: 'Test Street 4',
        city: 'Pristina',
        country: 'Kosovo',
        beds: 3,
        baths: 2,
        livingRooms: 1,
        sqft: 100,
        yearBuilt: 2021,
        parking: 1,
        description: 'Should fail due to limit',
        imageUrl: 'https://example.com/image.jpg',
        images: [],
        lat: 42.6629,
        lng: 21.1655,
        propertyType: 'house',
        specialFeatures: [],
        materials: [],
      };

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send(propertyData);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('LISTING_LIMIT_REACHED');
    });
  });

  describe('Integration: Full Property Creation Flow', () => {
    it('should complete full flow: upload images -> create property', async () => {
      // Step 1: Upload images
      const uploadResponse = await request(app)
        .post('/api/properties/upload-images')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('images', Buffer.from('fake-image-data'), 'exterior.jpg')
        .attach('images', Buffer.from('fake-image-data'), 'living-room.jpg');

      expect(uploadResponse.status).toBe(200);
      const uploadedImages = uploadResponse.body.images;

      // Step 2: Create property with uploaded images
      const propertyData = {
        price: 300000,
        address: 'Integration Test Street 1',
        city: 'Pristina',
        country: 'Kosovo',
        beds: 3,
        baths: 2,
        livingRooms: 1,
        sqft: 120,
        yearBuilt: 2022,
        parking: 2,
        description: 'Property created in integration test',
        imageUrl: uploadedImages[0].url,
        images: uploadedImages.map((img: any, index: number) => ({
          url: img.url,
          publicId: img.publicId,
          tag: index === 0 ? 'exterior' : 'living_room',
        })),
        lat: 42.6629,
        lng: 21.1655,
        propertyType: 'villa',
        specialFeatures: ['pool', 'garden'],
        materials: ['stone', 'glass'],
      };

      const createResponse = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send(propertyData);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.property.images.length).toBe(2);

      // Verify all images have CDN URLs and storage paths
      createResponse.body.property.images.forEach((img: any) => {
        expect(img.url).toContain('test-zone.b-cdn.net');
        expect(img.publicId).toContain('balkan-estate/users/');
      });

      // Verify user identification
      expect(createResponse.body.property.createdByName).toBe(testUser.name);
      expect(createResponse.body.property.createdByEmail).toBe(testUser.email);
    });
  });
});
