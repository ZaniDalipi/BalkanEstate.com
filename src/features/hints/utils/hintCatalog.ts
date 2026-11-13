/**
 * Every tip the app can give: things people can do that are easy to miss
 * (a long press, a swipe, a hidden tab). Each tip is one short sentence of
 * text, shown at most once on its own (see pickHint) and always listed in the
 * Tips panel.
 */

/** Where a tip applies. `global` tips are true on every page. */
export type HintPage = 'property' | 'search' | 'global';

/**
 * Which devices the tip is true for. `touch` is a phone or tablet,
 * `pointer` a mouse or trackpad, `installed` the app added to the home screen
 * on a touch device.
 */
export type HintDevice = 'any' | 'touch' | 'pointer' | 'installed';

export interface HintDef {
  id: string;
  page: HintPage;
  device: HintDevice;
  /** i18n key in the `common` namespace. */
  key: string;
  /** English text, used as the i18n defaultValue. */
  text: string;
}

const hint = (id: string, page: HintPage, device: HintDevice, text: string): HintDef => ({
  id,
  page,
  device,
  key: `hints.items.${id}`,
  text,
});

/** In the order they are offered: the most useful first. */
export const HINTS: readonly HintDef[] = [
  // A listing
  hint('agentHold', 'property', 'touch', "Press and hold the agent's photo in the bar at the bottom to see their other listings. A tap opens their profile."),
  hint('photoOpenTouch', 'property', 'touch', 'Tap the photos to open them full screen, then swipe between them.'),
  hint('photoOpenPointer', 'property', 'pointer', 'Click the photos to open them full screen, then use the arrow keys to move between them.'),
  hint('sectionRail', 'property', 'touch', 'Hold the glass rail at the edge of the screen and slide your thumb to jump straight to a section.'),
  hint('photoZoomTouch', 'property', 'touch', 'In full screen, double-tap a photo to zoom in, and swipe down to close it.'),
  hint('photoZoomPointer', 'property', 'pointer', 'In full screen, double-click a photo or press + and − to zoom. Esc closes it.'),
  hint('photoDraw', 'property', 'any', 'In full screen, use the pen to draw on a photo and send it to the seller with your question.'),
  // Search
  hint('drawArea', 'search', 'any', 'Use the pencil on the map to draw your own area and see only the listings inside it.'),
  hint('cardSwipe', 'search', 'touch', "Swipe a listing's photo left or right to see more photos without opening it."),
  hint('saveSearch', 'search', 'any', "Save your search and we'll tell you when new listings match it."),
  hint('mapOptions', 'search', 'any', 'Map options switch to satellite or street view and can show climate risks such as flood or heat.'),
  hint('listFold', 'search', 'pointer', "Use the tab on the map's edge to fold the list away and see the whole map."),
  hint('aiSwipe', 'search', 'any', 'Ask AI Search in your own words. In your matches, swipe right to save a home and left to skip it.'),
  // Everywhere
  hint('findTips', 'global', 'any', 'All tips are in the menu under Tips, whenever you want them.'),
  hint('swipeBack', 'global', 'installed', 'Swipe in from the left edge of the screen to go back.'),
  hint('submitShortcut', 'global', 'pointer', 'In message and contact forms, press Ctrl + Enter (⌘ + Enter on a Mac) to send.'),
];
