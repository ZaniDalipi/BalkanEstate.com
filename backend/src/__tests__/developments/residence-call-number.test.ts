/** The number buyers can call about an apartment: on the public unit detail, checked. */
import request from 'supertest';
import Development from '../../models/Development';
import { callableNumber, residenceCallNumber } from '../../services/developments/callNumber';
import { buildApp, setupDevelopment, encodeId } from './helpers/explorerHarness';

const app = buildApp();
const PUB = '/api/developments';

describe('callableNumber', () => {
  it.each([
    ['+389 71 967 915', '+389 71 967 915'],
    ['  (02) 123-4567 ', '(02) 123-4567'],
  ])('keeps %p', (raw, out) => expect(callableNumber(raw)).toBe(out));

  it.each([undefined, '', 'call me', '12345', 'javascript:alert(1)', '+1 2345 6789 0123 4567 8901'])('drops %p', (raw) => {
    expect(callableNumber(raw)).toBeUndefined();
  });
});

describe('residenceCallNumber', () => {
  it('prefers the residence contact, then the builder', () => {
    expect(residenceCallNumber({ contact: { phone: '+382 20 111 222' }, builder: { name: 'B', phone: '+382 20 999 999' } } as never)).toBe('+382 20 111 222');
    expect(residenceCallNumber({ contact: { phone: 'n/a' }, builder: { name: 'B', phone: '+382 20 999 999' } } as never)).toBe('+382 20 999 999');
    expect(residenceCallNumber({} as never)).toBeUndefined();
  });
});

describe('GET /:slug/units/:unitId — phone', () => {
  it('gives the residence number with the apartment, and none when there is no valid one', async () => {
    const t = await setupDevelopment({ published: true });
    const url = `${PUB}/${t.dev.slug}/units/${encodeId(String(t.unit._id))}`;

    const none = await request(app).get(url);
    expect(none.status).toBe(200);
    expect(none.body.development.phone).toBeUndefined();

    await Development.updateOne({ _id: t.devId }, { $set: { contact: { phone: '+389 71 967 915' } } });
    const withPhone = await request(app).get(url);
    expect(withPhone.body.development.phone).toBe('+389 71 967 915');
  });
});
