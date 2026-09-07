import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ViewTransition } from '@/src/components/ui/ViewTransition';
import { setNavigationDirection } from '@/app/navigation/navHistory';

function renderView(view: string) {
  return render(
    <ViewTransition>
      <div data-testid="page">{view}</div>
    </ViewTransition>,
  );
}

function rerenderView(rerender: (ui: React.ReactElement) => void, view: string) {
  rerender(
    <ViewTransition>
      <div data-testid="page">{view}</div>
    </ViewTransition>,
  );
}

/** The wrapper is the element the page content sits directly inside. */
function wrapperOf(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}

/**
 * Navigation is instant by design: no entrance animation on the page that
 * arrives, and no paired view transition sliding the one it replaces away.
 * Both put motion in front of every tap — and the paired transition also held
 * the document's rendering suspended while it waited for the new view to commit
 * — which is the delay these tests exist to keep out.
 */
describe('ViewTransition', () => {
  beforeEach(() => {
    // Leave no direction behind for the next case to pick up.
    setNavigationDirection('forward');
  });

  it('renders the first view with no animation on it', () => {
    const { container } = renderView('search');
    expect(wrapperOf(container).className).not.toMatch(/animate/);
  });

  it('swaps a new view in without animating it', () => {
    const { container, rerender } = renderView('search');
    rerenderView(rerender, 'property-1');
    expect(wrapperOf(container).className).not.toMatch(/animate/);
    expect(wrapperOf(container).textContent).toBe('property-1');
  });

  it('does not animate a back navigation either', () => {
    const { container, rerender } = renderView('property-1');
    setNavigationDirection('back');
    rerenderView(rerender, 'search');
    expect(wrapperOf(container).className).not.toMatch(/animate/);
  });

  it('does not animate views that used to be presented as a sheet', () => {
    const { container, rerender } = renderView('search');
    rerenderView(rerender, 'create-listing');
    expect(wrapperOf(container).className).not.toMatch(/animate/);
  });

  it('leaves no transform on the wrapper', () => {
    // A wrapper carrying a transform is a containing block for every
    // `position: fixed` child inside the page — the detail page's contact bar,
    // the sticky ad, any modal — and its own compositing layer. With nothing
    // animating, there is never one to clear.
    const { container, rerender } = renderView('search');
    rerenderView(rerender, 'agents');
    const wrapper = wrapperOf(container);
    expect(wrapper.className.trim()).toBe('h-full');
    expect(wrapper.style.transform).toBe('');
  });

  it('keeps the wrapper node identity across a view change', () => {
    // The swipe-back listeners bind to this node on mount; remounting it on
    // every navigation would silently unbind the gesture.
    const { container, rerender } = renderView('search');
    const before = wrapperOf(container);
    rerenderView(rerender, 'agents');
    expect(wrapperOf(container)).toBe(before);
  });
});
