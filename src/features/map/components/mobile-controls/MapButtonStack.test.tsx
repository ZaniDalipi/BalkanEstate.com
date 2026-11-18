import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MapButtonStack from './MapButtonStack';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, fallback?: string) => (typeof fallback === 'string' ? fallback : k) }),
}));

describe('MapButtonStack', () => {
  it('opens the Map sheet and reports its state', () => {
    const onOpenSheet = vi.fn();
    render(
      <MapButtonStack isSheetOpen={false} onOpenSheet={onOpenSheet} activeLayerCount={2} handleRecenter={vi.fn()}
        isDrawing={false} onDrawStart={vi.fn()} />,
    );
    const layers = screen.getByRole('button', { name: 'Layers (2)' });
    expect(screen.getByText('Locate')).toBeTruthy();
    expect(layers.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(layers);
    expect(onOpenSheet).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Reset view' })).toBeNull();
  });

  it('turns Draw into Cancel while drawing', () => {
    const onDrawStart = vi.fn();
    render(
      <MapButtonStack isSheetOpen={false} onOpenSheet={vi.fn()} activeLayerCount={0} handleRecenter={vi.fn()}
        handleResetView={vi.fn()} isDrawing onDrawStart={onDrawStart} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDrawStart).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Reset view' })).toBeTruthy();
  });
});
