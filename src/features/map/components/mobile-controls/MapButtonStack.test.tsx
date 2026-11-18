import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MapButtonStack from './MapButtonStack';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, fallback?: string) => (typeof fallback === 'string' ? fallback : k) }),
}));

describe('MapButtonStack', () => {
  it('shows captioned Locate and Draw, and Reset only when the map can reset', () => {
    const handleRecenter = vi.fn();
    render(<MapButtonStack handleRecenter={handleRecenter} isDrawing={false} onDrawStart={vi.fn()} />);
    expect(screen.getByText('Locate')).toBeTruthy();
    expect(screen.getByText('Draw')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Center on my location' }));
    expect(handleRecenter).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Reset view' })).toBeNull();
  });

  it('turns Draw into Cancel while drawing', () => {
    const onDrawStart = vi.fn();
    render(<MapButtonStack handleRecenter={vi.fn()} handleResetView={vi.fn()} isDrawing onDrawStart={onDrawStart} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDrawStart).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Reset view' })).toBeTruthy();
  });
});
