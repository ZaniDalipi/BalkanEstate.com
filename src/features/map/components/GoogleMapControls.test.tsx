import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type React from 'react';
import GoogleMapControls, { type GoogleMapControlsProps } from './GoogleMapControls';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, fallback?: string) => (typeof fallback === 'string' ? fallback : k) }),
}));
vi.mock('./GoogleMapLegend', () => ({
  Legend: () => null,
  ClimateRiskLegend: ({ riskType }: { riskType: string }) => <div data-testid="climate-legend">{riskType}</div>,
}));
vi.mock('@sentry/react', () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => children;
  return {
    ErrorBoundary: passthrough, withProfiler: <T,>(c: T) => c, withErrorBoundary: <T,>(c: T) => c,
    captureException: vi.fn(), captureMessage: vi.fn(), init: vi.fn(), setUser: vi.fn(), withScope: vi.fn(),
    addBreadcrumb: vi.fn(), setContext: vi.fn(), setTag: vi.fn(), browserTracingIntegration: vi.fn(), replayIntegration: vi.fn(),
  };
});

const props = (isMobile: boolean): GoogleMapControlsProps => ({
  isMobile, hideControls: false, handleRecenter: vi.fn(), mapStyle: 'street', setMapStyle: vi.fn(),
  isDrawing: false, onDrawStart: vi.fn(), drawnBounds: null, onDrawComplete: vi.fn(), onSaveSearch: vi.fn(),
  isSaving: false, isAuthenticated: true, selectedClimateRisk: 'fire', setSelectedClimateRisk: vi.fn(),
  isClimateMenuOpen: false, setIsClimateMenuOpen: vi.fn(), showOnlyPromoted: false, setShowOnlyPromoted: vi.fn(),
  promotedCount: 0, show3DBuildings: false, setShow3DBuildings: vi.fn(), showLandmarks: false, setShowLandmarks: vi.fn(),
  showMeasurement: false, setShowMeasurement: vi.fn(), showTerrain: false, setShowTerrain: vi.fn(),
  showCadastre: false, setShowCadastre: vi.fn(), isLegendOpen: false, setIsLegendOpen: vi.fn(),
  isLayerMenuOpen: false, setIsLayerMenuOpen: vi.fn(),
});

describe('GoogleMapControls climate legend', () => {
  it('shows exactly one climate legend on a phone', () => {
    render(<GoogleMapControls {...props(true)} />);
    expect(screen.getAllByTestId('climate-legend')).toHaveLength(1);
  });

  it('shows exactly one climate legend on desktop', () => {
    render(<GoogleMapControls {...props(false)} />);
    expect(screen.getAllByTestId('climate-legend')).toHaveLength(1);
  });
});
