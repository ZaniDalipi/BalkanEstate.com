import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { ViewTransition } from '@/src/components/ui/ViewTransition';
import { setNavigationDirection } from '@/app/navigation/navHistory';

function renderView(viewKey: string) {
  return render(
    <ViewTransition viewKey={viewKey}>
      <div data-testid="page">{viewKey}</div>
    </ViewTransition>,
  );
}

/** The animated wrapper is the element the page content sits directly inside. */
function wrapperOf(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}

describe('ViewTransition', () => {
  beforeEach(() => {
    // Leave no direction behind for the next case to pick up.
    setNavigationDirection('forward');
  });

  it('does not animate the first view it renders', () => {
    const { container } = renderView('search');
    expect(wrapperOf(container).className).not.toMatch(/animate-page/);
  });

  it('pushes a new view in from the right by default', () => {
    const { container, rerender } = renderView('search');
    rerender(
      <ViewTransition viewKey="property-1">
        <div data-testid="page">property-1</div>
      </ViewTransition>,
    );
    expect(wrapperOf(container).className).toContain('animate-page-enter');
    expect(wrapperOf(container).className).not.toContain('animate-page-enter-back');
  });

  it('animates a detail page, which used to bypass transitions entirely', () => {
    const { container, rerender } = renderView('search');
    rerender(
      <ViewTransition viewKey="agency-42">
        <div data-testid="page">agency-42</div>
      </ViewTransition>,
    );
    expect(wrapperOf(container).className).toMatch(/animate-page-/);
  });

  it('reverses the motion when the direction is back', () => {
    const { container, rerender } = renderView('property-1');
    setNavigationDirection('back');
    rerender(
      <ViewTransition viewKey="search">
        <div data-testid="page">search</div>
      </ViewTransition>,
    );
    expect(wrapperOf(container).className).toContain('animate-page-enter-back');
  });

  it('presents form pages as a sheet', () => {
    const { container, rerender } = renderView('search');
    rerender(
      <ViewTransition viewKey="create-listing">
        <div data-testid="page">create-listing</div>
      </ViewTransition>,
    );
    expect(wrapperOf(container).className).toContain('animate-page-enter-up');
  });

  it('cross-fades a change of context', () => {
    const { container, rerender } = renderView('search');
    rerender(
      <ViewTransition viewKey="account">
        <div data-testid="page">account</div>
      </ViewTransition>,
    );
    expect(wrapperOf(container).className).toContain('animate-page-morph');
  });

  it('does not leave the animation class on the wrapper', () => {
    // While the class is on, the wrapper carries a transform and is therefore
    // the containing block for every `position: fixed` child inside the page —
    // the detail page's contact bar, the sticky ad, any modal. It has to come
    // off again. In the browser `animationend` does that; here we exercise the
    // timeout backstop that covers an animationend which never arrives, since
    // jsdom does not dispatch animation events to React at all.
    vi.useFakeTimers();
    try {
      const { container, rerender } = renderView('search');
      rerender(
        <ViewTransition viewKey="agents">
          <div data-testid="page">agents</div>
        </ViewTransition>,
      );
      const wrapper = wrapperOf(container);
      expect(wrapper.className).toMatch(/animate-page-/);

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(wrapper.className).not.toMatch(/animate-page-/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stands aside while a paired transition drives the change', async () => {
    // Back and forward run through the browser's View Transitions API, which
    // animates a snapshot of the outgoing page against one of the incoming
    // page. The wrapper underneath has to sit still: its own entrance would
    // animate the same arrival a second time, half a frame out of step.
    const pageTransition = await import('@/app/navigation/pageTransition');
    const running = vi.spyOn(pageTransition, 'isPageTransitionRunning').mockReturnValue(true);
    try {
      const { container, rerender } = renderView('search');
      setNavigationDirection('back');
      rerender(
        <ViewTransition viewKey="agents">
          <div data-testid="page">agents</div>
        </ViewTransition>,
      );
      expect(wrapperOf(container).className).not.toMatch(/animate-page/);
    } finally {
      running.mockRestore();
    }
  });

  it('keeps the wrapper node identity across a view change', () => {
    // The swipe-back listeners bind to this node on mount; remounting it on
    // every navigation would silently unbind the gesture.
    const { container, rerender } = renderView('search');
    const before = wrapperOf(container);
    rerender(
      <ViewTransition viewKey="agents">
        <div data-testid="page">agents</div>
      </ViewTransition>,
    );
    expect(wrapperOf(container)).toBe(before);
  });
});
