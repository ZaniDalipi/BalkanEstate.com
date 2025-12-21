# Balkan Estate Backend API

Backend API server for the Balkan Estate real estate application built with Node.js, Express, TypeScript, and MongoDB.

## Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **Property Management**: CRUD operations with ownership validation
- **Favorites**: Save and manage favorite properties
- **Saved Searches**: Store search criteria and map bounds
- **Messaging**: Real-time conversation system between buyers and sellers
- **File Upload**: Cloud storage integration for property images
- **Security**: Helmet, CORS, compression, and input validation

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **File Storage**: Cloudinary
- **Security**: Helmet, CORS

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- Cloudinary account (for image uploads)

## Installation

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Configure `.env` file**:
   ```env
   PORT=5001
   NODE_ENV=development

   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/balkan-estate

   # JWT
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=7d

   # Cloudinary (for image uploads)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret

   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:5173
   ```

## Database Setup

### Option 1: Local MongoDB

1. **Install MongoDB**:
   - macOS: `brew install mongodb-community`
   - Ubuntu: `sudo apt-get install mongodb`
   - Windows: Download from [mongodb.com](https://www.mongodb.com/try/download/community)

2. **Start MongoDB**:
   ```bash
   # macOS/Linux
   mongod

   # Or as a service
   brew services start mongodb-community  # macOS
   sudo systemctl start mongod            # Linux
   ```

3. **Verify connection**:
   ```bash
   mongo
   ```

### Option 2: MongoDB Atlas (Cloud)

1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string and update `MONGODB_URI` in `.env`:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/balkan-estate?retryWrites=true&w=majority
   ```

## Cloudinary Setup

1. Create free account at [cloudinary.com](https://cloudinary.com)
2. Get credentials from Dashboard
3. Update `.env` with your credentials:
   ```env
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

## Running the Server

### Development Mode

```bash
npm run dev
```

Server will run on `http://localhost:5001` with auto-reload on file changes.

### Production Build

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/profile` - Update user profile (protected)

### Properties

- `GET /api/properties` - Get all properties (with filters)
- `GET /api/properties/:id` - Get single property
- `POST /api/properties` - Create new property (protected)
- `PUT /api/properties/:id` - Update property (protected, owner only)
- `DELETE /api/properties/:id` - Delete property (protected, owner only)
- `GET /api/properties/my/listings` - Get user's listings (protected)
- `POST /api/properties/upload-images` - Upload property images (protected)
- `PATCH /api/properties/:id/mark-sold` - Mark property as sold (protected)
- `PATCH /api/properties/:id/renew` - Renew property listing (protected)

### Favorites

- `GET /api/favorites` - Get user's favorites (protected)
- `POST /api/favorites/toggle` - Toggle favorite (protected)
- `GET /api/favorites/check/:propertyId` - Check if favorited (protected)

### Saved Searches

- `GET /api/saved-searches` - Get user's saved searches (protected)
- `POST /api/saved-searches` - Create saved search (protected)
- `PATCH /api/saved-searches/:id/access` - Update access time (protected)
- `DELETE /api/saved-searches/:id` - Delete saved search (protected)

### Conversations

- `GET /api/conversations` - Get user's conversations (protected)
- `POST /api/conversations` - Create conversation (protected)
- `GET /api/conversations/:id` - Get conversation with messages (protected)
- `POST /api/conversations/:id/messages` - Send message (protected)
- `PATCH /api/conversations/:id/read` - Mark as read (protected)

## Database Schema

### User
- email (unique)
- password (hashed)
- name, phone, avatarUrl
- role (buyer, private_seller, agent)
- city, country
- agencyName, agentId, licenseNumber (for agents)
- isSubscribed, subscriptionPlan
- timestamps

### Property
- sellerId (ref: User)
- status (active, pending, sold, draft)
- price, address, city, country
- beds, baths, livingRooms, sqft, yearBuilt, parking
- description, specialFeatures[], materials[]
- imageUrl, images[]
- lat, lng
- propertyType, floorNumber, totalFloors
- views, saves, inquiries
- timestamps

### Favorite
- userId (ref: User)
- propertyId (ref: Property)
- timestamps

### SavedSearch
- userId (ref: User)
- name
- filters (JSON)
- drawnBoundsJSON
- lastAccessed
- timestamps

### Conversation
- propertyId (ref: Property)
- buyerId, sellerId (ref: User)
- lastMessageAt
- buyerUnreadCount, sellerUnreadCount
- timestamps

### Message
- conversationId (ref: Conversation)
- senderId (ref: User)
- text
- isRead
- timestamps

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Express validator for request validation
- **CORS**: Configured for frontend domain only
- **Helmet**: Security headers
- **Rate Limiting**: TODO - Add rate limiting middleware
- **Ownership Validation**: Users can only edit their own properties

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

Error responses:
```json
{
  "message": "Error description"
}
```

## Testing

```bash
npm test
```

(Note: Tests not yet implemented - TODO)

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts      # MongoDB connection
│   │   └── cloudinary.ts    # Cloudinary config
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── propertyController.ts
│   │   ├── favoriteController.ts
│   │   ├── savedSearchController.ts
│   │   └── conversationController.ts
│   ├── middleware/
│   │   └── auth.ts          # JWT authentication
│   ├── models/
│   │   ├── User.ts
│   │   ├── Property.ts
│   │   ├── Favorite.ts
│   │   ├── SavedSearch.ts
│   │   ├── Conversation.ts
│   │   └── Message.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── propertyRoutes.ts
│   │   ├── favoriteRoutes.ts
│   │   ├── savedSearchRoutes.ts
│   │   └── conversationRoutes.ts
│   ├── utils/
│   │   ├── jwt.ts           # JWT helpers
│   │   └── upload.ts        # Multer config
│   └── server.ts            # Express server
├── .env                     # Environment variables
├── .env.example             # Example env file
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Deployment

### Deploy to Heroku

1. Create Heroku app:
   ```bash
   heroku create balkan-estate-api
   ```

2. Add MongoDB Atlas connection string to Heroku config:
   ```bash
   heroku config:set MONGODB_URI="your-mongodb-uri"
   heroku config:set JWT_SECRET="your-secret"
   heroku config:set CLOUDINARY_CLOUD_NAME="your-cloud-name"
   # ... add all env vars
   ```

3. Deploy:
   ```bash
   git push heroku main
   ```

### Deploy to Digital Ocean / AWS / Azure

1. Build the application:
   ```bash
   npm run build
   ```

2. Transfer `dist/` folder and `package.json` to server

3. Install production dependencies:
   ```bash
   npm install --production
   ```

4. Set environment variables

5. Start with PM2:
   ```bash
   pm2 start dist/server.js --name balkan-estate-api
   ```

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 5001 |
| `NODE_ENV` | Environment | No | development |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `JWT_EXPIRES_IN` | Token expiration | No | 7d |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes | - |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes | - |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes | - |
| `FRONTEND_URL` | Frontend URL for CORS | No | http://localhost:5173 |

## Development Tips

1. **MongoDB GUI**: Use [MongoDB Compass](https://www.mongodb.com/products/compass) to visualize your data

2. **API Testing**: Use [Postman](https://www.postman.com/) or [Thunder Client](https://www.thunderclient.com/) (VS Code extension)

3. **Logs**: Check server logs for debugging:
   ```bash
   npm run dev
   ```

4. **Database Reset**: To reset the database:
   ```javascript
   // In MongoDB shell or Compass
   use balkan-estate
   db.dropDatabase()
   ```

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.
