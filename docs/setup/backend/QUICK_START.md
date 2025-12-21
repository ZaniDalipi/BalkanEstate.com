# Backend Quick Start

Get the Balkan Estate backend server running in 5 minutes.

## Prerequisites

- Node.js 18+
- MongoDB 5+
- npm or yarn

## Installation

### 1. Clone & Install

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install
```

### 2. MongoDB Setup

**Option A: Local MongoDB**
```bash
# Install MongoDB (Ubuntu/Debian)
sudo apt install mongodb-org

# Start MongoDB
sudo systemctl start mongod
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at https://www.mongodb.com/atlas
2. Create cluster
3. Get connection string

### 3. Environment Configuration

Create `.env` file in backend directory:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/balkan-estate
# OR for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/balkan-estate

# JWT Secret (generate secure random string)
JWT_SECRET=your_very_secure_secret_key_here_min_32_chars

# Session Secret
SESSION_SECRET=another_secure_secret_key

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# File Upload
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_DIR=./uploads

# Cloudinary (for image hosting)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Stripe (optional - for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Redis (optional - for caching/sessions)
REDIS_URL=redis://localhost:6379
```

### 4. Database Initialization

```bash
# Seed initial data (optional)
npm run seed
```

### 5. Start Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server runs at `http://localhost:5000`

## Project Structure

```
backend/
├── src/
│   ├── models/           # Mongoose models
│   ├── routes/           # Express routes
│   ├── controllers/      # Route handlers
│   ├── middleware/       # Custom middleware
│   ├── services/         # Business logic
│   ├── utils/            # Utilities
│   └── config/           # Configuration
├── uploads/              # Temporary file uploads
└── tests/                # Test files
```

## API Endpoints

### Authentication
```
POST   /api/auth/signup       # Create account
POST   /api/auth/login        # Login
POST   /api/auth/logout       # Logout
GET    /api/auth/me           # Get current user
POST   /api/auth/refresh      # Refresh token
```

### Properties
```
GET    /api/properties        # List properties
GET    /api/properties/:id    # Get property
POST   /api/properties        # Create property
PUT    /api/properties/:id    # Update property
DELETE /api/properties/:id    # Delete property
```

### Agencies
```
GET    /api/agencies          # List agencies
GET    /api/agencies/:id      # Get agency
POST   /api/agencies          # Create agency
PUT    /api/agencies/:id      # Update agency
```

### Conversations
```
GET    /api/conversations     # List conversations
GET    /api/conversations/:id # Get conversation
POST   /api/conversations     # Create conversation
POST   /api/conversations/:id/messages  # Send message
```

See [API Reference](../../api/API_REFERENCE.md) for complete documentation.

## Testing API

### Using curl
```bash
# Health check
curl http://localhost:5000/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get properties
curl http://localhost:5000/api/properties
```

### Using Postman
Import the API collection from `docs/api/postman_collection.json`

## Common Tasks

### Adding New Route

```javascript
// routes/myRoute.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  // Handler logic
});

module.exports = router;
```

### Adding Middleware

```javascript
// middleware/myMiddleware.js
module.exports = (req, res, next) => {
  // Middleware logic
  next();
};
```

### Database Queries

```javascript
const Property = require('../models/Property');

// Find all
const properties = await Property.find();

// Find with filters
const properties = await Property.find({
  price: { $gte: 100000, $lte: 500000 }
});

// Create
const property = await Property.create(data);

// Update
await Property.findByIdAndUpdate(id, data);

// Delete
await Property.findByIdAndDelete(id);
```

## Development Workflow

### Auto-Reload
Using `nodemon` - server restarts on file changes.

### Debugging
```bash
# Enable debug logs
DEBUG=* npm run dev
```

### Database Inspection

**MongoDB Compass** (GUI)
- Download: https://www.mongodb.com/products/compass
- Connect to: `mongodb://localhost:27017`

**Mongo Shell**
```bash
mongosh
use balkan-estate
db.properties.find()
```

## Troubleshooting

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod
```

### Port Already in Use
```bash
# Find process on port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors
Check `FRONTEND_URL` in `.env` matches your frontend URL.

## Environment Variables

### Required
- `MONGODB_URI` - Database connection
- `JWT_SECRET` - Token signing (min 32 chars)
- `FRONTEND_URL` - For CORS

### Optional
- `PORT` - Server port (default: 5000)
- `CLOUDINARY_*` - Image hosting
- `STRIPE_*` - Payments
- `SMTP_*` - Email notifications
- `GOOGLE_*`, `FACEBOOK_*` - OAuth

See [Environment Guide](./ENVIRONMENT.md) for details.

## Security Best Practices

1. **Never commit `.env`** - Add to `.gitignore`
2. **Use strong JWT secrets** - Min 32 random characters
3. **Enable HTTPS** in production
4. **Rate limiting** - Already configured
5. **Input validation** - Use middleware
6. **SQL injection protection** - Mongoose handles this

## Performance Tips

1. **Database Indexing**
```javascript
// Add indexes to frequently queried fields
propertySchema.index({ city: 1, price: 1 });
```

2. **Redis Caching** (optional)
```javascript
const redis = require('redis');
const client = redis.createClient();
```

3. **Query Optimization**
```javascript
// Use lean() for read-only queries
const properties = await Property.find().lean();

// Select only needed fields
const properties = await Property.find().select('title price');
```

## Next Steps

- [Database Setup](./DATABASE_SETUP.md) - Detailed DB configuration
- [OAuth Setup](./OAUTH_SETUP.md) - Social login
- [Cloudinary Setup](./CLOUDINARY_SETUP.md) - Image hosting
- [API Reference](../../api/API_REFERENCE.md) - Complete API docs
- [Backend Architecture](../../architecture/BACKEND_ARCHITECTURE.md) - How it works

## Useful Commands

```bash
npm run dev          # Start with auto-reload
npm start            # Start production server
npm test             # Run tests
npm run lint         # Run linter
npm run seed         # Seed database
npm run migrate      # Run migrations
```

## Monitoring

### Logs
```bash
# View logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log
```

### Health Check
```bash
curl http://localhost:5000/health
```

## Getting Help

- Check [Database Setup Guide](./DATABASE_SETUP.md)
- Read [API Reference](../../api/API_REFERENCE.md)
- See [Troubleshooting](../../guides/TROUBLESHOOTING.md)

---

**Ready to develop!** Your API is running at `http://localhost:5000` 🚀
