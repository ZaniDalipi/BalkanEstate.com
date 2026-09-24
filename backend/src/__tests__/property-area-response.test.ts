process.env.SKIP_TEST_DB = 'true';

/**
 * The one size the API serves.
 *
 * Every property leaving this API goes through `sanitizeProperty`, so that is
 * where the total is settled — once, for every screen. Before it, each client
 * surface decided for itself and they disagreed: the same villa read 1500 m²
 * on its detail page and 500 on a card, because the card took the stored
 * field and the page worked it out. These pin that a response never carries
 * the stale figure, whichever context asked for it.
 */

import { sanitizeProperty } from '../utils/responseSanitizer';

/** The Resen villa: a 1500 m² plot, a 500 m² house, and a stale stored total. */
const villa = {
  _id: '507f1f77bcf86cd799439011',
  propertyType: 'luxury-villa',
  sqft: 500,
  landArea: 1500,
  buildingArea: 500,
  price: 0,
};

describe('sanitizeProperty settles the size for every response', () => {
  it('serves the plot, not the stale stored total, in a list response', () => {
    expect(sanitizeProperty({ ...villa }, 'list').sqft).toBe(1500);
  });

  it('serves the same figure on the detail response', () => {
    expect(sanitizeProperty({ ...villa }, 'detail').sqft).toBe(1500);
  });

  it('leaves a row the schema hook already agreed with untouched', () => {
    const settled = { ...villa, sqft: 1500 };
    expect(sanitizeProperty(settled, 'list').sqft).toBe(1500);
  });

  it('keeps a listing whose only figure is its stated total', () => {
    const flat = { _id: 'a', propertyType: 'apartment', sqft: 120 };
    expect(sanitizeProperty(flat, 'list').sqft).toBe(120);
  });

  it('reports a listing with no size anywhere as 0, not a guess', () => {
    const garage = { _id: 'b', propertyType: 'parking', sqft: 0, parking: 2 };
    expect(sanitizeProperty(garage, 'list').sqft).toBe(0);
  });

  it('does not invent an sqft on a record that never had the field', () => {
    const notAProperty = { _id: 'c', name: 'an agency' };
    expect('sqft' in sanitizeProperty(notAProperty, 'list')).toBe(false);
  });
});
