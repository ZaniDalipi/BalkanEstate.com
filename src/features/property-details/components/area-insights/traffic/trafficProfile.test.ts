import { describe, it, expect } from 'vitest';
import {
  HOURLY_SHARE, areaIntensity, busiestWindows, hourShare, nowSlot, roadIntensity, shadeFor,
} from './trafficProfile';

describe('trafficProfile', () => {
  it('has a share for every hour of both day types', () => {
    expect(HOURLY_SHARE.weekday).toHaveLength(24);
    expect(HOURLY_SHARE.weekend).toHaveLength(24);
  });

  it('peaks in the morning and evening on weekdays, around midday at weekends', () => {
    expect(busiestWindows('weekday')).toEqual([[8, 9], [15, 18]]);
    expect(busiestWindows('weekend')).toEqual([[11, 17]]);
  });

  it('is quiet at night and busiest at the evening peak', () => {
    expect(hourShare('weekday', 3)).toBeLessThan(0.1);
    expect(hourShare('weekday', 17)).toBe(1);
    expect(hourShare('weekday', 24 + 17)).toBe(1);
    expect(hourShare('weekday', -7)).toBe(hourShare('weekday', 17));
  });

  it('makes main roads busier than side streets at the same hour', () => {
    expect(roadIntensity('primary', 'weekday', 17)).toBeGreaterThan(roadIntensity('street', 'weekday', 17));
    expect(shadeFor(roadIntensity('primary', 'weekday', 17))).toBe('veryHeavy');
    expect(shadeFor(roadIntensity('street', 'weekday', 17))).toBe('light');
    expect(shadeFor(roadIntensity('primary', 'weekday', 3))).toBe('flowing');
  });

  it('scales the area by its traffic level', () => {
    expect(areaIntensity('busy', 'weekday', 8)).toBeGreaterThan(areaIntensity('calm', 'weekday', 8));
  });

  it('starts at the visitor\'s day type and hour', () => {
    expect(nowSlot(new Date(2026, 10, 10, 8, 30))).toEqual({ day: 'weekday', hour: 8 }); // a Tuesday
    expect(nowSlot(new Date(2026, 10, 15, 22, 0))).toEqual({ day: 'weekend', hour: 22 }); // a Sunday
  });
});
