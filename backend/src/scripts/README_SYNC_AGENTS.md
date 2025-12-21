# Agent Sync Script

## Purpose

This script fixes data inconsistency where users with `role='agent'` in the User collection don't have corresponding records in the Agent collection. This causes agents to:
- Not appear in the agents list page
- Be missing from agent-specific queries
- Have incomplete agent profile data

## When to Use

Run this script if:
1. Agents are showing in the app but not in the agents page
2. After migrating or restoring database data
3. After manual database modifications
4. If you notice agents missing from the Agent collection

## How to Run

```bash
cd backend
npm run sync:agents
```

## What It Does

1. **Finds all agent users**: Queries User collection for `role='agent'`
2. **Creates missing Agent records**: For users without Agent records
3. **Updates existing Agent records**: Syncs latest data from User to Agent
4. **Generates Agent IDs**: Creates unique agent IDs for users missing them
5. **Updates agency membership**: Ensures agents are in their agency's agents array
6. **Provides detailed logging**: Shows exactly what was synced

## Output

The script provides a detailed summary:
```
📊 Found X users with agent role
  ✅ Created agent record for user@example.com (AG-1234567890-ABC123)
  ✏️  Updated agent record for another@example.com (AG-0987654321-XYZ789)
  ⏭️  Agent record already up-to-date for existing@example.com

============================================================
📈 SYNC SUMMARY
============================================================
Total agent users found:     X
New agent records created:   Y
Existing records updated:    Z
Records already up-to-date:  W
Errors:                      0
============================================================

✅ Agent sync completed successfully!
All agents should now appear in the agents page.
```

## Safety

- **Non-destructive**: Never deletes data, only creates or updates
- **Idempotent**: Safe to run multiple times
- **Transaction-free**: Processes one agent at a time (won't rollback on partial failure)
- **Error handling**: Continues processing other agents if one fails

## Example Use Case

**Problem**: User `zano@zano.com` is an agent affiliated with "Zano Realestate" but doesn't appear in the agents page or database Agent collection.

**Solution**:
```bash
npm run sync:agents
```

**Result**: Agent record created with all data synced from User collection, agent now appears in agents list.

## Technical Details

- Creates Agent records with default values (rating: 0, totalSales: 0, etc.)
- Generates agent IDs in format: `AG-{timestamp}-{random}`
- Preserves existing agent data when updating
- Updates agency membership arrays automatically
- Uses mongoose lean() queries for better performance

## Troubleshooting

**MongoDB connection error**: Ensure `MONGO_URI` is set in `.env` file

**License number conflicts**: Script checks for duplicate license numbers and reports errors

**Agency not found**: If user has invalid `agencyId`, agent is created as "Independent Agent"

## Related Scripts

- `npm run remove:agents` - Remove all agent records (destructive)
- `npm run seed:agencies` - Seed sample agency data
- `npm run test:agencies` - Test agency access and permissions
