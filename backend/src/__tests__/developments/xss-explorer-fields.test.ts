/**
 * The XSS sanitizer must leave the residence explorer's plain-text fields
 * alone (React escapes them on render) while still escaping everything else.
 * Escaping them stored "Owner's view" as "Owner&#x27;s view", which React then
 * printed literally.
 */
process.env.SKIP_TEST_DB = 'true';

import type { Request, Response } from 'express';
import { xssSanitizer } from '../../middleware/security';

const run = (body: unknown): Record<string, any> => {
  const req = { body, query: {}, params: {} } as unknown as Request;
  xssSanitizer(req, {} as Response, () => undefined);
  return req.body as Record<string, any>;
};

describe('xssSanitizer and explorer fields', () => {
  it('keeps hotspot labels nested in a draft intact', () => {
    const out = run({ hotspots: [{ id: 'h1', label: "Owner's view", linkId: 'abc' }] });
    expect(out.hotspots[0].label).toBe("Owner's view");
  });

  it.each(['viewName', 'unitNumber', 'unitType', 'orientation', 'viewType', 'note'])('keeps %s intact', (key) => {
    expect(run({ [key]: `It's "B2" <east>` })[key]).toBe(`It's "B2" <east>`);
  });

  it('still escapes fields that are not explicitly plain text', () => {
    expect(run({ somethingElse: "<script>alert('x')</script>" }).somethingElse).toBe(
      '&lt;script&gt;alert(&#x27;x&#x27;)&lt;/script&gt;'
    );
  });
});
