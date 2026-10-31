import { describe, it, expect } from 'vitest';
import { notificationTarget } from './notificationTarget';

describe('notificationTarget', () => {
  it('follows a same-origin action link, never an external one', () => {
    expect(notificationTarget({ type: 'development_unit_available', data: { actionUrl: '/property/abc' } })).toEqual({ path: '/property/abc', direction: 'up' });
    expect(notificationTarget({ type: 'residence_offline', data: { actionUrl: '/dashboard/developments/x1' } })).toEqual({ path: '/dashboard/developments/x1', direction: 'morph' });
    expect(notificationTarget({ type: 'system', data: { actionUrl: '//evil.example/x' } })).toBeNull();
    expect(notificationTarget({ type: 'system', data: { actionUrl: 'https://evil.example' } })).toBeNull();
  });

  it('opens a residence notification stored before it had a link, with the apartment open', () => {
    expect(notificationTarget({ type: 'development_unit_available', data: { developmentSlug: 'aurora-residence', unitId: 'KO-1' } }))
      .toEqual({ path: '/developments/aurora-residence?unit=KO-1', direction: 'up' });
    expect(notificationTarget({ type: 'development_update', data: { developmentSlug: 'aurora-residence' } })?.path).toBe('/developments/aurora-residence');
  });

  it('opens the owner dashboard for trial reminders', () => {
    expect(notificationTarget({ type: 'residence_trial_reminder', data: { developmentId: 'd1' } })).toEqual({ path: '/dashboard/developments/d1', direction: 'morph' });
    expect(notificationTarget({ type: 'system', data: { developmentId: 'd1' } })).toBeNull();
  });

  it('keeps the existing targets', () => {
    expect(notificationTarget({ type: 'new_viewing' })?.path).toBe('/account/viewings');
    expect(notificationTarget({ type: 'price_drop', data: { propertyId: 'p1' } })?.path).toBe('/property/p1');
    expect(notificationTarget({ type: 'agency_join_request', data: { agencyId: 'a1', agencySlug: 'best' } })?.path).toBe('/agencies/best');
    expect(notificationTarget({ type: 'new_message', data: { conversationId: 'c1' } })?.path).toBe('/inbox');
    expect(notificationTarget({ type: 'system', data: {} })).toBeNull();
  });
});
