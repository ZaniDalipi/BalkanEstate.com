import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type React from 'react';
import MapLayersSheet, { type MapLayersSheetProps } from './MapLayersSheet';
import BottomSheet from './BottomSheet';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, fallback?: string) => (typeof fallback === 'string' ? fallback : k) }),
}));

const setup = (over: Partial<MapLayersSheetProps> = {}) => {
  const props: MapLayersSheetProps = {
    mapStyle: 'street', setMapStyle: vi.fn(), hasDrawnArea: true, clearDrawnArea: vi.fn(),
    selectedClimateRisk: 'none', setSelectedClimateRisk: vi.fn(),
    show3DBuildings: false, setShow3DBuildings: vi.fn(), showLandmarks: false, setShowLandmarks: vi.fn(),
    showCadastre: false, setShowCadastre: vi.fn(), showMeasurement: false, setShowMeasurement: vi.fn(),
    showTerrain: false, setShowTerrain: vi.fn(), isLegendOpen: false, setIsLegendOpen: vi.fn(),
    showOnlyPromoted: false, setShowOnlyPromoted: vi.fn(), promotedCount: 150,
    onClose: vi.fn(), ...over,
  };
  render(<MapLayersSheet {...props} />);
  return props;
};

vi.mock('@sentry/react', () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => children;
  return {
    ErrorBoundary: passthrough,
    withProfiler: <T,>(c: T) => c,
    withErrorBoundary: <T,>(c: T) => c,
    captureException: vi.fn(), captureMessage: vi.fn(), init: vi.fn(), setUser: vi.fn(),
    withScope: vi.fn(), addBreadcrumb: vi.fn(), setContext: vi.fn(), setTag: vi.fn(),
    browserTracingIntegration: vi.fn(), replayIntegration: vi.fn(),
  };
});

describe('MapLayersSheet', () => {
  it('is a labelled modal dialog that closes from the × button and Esc', () => {
    const props = setup();
    expect(screen.getByRole('dialog', { name: 'Map' }).getAttribute('aria-modal')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  it('picks a map style; Clean also clears the drawn area; the current style does nothing', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('radio', { name: 'Street' }));
    expect(props.setMapStyle).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('radio', { name: 'Clean' }));
    expect(props.setMapStyle).toHaveBeenCalledWith('clean');
    expect(props.clearDrawnArea).toHaveBeenCalled();
  });

  it('switches a climate overlay on', () => {
    const props = setup();
    expect(screen.getByRole('radio', { name: 'Off' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'Air' }));
    expect(props.setSelectedClimateRisk).toHaveBeenCalledWith('air');
  });

  it('toggles layers with switches, caps the premium count, and closes for map tools', () => {
    const props = setup();
    expect(screen.getByText('99+')).toBeTruthy();
    fireEvent.click(screen.getByRole('switch', { name: 'Cadastre' }));
    expect(props.setShowCadastre).toHaveBeenCalledWith(true);
    expect(props.onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('switch', { name: 'Measure' }));
    expect(props.setShowMeasurement).toHaveBeenCalledWith(true);
    expect(props.onClose).toHaveBeenCalled();
  });
});

describe('BottomSheet', () => {
  it('shows an error with a way back to the map when its content fails', () => {
    const Boom = () => {
      throw new Error('boom');
    };
    const onClose = vi.fn();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<BottomSheet title="Map" onClose={onClose}><Boom /></BottomSheet>);
    spy.mockRestore();
    expect(screen.getByRole('alert').textContent).toMatch('Something went wrong');
    const closes = screen.getAllByRole('button', { name: 'Close' });
    fireEvent.click(closes[closes.length - 1]);
    expect(onClose).toHaveBeenCalled();
  });
});
