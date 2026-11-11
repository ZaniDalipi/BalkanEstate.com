import { describe, it, expect } from 'vitest';
import { spinnerPhase, spinnerPhaseDelay, SPINNER_TURN_S } from './spinnerPhase';

describe('spinnerPhase', () => {
  it('is the fraction of a turn elapsed since page start', () => {
    expect(spinnerPhase(0)).toBe(0);
    expect(spinnerPhase(200)).toBeCloseTo(0.25);
    expect(spinnerPhase(600)).toBeCloseTo(0.75);
  });

  it('wraps around after a full turn', () => {
    expect(spinnerPhase(SPINNER_TURN_S * 1000)).toBe(0);
    expect(spinnerPhase(SPINNER_TURN_S * 1000 * 5 + 400)).toBeCloseTo(0.5);
  });

  it('stays in [0, 1) for negative clocks', () => {
    const phase = spinnerPhase(-200);
    expect(phase).toBeGreaterThanOrEqual(0);
    expect(phase).toBeLessThan(1);
    expect(phase).toBeCloseTo(0.75);
  });
});

describe('spinnerPhaseDelay', () => {
  it('starts the animation part-way through its turn', () => {
    expect(spinnerPhaseDelay(400)).toBe('-0.4s');
    expect(spinnerPhaseDelay(1000)).toBe('-0.2s');
  });

  it('two spinners mounted at the same moment point the same way', () => {
    expect(spinnerPhaseDelay(1234)).toBe(spinnerPhaseDelay(1234 + SPINNER_TURN_S * 1000));
  });
});

describe('spinnerPhaseDelay with another loop length', () => {
  it('works for the 1.8s logo float as well', () => {
    expect(spinnerPhaseDelay(900, 1.8)).toBe('-0.9s');
    expect(spinnerPhaseDelay(1800 + 450, 1.8)).toBe('-0.45s');
  });
});
