import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChipScroller from './ChipScroller';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

/** jsdom has no layout: give the row a fixed overflowing size. */
function sizeRow(row: HTMLElement, scrollLeft = 0) {
  Object.defineProperty(row, 'scrollWidth', { configurable: true, value: 900 });
  Object.defineProperty(row, 'clientWidth', { configurable: true, value: 300 });
  row.scrollLeft = scrollLeft;
  row.scrollBy = vi.fn() as unknown as typeof row.scrollBy;
}

describe('ChipScroller', () => {
  it('turns a vertical mouse wheel into sideways scroll and shows the arrows that apply', () => {
    render(<ChipScroller><button type="button">Chip</button></ChipScroller>);
    const row = screen.getByRole('button', { name: 'Chip' }).parentElement as HTMLElement;
    sizeRow(row);
    fireEvent.scroll(row);
    expect(screen.queryByRole('button', { name: 'Scroll left' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Scroll right' })).toBeTruthy();

    const wheel = new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true });
    row.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true);
    expect(row.scrollLeft).toBe(120);
  });

  it('pages the row from the arrow', () => {
    render(<ChipScroller><button type="button">Chip</button></ChipScroller>);
    const row = screen.getByRole('button', { name: 'Chip' }).parentElement as HTMLElement;
    sizeRow(row);
    fireEvent.scroll(row);
    fireEvent.click(screen.getByRole('button', { name: 'Scroll right' }));
    expect(row.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 225 }));
  });

  it('lets the page scroll once the row is at its end', () => {
    render(<ChipScroller><button type="button">Chip</button></ChipScroller>);
    const row = screen.getByRole('button', { name: 'Chip' }).parentElement as HTMLElement;
    sizeRow(row, 600);
    const wheel = new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true });
    row.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(false);
  });
});
