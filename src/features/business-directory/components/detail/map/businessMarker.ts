/**
 * The business's badge on the map: a white tile holding its logo (or initial)
 * on a stem down to the spot, with its name in a frosted label beneath — built with DOM APIs, so names
 * and URLs are never parsed as HTML.
 */
export function createBusinessMarker(name: string, logoUrl: string | undefined): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:0;pointer-events:none;';

  const pin = document.createElement('div');
  pin.style.cssText =
    'width:44px;height:44px;border-radius:14px;background:#fff;border:3px solid #0A84FF;box-shadow:0 10px 24px -8px rgba(2,82,205,.55);display:flex;align-items:center;justify-content:center;overflow:hidden;';
  if (logoUrl) {
    const img = document.createElement('img');
    img.src = logoUrl;
    img.alt = '';
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;padding:3px;';
    pin.appendChild(img);
  } else {
    pin.textContent = name.trim().charAt(0).toUpperCase();
    pin.style.font = '700 19px system-ui,-apple-system,sans-serif';
    pin.style.color = '#0252CD';
  }

  // A stem down to the spot, so the badge floats above the building instead of hiding it.
  const stem = document.createElement('div');
  stem.style.cssText = 'width:3px;height:46px;background:linear-gradient(#0A84FF,rgba(10,132,255,.55));border-radius:2px;';
  const dot = document.createElement('div');
  dot.style.cssText = 'width:10px;height:10px;margin-top:-3px;border-radius:9999px;background:#0A84FF;border:2px solid #fff;box-shadow:0 0 0 4px rgba(10,132,255,.25);';

  const label = document.createElement('div');
  label.textContent = name;
  label.style.cssText =
    'max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:4px 10px;border-radius:9999px;background:rgba(255,255,255,.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 4px 14px rgba(15,23,42,.18);font:600 12px system-ui,-apple-system,sans-serif;color:#0f172a;';

  label.style.marginTop = '6px';
  root.append(pin, stem, dot, label);
  return root;
}
