# Component Refactoring Plan

## Overview

This document outlines the plan to decompose large components (>200 lines) into smaller, maintainable components following the Single Responsibility Principle.

## Target Files

| File | Current Lines | Target | Priority |
|------|---------------|--------|----------|
| PropertyDetailsPage.tsx | 1,230 | <200 each | CRITICAL |
| GeminiDescriptionGenerator.tsx | 1,239 | <200 each | CRITICAL |
| SearchPage.tsx | 745 | <200 each | HIGH |
| MapComponent.tsx | 705 | <200 each | HIGH |
| AgencyManager.tsx | 767 | <200 each | MEDIUM |
| PropertyManager.tsx | 755 | <200 each | MEDIUM |

---

## 1. PropertyDetailsPage (1,230 lines → 7 components)

### Current Structure
```
PropertyDetailsPage.tsx (1,230 lines)
├── ImageEditorModal (237 lines)
├── parseMarkdown (35 lines)
├── NeighborhoodInsights (140 lines)
├── DetailItem (12 lines)
├── Thumbnail (30 lines)
├── SharePopover (66 lines)
└── PropertyDetailsPage (678 lines)
```

### Refactored Structure
```
src/components/property/
├── ImageEditorModal.tsx (✅ DONE - 237 lines)
├── NeighborhoodInsights.tsx (TODO - 140 lines)
├── SharePopover.tsx (TODO - 66 lines)
├── PropertyHeader.tsx (TODO - ~80 lines)
│   ├── Back button
│   ├── Title
│   ├── Address
│   └── Actions (share, edit, favorite)
├── PropertyGallery.tsx (TODO - ~150 lines)
│   ├── Main image
│   ├── Thumbnails
│   ├── Gallery controls
│   └── Image viewer modal
├── PropertyInfo.tsx (TODO - ~180 lines)
│   ├── Price
│   ├── Key details (beds, baths, sqft)
│   ├── Description
│   └── Features list
├── PropertyContact.tsx (TODO - ~100 lines)
│   ├── Agent info
│   ├── Contact form
│   └── Schedule viewing
├── PropertyLocation.tsx (TODO - ~120 lines)
│   ├── Map
│   ├── Address details
│   └── Neighborhood insights
└── PropertyDetailsPage.tsx (TODO - ~80 lines)
    └── Orchestrates all sub-components
```

### Component Responsibilities

#### PropertyHeader
- Display property title and address
- Back navigation
- Action buttons (share, edit, favorite)
- < 100 lines

#### PropertyGallery
- Image carousel/grid
- Thumbnail navigation
- Fullscreen image viewer
- Image editor integration
- < 150 lines

#### PropertyInfo
- Price and price per sqft
- Key details (beds, baths, sqft, etc.)
- Property description
- Features and amenities list
- < 200 lines

#### PropertyContact
- Agent/seller information
- Contact form
- Schedule viewing button
- Message agent functionality
- < 100 lines

#### PropertyLocation
- Interactive map
- Address details
- Neighborhood insights
- Nearby amenities
- < 150 lines

#### PropertyDetailsPage (Main)
- Fetch property data
- Layout orchestration
- Error handling
- Loading states
- < 100 lines

---

## 2. GeminiDescriptionGenerator (1,239 lines → 6 components)

### Current Issues
- Single massive component
- Mixed concerns (UI + AI logic + state management)
- Difficult to test
- Poor reusability

### Refactored Structure
```
src/components/gemini/
├── GeminiContext.tsx (~80 lines)
│   └── State management for AI generation
├── GeminiPromptForm.tsx (~150 lines)
│   ├── Property details input
│   ├── Tone selection
│   └── Options configuration
├── GeminiOutputDisplay.tsx (~100 lines)
│   ├── Generated description
│   ├── Copy/export actions
│   └── Edit mode
├── GeminiHistoryPanel.tsx (~120 lines)
│   ├── Previous generations
│   ├── Version comparison
│   └── History actions
├── GeminiPreview.tsx (~80 lines)
│   ├── Live preview
│   └── Formatting options
└── GeminiDescriptionGenerator.tsx (~100 lines)
    └── Main orchestrator
```

### Benefits
- Easier to test each component
- Better separation of concerns
- Reusable form components
- Clearer state flow

---

## 3. SearchPage (745 lines → 4 components)

### Refactored Structure
```
src/components/search/
├── SearchFilters.tsx (~180 lines)
│   ├── Filter inputs
│   ├── Price range
│   ├── Property type
│   └── Location search
├── SearchResults.tsx (~150 lines)
│   ├── Property grid/list
│   ├── Sort options
│   └── Pagination
├── SearchMap.tsx (~200 lines)
│   ├── Interactive map
│   ├── Property markers
│   └── Map controls
└── SearchPage.tsx (~150 lines)
    ├── Layout (filters + results + map)
    ├── State management
    └── URL sync
```

---

## 4. MapComponent (705 lines → 3 components)

### Refactored Structure
```
src/components/map/
├── MapControls.tsx (~100 lines)
│   ├── Zoom controls
│   ├── Layer toggle
│   ├── Draw tools
│   └── Search box
├── MapMarkers.tsx (~150 lines)
│   ├── Property markers
│   ├── Cluster management
│   └── Marker popups
└── MapComponent.tsx (~200 lines)
    ├── Map initialization
    ├── Event handlers
    └── State management
```

---

## 5. AgencyManager & PropertyManager

### Common Pattern
Both files (~760 lines each) follow similar structure:
- Large form
- Table/list view
- CRUD operations
- Modal management

### Refactored Structure (Each)
```
src/components/[agency|property]-manager/
├── [Entity]Form.tsx (~180 lines)
├── [Entity]Table.tsx (~150 lines)
├── [Entity]Actions.tsx (~80 lines)
└── [Entity]Manager.tsx (~100 lines)
```

---

## Implementation Strategy

### Phase 1: Extract Utilities & Sub-Components (DONE)
- [x] Extract ImageEditorModal from PropertyDetailsPage
- [x] Extract markdown utilities
- [ ] Extract SharePopover
- [ ] Extract NeighborhoodInsights
- [ ] Extract common UI components

### Phase 2: Create Component Structure
For each large component:
1. Create feature folder
2. Create sub-components
3. Move logic to hooks
4. Update imports
5. Test thoroughly

### Phase 3: Refactor Main Components
1. **PropertyDetailsPage** (CRITICAL)
   - Week 1: Extract sub-components
   - Week 1: Refactor main component
   - Week 1: Testing

2. **GeminiDescriptionGenerator** (CRITICAL)
   - Week 2: Extract sub-components
   - Week 2: Refactor with context
   - Week 2: Testing

3. **SearchPage** (HIGH)
   - Week 3: Extract filters and results
   - Week 3: Refactor main component
   - Week 3: Testing

4. **MapComponent** (HIGH)
   - Week 3: Extract controls and markers
   - Week 3: Refactor main component
   - Week 3: Testing

5. **Managers** (MEDIUM)
   - Week 4: Refactor both managers
   - Week 4: Testing

### Phase 4: Create UI Component Library
Extract reusable components:
- Button variants
- Form inputs
- Cards
- Modals
- Tables
- Badges
- etc.

---

## Component Size Guidelines

### Target Sizes
- **Page Components**: < 150 lines
- **Feature Components**: < 200 lines
- **UI Components**: < 100 lines
- **Utility Functions**: < 50 lines

### When to Split
Split a component if:
- > 200 lines
- Multiple responsibilities
- Difficult to test
- Low reusability
- Complex state management

### Signs of Good Decomposition
- ✅ Single responsibility
- ✅ Clear prop interface
- ✅ Easy to test
- ✅ Reusable
- ✅ Self-documenting
- ✅ < 200 lines

---

## Benefits of Decomposition

### Maintainability
- Easier to understand
- Easier to modify
- Easier to debug
- Clear dependencies

### Testability
- Unit test each component
- Mock dependencies easily
- Faster test execution
- Better coverage

### Reusability
- Components used across app
- Consistent UI
- Faster development
- Smaller bundle (code splitting)

### Performance
- Smaller components re-render less
- Better code splitting
- Lazy loading
- Optimized builds

### Developer Experience
- Clearer code structure
- Faster navigation
- Better IntelliSense
- Easier onboarding

---

## Testing Strategy

### Unit Tests
Each component should have:
- Rendering tests
- Interaction tests
- Edge case tests
- Accessibility tests

### Integration Tests
Test component composition:
- Parent-child communication
- State flow
- Event handling
- Data fetching

### E2E Tests
Test critical user flows:
- Property search
- Property details view
- Contact agent
- Save favorites

---

## Progress Tracking

### Completed ✅
- [x] ImageEditorModal extracted
- [x] Markdown utilities created
- [x] Refactoring plan documented

### In Progress 🔄
- [ ] PropertyDetailsPage decomposition
- [ ] SharePopover extraction
- [ ] NeighborhoodInsights extraction

### Pending ⏳
- [ ] GeminiDescriptionGenerator decomposition
- [ ] SearchPage decomposition
- [ ] MapComponent decomposition
- [ ] Manager components decomposition
- [ ] UI component library creation

---

## Notes

- All extracted components should use the new TanStack Query hooks
- Follow the existing TypeScript patterns
- Use Tailwind CSS for styling
- Add JSDoc comments for public APIs
- Keep components pure when possible
- Use React.memo for expensive components
- Implement proper error boundaries

---

**Status:** In Progress
**Last Updated:** 2025-11-28
**Next Review:** After PropertyDetailsPage completion
