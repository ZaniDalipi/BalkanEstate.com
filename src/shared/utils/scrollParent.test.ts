import { describe, expect, it } from 'vitest';
import { findScrollParent } from './scrollParent';

describe('findScrollParent', () => {
  it('finds the scrolling ancestor, and null when only the window scrolls', () => {
    const main = document.createElement('main');
    main.style.overflowY = 'auto';
    Object.defineProperty(main, 'scrollHeight', { value: 2000 });
    Object.defineProperty(main, 'clientHeight', { value: 800 });
    const inner = document.createElement('div');
    const card = document.createElement('div');
    inner.appendChild(card);
    main.appendChild(inner);
    document.body.appendChild(main);
    expect(findScrollParent(card)).toBe(main);
    const loose = document.createElement('div');
    document.body.appendChild(loose);
    expect(findScrollParent(loose)).toBeNull();
  });
});
