process.env.SKIP_TEST_DB = 'true';

jest.mock('../models/User', () => ({ __esModule: true, default: { findById: jest.fn() } }));
jest.mock('../models/Product', () => ({ __esModule: true, default: { findOne: jest.fn() } }));

import User from '../models/User';
import Product from '../models/Product';
import { consumeAiMessage } from '../utils/aiMessageLimits';
import { FREE_TIER_LIMITS } from '../config/subscriptionConstants';

const FUTURE = new Date(Date.now() + 86_400_000);
const user = (over: Record<string, unknown> = {}) => ({
  isSubscribed: false,
  hasActiveSubscription: () => false,
  subscriptionPlan: null,
  aiMessagesUsage: { monthlyCount: 0, monthResetDate: FUTURE },
  save: jest.fn().mockResolvedValue(undefined),
  ...over,
});

describe('consumeAiMessage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('counts a message for a free user under the limit', async () => {
    const u = user();
    (User.findById as jest.Mock).mockResolvedValue(u);
    await expect(consumeAiMessage('u1')).resolves.toEqual({ ok: true });
    expect(u.aiMessagesUsage.monthlyCount).toBe(1);
    expect(u.save).toHaveBeenCalled();
  });

  it('refuses once the free allowance is used, without counting', async () => {
    const u = user({ aiMessagesUsage: { monthlyCount: FREE_TIER_LIMITS.AI_MESSAGES, monthResetDate: FUTURE } });
    (User.findById as jest.Mock).mockResolvedValue(u);
    const result = await consumeAiMessage('u1');
    expect(result).toMatchObject({ ok: false, limit: FREE_TIER_LIMITS.AI_MESSAGES, used: FREE_TIER_LIMITS.AI_MESSAGES });
    expect(u.save).not.toHaveBeenCalled();
  });

  it('starts a new month when the reset date has passed', async () => {
    const u = user({ aiMessagesUsage: { monthlyCount: 999, monthResetDate: new Date(Date.now() - 1000) } });
    (User.findById as jest.Mock).mockResolvedValue(u);
    await expect(consumeAiMessage('u1')).resolves.toEqual({ ok: true });
    expect(u.aiMessagesUsage.monthlyCount).toBe(1);
  });

  it('uses the plan product limit, and -1 means unlimited', async () => {
    const u = user({ isSubscribed: true, hasActiveSubscription: () => true, subscriptionPlan: 'pro_monthly',
      aiMessagesUsage: { monthlyCount: 5000, monthResetDate: FUTURE } });
    (User.findById as jest.Mock).mockResolvedValue(u);
    (Product.findOne as jest.Mock).mockResolvedValue({ aiMessagesLimit: -1 });
    await expect(consumeAiMessage('u1')).resolves.toEqual({ ok: true });
  });

  it('lets an anonymous or unknown user through, as before', async () => {
    await expect(consumeAiMessage(undefined)).resolves.toEqual({ ok: true });
    (User.findById as jest.Mock).mockResolvedValue(null);
    await expect(consumeAiMessage('ghost')).resolves.toEqual({ ok: true });
  });
});
