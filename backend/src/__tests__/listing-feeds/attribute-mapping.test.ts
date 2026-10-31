process.env.SKIP_TEST_DB = 'true';

import { fieldForFeedKey, fieldForLabel } from '../../services/listingAttributes/labelMap';
import { enrichFromDetailHtml } from '../../services/listingHtmlEnricher';
import { extractRecordAttributes, fillFromRecordAttributes } from '../../services/listingAttributes/recordAttributes';

/**
 * Every feed names the same attributes differently. Each key must land on the
 * same field of our Property model, whatever language or naming style it uses.
 */
describe('fieldForFeedKey', () => {
  it.each([
    ['bathrooms', 'baths'], ['num_bathrooms', 'baths'], ['bathroomsCount', 'baths'], ['Kupatilo', 'baths'],
    ['broj_kupatila', 'baths'], ['bedrooms', 'beds'], ['numberOfBedrooms', 'beds'], ['spavace_sobe', 'beds'],
    ['living_rooms', 'livingRooms'], ['dnevni_boravak', 'livingRooms'], ['area_m2', 'sqft'], ['povrsina', 'sqft'],
    ['price_eur', 'price'], ['cijena', 'price'], ['town', 'city'], ['grad', 'city'], ['latitude', 'lat'],
    ['year_built', 'yearBuilt'], ['godina_izgradnje', 'yearBuilt'], ['grijanje', 'heatingType'], ['sprat', 'floor'],
  ])('%s → %s', (key, field) => {
    expect(fieldForFeedKey(key)).toBe(field);
  });

  it('ignores keys that are not listing attributes', () => {
    expect(fieldForFeedKey('created_at')).toBeUndefined();
    expect(fieldForFeedKey('agent_phone')).toBeUndefined();
  });

  it('keeps page labels to exact dictionary matches', () => {
    expect(fieldForLabel('Broj soba')).toBe('beds');
    expect(fieldForLabel('num_bathrooms')).toBeUndefined();
  });
});

describe('fillFromRecordAttributes', () => {
  it('maps a Kyero-style XML item (parsed by xml2js) attribute by attribute', () => {
    const item = {
      id: '123', ref: 'AB-1', price: '185000', currency: 'EUR', type: 'apartment', town: 'Budva',
      location: { latitude: '42.28', longitude: '18.84' },
      beds: '2', baths: '1', surface_area: { built: '74', plot: '0' },
      energy_rating: { consumption: 'C' },
      desc: { en: 'Nice flat' },
    };
    const out = fillFromRecordAttributes(item, {});
    expect(out).toMatchObject({ price: '185000', city: 'Budva', beds: 2, baths: 1, sqft: 74, lat: 42.28, lng: 18.84 });
  });

  it('reads name / value attribute lists in any language', () => {
    const item = {
      title: 'Stan Zagreb',
      attributes: [
        { name: 'Broj kupatila', value: '2' },
        { name: 'Dnevna soba', value: '1' },
        { name: 'Godina izgradnje', value: '2015' },
        { label: 'Grijanje', text: 'Centralno grijanje' },
      ],
    };
    expect(fillFromRecordAttributes(item, {})).toMatchObject({
      baths: 2, livingRooms: 1, yearBuilt: 2015, heatingType: 'central',
    });
  });

  it('never overwrites what the field map already set', () => {
    expect(fillFromRecordAttributes({ bathrooms: 3 }, { baths: 1 })).toEqual({ baths: 1 });
  });

  it('prefers a precise city key over a vague location and keeps the street as the address', () => {
    const out = fillFromRecordAttributes({ location: 'Centar, Tivat', address: 'Njegoševa 5', city: 'Kotor' }, {});
    expect(out).toMatchObject({ city: 'Kotor', address: 'Njegoševa 5' });
  });

  it("skips the agency's own address and id", () => {
    const out = fillFromRecordAttributes({ price: 90000, agency: { city: 'Beograd', id: 'ag-1' } }, {});
    expect(out.city).toBeUndefined();
    expect(out.propertyId).toBeUndefined();
  });

  it('understands booleans and XML text nodes with attributes', () => {
    const out = fillFromRecordAttributes({ parking: true, furnished: false, price: { _: '1200', currency: 'EUR' } }, {});
    expect(out).toMatchObject({ parking: 1, furnishing: 'unfurnished', price: '1200' });
  });

  it('rejects out-of-range values instead of guessing', () => {
    expect(extractRecordAttributes({ bedrooms: '250' })).toHaveLength(1);
    expect(fillFromRecordAttributes({ bedrooms: '250', year_built: '15' }, {})).toEqual({});
  });
});

describe('detail page attribute tables', () => {
  it('maps a label / value table row by row', () => {
    const html = `<table>
      <tr><th>Cijena</th><td>245.000 €</td></tr>
      <tr><th>Spavaće sobe</th><td>3</td></tr>
      <tr><th>Kupaonica</th><td>2</td></tr>
      <tr><th>Dnevna soba</th><td>1</td></tr>
      <tr><th>Namještenost</th><td>Namješteno</td></tr>
      <tr><th>Godina izgradnje</th><td>2019</td></tr>
    </table>`;
    expect(enrichFromDetailHtml(html, 'https://agency.example/oglas/1', {})).toMatchObject({
      price: '245.000 €', beds: 3, baths: 2, livingRooms: 1, furnishing: 'furnished', yearBuilt: 2019,
    });
  });
});
