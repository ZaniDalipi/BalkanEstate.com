# Agency Join Flow - Setup Instructions

## What Was Changed

The agency join flow from the user profile has been redesigned to work with invitation codes, similar to how it works on the agency detail page.

### Backend Changes
1. **New Endpoint**: `POST /api/agencies/find-by-code`
   - Finds an agency by its invitation code
   - Returns agency details for preview before joining
   - Location: `backend/src/controllers/agencyController.ts:960`

2. **Route Added**: `backend/src/routes/agencyRoutes.ts:52`
   - Registered the new endpoint with authentication protection

### Frontend Changes
1. **Updated Component**: `components/shared/AgencyManagementSection.tsx`
   - Removed dropdown agency selection
   - Added invitation code-based lookup
   - Shows agency preview before joining
   - Navigates to agency page after sending join request

## How to Test

### Step 1: Restart Backend Server

**IMPORTANT**: You must restart your backend server for the new endpoint to be available.

```bash
cd backend
npm run dev
```

### Step 2: Get an Agency Invitation Code

You need an invitation code from an existing agency. There are two ways to get one:

#### Option A: From an existing agency admin
1. Login as an agency owner or admin
2. Go to the agency detail page
3. Look for the "Agency Invitation Code" section (yellow box)
4. Copy the code (format: `AGY-XXXXXX-XXXXXX`)

#### Option B: Create a test agency
```bash
# In the backend directory
npm run seed:agencies
```

Then check the database for invitation codes:
```javascript
// Connect to MongoDB and run:
db.agencies.find({}, {name: 1, invitationCode: 1})
```

### Step 3: Test the Join Flow

1. **Login as an agent** (without an agency, or ready to switch)
2. **Go to your profile** (`/account`)
3. **Click "Join an Agency"** button
4. **Enter the invitation code** you obtained in Step 2
5. **Click "Find Agency"**
   - You should see a preview of the agency (logo, name, location, member count)
6. **Click "Send Join Request"**
   - You should see a success message
   - You will be navigated to the agency detail page
7. **Check the console** for detailed logs:
   - Look for: `🔍 Looking up agency with code:`
   - Look for: `✅ Found agency:`
   - Look for: `📤 Sending join request to agency:`

## Debugging

If you encounter errors, check the browser console for:

### Common Issues

1. **404 Error on `/api/agencies/find-by-code`**
   - Solution: Restart the backend server
   - The new route wasn't loaded

2. **"Invalid invitation code" error**
   - Solution: Verify the code is correct
   - Check that the agency exists in the database
   - Invitation codes are case-insensitive but must match exactly

3. **Network errors**
   - Solution: Ensure backend is running on correct port (default: 5001)
   - Check `VITE_API_URL` in frontend `.env`

4. **No agencies with invitation codes**
   - Solution: Run `npm run seed:agencies` in backend directory
   - Or create an agency through the UI (invitation codes are auto-generated)

### Enhanced Logging

The component now includes detailed logging:
- API request parameters
- API response data
- Error details (message, status, response)

Check the browser console (F12) for these logs.

## API Endpoint Details

### Find Agency by Invitation Code

**Endpoint**: `POST /api/agencies/find-by-code`

**Request**:
```json
{
  "code": "AGY-BELGRAD-A1B2C3"
}
```

**Response** (Success):
```json
{
  "success": true,
  "agency": {
    "_id": "...",
    "name": "Belgrade Real Estate",
    "description": "...",
    "city": "Belgrade",
    "country": "Serbia",
    "slug": "serbia/belgrade-real-estate",
    "logo": "https://...",
    "totalAgents": 5
  }
}
```

**Response** (Error):
```json
{
  "message": "Invalid invitation code. Please check and try again."
}
```

## User Flow

```
Profile → Enter Invitation Code → Find Agency → Preview Agency Details → Send Join Request → Navigate to Agency Page
```

This matches the flow on the agency detail page, providing a consistent user experience.

## Files Changed

1. `backend/src/controllers/agencyController.ts` - Added `findAgencyByInvitationCode` function
2. `backend/src/routes/agencyRoutes.ts` - Added route for new endpoint
3. `services/apiService.ts` - Added `findAgencyByInvitationCode` API function
4. `components/shared/AgencyManagementSection.tsx` - Complete redesign of join flow

## Next Steps

If you encounter any issues:
1. Check the console logs (both frontend and backend)
2. Verify the backend server was restarted
3. Confirm you have agencies with invitation codes
4. Test the endpoint directly using curl or Postman

Example curl test:
```bash
curl -X POST http://localhost:5001/api/agencies/find-by-code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"code":"AGY-BELGRAD-A1B2C3"}'
```
