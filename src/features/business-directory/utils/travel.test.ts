import { describe, expect, it } from 'vitest';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { appleMapsDirections, formatDistance, formatDuration, googleMapsDirections, haversineKm, prefersAppleMaps, roundPoint } from './travel';
import { askSuggestions } from './askSuggestions';
import { toHistory, type AskMessage } from '../hooks/useAskBusiness';

const tirana = { lat: 41.3275, lng: 19.8187 };
const vlora = { lat: 40.4517, lng: 19.4805 };

describe('travel', () => {
  it('measures straight-line distance', () => {
    expect(haversineKm(tirana, vlora)).toBeGreaterThan(95);
    expect(haversineKm(tirana, vlora)).toBeLessThan(105);
    expect(haversineKm(tirana, tirana)).toBe(0);
  });

  it('formats distances: metres up close, one decimal under 10 km, whole km beyond', () => {
    expect(formatDistance(0.423, 'en')).toBe('420 m');
    expect(formatDistance(4.26, 'en')).toBe('4.3 km');
    expect(formatDistance(38.4, 'en')).toBe('38 km');
  });

  it('formats durations in minutes and hours', () => {
    expect(formatDuration(1080, 'en')).toBe('18 min');
    expect(formatDuration(5100, 'en')).toBe('1 hr 25 min');
    expect(formatDuration(7200, 'en')).toBe('2 hr');
    expect(formatDuration(5, 'en')).toBe('1 min');
  });

  it('hands off to Google and Apple Maps, with or without a start point', () => {
    expect(googleMapsDirections(vlora, 'foot', tirana)).toBe('https://www.google.com/maps/dir/?api=1&origin=41.3275,19.8187&destination=40.4517,19.4805&travelmode=walking');
    expect(googleMapsDirections(vlora, 'car')).toBe('https://www.google.com/maps/dir/?api=1&destination=40.4517,19.4805&travelmode=driving');
    expect(appleMapsDirections(vlora, 'car', tirana)).toBe('https://maps.apple.com/?saddr=41.3275,19.8187&daddr=40.4517,19.4805&dirflg=d');
  });

  it('rounds a point to ~10 m and recognises Apple devices', () => {
    expect(roundPoint({ lat: 41.327512, lng: 19.818749 })).toEqual({ lat: 41.3275, lng: 19.8187 });
    expect(prefersAppleMaps('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe(true);
    expect(prefersAppleMaps('Mozilla/5.0 (Linux; Android 14)')).toBe(false);
  });
});

describe('ask helpers', () => {
  it('suggests questions the profile can answer, plus the quote hand-off', () => {
    const l = { services: ['Renovation'], businessHours: { monday: '9-17' }, serviceAreas: ['Vlore'], languages: ['English'], paymentMethods: ['cash'] } as unknown as BusinessListing;
    expect(askSuggestions(l).map((s) => s.key)).toEqual([
      'detail.ask.suggest.weekend', 'detail.ask.suggest.areas', 'detail.ask.suggest.languages', 'detail.ask.suggest.quote',
    ]);
    expect(askSuggestions({ services: [] } as unknown as BusinessListing).map((s) => s.key)).toEqual(['detail.ask.suggest.quote']);
  });

  it('sends the chat so far as history, without error notes', () => {
    const messages: AskMessage[] = [
      { id: 1, role: 'user', text: 'Open Saturday?' },
      { id: 2, role: 'error', reason: 'unavailable' },
      { id: 3, role: 'user', text: 'Open Saturday?' },
      { id: 4, role: 'assistant', text: 'Yes, 9–13.', action: 'none' },
    ];
    expect(toHistory(messages)).toEqual([
      { role: 'user', text: 'Open Saturday?' },
      { role: 'user', text: 'Open Saturday?' },
      { role: 'assistant', text: 'Yes, 9–13.' },
    ]);
  });
});
