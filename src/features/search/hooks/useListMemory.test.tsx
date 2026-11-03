import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useListMemory } from './useListMemory';

/** A stand-in for the page: the list is released (removed) while `released`. */
function Page({ released, filters }: { released: boolean; filters: string }) {
  const memory = useListMemory(released, filters);
  return (
    <div ref={memory.panelRef} data-testid="panel">
      {!released && (
        <div data-scroll-container data-testid="scroller">
          <button onClick={() => memory.onVisibleCountChange(60)}>page in</button>
          <span data-testid="initial">{String(memory.initialVisibleCount)}</span>
        </div>
      )}
    </div>
  );
}

describe('useListMemory', () => {
  it('puts the visitor back at the same depth when the list returns', () => {
    const { rerender, getByTestId, getByText } = render(<Page released={false} filters="a" />);
    getByText('page in').click();
    const scroller = getByTestId('scroller');
    scroller.scrollTop = 480;
    fireEvent.scroll(scroller);

    rerender(<Page released filters="a" />);
    expect(document.querySelector('[data-scroll-container]')).toBeNull();

    rerender(<Page released={false} filters="a" />);
    expect(getByTestId('scroller').scrollTop).toBe(480);
    expect(getByTestId('initial').textContent).toBe('60');
  });

  it('starts over when the filters changed while the list was away', () => {
    const { rerender, getByTestId, getByText } = render(<Page released={false} filters="a" />);
    getByText('page in').click();
    getByTestId('scroller').scrollTop = 480;
    fireEvent.scroll(getByTestId('scroller'));

    rerender(<Page released filters="a" />);
    rerender(<Page released filters="b" />);
    rerender(<Page released={false} filters="b" />);
    expect(getByTestId('scroller').scrollTop).toBe(0);
    expect(getByTestId('initial').textContent).toBe('undefined');
  });
});
