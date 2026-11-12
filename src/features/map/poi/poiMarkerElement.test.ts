import { describe, it, expect } from 'vitest';
import { buildPoiElement } from './poiMarkerElement';

describe('buildPoiElement', () => {
  it('shows the name as text, never as HTML', () => {
    const el = buildPoiElement({ id: 'x', name: '<img src=x onerror=alert(1)>', category: 'dining', lat: 1, lng: 1, rank: 1 });
    expect(el.querySelector('img[src="x"]')).toBeNull();
    expect(el.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(el.getAttribute('aria-label')).toBe('<img src=x onerror=alert(1)>');
  });
  it('opens its name on tap and closes it on the next', () => {
    const el = buildPoiElement({ id: 'x', name: 'Cafe', category: 'dining', lat: 1, lng: 1, rank: 1 });
    const label = el.lastElementChild as HTMLElement;
    expect(label.style.display).toBe('none');
    el.click(); expect(label.style.display).toBe('block');
    el.click(); expect(label.style.display).toBe('none');
  });
});
