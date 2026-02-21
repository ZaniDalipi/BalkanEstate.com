/**
 * Swagger API Documentation Configuration
 * Interactive API documentation for BalkanEstate Backend
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { Application } from 'express';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'BalkanEstate API',
      version: '1.0.0',
      description: `
## BalkanEstate Real Estate Platform API

This API powers the BalkanEstate real estate platform, providing endpoints for:

- **Authentication** - User registration, login, and token management
- **Properties** - Listing, searching, and managing real estate properties
- **Agencies & Agents** - Agency management and agent operations
- **Payments & Subscriptions** - Payment processing and subscription management
- **Messaging** - Real-time chat between users
- **Analytics** - Market data and insights

### Authentication

Most endpoints require authentication via JWT token. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

### Rate Limiting

API requests are rate-limited to prevent abuse:
- General endpoints: 200 requests per 15 minutes
- Auth endpoints: 50 requests per 15 minutes
- Payment endpoints: 30 requests per 15 minutes
      `,
      contact: {
        name: 'BalkanEstate Support',
        email: 'support@balkanestateai.com',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5001',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        // Common schemas
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message',
            },
            code: {
              type: 'string',
              description: 'Error code',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number',
            },
            limit: {
              type: 'integer',
              description: 'Items per page',
            },
            total: {
              type: 'integer',
              description: 'Total number of items',
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages',
            },
          },
        },
        // User schemas
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email',
            },
            firstName: {
              type: 'string',
              description: 'First name',
            },
            lastName: {
              type: 'string',
              description: 'Last name',
            },
            role: {
              type: 'string',
              enum: ['user', 'agent', 'agency_owner', 'admin'],
              description: 'User role',
            },
            phone: {
              type: 'string',
              description: 'Phone number',
            },
            avatar: {
              type: 'string',
              description: 'Avatar URL',
            },
            isVerified: {
              type: 'boolean',
              description: 'Email verification status',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        // Property schemas
        Property: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Property ID',
            },
            title: {
              type: 'string',
              description: 'Property title',
            },
            description: {
              type: 'string',
              description: 'Property description',
            },
            price: {
              type: 'number',
              description: 'Property price in EUR',
            },
            propertyType: {
              type: 'string',
              enum: ['apartment', 'house', 'land', 'commercial', 'other'],
              description: 'Type of property',
            },
            listingType: {
              type: 'string',
              enum: ['sale', 'rent'],
              description: 'Sale or rent',
            },
            location: {
              type: 'object',
              properties: {
                address: { type: 'string' },
                city: { type: 'string' },
                country: { type: 'string' },
                coordinates: {
                  type: 'object',
                  properties: {
                    lat: { type: 'number' },
                    lng: { type: 'number' },
                  },
                },
              },
            },
            features: {
              type: 'object',
              properties: {
                bedrooms: { type: 'integer' },
                bathrooms: { type: 'integer' },
                area: { type: 'number', description: 'Area in m²' },
                parking: { type: 'boolean' },
                furnished: { type: 'boolean' },
              },
            },
            images: {
              type: 'array',
              items: {
                type: 'string',
                description: 'Image URL',
              },
            },
            status: {
              type: 'string',
              enum: ['active', 'pending', 'sold', 'rented', 'inactive'],
            },
            owner: {
              $ref: '#/components/schemas/User',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        // Agency schema
        Agency: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Agency ID',
            },
            name: {
              type: 'string',
              description: 'Agency name',
            },
            description: {
              type: 'string',
            },
            logo: {
              type: 'string',
              description: 'Logo URL',
            },
            website: {
              type: 'string',
            },
            phone: {
              type: 'string',
            },
            email: {
              type: 'string',
            },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                country: { type: 'string' },
              },
            },
            owner: {
              $ref: '#/components/schemas/User',
            },
            agents: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/User',
              },
            },
            isVerified: {
              type: 'boolean',
            },
          },
        },
        // Subscription schema
        Subscription: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
            plan: {
              type: 'string',
              enum: ['free', 'basic', 'professional', 'enterprise'],
            },
            status: {
              type: 'string',
              enum: ['active', 'cancelled', 'expired', 'past_due'],
            },
            currentPeriodStart: {
              type: 'string',
              format: 'date-time',
            },
            currentPeriodEnd: {
              type: 'string',
              format: 'date-time',
            },
            externalSubscriptionId: {
              type: 'string',
            },
          },
        },
        // Conversation schema
        Conversation: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            participants: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/User',
              },
            },
            property: {
              $ref: '#/components/schemas/Property',
            },
            lastMessage: {
              type: 'object',
              properties: {
                content: { type: 'string' },
                sender: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
            unreadCount: {
              type: 'integer',
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                message: 'Authentication required',
              },
            },
          },
        },
        Forbidden: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                message: 'You do not have permission to perform this action',
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                message: 'Resource not found',
              },
            },
          },
        },
        RateLimited: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                message: 'Too many requests. Please try again later.',
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Properties',
        description: 'Property listing and management',
      },
      {
        name: 'Agencies',
        description: 'Real estate agency operations',
      },
      {
        name: 'Agents',
        description: 'Agent profile and operations',
      },
      {
        name: 'Favorites',
        description: 'User property favorites',
      },
      {
        name: 'Saved Searches',
        description: 'User saved search criteria',
      },
      {
        name: 'Conversations',
        description: 'Messaging between users',
      },
      {
        name: 'Payments',
        description: 'Payment processing',
      },
      {
        name: 'Subscriptions',
        description: 'Subscription management',
      },
      {
        name: 'Promotions',
        description: 'Property promotions and featured listings',
      },
      {
        name: 'Market Data',
        description: 'City market data and analytics',
      },
      {
        name: 'Admin',
        description: 'Administrative operations',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

// Generate Swagger specification
export const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger UI middleware for Express app
 */
export const setupSwagger = (app: Application): void => {
  // Swagger JSON endpoint
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Swagger UI
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 20px 0 }
        .swagger-ui .info .title { color: #3b82f6 }
      `,
      customSiteTitle: 'BalkanEstate API Documentation',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        tryItOutEnabled: true,
      },
    })
  );

  // Swagger setup logged via serverLogger in server.ts
};

export default { swaggerSpec, setupSwagger };
