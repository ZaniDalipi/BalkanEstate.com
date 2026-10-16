/**
 * Phase 3 — attachment conflict detection (pure, no database).
 *
 * detectAttachmentConflicts never writes; it decides whether an existing
 * listing may be linked to a unit. These cases pin the rule that a conflict is
 * never silently overridden: blocking conflicts always stop an attach, and the
 * soft "already attached elsewhere" case is only overridable with force.
 */
process.env.SKIP_TEST_DB = 'true';

import { detectAttachmentConflicts } from '../../services/developments/developmentListingService';

const DEV = 'dev000000000000000000001';
const OTHER_DEV = 'dev000000000000000000002';
const UNIT = 'unit00000000000000000001';
const OTHER_UNIT = 'unit00000000000000000002';
const LISTING = 'list00000000000000000001';

const property = (overrides: Record<string, unknown> = {}) =>
  ({ _id: LISTING, status: 'active', developmentId: undefined, unitId: undefined, ...overrides } as any);

const unit = (overrides: Record<string, unknown> = {}) =>
  ({ _id: UNIT, developmentId: DEV, listingIds: [], ...overrides } as any);

describe('detectAttachmentConflicts', () => {
  it('returns no conflicts for a clean, controlled, in-development attach', () => {
    const conflicts = detectAttachmentConflicts({
      property: property(),
      unit: unit(),
      targetDevelopmentId: DEV,
      controlsListing: true,
    });
    expect(conflicts).toHaveLength(0);
  });

  it('blocks when the caller does not control the listing', () => {
    const conflicts = detectAttachmentConflicts({
      property: property(),
      unit: unit(),
      targetDevelopmentId: DEV,
      controlsListing: false,
    });
    expect(conflicts).toContainEqual(
      expect.objectContaining({ code: 'listing_not_controlled_by_caller', blocking: true })
    );
  });

  it('blocks a sold listing', () => {
    const conflicts = detectAttachmentConflicts({
      property: property({ status: 'sold' }),
      unit: unit(),
      targetDevelopmentId: DEV,
      controlsListing: true,
    });
    expect(conflicts).toContainEqual(
      expect.objectContaining({ code: 'listing_archived_or_sold', blocking: true })
    );
  });

  it('blocks when the unit belongs to a different development', () => {
    const conflicts = detectAttachmentConflicts({
      property: property(),
      unit: unit({ developmentId: OTHER_DEV }),
      targetDevelopmentId: DEV,
      controlsListing: true,
    });
    expect(conflicts).toContainEqual(
      expect.objectContaining({ code: 'unit_in_other_development', blocking: true })
    );
  });

  it('flags re-homing from another unit as a soft (overridable) conflict', () => {
    const conflicts = detectAttachmentConflicts({
      property: property({ unitId: OTHER_UNIT, developmentId: OTHER_DEV }),
      unit: unit(),
      targetDevelopmentId: DEV,
      controlsListing: true,
    });
    const rehome = conflicts.find((c) => c.code === 'listing_already_attached_elsewhere');
    expect(rehome).toBeDefined();
    expect(rehome?.blocking).toBe(false);
  });

  it('flags an already-attached listing as a non-blocking no-op', () => {
    const conflicts = detectAttachmentConflicts({
      property: property({ unitId: UNIT, developmentId: DEV }),
      unit: unit({ listingIds: [LISTING] }),
      targetDevelopmentId: DEV,
      controlsListing: true,
    });
    expect(conflicts).toContainEqual(
      expect.objectContaining({ code: 'already_attached_to_this_unit', blocking: false })
    );
    // And no re-home conflict, since it is the same unit.
    expect(conflicts.find((c) => c.code === 'listing_already_attached_elsewhere')).toBeUndefined();
  });
});
