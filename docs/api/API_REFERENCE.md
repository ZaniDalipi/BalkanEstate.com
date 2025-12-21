# 🔗 API Endpoints Reference

## Backend is running on: http://localhost:5001

### ✅ Working Endpoints:

#### Health Check
```
GET http://localhost:5001/health
```
Returns: `{"status":"ok","timestamp":"...","port":5001,"cors":"enabled"}`

#### Authentication
```
POST http://localhost:5001/api/auth/signup
POST http://localhost:5001/api/auth/login
GET  http://localhost:5001/api/auth/me (requires auth token)
PUT  http://localhost:5001/api/auth/profile (requires auth token)
POST http://localhost:5001/api/auth/logout (requires auth token)
```

#### Properties
```
GET    http://localhost:5001/api/properties
POST   http://localhost:5001/api/properties (requires auth token)
GET    http://localhost:5001/api/properties/:id
PUT    http://localhost:5001/api/properties/:id (requires auth token, owner only)
DELETE http://localhost:5001/api/properties/:id (requires auth token, owner only)
```

#### Favorites
```
GET    http://localhost:5001/api/favorites (requires auth token)
POST   http://localhost:5001/api/favorites (requires auth token)
DELETE http://localhost:5001/api/favorites/:propertyId (requires auth token)
```

#### Saved Searches
```
GET    http://localhost:5001/api/saved-searches (requires auth token)
POST   http://localhost:5001/api/saved-searches (requires auth token)
DELETE http://localhost:5001/api/saved-searches/:id (requires auth token)
```

#### Conversations (Messages)
```
GET  http://localhost:5001/api/conversations (requires auth token)
POST http://localhost:5001/api/conversations (requires auth token)
GET  http://localhost:5001/api/conversations/:id (requires auth token)
POST http://localhost:5001/api/conversations/:id/messages (requires auth token)
```

---

## ❌ Routes That DON'T Exist:

- `http://localhost:5001` - Root path (no route here, use /health or /api/...)
- `http://localhost:5001/api` - Base API path (no route here, use specific endpoints)

---

## 🧪 Testing Commands:

### Test Backend is Running:
```bash
curl http://localhost:5001/health
```

### Test CORS Preflight:
```bash
curl -v -X OPTIONS http://localhost:5001/api/properties \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```

### Test Signup:
```bash
curl -X POST http://localhost:5001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123",
    "name": "Test User",
    "phone": "+1234567890"
  }'
```

### Test Get Properties:
```bash
curl http://localhost:5001/api/properties
```

---

## 🌐 Frontend URL:

The frontend should be accessed at:
```
http://localhost:3000
```

NOT http://localhost:5001 (that's the backend API)

---

## 📊 What You Should See in Backend Terminal:

When you open http://localhost:3000, you should see:
```
✅ CORS Preflight: OPTIONS /api/properties - Origin: http://localhost:3000
📥 Request: GET /api/properties - Origin: http://localhost:3000
```

If you DON'T see these logs, the frontend isn't connecting to the backend.

---

## 🔍 Troubleshooting:

### "Route not found" Error

**If you get this at:**
- `http://localhost:5001` → Normal! Use /health or /api/... instead
- `http://localhost:5001/api/properties` → Backend might not be running properly
- `http://localhost:3000` → Frontend routing issue (different problem)

### Check Backend is Running:
```bash
lsof -i :5001
```
Should show node process. If not, backend isn't running.

### Check Backend Logs:
Look in your backend terminal for:
```
🚀 Server running on port 5001
```

If you don't see this, the backend didn't start correctly.

---

## ✅ Success Checklist:

- [ ] `curl http://localhost:5001/health` returns JSON
- [ ] Backend terminal shows 🚀 startup message
- [ ] Frontend runs on http://localhost:3000
- [ ] Opening frontend shows logs in backend terminal
- [ ] No 403 errors in browser console

---

## 🆘 If Nothing Works:

1. **Kill everything:**
   ```bash
   pkill -f "node"
   ```

2. **Start backend fresh:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Start frontend fresh (new terminal):**
   ```bash
   npm run dev
   ```

4. **Open frontend in Incognito mode:**
   http://localhost:3000
