# Cloudinary Setup Guide

## Quick Setup (5 minutes)

### Step 1: Create a Free Cloudinary Account
1. Go to https://cloudinary.com/users/register_free
2. Sign up with your email or Google account
3. Verify your email

### Step 2: Get Your Credentials
1. After signing in, you'll be on the Dashboard
2. You'll see three credentials displayed:
   - **Cloud Name** (e.g., `dxyz123abc`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (click the eye icon to reveal)

### Step 3: Add Credentials to .env File
1. Open `/backend/.env` file
2. Replace the placeholder values:

```env
# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-actual-cloud-name-here
CLOUDINARY_API_KEY=your-actual-api-key-here
CLOUDINARY_API_SECRET=your-actual-api-secret-here
```

**Example:**
```env
# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=dzx8c9abc
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdef123456789ghijklmn
```

### Step 4: Restart Your Backend Server
```bash
# Stop the server (Ctrl+C)
# Then restart it
cd backend
npm run dev
```

### Step 5: Test Image Upload
1. Go to your profile settings
2. Click "Change Picture"
3. Select an image
4. You should see it upload successfully!

## Troubleshooting

### "Image upload service not configured" error
**Check your backend logs.** You'll see:
```
=== Cloudinary Configuration Check ===
CLOUDINARY_CLOUD_NAME: Set (your-cloud-name) ✓
CLOUDINARY_API_KEY: Set (hidden) ✓
CLOUDINARY_API_SECRET: Set (hidden) ✓
```

If any show "NOT SET":
1. Make sure you saved the `.env` file
2. Make sure there are no quotes around the values
3. Restart the backend server

### Still not working?
1. Double-check the credentials on Cloudinary dashboard
2. Make sure there are no spaces before or after the values
3. Try copying the values again

## Free Tier Limits
Cloudinary free tier includes:
- ✅ 25 GB storage
- ✅ 25 GB bandwidth/month
- ✅ Unlimited transformations
- ✅ Perfect for development and small projects!

## Need Help?
The backend now logs exactly which credentials are missing when you try to upload.
Check your terminal/console for helpful error messages!
