/**
 * userLocationMarker - Shared "you are here" marker visuals for both the
 * Google Maps (AdvancedMarkerElement) and Leaflet (DivIcon) rendering paths.
 *
 * Renders a breathing radar-ping dot, matching the familiar "my location"
 * indicator pattern users already recognise from Google/Apple Maps.
 */

const STYLE_ID = 'user-location-marker-styles';

/** Injects the pulse/entrance keyframes once per document. */
export function injectUserLocationMarkerStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes ulmRadarPing {
      0% { transform: scale(0.5); opacity: 0.55; }
      70% { opacity: 0; }
      100% { transform: scale(1); opacity: 0; }
    }
    @keyframes ulmEnter {
      0% { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .user-location-marker {
      position: relative;
      width: 22px;
      height: 22px;
      cursor: pointer;
      animation: ulmEnter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    .user-location-marker .ulm-ping {
      position: absolute;
      inset: -16px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(2, 82, 205, 0.45) 0%, rgba(2, 82, 205, 0.15) 60%, rgba(2, 82, 205, 0) 100%);
      animation: ulmRadarPing 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
    .user-location-marker .ulm-ping-delay {
      animation-delay: 1.1s;
    }
    .user-location-marker .ulm-dot {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: linear-gradient(135deg, #0066FF 0%, #0252CD 100%);
      border: 3px solid #ffffff;
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
      transition: transform 0.15s ease-out;
    }
    .user-location-marker:hover .ulm-dot {
      transform: scale(1.12);
    }
    .user-location-marker-icon {
      background: transparent !important;
      border: none !important;
    }
  `;
  document.head.appendChild(style);
}

/** Inline HTML for the marker — shared string so both map engines render identically. */
export function userLocationMarkerHtml(label: string): string {
  return `
    <div class="user-location-marker" role="img" aria-label="${label}" title="${label}">
      <div class="ulm-ping"></div>
      <div class="ulm-ping ulm-ping-delay"></div>
      <div class="ulm-dot"></div>
    </div>
  `;
}

/** Builds a detached DOM node for use as Google Maps AdvancedMarkerElement content. */
export function createUserLocationMarkerElement(label: string): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = userLocationMarkerHtml(label).trim();
  return wrapper.firstElementChild as HTMLDivElement;
}
