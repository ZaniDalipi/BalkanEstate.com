# Mock Properties Seeder

This script generates mock property listings for testing purposes.

## What it does

- Finds all users with the role `agent`
- Creates **100 properties per agent** (70 active, 30 sold)
- Generates realistic property data including:
  - Various property types (house, apartment, villa)
  - Random prices (€30,000 - €500,000)
  - Multiple cities in Serbia (Belgrade, Novi Sad, Niš, etc.)
  - Realistic coordinates with slight random offsets for map display
  - Random features, materials, and amenities
  - Sold properties include soldAt timestamps within last 2 years
  - Various property attributes (beds, baths, sqft, etc.)

**Map Display:**
- ✓ Active properties (70%) will appear on the search/buyer map
- ✓ Sold properties (30%) will appear on agency detail pages for sales statistics
- ✓ All properties have valid lat/lng coordinates based on Serbian cities

## Prerequisites

⚠️ **Important**: Make sure MongoDB is running before executing this script.

## How to run

From the backend directory:

```bash
# First, install dependencies if not already installed
npm install

# Then run the seed script
npm run seed:properties
```

## Configuration

You can modify these variables in `seedMockProperties.ts`:

- `propertiesPerAgent`: Number of properties to create per agent (default: 100)
- `activePropCount`: Percentage of active properties (default: 70%)
- `soldPropCount`: Percentage of sold properties (default: 30%)

## Important Notes

⚠️ **Warning**: This script will create a large number of properties. Make sure you have enough database space.

💡 **Tip**: If you want to clear existing properties before seeding, uncomment the line:
```typescript
await Property.deleteMany({});
```

## Output

The script will show:
- Number of agents found
- Properties created per agent
- Total properties created
- Breakdown of active vs sold properties
