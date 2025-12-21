# Plan: Rotating Promoted Ads During the Day

## Overview

This document outlines the implementation plan for rotating promoted listings throughout the day to ensure fair exposure for all promoted properties and maximize engagement.

## Current State

- **Backend**: Fully implemented promotion tiers (Featured, Highlight, Premium) with priority scoring
- **Auto-refresh**: Highlight tier promotions auto-refresh every 3 days (via `promotionRefreshWorker.ts`)
- **Frontend**: Not yet displaying promoted properties with tier-specific features

## Goals

1. Display promoted properties prominently on homepage and search results
2. Rotate premium tier listings throughout the day for fair exposure
3. Implement visual differentiation between tiers (size, badges, carousels)

---

## Implementation Plan

### Phase 1: Homepage Featured Properties Section

**Create `FeaturedPropertiesSection` component:**

```
Location: /components/BuyerFlow/FeaturedPropertiesSection.tsx
```

**Features:**
- Fetch promoted properties via `getFeaturedProperties()` API
- Display a carousel of featured properties above regular listings
- Show tier badges (Featured, Highlight, Premium)
- Implement automatic rotation every 10-15 seconds (similar to `AdvertisementBanner.tsx`)

**Display Hierarchy:**
1. Premium tier - Largest cards (3x size), rotating banner at top
2. Highlight tier - Medium cards (2.5x size), second row
3. Featured tier - Standard-large cards (2x size), third row

---

### Phase 2: Daily Rotation Algorithm

**Backend: Time-Based Rotation Slots**

Add to `promotionController.ts`:

```typescript
// Divide day into time slots for fair rotation
const TIME_SLOTS = [
  { start: 0, end: 6, name: 'night' },      // 00:00 - 06:00
  { start: 6, end: 12, name: 'morning' },   // 06:00 - 12:00
  { start: 12, end: 18, name: 'afternoon' }, // 12:00 - 18:00
  { start: 18, end: 24, name: 'evening' },  // 18:00 - 24:00
];
```

**Rotation Logic:**
1. Each premium listing gets assigned a primary time slot when purchased
2. Within each slot, rotate based on:
   - `lastDisplayedAt` timestamp (least recently shown first)
   - Random shuffle within priority group
   - View count (lower views get priority boost)

**Database Fields to Add:**

```typescript
// In Promotion model
primaryTimeSlot: 'night' | 'morning' | 'afternoon' | 'evening';
lastDisplayedAt: Date;
dailyImpressions: number;
```

---

### Phase 3: API Enhancements

**New Endpoint: `GET /api/promotions/rotating`**

Returns promoted properties optimized for current time slot:

```typescript
interface RotatingPromotionsResponse {
  hero: Property[];        // 1-2 premium tier for top banner
  featured: Property[];    // 3-6 featured/highlight for carousel
  sidebar: Property[];     // 2-4 for sidebar widget
  timeSlot: string;
  nextRotation: Date;      // When content will refresh
}
```

**Parameters:**
- `city?: string` - Filter by city
- `category?: string` - Property type filter
- `limit?: number` - Max properties per section

---

### Phase 4: Frontend Components

#### 4.1 Hero Rotating Banner

```
Location: /components/promotions/HeroPromotionBanner.tsx
```

**Features:**
- Full-width premium tier display
- Auto-rotate every 8 seconds
- Smooth fade transitions
- Progress dots indicator
- "Premium Listing" badge
- Quick action buttons (Contact, Save, View)

#### 4.2 Featured Carousel

```
Location: /components/promotions/FeaturedCarousel.tsx
```

**Features:**
- Horizontal scroll with navigation arrows
- Show 3-4 cards at a time (responsive)
- Highlight and Featured tier properties
- Image carousel within cards (for Highlight+ tiers)
- Tier badges

#### 4.3 Sidebar Widget

```
Location: /components/promotions/PromotedSidebar.tsx
```

**Features:**
- Compact property cards
- Rotate every 30 seconds
- "Promoted" label
- Show on search results and listing detail pages

---

### Phase 5: Scheduling Worker

**New Worker: `promotionDisplayWorker.ts`**

```typescript
// Run every 15 minutes to update rotation queue
async function updateRotationQueue() {
  const currentHour = new Date().getHours();
  const currentSlot = getTimeSlot(currentHour);

  // Get all active premium promotions
  const premiumPromotions = await Promotion.find({
    promotionTier: 'premium',
    isActive: true,
  });

  // Sort by fair exposure algorithm
  const sortedPromotions = premiumPromotions.sort((a, b) => {
    // Prioritize listings with fewer impressions today
    const aScore = a.dailyImpressions * -1;
    const bScore = b.dailyImpressions * -1;

    // Add time slot bonus
    if (a.primaryTimeSlot === currentSlot) aScore += 100;
    if (b.primaryTimeSlot === currentSlot) bScore += 100;

    return bScore - aScore;
  });

  // Cache rotation order in Redis/memory
  await cacheRotationOrder(sortedPromotions);
}
```

---

### Phase 6: Analytics & Tracking

**Track per-promotion:**
- Impressions per time slot
- Click-through rate by position
- Time-of-day performance
- Conversion rate (inquiries/views)

**Dashboard Updates:**
- Add rotation schedule visualization
- Show exposure metrics by time slot
- Performance comparison charts

---

## Database Schema Additions

```typescript
// promotion.model.ts additions
{
  // Rotation fields
  primaryTimeSlot: {
    type: String,
    enum: ['night', 'morning', 'afternoon', 'evening'],
    default: function() {
      // Auto-assign based on purchase time
      const hour = new Date().getHours();
      if (hour < 6) return 'night';
      if (hour < 12) return 'morning';
      if (hour < 18) return 'afternoon';
      return 'evening';
    }
  },
  lastDisplayedAt: Date,
  dailyImpressions: {
    type: Number,
    default: 0
  },
  impressionsBySlot: {
    night: { type: Number, default: 0 },
    morning: { type: Number, default: 0 },
    afternoon: { type: Number, default: 0 },
    evening: { type: Number, default: 0 }
  }
}
```

---

## Implementation Priority

1. **High Priority (Week 1)**
   - FeaturedPropertiesSection component
   - Basic hero banner with rotation
   - API endpoint for featured properties with time awareness

2. **Medium Priority (Week 2)**
   - Time slot assignment logic
   - Fair rotation algorithm
   - Sidebar widget

3. **Lower Priority (Week 3+)**
   - Analytics dashboard
   - Impression tracking per slot
   - Admin controls for manual rotation overrides

---

## Technical Considerations

### Performance
- Cache rotation order in Redis (5-minute TTL)
- Prefetch next rotation batch
- Use server-side rendering for initial load

### Fairness
- Reset daily impression counters at midnight
- Equal minimum exposure guarantee for all premium listings
- Randomization within priority groups

### Mobile Optimization
- Single prominent card on mobile hero
- Touch-friendly carousel
- Reduced rotation frequency (15s on mobile)

---

## Success Metrics

- **Even Distribution**: All premium listings should get ±10% of average impressions
- **Engagement**: CTR should improve 15-20% with rotation vs static display
- **User Satisfaction**: Survey promoted sellers on perceived fairness
