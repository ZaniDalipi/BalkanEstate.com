import { evaluateSender, SENDER_LIMITS, type PastInquiry } from '../../services/inquiries/senderLimits';

const NOW = Date.UTC(2026, 10, 17, 12, 0, 0);
const minutesAgo = (m: number) => new Date(NOW - m * 60_000);
const IP = 'ip-a';
const EMAIL = 'buyer@example.com';

const past = (over: Partial<PastInquiry> = {}): PastInquiry => ({
  createdAt: minutesAgo(5),
  buyerEmail: EMAIL,
  buyerPhone: '+38267123456',
  propertyId: 'p1',
  recipientId: 'r1',
  senderIpHash: IP,
  ...over,
});

const attempt = { buyerEmail: EMAIL, buyerPhone: '+38267123456', propertyId: 'p9', recipientId: 'r9', senderIpHash: IP };

describe('evaluateSender', () => {
  it('admits a first inquiry', () => {
    expect(evaluateSender(attempt, [], NOW)).toEqual({ ok: true });
  });

  it('refuses the same email asking about the same listing within a day', () => {
    const v = evaluateSender({ ...attempt, propertyId: 'p1' }, [past()], NOW);
    expect(v).toMatchObject({ ok: false, code: 'duplicate_inquiry' });
  });

  it('allows the same listing again after a day', () => {
    const v = evaluateSender({ ...attempt, propertyId: 'p1' }, [past({ createdAt: minutesAgo(25 * 60) })], NOW);
    expect(v.ok).toBe(true);
  });

  it('refuses a second general inquiry to the same agent within a day', () => {
    const general = { buyerEmail: EMAIL, recipientId: 'r1', senderIpHash: IP };
    expect(evaluateSender(general, [past({ propertyId: null })], NOW)).toMatchObject({ code: 'duplicate_inquiry' });
    // A property inquiry to that agent is a different conversation.
    expect(evaluateSender(general, [past()], NOW).ok).toBe(true);
  });

  it('refuses a third different phone number for one email (the pattern seen in production)', () => {
    const history = [past({ propertyId: 'a', buyerPhone: '+38267111111' }), past({ propertyId: 'b', buyerPhone: '+38267222222' })];
    expect(evaluateSender({ ...attempt, buyerPhone: '+38267333333' }, history, NOW)).toMatchObject({ ok: false, code: 'phone_mismatch' });
    // Re-using a number already given is fine.
    expect(evaluateSender({ ...attempt, buyerPhone: '+38267222222' }, history, NOW).ok).toBe(true);
    // So is leaving the phone out.
    expect(evaluateSender({ ...attempt, buyerPhone: undefined }, history, NOW).ok).toBe(true);
  });

  it('caps inquiries per email per hour, across IPs', () => {
    const history = Array.from({ length: SENDER_LIMITS.perEmail.hour }, (_, i) =>
      past({ propertyId: `x${i}`, senderIpHash: `ip-${i}` })
    );
    expect(evaluateSender({ ...attempt, senderIpHash: 'ip-new' }, history, NOW)).toMatchObject({ code: 'sender_limit' });
  });

  it('caps inquiries per IP per hour, across emails', () => {
    const history = Array.from({ length: SENDER_LIMITS.perIp.hour }, (_, i) =>
      past({ propertyId: `x${i}`, buyerEmail: `other${i}@example.com`, buyerPhone: null })
    );
    expect(evaluateSender(attempt, history, NOW)).toMatchObject({ code: 'sender_limit' });
  });

  it('counts an area search as one inquiry per agent it reaches', () => {
    const history = Array.from({ length: SENDER_LIMITS.perEmail.hour - 2 }, (_, i) => past({ propertyId: `x${i}`, buyerPhone: null }));
    const area = { buyerEmail: EMAIL, senderIpHash: 'ip-z' };
    expect(evaluateSender({ ...area, count: 2 }, history, NOW).ok).toBe(true);
    expect(evaluateSender({ ...area, count: 3 }, history, NOW)).toMatchObject({ code: 'sender_limit' });
  });

  it('ignores history older than the windows', () => {
    const old = Array.from({ length: 30 }, (_, i) => past({ propertyId: `x${i}`, createdAt: minutesAgo(8 * 24 * 60) }));
    expect(evaluateSender(attempt, old, NOW).ok).toBe(true);
  });
});
