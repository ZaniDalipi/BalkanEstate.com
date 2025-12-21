# Cron Job Setup for Sold Properties Cleanup

This document explains how to set up a cron job to automatically delete/archive properties that have been sold for more than 24 hours.

## Script

The cleanup script is located at: `src/scripts/archiveSoldProperties.ts`

You can run it manually with:
```bash
npm run cleanup:sold
```

## Automated Cron Job Setup

### Option 1: Using system cron (Linux/Mac)

1. Open your crontab editor:
```bash
crontab -e
```

2. Add this line to run the cleanup every hour:
```bash
0 * * * * cd /path/to/BalkanEstateWebVersion/backend && npm run cleanup:sold >> /var/log/balkan-estate-cleanup.log 2>&1
```

3. Or run it every 6 hours:
```bash
0 */6 * * * cd /path/to/BalkanEstateWebVersion/backend && npm run cleanup:sold >> /var/log/balkan-estate-cleanup.log 2>&1
```

4. Or run it once per day at 2 AM:
```bash
0 2 * * * cd /path/to/BalkanEstateWebVersion/backend && npm run cleanup:sold >> /var/log/balkan-estate-cleanup.log 2>&1
```

### Option 2: Using node-cron (within the app)

Install node-cron:
```bash
npm install node-cron @types/node-cron
```

Then add to your server.ts:
```typescript
import cron from 'node-cron';
import { exec } from 'child_process';

// Run cleanup every hour
cron.schedule('0 * * * *', () => {
  console.log('Running sold properties cleanup...');
  exec('npm run cleanup:sold', (error, stdout, stderr) => {
    if (error) {
      console.error(`Cleanup error: ${error}`);
      return;
    }
    console.log(stdout);
  });
});
```

### Option 3: Using PM2 (recommended for production)

If you're using PM2 to manage your Node.js process:

1. Install PM2 if not already installed:
```bash
npm install -g pm2
```

2. Create a PM2 ecosystem file (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'balkan-estate-api',
    script: 'dist/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }, {
    name: 'sold-properties-cleanup',
    script: 'dist/scripts/archiveSoldProperties.js',
    cron_restart: '0 */6 * * *', // Every 6 hours
    autorestart: false,
    watch: false,
  }]
};
```

3. Start with PM2:
```bash
pm2 start ecosystem.config.js
```

## What the Script Does

1. Connects to MongoDB
2. Finds all properties with `status: 'sold'` and `soldAt` older than 24 hours
3. Deletes those properties from the database
4. Logs the results

## Customization

If you want to archive instead of delete, modify the script at `src/scripts/archiveSoldProperties.ts`:

1. Add 'archived' to the Property model status enum
2. Update the script to set `status: 'archived'` instead of deleting

## Monitoring

Check the logs to ensure the cron job is running:
```bash
# If using system cron
tail -f /var/log/balkan-estate-cleanup.log

# If using PM2
pm2 logs sold-properties-cleanup
```
