/**
 * userLocationMarker - Shared "you are here" marker visuals for both the
 * Google Maps (AdvancedMarkerElement) and Leaflet (DivIcon) rendering paths.
 *
 * Renders a distinct animated person avatar (deliberately different from the
 * property price-pin markers) with a breathing radar ping, so users instantly
 * recognise "this is me" versus a listing.
 */

const STYLE_ID = 'user-location-marker-styles';

// Marker footprint in px — exported so the Leaflet DivIcon can size/anchor to match.
export const USER_LOCATION_MARKER_SIZE = 40;

/**
 * Zoom-proportional scale factor for the marker. Full size at street-level
 * zoom; shrinks toward a floor as the user zooms out, so the marker stays
 * proportionate and doesn't blanket the map at country/continent scale.
 * Applied as a CSS `transform: scale(...)` on the inner `.ulm-scale` layer.
 */
export function userLocationScaleForZoom(zoom: number): number {
  const MIN_SCALE = 0.4; // ~16px at continent zoom
  const MAX_SCALE = 1; // full 40px at street zoom
  const SMALL_AT = 6; // zoom <= 6 → smallest
  const FULL_AT = 13; // zoom >= 13 → full size

  if (!Number.isFinite(zoom) || zoom >= FULL_AT) return MAX_SCALE;
  if (zoom <= SMALL_AT) return MIN_SCALE;
  const ratio = (zoom - SMALL_AT) / (FULL_AT - SMALL_AT);
  return MIN_SCALE + ratio * (MAX_SCALE - MIN_SCALE);
}

/** Injects the pulse/entrance keyframes once per document. */
export function injectUserLocationMarkerStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes ulmRadarPing {
      0% { transform: scale(0.45); opacity: 0.6; }
      70% { opacity: 0; }
      100% { transform: scale(1.15); opacity: 0; }
    }
    @keyframes ulmEnter {
      0% { transform: scale(0) translateY(6px); opacity: 0; }
      100% { transform: scale(1) translateY(0); opacity: 1; }
    }
    @keyframes ulmBob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    /* Outer element handed to the map marker — MUST stay a static, fixed-size,
       transform-free box so map engines (esp. Google AdvancedMarkerElement on a
       vector map) don't composite our animation transforms with their own zoom
       transforms, which made the marker visually scale on zoom. All animations
       live on the inner children below. */
    .user-location-marker {
      position: relative;
      width: ${USER_LOCATION_MARKER_SIZE}px;
      height: ${USER_LOCATION_MARKER_SIZE}px;
      cursor: pointer;
      transform: none;
    }
    /* Zoom-proportional scale layer — driven by the --ulm-zoom-scale custom
       property set on the marker element as the map zoom changes. Kept separate
       from the entrance/bob animations so they never fight over transform. */
    .user-location-marker .ulm-scale {
      position: absolute;
      inset: 0;
      transform: scale(var(--ulm-zoom-scale, 1));
      transform-origin: center;
      transition: transform 0.2s ease-out;
    }
    .user-location-marker .ulm-inner {
      position: absolute;
      inset: 0;
      animation: ulmEnter 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    .user-location-marker .ulm-ping {
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(124, 58, 237, 0.45) 0%, rgba(124, 58, 237, 0.15) 55%, rgba(124, 58, 237, 0) 72%);
      animation: ulmRadarPing 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
      pointer-events: none;
    }
    .user-location-marker .ulm-ping-delay {
      animation-delay: 1.2s;
    }
    .user-location-marker .ulm-avatar {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 55%, #4F46E5 100%);
      border: 3px solid #ffffff;
      box-shadow: 0 3px 10px rgba(79, 70, 229, 0.5), 0 1px 3px rgba(0, 0, 0, 0.35);
      animation: ulmBob 2.6s ease-in-out infinite;
      transition: transform 0.15s ease-out;
    }
    .user-location-marker:hover .ulm-avatar {
      transform: scale(1.12);
    }
    .user-location-marker .ulm-avatar svg {
      width: 60%;
      height: 60%;
      display: block;
    }
    .user-location-marker-icon {
      background: transparent !important;
      border: none !important;
    }
  `;
  document.head.appendChild(style);
}

// White person/avatar glyph (head + shoulders) shown inside the badge.
const PERSON_SVG =
  '<svg viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
  '<path d="M12 12.5a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Z"/>' +
  '<path d="M12 14c-3.86 0-7 2.35-7 5.25 0 .41.34.75.75.75h12.5c.41 0 .75-.34.75-.75C19 16.35 15.86 14 12 14Z"/>' +
  '</svg>';

/** Inline HTML for the marker — shared string so both map engines render identically. */
export function userLocationMarkerHtml(label: string): string {
  return `
    <div class="user-location-marker" role="img" aria-label="${label}" title="${label}">
      <div class="ulm-scale">
        <div class="ulm-inner">
          <div class="ulm-ping"></div>
          <div class="ulm-ping ulm-ping-delay"></div>
          <div class="ulm-avatar">${PERSON_SVG}</div>
        </div>
      </div>
    </div>
  `;
}

/** Builds a detached DOM node for use as Google Maps AdvancedMarkerElement content. */
export function createUserLocationMarkerElement(label: string): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = userLocationMarkerHtml(label).trim();
  return wrapper.firstElementChild as HTMLDivElement;
}
