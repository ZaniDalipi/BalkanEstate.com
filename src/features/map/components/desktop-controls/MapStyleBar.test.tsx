import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MapStyleBar, { type MapStyleBarProps } from './MapStyleBar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, fallback?: string) => (typeof fallback === 'string' ? fallback : k) }),
}));

const setup = (over: Partial<MapStyleBarProps> = {}) => {
  const props: MapStyleBarProps = {
    handleRecenter: vi.fn(), mapStyle: 'street', setMapStyle: vi.fn(),
    isDrawing: false, onDrawStart: vi.fn(), hasDrawnArea: true, clearDrawnArea: vi.fn(), ...over,
  };
  render(<MapStyleBar {...props} />);
  return props;
};

describe('MapStyleBar', () => {
  it('shows the current style as the checked radio', () => {
    setup();
    expect(screen.getByRole('radio', { name: 'Street' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Clean' }).getAttribute('aria-checked')).toBe('false');
  });

  it('switching to Clean also clears the drawn area', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('radio', { name: 'Clean' }));
    expect(props.setMapStyle).toHaveBeenCalledWith('clean');
    expect(props.clearDrawnArea).toHaveBeenCalled();
  });

  it('other styles keep the drawn area', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('radio', { name: 'Satellite' }));
    expect(props.setMapStyle).toHaveBeenCalledWith('satellite');
    expect(props.clearDrawnArea).not.toHaveBeenCalled();
  });
});
