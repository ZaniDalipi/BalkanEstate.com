process.env.SKIP_TEST_DB = 'true';

import { isPropertyImageTag, PROPERTY_IMAGE_TAGS } from '../../config/propertyImageTags';

describe('isPropertyImageTag', () => {
  it('accepts every known photo tag', () => {
    for (const tag of PROPERTY_IMAGE_TAGS) expect(isPropertyImageTag(tag)).toBe(true);
  });

  it('rejects anything else, so unknown or injected values never reach visitors', () => {
    for (const value of ['', 'Living_Room', 'living room', '<script>', 'living_room ', null, undefined, 3, {}, ['kitchen']]) {
      expect(isPropertyImageTag(value)).toBe(false);
    }
  });
});
