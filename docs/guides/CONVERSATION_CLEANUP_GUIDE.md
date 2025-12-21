# Conversation Cleanup System Guide

## Overview

This system automatically tracks and deletes old conversations after 30 days from the last message. It also properly manages Cloudinary images associated with messages, ensuring no orphaned files remain in cloud storage.

## Features

###1. **Automatic Expiration Tracking**
- Every conversation has an `expiresAt` field
- Auto-updates to 30 days from last message
- Indexed for efficient cleanup queries

### 2. **User-Associated Image Storage**
- Images organized by both user IDs
- Easy to identify conversation participants
- Organized folder structure

### 3. **Complete Cleanup**
- Deletes expired conversations
- Deletes all associated messages
- Deletes Cloudinary images
- Prevents orphaned data

### 4. **Manual and Automated Execution**
- Run manually via npm script
- Can be scheduled with cron jobs
- Provides detailed statistics

---

## How It Works

### Expiration Timeline

```
Day 0: Conversation created
   ↓
Day 5: Last message sent
   ↓
Day 35: Conversation expires (30 days from last message)
   ↓
Next cleanup: Conversation + messages + images deleted
```

### Database Schema Changes

#### Conversation Model
```typescript
interface IConversation {
  // ... existing fields
  expiresAt: Date; // NEW: Auto-set to lastMessageAt + 30 days
}
```

#### Message Model
```typescript
interface IMessage {
  // ... existing fields
  imagePublicId?: string; // NEW: Cloudinary public_id for cleanup
}
```

### Image Organization

**Old structure:**
```
balkan-estate/messages/
  └── random-image-1.jpg
  └── random-image-2.jpg
```

**New structure:**
```
balkan-estate/messages/
  └── user-{userId1}-user-{userId2}/
      └── conv-{conversationId}/
          ├── annotated-image-1.jpg
          ├── annotated-image-2.jpg
          └── screenshot-3.jpg
```

**Benefits:**
- Both user IDs visible in path
- Easy to track conversation ownership
- Organized by conversation
- Efficient bulk deletion

---

## Usage

### Running Cleanup Manually

```bash
cd backend
npm run cleanup:conversations
```

**Output example:**
```
============================================================
🧹 Conversation Cleanup Script
============================================================

🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📊 Getting conversation stats...
  Current state:
    - Total conversations: 150
    - Expired conversations: 12
    - Expiring soon (7 days): 8

🧹 Starting cleanup...

🗑️  Processing conversation 507f1f77bcf86cd799439011 (expired: 2024-10-18T14:30:00.000Z)
  📸 Deleting 5 images from Cloudinary...
    ✅ Deleted: balkan-estate/messages/user-abc123-user-def456/conv-507f.../img1
    ✅ Deleted: balkan-estate/messages/user-abc123-user-def456/conv-507f.../img2
    ...
  ✅ Deleted 5/5 images
  ✅ Deleted 23 messages
  ✅ Deleted conversation 507f1f77bcf86cd799439011

...

============================================================
✅ Cleanup Complete
============================================================
  📈 Results:
    - Conversations deleted: 12
    - Messages deleted: 143
    - Images deleted: 37

⚠️  Note: 8 conversations will expire in the next 7 days
```

### Scheduling with Cron

**Run daily at 2 AM:**

```bash
# Edit crontab
crontab -e

# Add this line:
0 2 * * * cd /path/to/BalkanEstateWebVersion/backend && npm run cleanup:conversations >> /var/log/conversation-cleanup.log 2>&1
```

**Run weekly (Sunday at 3 AM):**
```bash
0 3 * * 0 cd /path/to/BalkanEstateWebVersion/backend && npm run cleanup:conversations >> /var/log/conversation-cleanup.log 2>&1
```

### Monitoring

**View cleanup logs:**
```bash
tail -f /var/log/conversation-cleanup.log
```

**Check expiration stats:**
```typescript
import { getExpirationStats } from './services/conversationCleanupService';

const stats = await getExpirationStats();
console.log(stats);
// {
//   expiredCount: 12,
//   expiringSoonCount: 8,
//   totalCount: 150
// }
```

---

## API Changes

### Message Image Upload

**Endpoint:** `POST /api/conversations/:id/upload-image`

**Before:**
```json
{
  "imageUrl": "https://res.cloudinary.com/..."
}
```

**After:**
```json
{
  "imageUrl": "https://res.cloudinary.com/...",
  "publicId": "balkan-estate/messages/user-abc-user-def/conv-xyz/img123"
}
```

**Frontend update required:**
When sending a message with an image, include the `publicId`:

```typescript
// After uploading image
const { imageUrl, publicId } = await uploadMessageImage(conversationId, file);

// When sending message
await sendMessage(conversationId, {
  imageUrl,
  imagePublicId: publicId, // Include this!
  text: 'Check this out',
});
```

### Conversation Deletion

**Endpoint:** `DELETE /api/conversations/:id`

**Behavior:**
- Finds all messages with images
- Deletes images from Cloudinary
- Deletes all messages
- Deletes conversation
- Returns summary

**Response:**
```json
{
  "message": "Conversation deleted"
}
```

---

## Migration

### For Existing Conversations

Existing conversations without `expiresAt` will need to be migrated:

```typescript
// Run this migration script once
import Conversation from './models/Conversation';

const migrateExistingConversations = async () => {
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  const conversations = await Conversation.find({
    expiresAt: { $exists: false }
  });

  for (const conv of conversations) {
    conv.expiresAt = new Date(conv.lastMessageAt.getTime() + THIRTY_DAYS);
    await conv.save();
  }

  console.log(`Migrated ${conversations.length} conversations`);
};
```

### For Existing Messages

Old messages without `imagePublicId` will still work, but images won't be deleted during cleanup. This is acceptable for backward compatibility.

---

## Testing

### Test Cleanup Locally

1. **Create test conversations:**
   ```typescript
   // Create a conversation with expired date
   const testConversation = await Conversation.create({
     propertyId: '...',
     buyerId: '...',
     sellerId: '...',
     lastMessageAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
     expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Expired 10 days ago
   });
   ```

2. **Add test messages with images:**
   ```typescript
   await Message.create({
     conversationId: testConversation._id,
     senderId: '...',
     imageUrl: 'https://...',
     imagePublicId: 'test-image-public-id',
   });
   ```

3. **Run cleanup:**
   ```bash
   npm run cleanup:conversations
   ```

4. **Verify:**
   - Conversation deleted
   - Messages deleted
   - Cloudinary images deleted

### Test Image Upload

1. **Upload an annotated image:**
   ```bash
   curl -X POST http://localhost:5001/api/conversations/{convId}/upload-image \
     -H "Authorization: Bearer {token}" \
     -F "image=@annotated-screenshot.png"
   ```

2. **Verify folder structure in Cloudinary:**
   - Should be in: `balkan-estate/messages/user-{id1}-user-{id2}/conv-{id}/`
   - Should have context metadata

3. **Send message with image:**
   ```bash
   curl -X POST http://localhost:5001/api/conversations/{convId}/messages \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{
       "text": "Check this",
       "imageUrl": "...",
       "imagePublicId": "..."
     }'
   ```

4. **Verify in database:**
   ```javascript
   const message = await Message.findOne({ imageUrl: '...' });
   console.log(message.imagePublicId); // Should be set
   ```

---

## Troubleshooting

### Issue: Cleanup script fails to delete images

**Possible causes:**
1. Cloudinary credentials not set
2. Invalid public_id format
3. Image already deleted

**Solution:**
```bash
# Check Cloudinary config
echo $CLOUDINARY_CLOUD_NAME
echo $CLOUDINARY_API_KEY
# (Don't echo API_SECRET in production)

# Check logs for specific errors
npm run cleanup:conversations 2>&1 | grep "Failed to delete"
```

### Issue: expiresAt not being set

**Check:**
```typescript
// Verify pre-save hook is working
const conv = await Conversation.create({
  propertyId: '...',
  buyerId: '...',
  sellerId: '...',
});

console.log(conv.expiresAt); // Should be set automatically
```

### Issue: Images not organized correctly

**Check upload endpoint:**
```typescript
// In conversationController.ts, verify folder path
console.log(folderPath);
// Should be: balkan-estate/messages/user-{id1}-user-{id2}/conv-{id}
```

### Issue: Cron job not running

**Debug cron:**
```bash
# Check if cron is running
service cron status

# Check cron logs
grep CRON /var/log/syslog

# Test command manually first
cd /path/to/backend && npm run cleanup:conversations
```

---

## Performance Considerations

### Cleanup Performance

- **Small scale** (< 100 expired conversations): < 1 minute
- **Medium scale** (100-1000): 1-5 minutes
- **Large scale** (1000+): 5-15 minutes

### Optimization Tips

1. **Run during off-peak hours** (2-4 AM)
2. **Monitor Cloudinary rate limits**
3. **Consider batching for very large cleanups**
4. **Add retry logic for failed deletes**

### Database Impact

- Uses indexed queries (`expiresAt` index)
- Minimal impact on active users
- No table locks (MongoDB)

---

## Security & Privacy

### Data Retention

- **Messages**: Automatically deleted after 30 days
- **Images**: Automatically deleted with messages
- **Conversations**: Full cleanup including all traces

### User Privacy

- Images stored with both user IDs (transparent)
- Both users' data deleted together
- No orphaned images in cloud storage
- Complies with "right to be forgotten"

### Cloudinary Context

Images include metadata:
```json
{
  "conversation_id": "...",
  "buyer_id": "...",
  "seller_id": "...",
  "uploaded_by": "..."
}
```

This helps with:
- Auditing
- Debugging
- Data ownership tracking

---

## Monitoring & Alerts

### Recommended Monitoring

1. **Track cleanup success rate:**
   ```typescript
   const result = await cleanupExpiredConversations();
   if (result.deletedConversations > 0) {
     // Send metrics to monitoring service
     metrics.track('conversations_cleanup', result);
   }
   ```

2. **Alert on failures:**
   ```typescript
   try {
     await cleanupExpiredConversations();
   } catch (error) {
     // Send alert
     alerting.error('Conversation cleanup failed', error);
   }
   ```

3. **Monitor expired count:**
   ```typescript
   const stats = await getExpirationStats();
   if (stats.expiredCount > 100) {
     // Alert: Cleanup may not be running
     alerting.warn('High expired conversation count', stats);
   }
   ```

### Health Check Endpoint

Add to your API:
```typescript
app.get('/health/cleanup', async (req, res) => {
  const stats = await getExpirationStats();
  res.json({
    status: stats.expiredCount < 50 ? 'healthy' : 'warning',
    stats,
  });
});
```

---

## Future Enhancements

### Possible Improvements

1. **Configurable retention period:**
   ```typescript
   // Allow per-user or per-plan retention settings
   conversation.retentionDays = user.plan === 'premium' ? 90 : 30;
   ```

2. **Archive before delete:**
   ```typescript
   // Export conversations to S3 before deletion
   await archiveConversation(conversation);
   await deleteConversation(conversation);
   ```

3. **Selective cleanup:**
   ```typescript
   // Keep conversations with important flags
   if (conversation.isImportant) {
     conversation.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
   }
   ```

4. **User notification:**
   ```typescript
   // Warn users 7 days before expiration
   if (daysUntilExpiration <= 7) {
     await sendExpirationWarning(user, conversation);
   }
   ```

---

## Summary

The conversation cleanup system provides:

✅ **Automatic expiration** - 30 days from last message
✅ **Complete cleanup** - Conversations + messages + images
✅ **User association** - Both user IDs in image paths
✅ **Easy execution** - npm script + cron scheduling
✅ **Detailed logging** - Full visibility into cleanup process
✅ **Privacy compliant** - Automatic data deletion
✅ **Cloud optimized** - Prevents orphaned Cloudinary files

For questions or issues, check the troubleshooting section or review the cleanup service code at:
- `/backend/src/services/conversationCleanupService.ts`
- `/backend/src/scripts/cleanupConversations.ts`
