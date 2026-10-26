import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { StackingPlan } from './StackingPlan';
import type { DevelopmentFloor, PublicUnit } from '../../../types';

vi.mock('react-i18next', async () => (await import('./__tests__/i18nMock')).default);

const floor = (id: string, level: number): DevelopmentFloor => ({ id, label: `Floor ${level}`, level, buildingId: 'b', developmentId: 'd' }) as DevelopmentFloor;
const unit = (id: string, floorId: string, n: string): PublicUnit =>
  ({ id, developmentId: 'd', buildingId: 'b', floorId, unitNumber: n, unitType: 'apartment', availability: 'available', listingIds: [] }) as PublicUnit;

describe('StackingPlan', () => {
  it('lists floors top-down with their apartments and opens one on click', () => {
    const onOpen = vi.fn();
    render(
      <StackingPlan
        floors={[floor('f1', 1), floor('f2', 2), floor('f3', 3)]}
        units={[unit('a', 'f1', '1-2'), unit('b', 'f1', '1-10'), unit('c', 'f2', '2-1')]}
        matchedIds={new Set(['a'])}
        onOpenUnit={onOpen}
      />
    );
    const rows = screen.getAllByRole('listitem');
    expect(rows.map((r) => r.textContent?.slice(0, 7))).toEqual(['Floor 2', 'Floor 1']);
    const floor1 = within(rows[1]).getAllByRole('button').map((b) => b.textContent?.slice(0, 4));
    expect(floor1).toEqual(['1-2', '1-10']);
    expect(screen.getByRole('button', { name: /Apt 1-10/ }).className).toContain('opacity-30');
    fireEvent.click(screen.getByRole('button', { name: /Apt 2-1/ }));
    expect(onOpen).toHaveBeenCalledWith('c');
  });

  it('picks out the apartment that is open in the details sheet', () => {
    render(<StackingPlan floors={[floor('f1', 1)]} units={[unit('a', 'f1', '1-1'), unit('b', 'f1', '1-2')]} onOpenUnit={vi.fn()} openUnitId="b" />);
    expect(screen.getByRole('button', { name: /Apt 1-2/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: /Apt 1-1/ })).not.toHaveAttribute('aria-current');
  });
});
