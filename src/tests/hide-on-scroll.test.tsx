/**
 * `useHideOnScroll` slides the floating header away on short landscape
 * screens. It must follow the page's own scroll containers (the app never
 * scrolls the document), ignore the sidebar and dialogs, never hide near the
 * top, and do nothing at all when disabled.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useHideOnScroll } from '@/src/shared/hooks/useHideOnScroll';

function Probe({ enabled }: { enabled: boolean }) {
  const hidden = useHideOnScroll(enabled);
  return (
    <>
      <div data-testid="state">{hidden ? 'hidden' : 'shown'}</div>
      <main data-testid="main" />
      <aside><div data-testid="side" /></aside>
    </>
  );
}

const state = () => screen.getByTestId('state').textContent;

function scrollTo(el: HTMLElement, top: number) {
  act(() => {
    el.scrollTop = top;
    el.dispatchEvent(new Event('scroll'));
  });
}

describe('useHideOnScroll', () => {
  it('hides while scrolling down and comes back on the way up', () => {
    render(<Probe enabled />);
    const main = screen.getByTestId('main');
    scrollTo(main, 0);
    scrollTo(main, 200);
    expect(state()).toBe('hidden');
    scrollTo(main, 150);
    expect(state()).toBe('shown');
  });

  it('stays shown near the top', () => {
    render(<Probe enabled />);
    const main = screen.getByTestId('main');
    scrollTo(main, 0);
    scrollTo(main, 30);
    expect(state()).toBe('shown');
  });

  it('ignores scrolling inside the sidebar', () => {
    render(<Probe enabled />);
    const side = screen.getByTestId('side');
    scrollTo(side, 0);
    scrollTo(side, 300);
    expect(state()).toBe('shown');
  });

  it('never hides when disabled', () => {
    render(<Probe enabled={false} />);
    const main = screen.getByTestId('main');
    scrollTo(main, 0);
    scrollTo(main, 400);
    expect(state()).toBe('shown');
  });
});
