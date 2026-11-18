import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MapLayerDock, { type MapLayerDockProps } from './MapLayerDock';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, fallback?: string) => (typeof fallback === 'string' ? fallback : _k) }),
}));

const base = (over: Partial<MapLayerDockProps> = {}): MapLayerDockProps => ({
  selectedClimateRisk: 'none', setSelectedClimateRisk: vi.fn(),
  isClimateMenuOpen: false, setIsClimateMenuOpen: vi.fn(),
  showOnlyPromoted: false, setShowOnlyPromoted: vi.fn(), promotedCount: 3,
  show3DBuildings: false, setShow3DBuildings: vi.fn(),
  showLandmarks: false, setShowLandmarks: vi.fn(),
  showMeasurement: false, setShowMeasurement: vi.fn(),
  showTerrain: true, setShowTerrain: vi.fn(),
  showCadastre: false, setShowCadastre: vi.fn(),
  isLegendOpen: false, setIsLegendOpen: vi.fn(),
  ...over,
});

describe('MapLayerDock', () => {
  it('toggles a layer, shows the premium count and marks active layers pressed', () => {
    const props = base();
    render(<MapLayerDock {...props} />);
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Terrain' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Cadastre' }));
    expect(props.setShowCadastre).toHaveBeenCalledWith(true);
  });

  it('opens the climate menu and picks a risk', () => {
    const closed = base();
    const { rerender } = render(<MapLayerDock {...closed} />);
    fireEvent.click(screen.getByRole('button', { name: 'Climate Risks' }));
    expect(closed.setIsClimateMenuOpen).toHaveBeenCalledWith(true);

    const open = base({ isClimateMenuOpen: true });
    rerender(<MapLayerDock {...open} />);
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Flood/ }));
    expect(open.setSelectedClimateRisk).toHaveBeenCalledWith('flood');
    expect(open.setIsClimateMenuOpen).toHaveBeenCalledWith(false);
  });
});
