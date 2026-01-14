# BalkanEstate Translation Workflow Guide

## Overview

BalkanEstate uses **i18next** with **react-i18next** for internationalization, supporting 10 languages across the Balkans region.

---

## Supported Languages

| Code | Language | Native Name | Flag |
|------|----------|-------------|------|
| `en` | English | English | 🇬🇧 |
| `sq` | Albanian | Shqip | 🇦🇱 |
| `sr` | Serbian | Српски | 🇷🇸 |
| `mk` | Macedonian | Македонски | 🇲🇰 |
| `bs` | Bosnian | Bosanski | 🇧🇦 |
| `hr` | Croatian | Hrvatski | 🇭🇷 |
| `bg` | Bulgarian | Български | 🇧🇬 |
| `ro` | Romanian | Română | 🇷🇴 |
| `el` | Greek | Ελληνικά | 🇬🇷 |
| `me` | Montenegrin | Crnogorski | 🇲🇪 |

---

## File Structure

```
src/i18n/
├── index.ts                    # Main i18n configuration
└── locales/
    ├── en/                     # English (default/fallback)
    │   ├── common.json         # Common UI elements
    │   ├── nav.json            # Navigation
    │   ├── property.json       # Property-related text
    │   ├── auth.json           # Authentication
    │   ├── search.json         # Search functionality
    │   ├── messages.json       # Messaging
    │   ├── footer.json         # Footer content
    │   ├── newsletter.json     # Newsletter
    │   ├── calculators.json    # Financial calculators
    │   ├── pricing.json        # Pricing plans
    │   ├── validation.json     # Form validation
    │   ├── admin.json          # Admin panel
    │   ├── account.json        # Account settings
    │   ├── seller.json         # Seller dashboard
    │   ├── agents.json         # Agents page
    │   ├── modals.json         # Modal dialogs
    │   ├── payment.json        # Payment flow
    │   ├── saved.json          # Saved items
    │   ├── exploreCities.json  # City exploration
    │   ├── analytics.json      # Analytics
    │   ├── subscription.json   # Subscription
    │   ├── agencies.json       # Agencies
    │   ├── agencyDetails.json  # Agency details
    │   ├── agentProfile.json   # Agent profiles
    │   ├── newListing.json     # Create listing
    │   ├── valuation.json      # Property valuation
    │   └── howItWorks.json     # How it works page
    ├── sq/                     # Albanian (same structure)
    ├── sr/                     # Serbian
    ├── mk/                     # Macedonian
    ├── bs/                     # Bosnian
    ├── hr/                     # Croatian
    ├── bg/                     # Bulgarian
    ├── ro/                     # Romanian
    ├── el/                     # Greek
    └── me/                     # Montenegrin
```

---

## Translation File Format (JSON)

Translation files use nested JSON structure:

```json
{
  "sectionName": {
    "title": "Section Title",
    "subtitle": "Section subtitle text",
    "items": {
      "item1": {
        "title": "Item 1 Title",
        "description": "Item 1 description"
      },
      "item2": {
        "title": "Item 2 Title",
        "description": "Item 2 description"
      }
    }
  }
}
```

### Example: `howItWorks.json`

```json
{
  "tabs": {
    "gettingStarted": "Getting Started",
    "premiumFeatures": "Premium Features",
    "forAgencies": "For Agencies"
  },
  "premiumFeatures": {
    "title": "Unlock Premium Features",
    "subtitle": "Take your real estate experience to the next level",
    "aiSearch": {
      "title": "AI-Powered Search",
      "badge": "PRO",
      "desc": "Describe your dream property in natural language",
      "features": {
        "natural": "Natural language queries",
        "smart": "Smart property matching"
      }
    }
  }
}
```

---

## How to Reference Translations in Components

### 1. Import the Hook

```tsx
import { useTranslation } from 'react-i18next';
```

### 2. Initialize in Component

```tsx
const MyComponent = () => {
  const { t } = useTranslation();

  // ...
};
```

### 3. Reference Translation Keys

**Syntax:** `t('namespace:key.nested.path')`

```tsx
// Simple key
{t('howItWorks:tabs.premiumFeatures')}
// Output: "Premium Features"

// Nested key
{t('howItWorks:premiumFeatures.title')}
// Output: "Unlock Premium Features"

// Deeply nested
{t('howItWorks:premiumFeatures.aiSearch.features.natural')}
// Output: "Natural language queries"
```

### 4. Full Component Example

```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';

const PremiumFeaturesSection = () => {
  const { t } = useTranslation();

  return (
    <section>
      {/* Section header */}
      <h1>{t('howItWorks:premiumFeatures.title')}</h1>
      <p>{t('howItWorks:premiumFeatures.subtitle')}</p>

      {/* Feature card */}
      <div className="feature-card">
        <span className="badge">
          {t('howItWorks:premiumFeatures.aiSearch.badge')}
        </span>
        <h2>{t('howItWorks:premiumFeatures.aiSearch.title')}</h2>
        <p>{t('howItWorks:premiumFeatures.aiSearch.desc')}</p>

        {/* Feature list */}
        <ul>
          <li>{t('howItWorks:premiumFeatures.aiSearch.features.natural')}</li>
          <li>{t('howItWorks:premiumFeatures.aiSearch.features.smart')}</li>
        </ul>
      </div>
    </section>
  );
};

export default PremiumFeaturesSection;
```

---

## Adding New Translations

### Step 1: Add to English First

Always start with `en/` as the source of truth:

```json
// src/i18n/locales/en/howItWorks.json
{
  "newSection": {
    "title": "New Section Title",
    "description": "Description text here"
  }
}
```

### Step 2: Translate to All Languages

Copy the structure to each language file and translate:

```json
// src/i18n/locales/sq/howItWorks.json (Albanian)
{
  "newSection": {
    "title": "Titulli i Seksionit të Ri",
    "description": "Teksti i përshkrimit këtu"
  }
}
```

### Step 3: Use in Component

```tsx
<h1>{t('howItWorks:newSection.title')}</h1>
<p>{t('howItWorks:newSection.description')}</p>
```

---

## Adding a New Namespace

### Step 1: Create JSON Files

Create the new namespace file in each language folder:

```
src/i18n/locales/en/myNewNamespace.json
src/i18n/locales/sq/myNewNamespace.json
src/i18n/locales/sr/myNewNamespace.json
... (all 10 languages)
```

### Step 2: Import in `src/i18n/index.ts`

```typescript
// Add imports for each language
import enMyNewNamespace from './locales/en/myNewNamespace.json';
import sqMyNewNamespace from './locales/sq/myNewNamespace.json';
// ... etc

// Add to resources object
const resources = {
  en: {
    // ... existing namespaces
    myNewNamespace: enMyNewNamespace,
  },
  sq: {
    // ... existing namespaces
    myNewNamespace: sqMyNewNamespace,
  },
  // ... repeat for all languages
};

// Add namespace to the ns array in init()
i18n.init({
  // ...
  ns: [
    'common', 'nav', 'property', /* ... existing ... */,
    'myNewNamespace'  // Add here
  ],
});
```

### Step 3: Use in Components

```tsx
{t('myNewNamespace:someKey')}
```

---

## Interpolation (Dynamic Values)

### In JSON:
```json
{
  "greeting": "Hello, {{name}}!",
  "itemCount": "You have {{count}} items"
}
```

### In Component:
```tsx
{t('common:greeting', { name: 'John' })}
// Output: "Hello, John!"

{t('common:itemCount', { count: 5 })}
// Output: "You have 5 items"
```

---

## Pluralization

### In JSON:
```json
{
  "property": "property",
  "property_plural": "properties",
  "itemCount": "{{count}} property",
  "itemCount_plural": "{{count}} properties"
}
```

### In Component:
```tsx
{t('common:itemCount', { count: 1 })}
// Output: "1 property"

{t('common:itemCount', { count: 5 })}
// Output: "5 properties"
```

---

## Language Switching

### Programmatic Change

```tsx
import { changeLanguage } from '../src/i18n';

// Change to Albanian
changeLanguage('sq');

// Change to Serbian
changeLanguage('sr');
```

### Get Current Language

```tsx
import { getCurrentLanguage } from '../src/i18n';

const currentLang = getCurrentLanguage(); // e.g., 'en'
```

---

## Best Practices

### 1. Keep Keys Organized
```json
// Good: Grouped by feature
{
  "search": {
    "placeholder": "...",
    "button": "...",
    "filters": { ... }
  }
}

// Bad: Flat structure
{
  "searchPlaceholder": "...",
  "searchButton": "...",
  "searchFilterPrice": "..."
}
```

### 2. Use Descriptive Keys
```json
// Good
{ "submitButton": "Submit" }

// Bad
{ "btn1": "Submit" }
```

### 3. Avoid Special Quotation Marks
For languages like Macedonian, use single quotes instead of special quotation marks:
```json
// Good
{ "example": "Click 'Submit' to continue" }

// Bad (causes JSON parsing errors)
{ "example": "Click „Submit" to continue" }
```

### 4. Always Provide Fallbacks
English is the fallback language. If a key is missing in another language, English will be shown.

### 5. Test All Languages
After adding translations, test by switching languages in the app to ensure all keys render correctly.

---

## Quick Reference

| Task | Example |
|------|---------|
| Import hook | `import { useTranslation } from 'react-i18next';` |
| Initialize | `const { t } = useTranslation();` |
| Simple key | `t('namespace:key')` |
| Nested key | `t('namespace:section.subsection.key')` |
| With variable | `t('namespace:key', { name: 'value' })` |
| Change language | `changeLanguage('sq')` |
| Get current | `getCurrentLanguage()` |

---

## File Locations

- **i18n Config:** `src/i18n/index.ts`
- **Translation Files:** `src/i18n/locales/{lang}/*.json`
- **Language Routing:** `src/utils/languageRouting.ts`

---

## Need Help?

1. Check existing translation files for examples
2. Look at how similar components use translations
3. Ensure JSON is valid (use a JSON validator)
4. Test in browser with different languages selected
