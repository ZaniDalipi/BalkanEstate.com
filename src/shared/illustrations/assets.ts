// The one place that knows where illustration files live. Components, tests
// and HTML strings handed to map libraries all build their URLs here.

import type { CategoryPictureName, NavPictureName, SoftIconName, SpecIllustrationName } from './types';

export const ILLUSTRATIONS_BASE = '/images/illustrations';

export const softIconUrl = (name: SoftIconName) => `${ILLUSTRATIONS_BASE}/soft/${name}.svg`;
export const specIllustrationUrl = (name: SpecIllustrationName) => `${ILLUSTRATIONS_BASE}/spec/${name}.svg`;
export const navPictureUrl = (name: NavPictureName) => `${ILLUSTRATIONS_BASE}/nav/${name}.webp`;
export const categoryPictureUrl = (name: CategoryPictureName) => `${ILLUSTRATIONS_BASE}/categories/${name}.webp`;

/**
 * A soft icon as an HTML string, for places that take markup rather than
 * React (Leaflet/MapLibre popups and markers). Decorative, and hides itself if
 * the file fails to load, like the React components.
 */
export const softIconHtml = (name: SoftIconName, size = 16, style = '') =>
  `<img src="${softIconUrl(name)}" alt="" aria-hidden="true" width="${size}" height="${size}" ` +
  `style="display:inline-block;vertical-align:-3px;${style}" onerror="this.style.visibility='hidden'">`;
