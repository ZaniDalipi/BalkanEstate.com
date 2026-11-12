import { softIconHtml } from '@/src/shared/illustrations';
import { POI_STYLE, type Poi } from './poiTypes';

/**
 * The DOM for one place on the map, shared by the Google and Leaflet maps.
 * The name goes in through `textContent` / `aria-label`, never as HTML, because
 * it comes from OpenStreetMap. Tapping the pin opens its name; the 44px outer
 * box is the touch target.
 */
export const buildPoiElement = (poi: Poi): HTMLElement => {
  const { icon, color } = POI_STYLE[poi.category];

  const outer = document.createElement('div');
  outer.setAttribute('role', 'button');
  outer.setAttribute('aria-label', poi.name);
  outer.tabIndex = 0;
  outer.title = poi.name;
  outer.style.cssText = 'width:44px;height:44px;display:flex;align-items:center;justify-content:center;position:relative;cursor:pointer;';

  const pin = document.createElement('div');
  pin.style.cssText = `width:30px;height:30px;border-radius:50%;background:#fff;border:2px solid ${color};box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;`;
  pin.innerHTML = softIconHtml(icon, 18, 'vertical-align:middle;');

  const label = document.createElement('div');
  label.textContent = poi.name;
  label.style.cssText = 'display:none;position:absolute;bottom:100%;left:50%;transform:translateX(-50%);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#111827;color:#fff;font:600 12px/1.2 system-ui,sans-serif;padding:4px 8px;border-radius:8px;pointer-events:none;';

  label.style.display = 'none';

  const toggle = (e: Event) => {
    e.stopPropagation();
    label.style.display = label.style.display === 'none' ? 'block' : 'none';
  };
  outer.addEventListener('click', toggle);
  outer.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') toggle(e); });

  outer.append(pin, label);
  return outer;
};
