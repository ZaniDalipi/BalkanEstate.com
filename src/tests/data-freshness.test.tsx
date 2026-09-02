/**
 * Data freshness indicator
 *
 * Explore Cities figures are refreshed on a schedule, so the age shown is what
 * tells a reader whether they are looking at this week's market or last
 * quarter's. Two rules matter: never invent an age when there is no timestamp,
 * and never render a future age from clock skew.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DataFreshness, { describeAge, parseFetchedAt } from '../features/cities/components/DataFreshness';

const NOW = new Date('2026-09-02T12:00:00.000Z');
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60 * 1000);
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 60 * 60 * 1000);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

describe('parseFetchedAt', () => {
  it('accepts an ISO string and a Date', () => {
    expect(parseFetchedAt('2026-09-01T00:00:00.000Z')?.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(parseFetchedAt(NOW)).toEqual(NOW);
  });

  it('rejects missing and unparseable values instead of guessing', () => {
    expect(parseFetchedAt(null)).toBeNull();
    expect(parseFetchedAt(undefined)).toBeNull();
    expect(parseFetchedAt('')).toBeNull();
    expect(parseFetchedAt('not a date')).toBeNull();
  });
});

describe('describeAge', () => {
  it('describes minutes, hours, days and months', () => {
    expect(describeAge(minutesAgo(0), NOW).key).toBe('freshness.justNow');
    expect(describeAge(minutesAgo(1), NOW).key).toBe('freshness.justNow');
    expect(describeAge(minutesAgo(20), NOW)).toEqual({
      key: 'freshness.minutesAgo', defaultValue: '{{count}} min ago', count: 20,
    });
    expect(describeAge(hoursAgo(5), NOW)).toMatchObject({ key: 'freshness.hoursAgo', count: 5 });
    expect(describeAge(daysAgo(1), NOW).key).toBe('freshness.yesterday');
    expect(describeAge(daysAgo(9), NOW)).toMatchObject({ key: 'freshness.daysAgo', count: 9 });
    expect(describeAge(daysAgo(45), NOW).key).toBe('freshness.monthAgo');
    expect(describeAge(daysAgo(200), NOW)).toMatchObject({ key: 'freshness.monthsAgo', count: 6 });
  });

  it('reports a future timestamp as current rather than "in 3 hours"', () => {
    const future = new Date(NOW.getTime() + 3 * 60 * 60 * 1000);
    expect(describeAge(future, NOW).key).toBe('freshness.justNow');
  });

  it('does not skip a boundary between units', () => {
    // 59 minutes is still minutes; 60 becomes hours.
    expect(describeAge(minutesAgo(59), NOW).key).toBe('freshness.minutesAgo');
    expect(describeAge(minutesAgo(60), NOW).key).toBe('freshness.hoursAgo');
    expect(describeAge(hoursAgo(23), NOW).key).toBe('freshness.hoursAgo');
    expect(describeAge(hoursAgo(24), NOW).key).toBe('freshness.yesterday');
  });
});

describe('DataFreshness', () => {
  it('renders the age with the exact time available on hover and to a reader', () => {
    render(<DataFreshness fetchedAt={daysAgo(3)} now={NOW} />);

    // The i18n mock returns keys, so the label key proves the wiring.
    expect(screen.getByText('freshness.label')).toBeInTheDocument();
    const exact = screen.getByText(/2026/);
    expect(exact.tagName.toLowerCase()).toBe('time');
    expect(exact).toHaveAttribute('dateTime', daysAgo(3).toISOString());
  });

  it('names the source when given one', () => {
    render(<DataFreshness fetchedAt={daysAgo(3)} sourceLabel="OpenStreetMap" now={NOW} />);
    expect(screen.getByText('freshness.labelWithSource')).toBeInTheDocument();
  });

  it('renders nothing without a usable timestamp', () => {
    const { container: empty } = render(<DataFreshness fetchedAt={null} now={NOW} />);
    expect(empty).toBeEmptyDOMElement();

    const { container: broken } = render(<DataFreshness fetchedAt="never" now={NOW} />);
    expect(broken).toBeEmptyDOMElement();
  });
});
