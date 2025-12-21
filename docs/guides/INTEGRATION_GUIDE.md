# Balkan Estate - Backend Integration Guide

This guide explains how to run the Balkan Estate application with the newly integrated backend.

## Overview

The application now has a complete backend integration with:

✅ **User Authentication** - JWT-based auth with secure password hashing
✅ **Property Listings** - Create, edit, delete (owner-only validation)
✅ **Favorites** - Save properties to user accounts
✅ **Saved Searches** - Persist search filters and map bounds
✅ **Messaging** - Conversations between buyers and sellers
✅ **File Uploads** - Cloud storage for property images

## Architecture

```
Frontend (React + TypeScript + Vite)
    ↓ HTTP/REST API
Backend (Node.js + Express + TypeScript)
    ↓ Mongoose ODM
Database (MongoDB)

File Storage: Cloudinary
```

## Quick Start

### 1. Prerequisites

Install these first:
- Node.js 18+ ([download](https://nodejs.org/))
- MongoDB 6+ ([download](https://www.mongodb.com/try/download/community))
- Git

### 2. Clone & Install

```bash
# Clone repository
git clone https://github.com/ZaniDalipi/BalkanEstateWebVersion.git
cd BalkanEstateWebVersion

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 3. Set Up MongoDB

**Option A: Local MongoDB**

```bash
# Start MongoDB
mongod

# Or as a service
brew services start mongodb-community  # macOS
sudo systemctl start mongod            # Linux
```

**Option B: MongoDB Atlas (Cloud - Recommended)**

1. Create free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create cluster
3. Get connection string
4. Use in backend `.env` file

### 4. Configure Environment Variables

**Backend** (`backend/.env`):

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=5001
NODE_ENV=development

# MongoDB - Use your connection string
MONGODB_URI=mongodb://localhost:27017/balkan-estate
# OR for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/balkan-estate

# JWT Secret - Generate a random string
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=7d

# Cloudinary - Get from cloudinary.com (free account)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`.env` in project root):

```bash
cd ..  # Back to project root
```

The `.env` file already exists with:

```env
VITE_API_URL=http://localhost:5001/api
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

### 5. Set Up Cloudinary (Image Uploads)

1. Create free account at [cloudinary.com](https://cloudinary.com)
2. Go to Dashboard
3. Copy: Cloud name, API Key, API Secret
4. Add to `backend/.env`

### 6. Run the Application

You need TWO terminal windows:

**Terminal 1 - Backend**:

```bash
cd backend
npm run dev
```

You should see:
```
MongoDB connected successfully
Server running in development mode on port 5001
```

**Terminal 2 - Frontend**:

```bash
# From project root
npm run dev
```

You should see:
```
VITE ready
Local: http://localhost:5173/
```

### 7. Open Application

Visit: [http://localhost:5173](http://localhost:5173)

## Testing the Integration

### 1. Create an Account

1. Click "Sign Up"
2. Enter email and password
3. Account is created and stored in MongoDB

### 2. Create a Property Listing

1. Click "Create Listing"
2. Fill in property details or use AI generation
3. Upload images (stored in Cloudinary)
4. Submit → Property saved to database

### 3. Test Ownership Validation

1. Log out
2. Create different account
3. Try to edit first account's property → Should be blocked ✅

### 4. Test Favorites

1. Browse properties
2. Click heart icon to favorite
3. Go to "Saved Homes"
4. Favorites persist in database

### 5. Test Saved Searches

1. Apply filters in search
2. Click "Save Search"
3. Go to "Saved Searches"
4. Saved searches persist in database

### 6. Test Messaging

1. Click on a property (not yours)
2. Click "Contact Seller"
3. Send message
4. Messages stored in database

## Common Issues & Solutions

### MongoDB Connection Error

**Error**: `MongoNetworkError: failed to connect`

**Solution**:
```bash
# Check if MongoDB is running
mongod

# Or start as service
brew services start mongodb-community  # macOS
sudo systemctl start mongod            # Linux
```

### Port Already in Use

**Error**: `Port 5001 is already in use`

**Solution**:
```bash
# Find process using port
lsof -i :5001

# Kill process
kill -9 <PID>

# Or change port in backend/.env
PORT=5001
```

### CORS Errors

**Error**: `Access-Control-Allow-Origin`

**Solution**: Check that `FRONTEND_URL` in `backend/.env` matches your frontend URL:
```env
FRONTEND_URL=http://localhost:5173
```

### Image Upload Fails

**Error**: `Failed to upload images`

**Solution**: Verify Cloudinary credentials in `backend/.env`:
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### JWT Token Invalid

**Error**: `Not authorized, token failed`

**Solution**:
1. Clear browser localStorage
2. Log out and log back in
3. Check `JWT_SECRET` in `backend/.env` is set

## Database Management

### View Database with MongoDB Compass

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect to: `mongodb://localhost:27017`
3. Browse `balkan-estate` database

### Collections

- `users` - User accounts
- `properties` - Property listings
- `favorites` - User favorites
- `savedsearches` - Saved search filters
- `conversations` - Chat conversations
- `messages` - Chat messages

### Reset Database

```javascript
// In MongoDB shell or Compass
use balkan-estate
db.dropDatabase()
```

## API Testing with Postman

1. Install [Postman](https://www.postman.com/)

2. **Login**:
   ```
   POST http://localhost:5001/api/auth/login
   Body (JSON):
   {
     "email": "test@example.com",
     "password": "password123"
   }
   ```

3. **Copy token from response**

4. **Get Properties** (with auth):
   ```
   GET http://localhost:5001/api/properties
   Headers:
   Authorization: Bearer <your-token>
   ```

## Project Structure

```
BalkanEstateWebVersion/
├── backend/                    # Backend API
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── models/           # Database models
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Auth, validation
│   │   ├── config/           # DB, Cloudinary config
│   │   ├── utils/            # Helper functions
│   │   └── server.ts         # Express server
│   ├── .env                  # Backend config
│   ├── package.json
│   └── tsconfig.json
│
├── src/                       # Frontend React app
├── services/
│   └── apiService.ts         # API client (now integrated!)
├── .env                      # Frontend config
├── package.json
└── vite.config.ts
```

## Development Workflow

### Adding New Features

1. **Backend**:
   - Add model in `backend/src/models/`
   - Add controller in `backend/src/controllers/`
   - Add routes in `backend/src/routes/`
   - Update `backend/src/server.ts`

2. **Frontend**:
   - Add API function in `services/apiService.ts`
   - Update components to use new API

3. **Test**:
   - Test with Postman
   - Test in browser
   - Check database

### Code Organization

- **Models**: Define data structure
- **Controllers**: Business logic
- **Routes**: URL mapping
- **Middleware**: Auth, validation
- **API Service**: Frontend API client

## Security Checklist

✅ Passwords hashed with bcrypt
✅ JWT authentication
✅ Ownership validation (users can only edit their own properties)
✅ CORS configured
✅ Helmet security headers
✅ Input validation
⬜ Rate limiting (TODO)
⬜ Email verification (TODO)

## Performance Optimization

- Database indexes on frequently queried fields
- Pagination for property listings
- Compression middleware
- Image optimization via Cloudinary

## Next Steps / TODOs

1. ✅ **Completed**: Core backend integration
2. ⬜ **TODO**: Implement social login (Google, Facebook, Apple)
3. ⬜ **TODO**: Add email verification
4. ⬜ **TODO**: Implement password reset
5. ⬜ **TODO**: Add phone verification
6. ⬜ **TODO**: Implement real-time messaging (WebSockets)
7. ⬜ **TODO**: Add rate limiting
8. ⬜ **TODO**: Add unit tests
9. ⬜ **TODO**: Deploy to production

## Deployment

### Backend Deployment

See `backend/README.md` for deployment instructions to:
- Heroku
- Digital Ocean
- AWS
- Azure

### Frontend Deployment

```bash
npm run build
# Deploy dist/ folder to Vercel, Netlify, or any static host
```

## Support

For issues:
1. Check this guide
2. Check `backend/README.md`
3. Open GitHub issue

## License

ISC
