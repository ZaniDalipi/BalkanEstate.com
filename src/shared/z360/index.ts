/**
 * Z360 Virtual Tour Integration
 *
 * This module provides utilities and components for integrating
 * Z360 virtual tours (z360-virtual-tour.vercel.app) with BalkanEstate.
 *
 * Usage:
 *
 * 1. Embed a Z360 tour in a property listing:
 *    ```tsx
 *    import { Z360TourEmbed } from '@/shared/z360';
 *
 *    <Z360TourEmbed url="https://z360-virtual-tour.vercel.app/tour/abc123" />
 *    ```
 *
 * 2. Use the specialized input for tour URLs:
 *    ```tsx
 *    import { Z360TourInput } from '@/shared/z360';
 *
 *    <Z360TourInput
 *      value={tourUrl}
 *      onChange={setTourUrl}
 *      showPreview
 *    />
 *    ```
 *
 * 3. Validate and normalize Z360 URLs:
 *    ```ts
 *    import { validateZ360Url, normalizeZ360Url } from '@/shared/z360';
 *
 *    const result = validateZ360Url(url);
 *    if (result.isValid) {
 *      const embedUrl = result.normalizedUrl;
 *    }
 *    ```
 */

// Components
export { Z360TourEmbed } from '../components/Z360TourEmbed';
export { Z360TourInput } from '../components/Z360TourInput';

// Utilities
export {
  Z360_CONFIG,
  isZ360TourUrl,
  extractZ360TourId,
  generateZ360EmbedUrl,
  normalizeZ360Url,
  validateZ360Url,
  generateZ360IframeHtml,
  is360TourUrl,
} from '../utils/z360Tour';
