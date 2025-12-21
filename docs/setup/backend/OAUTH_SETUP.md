# OAuth Social Authentication Setup Guide

This guide explains how to set up Google, Facebook, and Apple ID authentication for Balkan Estate.

## Overview

The application now supports three social authentication providers:
- Google OAuth 2.0
- Facebook Login
- Apple Sign In

## Prerequisites

Before you begin, ensure you have:
- A Google Cloud Platform account
- A Facebook Developers account
- An Apple Developer account (for Apple Sign In)

## Backend Setup

### 1. Environment Variables

Add the following environment variables to your `backend/.env` file:

```bash
# Backend URL (for OAuth callbacks)
BACKEND_URL=http://localhost:5001

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Apple OAuth
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY_PATH=./path/to/apple-private-key.p8
```

### 2. Database Migration

The User model has been updated to support OAuth. If you have existing users, you may need to update your database:

```javascript
// New fields added to User schema:
{
  provider: 'local' | 'google' | 'facebook' | 'apple',  // default: 'local'
  providerId: String,                                    // OAuth provider's user ID
  isEmailVerified: Boolean,                             // default: false
  password: String (now optional),                      // Not required for OAuth users
  phone: String (now optional)                          // Not required for OAuth users
}
```

## Provider-Specific Setup

### Google OAuth 2.0

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Google+ API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Authorized JavaScript origins:
     ```
     http://localhost:5173
     https://yourdomain.com
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:5001/api/auth/google/callback
     https://yourbackend.com/api/auth/google/callback
     ```

4. **Configure Environment Variables**
   - Copy the Client ID to `GOOGLE_CLIENT_ID`
   - Copy the Client Secret to `GOOGLE_CLIENT_SECRET`

### Facebook Login

1. **Create a Facebook App**
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Click "My Apps" > "Create App"
   - Choose "Consumer" as the app type
   - Fill in the app details

2. **Add Facebook Login Product**
   - In your app dashboard, click "Add Product"
   - Select "Facebook Login" and configure it

3. **Configure OAuth Settings**
   - Go to "Facebook Login" > "Settings"
   - Valid OAuth Redirect URIs:
     ```
     http://localhost:5001/api/auth/facebook/callback
     https://yourbackend.com/api/auth/facebook/callback
     ```

4. **Configure Environment Variables**
   - Go to "Settings" > "Basic"
   - Copy the App ID to `FACEBOOK_APP_ID`
   - Copy the App Secret to `FACEBOOK_APP_SECRET`

5. **App Review**
   - For production, submit your app for review to access `email` permission
   - During development, add test users in "Roles" > "Test Users"

### Apple Sign In

1. **Register an App ID**
   - Go to [Apple Developer Portal](https://developer.apple.com/)
   - Navigate to "Certificates, Identifiers & Profiles"
   - Create a new App ID with "Sign In with Apple" capability enabled

2. **Create a Services ID**
   - In "Identifiers", create a new "Services ID"
   - Enable "Sign In with Apple"
   - Configure the Return URLs:
     ```
     http://localhost:5001/api/auth/apple/callback
     https://yourbackend.com/api/auth/apple/callback
     ```
   - Note: Apple doesn't support localhost in production, only for testing

3. **Create a Private Key**
   - Go to "Keys" in the developer portal
   - Create a new key and enable "Sign In with Apple"
   - Download the `.p8` file (you can only download it once!)
   - Save it in your backend directory (e.g., `backend/keys/apple-private-key.p8`)

4. **Configure Environment Variables**
   - Copy your Services ID to `APPLE_CLIENT_ID`
   - Copy your Team ID to `APPLE_TEAM_ID` (found in membership details)
   - Copy your Key ID to `APPLE_KEY_ID` (shown when you created the key)
   - Set `APPLE_PRIVATE_KEY_PATH` to the path of your `.p8` file

## OAuth Flow

### Authentication Flow

1. **User Initiates Login**
   - User clicks on "Continue with Google/Facebook/Apple" button
   - Frontend redirects to backend OAuth endpoint: `/api/auth/{provider}`

2. **Backend Handles OAuth**
   - Backend redirects to OAuth provider's authorization page
   - User authorizes the application
   - Provider redirects back to backend callback: `/api/auth/{provider}/callback`

3. **Backend Processes Authentication**
   - Backend receives OAuth token and user profile
   - Checks if user exists by `provider` and `providerId`
   - If user exists with same email but different provider, links accounts
   - If new user, creates account with OAuth data
   - Generates JWT token

4. **Frontend Receives Token**
   - Backend redirects to frontend: `/?token={jwt}&user={userdata}`
   - Frontend extracts token and user data from URL
   - Stores token in localStorage
   - Updates application state
   - Redirects to main app

### Error Handling

If OAuth fails, the backend redirects to:
```
http://localhost:5173/?error={error_type}
```

Possible error types:
- `authentication_failed`: OAuth authentication failed
- `google_auth_failed`: Google-specific failure
- `facebook_auth_failed`: Facebook-specific failure
- `apple_auth_failed`: Apple-specific failure
- `server_error`: Backend error during OAuth processing

## Testing

### Local Development

1. **Start Backend**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend**
   ```bash
   npm run dev
   ```

3. **Test OAuth Flow**
   - Open http://localhost:5173
   - Click on a social login button
   - Complete the OAuth flow
   - Verify successful login

### Production Deployment

1. **Update Environment Variables**
   - Set `BACKEND_URL` to your production backend URL
   - Set `FRONTEND_URL` to your production frontend URL

2. **Update OAuth Provider Settings**
   - Add production URLs to authorized redirect URIs
   - For Google: Update JavaScript origins and redirect URIs
   - For Facebook: Update Valid OAuth Redirect URIs
   - For Apple: Update Return URLs

3. **SSL/HTTPS Required**
   - All OAuth providers require HTTPS in production
   - Ensure your backend has a valid SSL certificate

## Security Considerations

1. **Environment Variables**
   - Never commit `.env` files to version control
   - Use secure methods to manage production secrets
   - Rotate secrets periodically

2. **Token Security**
   - JWT tokens are stored in localStorage
   - Consider using httpOnly cookies for enhanced security
   - Implement token refresh mechanism for long-lived sessions

3. **CORS Configuration**
   - Ensure CORS is properly configured for production
   - Only allow trusted origins

4. **OAuth Scopes**
   - Request only necessary scopes (profile, email)
   - Review and minimize data access

## Troubleshooting

### Google OAuth Issues

**Error: "redirect_uri_mismatch"**
- Ensure the redirect URI in Google Console exactly matches your backend URL
- Include the protocol (http/https) and port number

**Error: "invalid_client"**
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Ensure the OAuth credentials are for the correct project

### Facebook OAuth Issues

**Error: "URL Blocked"**
- Add the redirect URI to "Valid OAuth Redirect URIs" in Facebook settings
- Ensure the app is not in development mode if using production URLs

**Error: "App Not Set Up"**
- Enable Facebook Login product in your app
- Complete the basic app configuration

### Apple OAuth Issues

**Error: "invalid_client"**
- Verify all Apple credentials (Client ID, Team ID, Key ID)
- Ensure the private key file path is correct and file exists

**Error: "invalid_grant"**
- Check that your Services ID is properly configured
- Verify the Return URLs match exactly

### General Issues

**OAuth callback not working**
- Check that `BACKEND_URL` is set correctly
- Verify backend server is running and accessible
- Check browser console for CORS errors

**User not logged in after OAuth**
- Check browser console for errors
- Verify localStorage has the token
- Check backend logs for JWT generation errors

## Support

For issues or questions:
- Check the application logs (backend console)
- Review browser console for frontend errors
- Ensure all environment variables are set correctly
- Verify OAuth provider credentials are valid

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Passport.js Documentation](http://www.passportjs.org/)
