import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InfoPopover, { shiftIntoView } from '../InfoPopover';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

const renderIt = () =>
  render(
    <div>
      <InfoPopover topic="Air quality"><p>How it works</p></InfoPopover>
      <button type="button">Elsewhere</button>
    </div>
  );

describe('InfoPopover', () => {
  it('opens a labelled panel from a named button', () => {
    renderIt();
    const button = screen.getByRole('button', { name: 'About: Air quality' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Air quality' })).toHaveTextContent('How it works');
  });

  it('closes on Esc and gives focus back to the button', () => {
    renderIt();
    const button = screen.getByRole('button', { name: 'About: Air quality' });
    fireEvent.click(button);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('closes on a click outside but not inside', () => {
    renderIt();
    fireEvent.click(screen.getByRole('button', { name: 'About: Air quality' }));
    fireEvent.pointerDown(screen.getByText('How it works'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('shiftIntoView', () => {
  it('leaves a panel that fits, and slides one that spills back inside the gutter', () => {
    expect(shiftIntoView(100, 300, 375)).toBe(0);
    expect(shiftIntoView(184, 460, 375)).toBe(-101);
    expect(shiftIntoView(-20, 200, 375)).toBe(36);
  });

  it('keeps the left edge in view when the panel is wider than the screen', () => {
    expect(shiftIntoView(50, 450, 320)).toBe(-34);
  });
});
